"""
FastAPI Routes for AegisAI
All REST API endpoints for the dashboard.
"""

import uuid
import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends # type: ignore
from fastapi.responses import HTMLResponse # type: ignore

from backend.api.schemas import ( # type: ignore
    AttackSimulationRequest,
    AttackSimulationResponse,
    ResponseActionRequest,
    ResponseActionResponse,
    StatsResponse,
    ThreatResponse,
    ModelInfoResponse,
)

router = APIRouter(prefix="/api")

from backend.engine.fleet_manager import fleet_manager # type: ignore
from backend.engine.identity_engine import identity_engine # type: ignore
from backend.engine.graph_engine import graph_engine # type: ignore
from backend.engine.webhook_engine import webhook_engine # type: ignore
# from fastapi import Depends  # Moved to top
# Authentication layer neutralised for direct analyst access.

# Endpoints /fleet, /identity, /graph retired in favor of WebSocket channels.


# ---------------------------------------------------------------------------
# These will be injected by main.py at startup
# ---------------------------------------------------------------------------
_app_state: dict[str, Any] = {}


def init_routes(app_state: dict[str, Any]):
    """Receive references to shared app state (models, engines, db)."""
    global _app_state
    _app_state = app_state


def _state(key: str) -> Any:
    val = _app_state.get(key)
    if val is None:
        raise HTTPException(status_code=503, detail=f"System component {key} not initialized")
    return val


# ---------------------------------------------------------------------------
# GET /api/stats
# ---------------------------------------------------------------------------
# Endpoints /stats, /telemetry, /security-insights retired in favor of WebSocket channels.


# ---------------------------------------------------------------------------
# GET /api/threats
# ---------------------------------------------------------------------------
# Endpoint /threats retired in favor of WebSocket channel.


# ---------------------------------------------------------------------------
# WebSocket /ws — Real-time streaming (replaces SSE)
# ---------------------------------------------------------------------------
from backend.engine.stream_manager import ws_manager  # type: ignore

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Single persistent WebSocket connection for all real-time channel data."""
    await ws_manager.connect(websocket)
    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                msg = json.loads(raw_msg)
                channel = msg.get("channel")
                
                # Handle incoming chat messages
                if channel == "AI_CHAT":
                    query = msg.get("query", "")
                    session_id = msg.get("session_id", str(uuid.uuid4()))
                    # pyre-ignore[16]
                    ai_engine = _app_state.get("ai_engine")
                    if ai_engine and query:
                        # Spawn background task to stream response tokens
                        asyncio.create_task(
                            ai_engine.stream_chat_ws(query, session_id, websocket)
                        )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# GET /api/threats/latest
# ---------------------------------------------------------------------------
@router.get("/threats/latest")
async def get_latest_threats(limit: int = 10) -> list[dict]:
    db = _state("db")
    return db.get_threats(limit=limit)


# ---------------------------------------------------------------------------
# GET /api/system/location
# ---------------------------------------------------------------------------
# Endpoint /system/location retired in favor of WebSocket channel.


# ---------------------------------------------------------------------------
# GET /api/threats/{threat_id}
# ---------------------------------------------------------------------------
@router.get("/threats/{threat_id}")
async def get_threat_detail(threat_id: str) -> dict:
    db = _state("db")
    threat = db.get_threat_by_id(threat_id)
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    # Attach recommended actions
    response_engine = _state("response_engine")
    threat["recommended_actions"] = response_engine.get_recommended_actions(
        threat["threat_type"], threat["source_ip"]
    )
    return threat


# ---------------------------------------------------------------------------
# POST /api/simulate-attack
# ---------------------------------------------------------------------------
@router.post("/simulate-attack")
async def simulate_attack(req: AttackSimulationRequest) -> AttackSimulationResponse:
    from backend.simulator.log_generator import ATTACK_GENERATORS # type: ignore

    if req.attack_type not in ATTACK_GENERATORS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown attack type. Available: {list(ATTACK_GENERATORS.keys())}",
        )

    generator = ATTACK_GENERATORS[req.attack_type]
    count = req.intensity or None
    events = generator(count) if count else generator()

    # Process through the pipeline
    aggregator = _state("aggregator")
    preprocessor = _state("preprocessor")
    detector = _state("detector")
    classifier = _state("classifier")
    risk_scorer = _state("risk_scorer")
    db = _state("db")

    windows = aggregator.aggregate(events)
    features = preprocessor.extract_features(windows)
    scaled = preprocessor.transform(features)

    detections = detector.detect(scaled)
    classifications = classifier.classify(scaled)

    detections_indices: list[int] = []
    for i, detection in enumerate(detections):
        if detection["is_anomaly"]:
            detections_indices.append(i)
    
    threat_count = len(detections_indices)

    for i in detections_indices:
        window = windows[i]
        classification = classifications[i]
        detection = detections[i]
        
        # Generate explanation
        from backend.engine.threat_intel import generate_explanation # type: ignore
        explanation = generate_explanation(
            threat_type=classification["threat_type"],
            confidence=classification["confidence"],
            features=window["features"],
            anomaly_score=detection["anomaly_score"],
        )

        threat_id = str(uuid.uuid4())
        threat_record = {
            "id": threat_id,
            "timestamp": window["window_start"],
            "threat_type": classification["threat_type"],
            "severity": explanation["severity"],
            "confidence": classification["confidence"],
            "source_ip": window["source_ip"],
            "target_user": window.get("primary_user", ""),
            "geo": window.get("primary_geo", ""),
            "anomaly_score": detection["anomaly_score"],
            "explanation": explanation["title"],
            "indicators": explanation["indicators"],
            "recommendation": explanation["recommendation"],
            "features": window.get("features", {}),
            "probabilities": classification.get("probabilities", {}),
            "mitre_id": explanation.get("mitre_id", ""),
            "mitre_name": explanation.get("mitre_name", ""),
            "mitre_tactic": explanation.get("mitre_tactic", ""),
            "status": "active",
        }
        db.insert_threat(threat_record)

        # Update risk score
        risk_scorer.update(
            classification["threat_type"],
            classification["confidence"],
            detection["anomaly_score"],
        )

        # Auto-mitigation and Webhooks for CRITICAL severity threats
        response_engine = _state("response_engine")
        if explanation["severity"] == "critical":
            src_ip = window["source_ip"]
            webhook_engine.dispatch_alert(threat_record)
            result = response_engine.execute_action("block_ip", src_ip, threat_id)
            if result["status"] == "executed":
                db.update_threat_status(threat_id, "mitigated", "block_ip")
                risk_scorer.reduce(10.0)

    # Record risk snapshot
    db.insert_risk_score(risk_scorer.get_score(), risk_scorer.get_level())
    _app_state["event_count"] = _app_state.get("event_count", 0) + len(events)

    return AttackSimulationResponse(
        status="completed",
        attack_type=req.attack_type,
        events_generated=len(events),
        threats_detected=threat_count,
        message=f"Simulated {req.attack_type} attack: {len(events)} events generated, {threat_count} threats detected.",
    )

# ---------------------------------------------------------------------------
# POST /api/ingest-raw
# ---------------------------------------------------------------------------
@router.post("/ingest-raw")
async def ingest_raw_events(req: list[dict]):
    """Extreme Ingestion Endpoint for signed raw events."""
    sim_events = _state("simulation_events")
    # Add to the global simulation_events queue for processing in the main loop
    sim_events.extend(req)
    return {"status": "ingested", "count": len(req)}

# ---------------------------------------------------------------------------
# Phase 8.7: Stateful Simulation API
# ---------------------------------------------------------------------------
@router.post("/simulate-stateful")
async def start_stateful_simulation(req: dict):
    """Start a multi-stage MITRE attack emulation."""
    scenario = req.get("scenario")
    if not scenario:
        raise HTTPException(status_code=400, detail="Scenario is required")
    
    emulation_engine = _state("emulation_engine")
    sim_id = await emulation_engine.start_simulation(scenario)
    
    if sim_id.startswith("SIM_"):
        return {"status": "started", "simulation_id": sim_id, "scenario": scenario}
    else:
        raise HTTPException(status_code=400, detail=sim_id)

@router.get("/simulate/status")
async def get_simulation_status():
    """Get status of all active and recent simulations."""
    emulation_engine = _state("emulation_engine")
    return emulation_engine.active_simulations

# ---------------------------------------------------------------------------
# POST /api/extreme-tests/run
# ---------------------------------------------------------------------------
@router.post("/extreme-tests/run")
async def run_extreme_tests():
    """Trigger the 9-phase extreme testing suite."""
    orchestrator = _state("extreme_orchestrator")
    if orchestrator.is_running:
        return {"status": "already_running"}
    
    asyncio.create_task(orchestrator.run_suite())
    return {"status": "started"}

# ---------------------------------------------------------------------------
# POST /api/respond
# ---------------------------------------------------------------------------
@router.post("/respond")
async def execute_response(
    req: ResponseActionRequest
) -> ResponseActionResponse:
    db = _state("db")
    response_engine = _state("response_engine")
    risk_scorer = _state("risk_scorer")

    # Resolve target if not provided
    target = req.target
    if not target:
        threat = db.get_threat_by_id(req.threat_id)
        if not threat:
            raise HTTPException(status_code=404, detail="Threat not found")
        target = threat["source_ip"]

    result = response_engine.execute_action(req.action, target, req.threat_id)

    # If action was executed, update threat status and reduce risk
    if result["status"] == "executed":
        db.update_threat_status(req.threat_id, "mitigated", req.action)
        risk_scorer.reduce(15.0)
        db.insert_risk_score(risk_scorer.get_score(), risk_scorer.get_level())
        
        # Log to audit log
        db.log_audit_action(
            user_id="system_admin",
            action=req.action,
            target=target,
            details=f"Threat ID: {req.threat_id}"
        )

    return ResponseActionResponse(
        action=req.action,
        target=target,
        threat_id=req.threat_id,
        status=result["status"],
        detail=result.get("detail", result.get("reason", "")),
    )


# ---------------------------------------------------------------------------
# GET /api/risk/history
# ---------------------------------------------------------------------------
# Endpoint /risk/history retired in favor of WebSocket channel.


# ---------------------------------------------------------------------------
# GET /api/model/info
# ---------------------------------------------------------------------------
@router.get("/model/info")
async def get_model_info() -> ModelInfoResponse:
    detector = _state("detector")
    classifier = _state("classifier")
    preprocessor = _state("preprocessor")

    return ModelInfoResponse(
        detector=detector.model_info,
        classifier=classifier.model_info,
        features_used=preprocessor.feature_names,
    )


# ---------------------------------------------------------------------------
# POST /api/chat — AI-Powered Chat (non-streaming)
# ---------------------------------------------------------------------------
@router.post("/chat")
async def chat_assistant(req: dict) -> dict:
    """AI-powered chat with full system context. Uses Ollama if available, falls back to rule engine."""
    query = req.get("query", "").strip()
    session_id = req.get("session_id", str(uuid.uuid4()))
    
    if not query:
        return {"response": "Please provide a query.", "mode": "error"}

    ai_engine = _app_state.get("ai_engine")
    if not ai_engine:
        # Absolute fallback if AI engine isn't initialized
        return {
            "response": "AI engine is initializing. Please try again in a moment.",
            "mode": "initializing"
        }

    try:
        response = await ai_engine.chat(query, session_id)
        is_llm = await ai_engine.check_ollama()
        return {
            "response": response,
            "mode": "ai" if is_llm else "fallback",
            "model": ai_engine.model if is_llm else "rule-engine",
            "session_id": session_id
        }
    except Exception as e:
        print(f"[AegisAI Chat] Error: {e}")
        return {"response": f"Error: {e}", "mode": "error", "session_id": session_id}


# ---------------------------------------------------------------------------
# (SSE endpoint /api/ai/chat/stream removed in favor of /ws unified protocol)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# GET /api/ai/status — AI Engine Health Check
# ---------------------------------------------------------------------------
@router.get("/ai/status")
async def ai_status():
    """Returns AI engine connectivity status, model info, and memory statistics."""
    ai_engine = _app_state.get("ai_engine")
    if not ai_engine:
        return {
            "engine": "AegisAI Brain",
            "status": "initializing",
            "llm": {"connected": False, "status": "not_initialized"},
            "mode": "offline"
        }

    return await ai_engine.get_status()


# ---------------------------------------------------------------------------
# POST /api/ai/analyze — Deep Event Analysis
# ---------------------------------------------------------------------------
@router.post("/ai/analyze")
async def ai_analyze_event(req: dict) -> dict:
    """Deep AI analysis of a specific threat event with RAG context."""
    threat_id = req.get("threat_id", "")
    if not threat_id:
        raise HTTPException(status_code=400, detail="threat_id is required")

    db = _state("db")
    threat = db.get_threat_by_id(threat_id)
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")

    ai_engine = _app_state.get("ai_engine")
    if not ai_engine:
        raise HTTPException(status_code=503, detail="AI engine not initialized")

    analysis = await ai_engine.analyze_event(threat)
    is_llm = await ai_engine.check_ollama()
    
    return {
        "analysis": analysis,
        "threat_id": threat_id,
        "mode": "ai" if is_llm else "fallback",
    }


# ---------------------------------------------------------------------------
# GET /api/report/generate/{threat_id}
# ---------------------------------------------------------------------------
@router.get("/report/generate/{threat_id}", response_class=HTMLResponse)
async def generate_threat_report(threat_id: str):
    db = _state("db")
    threat = db.get_threat_by_id(threat_id)
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AegisAI Executive Threat Report - {threat_id}</title>
        <style>
            body {{ font-family: 'Courier New', Courier, monospace; margin: 40px; color: #333; line-height: 1.6; }}
            .header {{ border-bottom: 2px solid #00E5FF; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: end; }}
            .title {{ font-size: 24px; font-weight: bold; margin: 0; }}
            .meta {{ font-size: 12px; color: #666; }}
            .severity {{ padding: 5px 10px; color: white; border-radius: 4px; font-weight: bold; text-transform: uppercase; }}
            .critical {{ background: #ef4444; }} .high {{ background: #f97316; }} .medium {{ background: #eab308; }} .low {{ background: #3b82f6; }}
            .section-title {{ font-size: 16px; font-weight: bold; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #111; }}
            .data-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }}
            .data-item label {{ font-size: 10px; text-transform: uppercase; color: #888; display: block; }}
            .data-item div {{ font-size: 14px; font-weight: bold; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }}
            th, td {{ border: 1px solid #ccc; padding: 10px; text-align: left; }}
            th {{ background: #f4f4f4; text-transform: uppercase; font-size: 10px; color: #555; }}
            .footer {{ margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1 class="title">Incident Briefing: {threat.get('explanation', threat.get('threat_type'))}</h1>
                <div class="meta">Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
            </div>
            <div class="severity {threat.get('severity', 'low')}">{threat.get('severity', 'UNKNOWN')} SEVERITY</div>
        </div>
        
        <div class="data-grid">
            <div class="data-item"><label>Threat ID</label><div>{threat.get('id')}</div></div>
            <div class="data-item"><label>Detection Time</label><div>{threat.get('timestamp')}</div></div>
            <div class="data-item"><label>Source Vector (IP)</label><div>{threat.get('source_ip')}</div></div>
            <div class="data-item"><label>Geo Location</label><div>{threat.get('geo', 'Unknown')}</div></div>
            <div class="data-item"><label>Target Identity</label><div>{threat.get('target_user', 'UNBOUND')}</div></div>
            <div class="data-item"><label>Status</label><div style="text-transform: uppercase">{threat.get('status', 'active')}</div></div>
        </div>

        <div class="section-title">MITRE ATT&CK Mapping</div>
        <table>
            <tr><th>Tactic</th><th>Technique</th><th>Identifier</th></tr>
            <tr>
                <td>{threat.get('mitre_tactic', 'N/A')}</td>
                <td>{threat.get('mitre_name', 'N/A')}</td>
                <td>{threat.get('mitre_id', 'N/A')}</td>
            </tr>
        </table>
        
        <div class="section-title">AI Confidence Metrics</div>
        <div class="data-grid">
            <div class="data-item"><label>Classifier Confidence</label><div>{float(threat.get('confidence', 0)):.2f}%</div></div>
            <div class="data-item"><label>Anomaly Threshold Score</label><div>{float(threat.get('anomaly_score', 0)):.4f}</div></div>
        </div>

        <div class="section-title">Forensic Evidence Chain</div>
        <ul>
            {''.join(f'<li>{ind}</li>' for ind in threat.get('indicators', []))}
        </ul>

        <div class="section-title">Automated Playbook Recommendation</div>
        <p>{threat.get('recommendation', 'Isolate node and block perimeter access immediately.')}</p>

        <div class="footer">
            CONFIDENTIAL: AEGIS-XDR GENERATED REPORT | AUTHORIZED ANALYST ONLY<br>
            THIS DOCUMENT MAY CONTAIN RESTRICTED CISA/SOC INTELLIGENCE.
        </div>
        
        <script>
            window.onload = function() {{ window.print(); }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# ---------------------------------------------------------------------------
# POST /api/reset
# ---------------------------------------------------------------------------
@router.post("/reset")
async def reset_system():
    """Reset the system for a fresh demo."""
    db = _state("db")
    risk_scorer = _state("risk_scorer")
    response_engine = _state("response_engine")

    db.clear_all()
    risk_scorer.reset()
    response_engine.blocked_ips.clear()
    response_engine.locked_accounts.clear()
    response_engine.action_log.clear()
    _app_state["event_count"] = 0

    return {"status": "reset", "message": "System has been reset to initial state."}


# ---------------------------------------------------------------------------
# WAR ROOM — Extreme Testing Suite
# ---------------------------------------------------------------------------

@router.post("/extreme-tests/run")
async def run_extreme_tests():
    """Trigger the 9-phase extreme testing suite (War Mode)."""
    orchestrator = _app_state.get("extreme_orchestrator")
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Extreme orchestrator not initialized")
    if orchestrator.is_running:
        return {"status": "already_running", "message": "War Mode is already active."}
    
    # Wire the live app state into the orchestrator
    orchestrator.app_state = _app_state
    
    # Run in background so the API responds immediately
    asyncio.create_task(orchestrator.run_suite())
    return {"status": "started", "message": "War Mode initiated. Monitor via WebSocket channels."}
