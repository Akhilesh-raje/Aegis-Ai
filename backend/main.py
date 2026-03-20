"""
AegisAI — Main Application Entry Point

Initializes all components, trains ML models on synthetic baseline data,
and starts the FastAPI server with independent async stream tasks.
"""

import asyncio
import sys
import json
import logging
import time
import os
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from collections import deque
from statistics import mean
from typing import Any, AsyncGenerator, Dict, List, Optional
from itertools import islice

# pyre-ignore[21]
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# pyre-ignore[21]
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.simulator.log_generator import (  # type: ignore
    generate_normal_batch,
    ATTACK_GENERATORS,
)
from backend.stream.aggregator import AggregationEngine  # type: ignore
from backend.ml.preprocessor import Preprocessor  # type: ignore
from backend.ml.detector import AnomalyDetector  # type: ignore
from backend.ml.classifier import ThreatClassifier, generate_synthetic_training_data  # type: ignore
from backend.engine.risk_scorer import RiskScorer  # type: ignore
from backend.engine.response_engine import ResponseEngine  # type: ignore
from backend.engine.telemetry import TelemetryEngine  # type: ignore
from backend.engine.insight_engine import InsightEngine  # type: ignore
from backend.engine.normalization import EventNormalizer  # type: ignore
from backend.engine.stream_manager import ws_manager  # type: ignore
from backend.engine.rules_engine import rules_engine  # type: ignore
from backend.engine.threat_intel_engine import intel_engine  # type: ignore
from backend.engine.worker import MLWorker  # type: ignore
from backend.ai.decision_engine import decision_engine

from backend.engine.fleet_manager import fleet_manager  # type: ignore
from backend.engine.identity_engine import identity_engine  # type: ignore
from backend.engine.graph_engine import graph_engine  # type: ignore
from backend.engine.policy_engine import policy_engine  # type: ignore
from backend.engine.location_engine import location_engine  # type: ignore
from backend.engine.crypto import verify_signature  # type: ignore
from backend.engine.adversary_emulation import AdversaryEmulationEngine  # type: ignore
from backend.storage.database import Database  # type: ignore
from backend.api.routes import router, init_routes  # type: ignore
from backend.engine.extreme_orchestrator import ExtremeOrchestrator
# Auth router removed for direct access
from backend.api.settings import router as settings_router # type: ignore

# AI Brain
from backend.ai.engine import AegisAIEngine  # type: ignore
from backend.ai.knowledge_store import KnowledgeStore  # type: ignore
from backend.ai.prompts import KNOWLEDGE_SEEDS  # type: ignore


# ---------------------------------------------------------------------------
# Linter Harmonization Helpers
# ---------------------------------------------------------------------------
def _t_str(s: Any, limit: int) -> str:
    """Explicitly truncate string to satisfy pedantic linter inference."""
    val = str(s)
    # pyre-ignore[16]
    return val[:limit] if len(val) > limit else val

def _t_list(l: Any, limit: int) -> list:
    """Explicitly truncate list to satisfy pedantic linter inference."""
    val = list(l) if l is not None else []
    # pyre-ignore[24]
    return val[:limit] if len(val) > limit else val

# ---------------------------------------------------------------------------
# Application State
# ---------------------------------------------------------------------------
from typing import Any
app_state: dict[str, Any] = {}


def initialize_models():
    """Train ML models on synthetic baseline data at startup."""
    print("[AegisAI] Initializing components...")

    aggregator = AggregationEngine(window_seconds=5)
    preprocessor = Preprocessor()
    detector = AnomalyDetector(contamination=0.15)
    classifier = ThreatClassifier()
    risk_scorer = RiskScorer()
    response_engine = ResponseEngine()
    telemetry_engine = TelemetryEngine()
    db = Database()
    security_insights_engine = InsightEngine(
        db, 
        telemetry_engine, 
        risk_scorer,
        rules_engine,
        intel_engine
    )

    # Initialize AI Brain
    knowledge_store = KnowledgeStore()
    knowledge_store.seed_knowledge(KNOWLEDGE_SEEDS)
    ai_engine = AegisAIEngine(knowledge_store=knowledge_store)
    print("[AegisAI] AI Brain initialized")

    # --- Train Isolation Forest on normal baseline ---
    print("[AegisAI] Generating normal baseline data...")
    normal_events = []
    for _ in range(200):
        normal_events.extend(generate_normal_batch(count=20))

    normal_windows = aggregator.aggregate(normal_events)
    normal_features = preprocessor.extract_features(normal_windows)
    preprocessor.fit(normal_features)
    scaled_normal = preprocessor.transform(normal_features)

    print(f"[AegisAI] Training Isolation Forest on {len(scaled_normal)} baseline samples...")
    detector.fit(scaled_normal)

    # --- Train Random Forest Classifier on synthetic attack data ---
    print("[AegisAI] Generating synthetic attack training data...")
    X_train, y_train = generate_synthetic_training_data(preprocessor, aggregator)
    X_train_scaled = preprocessor.transform(X_train)

    print(f"[AegisAI] Training Random Forest Classifier on {len(X_train_scaled)} samples...")
    classifier.fit(X_train_scaled, y_train)

    print("[AegisAI] All models trained successfully.")

    emulation_engine = AdversaryEmulationEngine({}) # Will be wired in lifespan
    
    # Initialize Extreme Test Orchestrator
    extreme_orchestrator = ExtremeOrchestrator(app_state={}) 

    return {
        "aggregator": aggregator,
        "preprocessor": preprocessor,
        "detector": detector,
        "classifier": classifier,
        "risk_scorer": risk_scorer,
        "response_engine": response_engine,
        "telemetry_engine": telemetry_engine,
        "db": db,
        "security_insights_engine": security_insights_engine,
        "ws_manager": ws_manager,
        "rules_engine": rules_engine,
        "intel_engine": intel_engine,
        "policy_engine": policy_engine,
        "emulation_engine": emulation_engine,
        "location_engine": location_engine,
        "simulation_events": [],
        "recent_events": [], # Ring buffer for forensic multiplexing
        "start_time": datetime.now(timezone.utc),
        "event_count": 0,
        "ai_engine": ai_engine,
        "knowledge_store": knowledge_store,
        "extreme_orchestrator": extreme_orchestrator,
    }


# ---------------------------------------------------------------------------
# Independent Async Stream Tasks (replaces single background loop)
# ---------------------------------------------------------------------------

async def _stream_telemetry_and_stats():
    """
    Stream TELEMETRY + STATS channels every 3 seconds.
    Also handles core event processing (real telemetry capture + ML pipeline).
    Priority: MEDIUM
    """
    aggregator = app_state["aggregator"]
    preprocessor = app_state["preprocessor"]
    detector = app_state["detector"]
    telemetry_engine = app_state["telemetry_engine"]
    db = app_state["db"]
    risk_scorer = app_state["risk_scorer"]

    print("[AegisStream] Telemetry + Stats stream started (3s cycle)")

    while True:
        try:
            # 1. Real-World Telemetry Capture (offloaded to thread to prevent blocking event loop)
            real_telemetry = await asyncio.to_thread(telemetry_engine.get_full_telemetry)


            # 2. Normalize + process through identity engine
            try:
                normalized_real_events = EventNormalizer.normalize_telemetry(real_telemetry)
                for event in normalized_real_events:
                    try:
                        identity_engine.process_event(event)
                        db.insert_event(event.event_type, event.source_node, event.data)
                    except Exception as e:
                        print(f"[AegisStream] Event processing error: {e}")
            except Exception as e:
                print(f"[AegisStream] Normalization error: {e}")
                normalized_real_events = []

            # 3. Process verified simulation events  
            sim_events = app_state.get("simulation_events", [])
            app_state["simulation_events"] = []
            verified_sim_events = []
            for raw_event in sim_events:
                try:
                    sig = raw_event.get("_signature")
                    ts = raw_event.get("_timestamp")
                    payload = {k: v for k, v in raw_event.items() if k not in ["_signature", "_timestamp"]}
                    if sig and ts and verify_signature(payload, ts, sig):
                        verified_sim_events.append(raw_event)
                        normalized_sim = EventNormalizer.normalize_generic_event(raw_event)
                        identity_engine.process_event(normalized_sim)
                except Exception as e:
                    print(f"[AegisStream] Sim event error: {e}")

            # 4. Aggregation + ML Detection
            all_events = [e.to_dict() if hasattr(e, 'to_dict') else e for e in normalized_real_events] + verified_sim_events
            app_state["event_count"] = app_state.get("event_count", 0) + len(all_events)

            if all_events:
                # ML Pipeline
                try:
                    windows = aggregator.aggregate(all_events)
                    if windows:
                        features = preprocessor.extract_features(windows)
                        scaled = preprocessor.transform(features)
                        detections = detector.detect(scaled)

                        node = fleet_manager.nodes.get("local-node")
                        asset_type = node.asset_type if node else "Workstation"

                        asyncio.create_task(app_state["ml_worker"].analyze_async(
                            telemetry_windows=windows,
                            features=features,
                            scaled_features=scaled,
                            detection_results=detections,
                            asset_type=asset_type
                        ))
                except Exception as e:
                    print(f"[AegisStream] ML pipeline error: {e}")

                # Forensic Multiplexing (Ring Buffer)
                new_logs = []
                for ev in all_events:
                    log_entry = {
                        "timestamp": ev.get("timestamp", time.time()) if isinstance(ev.get("timestamp"), (int, float)) else time.time(),
                        "level": "INFO" if not ev.get("severity") or ev.get("severity") == "low" else "WARNING",
                        "source": ev.get("source_node", "local-node"),
                        "message": f"[{ev.get('event_type', 'EVENT')}] {_t_str(json.dumps(ev.get('data', {})), 100)}..."
                    }
                    new_logs.append(log_entry)
                
                # Use explicit slice helpers to avoid Pyre2 indexing confusion
                app_state["recent_events"] = _t_list(new_logs + list(app_state.get("recent_events", [])), 50)

            # 6. Broadcast TELEMETRY channel (delta-checked inside ws_manager)
            telemetry_payload = {
                # pyre-ignore[16]
                "cpu": round(real_telemetry.get("system", {}).get("cpu_usage", 0), 1),
                # pyre-ignore[16]
                "ram": round(real_telemetry.get("system", {}).get("ram_usage", 0), 1),
                "audit_logs": app_state["recent_events"]
            }
            await ws_manager.broadcast_channel("TELEMETRY", telemetry_payload)

            # 6. Broadcast STATS channel (delta-checked)
            try:
                start_time = app_state["start_time"]
                db_stats = db.get_stats()
                uptime = (datetime.now(timezone.utc) - start_time).total_seconds()
                event_count = app_state.get("event_count", 0)
                stats_data = {
                    "total_events": event_count,
                    "threats_detected": db_stats["total_threats"],
                    "active_threats": db_stats["active_threats"],
                    "mitigated_threats": db_stats["mitigated_threats"],
                    "risk_level": risk_scorer.get_level(),
                    "risk_score": float(risk_scorer.get_score()),
                    "uptime_seconds": float(f"{uptime:.1f}"),
                    "event_rate": float(f"{event_count / max(uptime, 1):.1f}"),
                }
                await ws_manager.broadcast_channel("STATS", stats_data)
            except Exception as e:
                print(f"[AegisStream] Stats broadcast error: {e}")

        except Exception as e:
            print(f"[AegisStream] Telemetry stream error: {e}")

        await asyncio.sleep(3)


async def _stream_threats_and_insights():
    """
    Stream THREATS + INSIGHTS channels every 5 seconds.
    Priority: HIGH (threats are force-pushed when new ones appear)
    """
    db = app_state["db"]
    insights_engine = app_state["security_insights_engine"]
    telemetry_engine = app_state["telemetry_engine"]
    risk_scorer = app_state["risk_scorer"]

    print("[AegisStream] Threats + Insights stream started (5s cycle)")

    last_threat_count = 0
    last_risk_score = 100

    while True:
        try:
            # Broadcast latest threats (delta-checked) 
            threats = db.get_threats(limit=10)
            await ws_manager.broadcast_channel("THREATS", threats)

            # Broadcast security insights + observations
            try:
                insights = insights_engine.get_security_signals()
                await ws_manager.broadcast_channel("INSIGHTS", insights)

                # Also process observations through graph engine
                real_telemetry = await asyncio.to_thread(telemetry_engine.get_full_telemetry)
                merged_data = {
                    **real_telemetry,
                    "observations": insights.get("observations", [])
                }
                try:
                    normalized_events = EventNormalizer.normalize_telemetry(merged_data)
                    for event in normalized_events:
                        identity_engine.process_event(event)
                        graph_engine.process_event(event)
                        db.insert_event(event.event_type, event.source_node, event.data)
                except Exception as e:
                    print(f"[AegisStream] Insight normalization error: {e}")

                # Update fleet with real risk score
                risk_score = insights.get("score", {}).get("total", 100)
                real_metrics = telemetry_engine.get_system_stats()
                fleet_manager.update_node("local-node", 100 - risk_score, {
                    "cpu": int(real_metrics["cpu_usage"]),
                    "mem": int(real_metrics["ram_usage"])
                })
                
                # --- EVENT-DRIVEN AI ADVISORY & DECISIONS TRIGGER (NON-BLOCKING) ---
                current_threat_count = len(threats)
                risk_spike = (last_risk_score - risk_score) > 10
                new_threat = current_threat_count > last_threat_count
                
                if risk_spike or new_threat:
                    # Offload to background task to prevent blocking the telemetry loop
                    asyncio.create_task(_run_ai_analysis_cycle(risk_score, threats, last_threat_count))
                    
                last_threat_count = current_threat_count
                last_risk_score = risk_score
                
            except Exception as e:
                print(f"[AegisStream] Insight broadcast error: {e}")

        except Exception as e:
            print(f"[AegisStream] Threats + Insights loop error: {e}")

        await asyncio.sleep(5)


async def _run_ai_analysis_cycle(risk_score: float, threats: List[Dict[str, Any]], last_threat_count: int):
    """Background task for heavy AI reasoning."""
    # Explicit type hints to satisfy linter
    ai_engine = app_state.get("ai_engine")
    decision_engine = app_state.get("decision_engine")
    
    if ai_engine is None or decision_engine is None:
        return
    
    # pyre-ignore[9]
    ae: AegisAIEngine = ai_engine
    # pyre-ignore[9]
    de: DecisionEngine = decision_engine
    
    assert ae is not None
    assert de is not None

    try:
        # 1. Generate text advisory (Can take 2-10 seconds)
        advisory = await ae.generate_advisory()
        if advisory:
            await ws_manager.broadcast_channel("AI_ADVISOR", advisory)
        
            # 2. Run decision engine on top threats
            context_ds = {
                "risk_score": risk_score,
                "active_threats": len(threats),
            }
            
            # pyre-ignore[16]
            ai_output_text = advisory.get("narrative", "")
            # Use islice for type-safe slicing
            recent_top_threats = list(islice(threats, 3))
            
            decisions = []
            if recent_top_threats:
                decisions = de.analyze_threats(recent_top_threats, context_ds, ai_output_text)
            else:
                # Fallback if no specific threats but risk is high
                decisions = [de.decide_action(context_ds, ai_output_text, None)]
                
            # 3. Broadcast high-confidence/critical decisions
            for dec in decisions:
                if dec["severity"] in ("high", "critical") or dec["action"] != "NO_ACTION":
                    ws_payload = de.build_ws_payload(dec)
                    await ws_manager.broadcast_channel("AI_DECISIONS", ws_payload)
            
    except Exception as e:
        print(f"[AegisAI] Background analysis error: {e}")


async def _stream_fleet_and_identity():
    """
    Stream FLEET + IDENTITY channels every 10 seconds.
    Priority: LOW
    """
    print("[AegisStream] Fleet + Identity stream started (10s cycle)")

    while True:
        try:
            fleet_data = fleet_manager.get_fleet_summary()
            await ws_manager.broadcast_channel("FLEET", fleet_data)
        except Exception as e:
            print(f"[AegisStream] Fleet broadcast error: {e}")

        try:
            identity_data = identity_engine.get_identity_insights()
            await ws_manager.broadcast_channel("IDENTITY", identity_data)
        except Exception as e:
            print(f"[AegisStream] Identity broadcast error: {e}")

        await asyncio.sleep(10)


async def _stream_graph_and_risk():
    """
    Stream GRAPH + RISK_HISTORY channels every 15 seconds.
    Priority: LOW (graph data is heavy)
    """
    db = app_state["db"]
    print("[AegisStream] Graph + Risk History stream started (15s cycle)")

    while True:
        try:
            active_threats = db.get_threats(limit=100)
            graph_data = graph_engine.get_graph_data(active_threats)
            await ws_manager.broadcast_channel("GRAPH", graph_data)
        except Exception as e:
            print(f"[AegisStream] Graph broadcast error: {e}")

        try:
            risk_history = db.get_risk_history(limit=30)
            await ws_manager.broadcast_channel("RISK_HISTORY", risk_history)
        except Exception as e:
            print(f"[AegisStream] Risk history broadcast error: {e}")

        await asyncio.sleep(15)


async def _stream_simulation():
    """
    Stream SIMULATION channel every 1 second.
    Priority: HIGH (Real-time visual feedback)
    """
    print("[AegisStream] Simulation stream started (1s cycle)")

    while True:
        try:
            emulation_engine = app_state["emulation_engine"]
            if emulation_engine:
                await ws_manager.broadcast_channel("SIMULATION", emulation_engine.active_simulations)
        except Exception as e:
            print(f"[AegisStream] Simulation broadcast error: {e}")

        await asyncio.sleep(1)


# (AI Advisor stream replaced by event-driven trigger in _stream_threats)


# ---------------------------------------------------------------------------
# App Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize models and start independent stream tasks on startup."""
    global app_state
    app_state = initialize_models()
    init_routes(app_state)

    # Wire AI engine with live app state
    ai_engine = app_state.get("ai_engine")
    if ai_engine is not None:
        # pyre-ignore[16]
        ai_engine.set_app_state(app_state)
    
    # Wire the emulation engine
    # pyre-ignore[16]
    app_state["emulation_engine"].app_state = app_state
    
    # Wire the extreme orchestrator
    # pyre-ignore[16]
    app_state["extreme_orchestrator"].app_state = app_state

    # Initialize and start v3 Async Worker
    ml_worker = MLWorker(app_state)
    await ml_worker.start()
    app_state["ml_worker"] = ml_worker

    # Start independent async stream tasks (NOT a single bottleneck loop)
    tasks = [
        asyncio.create_task(_stream_telemetry_and_stats()),
        asyncio.create_task(_stream_threats_and_insights()),
        asyncio.create_task(_stream_fleet_and_identity()),
        asyncio.create_task(_stream_graph_and_risk()),
        asyncio.create_task(_stream_simulation()),
    ]
    
    # Start Location monitoring (already has its own 120s loop)
    await location_engine.start()

    print("[AegisAI] [OK] System online. Real-time WebSocket streaming active.")
    print("[AegisAI] API docs: http://localhost:8000/docs")

    yield

    # Cleanup
    for task in tasks:
        task.cancel()
    print("[AegisAI] System shutting down.")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AegisAI — Autonomous AI Cyber Defense System",
    description="AI-powered cybersecurity monitoring and response platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth registration removed for direct access
app.include_router(router)
app.include_router(settings_router)


@app.get("/")
async def root():
    return {
        "name": "AegisAI",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    # pyre-ignore[21]
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
