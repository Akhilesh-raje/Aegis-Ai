"""
AegisAI v4 — Asynchronous ML Analysis Worker
Offloads heavy ML inference (Deep Path) from the primary telemetry loop.
Integrates SOAR v2 Policy Engine for autonomous defense.
"""

import asyncio
import uuid
import time
from typing import Dict, Any, List, cast
from backend.engine.normalization import AegisEvent
from backend.engine.stream_manager import ws_manager
from backend.engine.threat_intel import generate_explanation  # type: ignore

class MLWorker:
    def __init__(self, app_state: Dict[str, Any]):
        self.queue = asyncio.Queue()
        self.app_state = app_state
        self._running = False

    async def start(self):
        """Start the background consumer task."""
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._process_queue())
        print("[AegisWorker] ML analysis worker started.")

    async def analyze_async(self, telemetry_windows: List[Dict[str, Any]], features: Any, scaled_features: Any, detection_results: List[Dict[str, Any]], asset_type: str = "Workstation"):
        """Submit a batch of telemetry windows for deep ML analysis with asset context."""
        await self.queue.put({
            "windows": telemetry_windows,
            "features": features,
            "scaled": scaled_features,
            "detections": detection_results,
            "asset_type": asset_type
        })

    async def _process_queue(self):
        """Infinite loop consuming the analysis queue."""
        while self._running:
            try:
                task = await self.queue.get()
                windows = cast(List[Dict[str, Any]], task["windows"])
                detections = cast(List[Dict[str, Any]], task["detections"])
                scaled = task["scaled"]
                asset_type = str(task.get("asset_type", "Workstation"))

                # Filter anomalies to process them in a batch if supported, or iterate as before but without the massive loop overhead
                anomalous_indices = [i for i, d in enumerate(detections) if d["is_anomaly"]]
                if not anomalous_indices:
                    self.queue.task_done()
                    continue

                # Batch classify
                import numpy as np
                anomalous_scaled = np.array([scaled[i] for i in anomalous_indices])
                classifications = self.app_state["classifier"].classify(anomalous_scaled)

                for idx, c_idx in enumerate(anomalous_indices):
                    window = windows[c_idx]
                    detection = detections[c_idx]
                    classification = classifications[idx]

                    # 2. Update Risk Score with Contextual Weight (v4)
                    new_score = self.app_state["risk_scorer"].update(
                        classification["threat_type"],
                        classification["confidence"],
                        detection["anomaly_score"],
                        asset_type=asset_type
                    )

                    # 3. Autonomous Response Evaluation (SOAR v2.5 with Dynamic Risk)
                    policy_result = self.app_state["policy_engine"].evaluate(
                        classification, 
                        asset_type,
                        system_risk=self.app_state["risk_scorer"].get_score()
                    )

                    # 4. Logic Enrichment (LLM-lite)
                    explanation = generate_explanation(
                        threat_type=classification["threat_type"],
                        confidence=classification["confidence"],
                        features=window.get("features", {}),
                        anomaly_score=detection["anomaly_score"],
                    )

                    # 5. Persistence
                    threat_id = str(uuid.uuid4())
                    threat_record = {
                        "id": threat_id,
                        "timestamp": window["window_start"],
                        "threat_type": classification["threat_type"],
                        "severity": explanation["severity"],
                        "confidence": classification["confidence"],
                        "source_ip": window["source_ip"],
                        "explanation": explanation["title"],
                        "recommendation": explanation["recommendation"],
                        "asset_context": asset_type,
                        "policy_verdict": policy_result["mode"],
                        "is_simulation": window.get("is_simulation", False),
                        "status": "active"
                    }
                    
                    # 6. Trigger Autonomous Action if Approved
                    if policy_result["approved"]:
                        action_result = self.app_state["response_engine"].execute_action(
                            policy_result["action"],
                            window["source_ip"],
                            threat_id
                        )
                        threat_record["autonomous_action"] = action_result
                    
                    self.app_state["db"].insert_threat(threat_record)

                    # 7. Push "Late Intelligence" to Stream (Array format for frontend sync)
                    latest_threats = self.app_state["db"].get_threats(limit=5)
                    await ws_manager.broadcast_channel("THREATS", latest_threats, force=True)

                self.queue.task_done()
                await asyncio.sleep(0.01)

            except Exception as e:
                print(f"[AegisWorker] Error in ML analysis: {e}")
                await asyncio.sleep(1)
