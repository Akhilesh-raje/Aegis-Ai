"""
Pydantic schemas for AegisAI API.
Defines request/response models for all endpoints.
"""

from pydantic import BaseModel
from typing import Optional


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class AttackSimulationRequest(BaseModel):
    attack_type: str  # "brute_force" | "ddos" | "port_scan" | "exfiltration"
    intensity: Optional[int] = None  # optional event count override


class ResponseActionRequest(BaseModel):
    threat_id: str
    action: str  # "block_ip" | "lock_account" | "isolate_service" | "alert_admin" | "rate_limit"
    target: Optional[str] = None  # IP or username, auto-resolved from threat if not provided


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class StatsResponse(BaseModel):
    total_events: int
    threats_detected: int
    active_threats: int
    mitigated_threats: int
    risk_level: str
    risk_score: float
    uptime_seconds: float
    event_rate: float  # events/sec


class ThreatResponse(BaseModel):
    id: str
    timestamp: str
    threat_type: str
    severity: str
    confidence: float
    source_ip: str
    target_user: str
    geo: str
    anomaly_score: float
    explanation: str
    indicators: list[str]
    recommendation: str
    status: str
    response_action: Optional[str] = None


class AttackSimulationResponse(BaseModel):
    status: str
    attack_type: str
    events_generated: int
    threats_detected: int
    message: str


class ResponseActionResponse(BaseModel):
    action: str
    target: str
    threat_id: str
    status: str
    detail: str


class ModelInfoResponse(BaseModel):
    detector: dict
    classifier: dict
    features_used: list[str]


class RiskHistoryEntry(BaseModel):
    timestamp: str
    score: float
    level: str
