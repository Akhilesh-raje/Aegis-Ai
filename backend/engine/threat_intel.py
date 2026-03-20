"""
Threat Intelligence Engine
Generates human-readable explanations for detected threats.
Includes MITRE ATT&CK Framework mapping.
"""

# Feature display names for human-readable output
FEATURE_LABELS = {
    "login_attempt_rate": "login attempts",
    "failed_login_ratio": "login failure rate",
    "unique_ports": "unique ports accessed",
    "connection_frequency": "connections per second",
    "avg_payload_size": "average payload size (bytes)",
    "unique_users": "unique user accounts",
    "session_variation": "session variation",
    "hour_of_day": "hour of activity",
    "geo_anomaly": "geographic anomaly",
}

# Baseline thresholds for comparison (typical normal values)
BASELINES = {
    "login_attempt_rate": 2,
    "failed_login_ratio": 0.1,
    "unique_ports": 3,
    "connection_frequency": 1.0,
    "avg_payload_size": 1024,
    "unique_users": 1,
    "session_variation": 0.5,
}

# MITRE ATT&CK Framework Mapping
MITRE_ATTACK = {
    "brute_force": {"id": "T1110", "name": "Brute Force", "tactic": "Credential Access"},
    "ddos": {"id": "T1498", "name": "Network Denial of Service", "tactic": "Impact"},
    "port_scan": {"id": "T1046", "name": "Network Service Discovery", "tactic": "Discovery"},
    "exfiltration": {"id": "T1041", "name": "Exfiltration Over C2 Channel", "tactic": "Exfiltration"},
    "insider_threat": {"id": "T1078", "name": "Valid Accounts", "tactic": "Persistence"},
    "unknown_anomaly": {"id": "TA0001", "name": "Behavioral Deviation", "tactic": "Heuristic"},
}

# Threat descriptions — enterprise nomenclature
THREAT_DESCRIPTIONS = {
    "brute_force": "Credential Stuffing / Brute Force Attack",
    "ddos": "Distributed Denial of Service Attack",
    "port_scan": "Network Reconnaissance — Port Enumeration",
    "exfiltration": "Data Exfiltration via Encrypted Channel",
    "insider_threat": "Insider Threat — Privilege Abuse",
    "unknown_anomaly": "Zero-Day / Novel Behavioral Deviation",
}

# Severity mapping
SEVERITY_MAP = {
    "brute_force": "high",
    "ddos": "critical",
    "port_scan": "medium",
    "exfiltration": "critical",
    "insider_threat": "high",
    "unknown_anomaly": "medium",
}


def generate_explanation(
    threat_type: str,
    confidence: float,
    features: dict,
    anomaly_score: float,
) -> dict:
    """
    Generate a human-readable threat intelligence report.

    Args:
        threat_type: classified attack type
        confidence: classification confidence (0-100)
        features: the raw feature values from aggregation
        anomaly_score: Isolation Forest anomaly score

    Returns:
        dict with title, severity, confidence, indicators, and recommendation
    """
    title = THREAT_DESCRIPTIONS.get(threat_type, "Unknown Threat")
    severity = SEVERITY_MAP.get(threat_type, "medium")

    # Build indicators — highlight features that deviate from baseline
    indicators = []

    login_rate = features.get("login_attempt_rate", 0)
    if login_rate > BASELINES["login_attempt_rate"]:
        indicators.append(
            f"{login_rate} login attempts detected (baseline: {BASELINES['login_attempt_rate']} per window)"
        )

    fail_ratio = features.get("failed_login_ratio", 0)
    if fail_ratio > BASELINES["failed_login_ratio"]:
        indicators.append(
            f"{fail_ratio * 100:.0f}% login failure rate (baseline: {BASELINES['failed_login_ratio'] * 100:.0f}%)"
        )

    ports = features.get("unique_ports", 0)
    if ports > BASELINES["unique_ports"] * 3:
        indicators.append(
            f"{ports} unique ports accessed (baseline: {BASELINES['unique_ports']})"
        )

    conn_freq = features.get("connection_frequency", 0)
    if conn_freq > BASELINES["connection_frequency"] * 3:
        indicators.append(
            f"{conn_freq:.1f} connections/sec (baseline: {BASELINES['connection_frequency']:.1f})"
        )

    payload = features.get("avg_payload_size", 0)
    if payload > BASELINES["avg_payload_size"] * 10:
        indicators.append(
            f"Average payload {payload:.0f} bytes — abnormally large data transfer"
        )

    if features.get("geo_anomaly", 0) == 1:
        indicators.append("Activity from suspicious geographic location")

    hour = features.get("hour_of_day", 12)
    if hour < 6 or hour > 22:
        indicators.append(f"Activity at unusual hour ({hour}:00) — outside normal business window")

    session_var = features.get("session_variation", 0)
    if session_var < 0.05 and conn_freq > 2:
        indicators.append("Extremely uniform request pattern — likely automated/bot traffic")

    # Fallback if no specific indicators
    if not indicators:
        indicators.append("Behavioral pattern significantly deviates from established baseline")

    mitre = MITRE_ATTACK.get(threat_type, MITRE_ATTACK["unknown_anomaly"])

    return {
        "title": title,
        "threat_type": threat_type,
        "severity": severity,
        "confidence": float(f"{confidence:.1f}"),
        "anomaly_score": float(f"{anomaly_score:.4f}"),
        "indicators": indicators,
        "recommendation": _get_recommendation(threat_type),
        "mitre_id": mitre["id"],
        "mitre_name": mitre["name"],
        "mitre_tactic": mitre["tactic"],
    }


def _get_recommendation(threat_type: str) -> str:
    """Return a recommended action based on threat type."""
    recs = {
        "brute_force": "Block source IP and enforce account lockout policy. Review credential rotation.",
        "ddos": "Enable rate limiting and activate DDoS mitigation. Engage upstream scrubbing.",
        "port_scan": "Monitor source IP for follow-up exploitation. Consider firewall rule.",
        "exfiltration": "Isolate affected system immediately. Audit data access and file integrity.",
        "insider_threat": "Lock user account. Escalate to SOC for forensic investigation.",
        "unknown_anomaly": "Heuristic deviation flagged — escalate for manual analyst review.",
    }
    return recs.get(threat_type, "Escalate to security operations center for manual review.")
