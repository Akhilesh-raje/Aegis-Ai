"""
Streaming Aggregation Engine
Groups raw events into 5-second time windows and computes behavioral metrics per source IP.
"""

from collections import defaultdict
from datetime import datetime, timezone


class AggregationEngine:
    """Aggregates raw events into behavioral feature windows."""

    def __init__(self, window_seconds: int = 5):
        self.window_seconds = window_seconds

    def aggregate(self, events: list[dict]) -> list[dict]:
        """
        Take a list of raw events and return aggregated feature windows
        grouped by source_ip.
        """
        if not events:
            return []

        # Group events by source IP (support both raw events and normalized AegisEvent dicts)
        ip_groups: dict[str, list[dict]] = defaultdict(list)
        for event in events:
            ip = event.get("source_ip") or event.get("source_node", "unknown")
            if not ip or ip == "unknown":
                continue
            event["source_ip"] = ip
            ip_groups[ip].append(event)

        windows = []
        for ip, ip_events in ip_groups.items():
            window = self._compute_window(ip, ip_events)
            windows.append(window)

        return windows

    def _compute_window(self, source_ip: str, events: list[dict]) -> dict:
        """Compute behavioral metrics for a single IP's activity window."""
        total = len(events)
        if total == 0:
            return self._empty_window(source_ip)

        # Login metrics
        login_events = [e for e in events if e.get("event_type") == "login_attempt"]
        login_count = len(login_events)
        failed_logins = sum(1 for e in login_events if not e.get("success", False))
        failed_login_ratio = failed_logins / login_count if login_count > 0 else 0.0

        # Port metrics
        unique_ports = len(set(e.get("port", 0) for e in events))

        # Payload metrics
        payloads = [e.get("payload_size", 0) for e in events]
        avg_payload = sum(payloads) / len(payloads) if payloads else 0.0

        # Connection frequency
        connection_frequency = total / self.window_seconds

        # User diversity (credential stuffing indicator)
        unique_users = len(set(e.get("user", "unknown") for e in events))

        # Session variation (std dev of payload sizes — low variation = automated)
        if len(payloads) > 1:
            mean_p = avg_payload
            variance = sum((p - mean_p) ** 2 for p in payloads) / len(payloads)
            session_variation = variance ** 0.5 / (mean_p + 1)  # coefficient of variation
        else:
            session_variation = 0.0

        # Time-based feature
        try:
            ts = datetime.fromisoformat(events[0]["timestamp"].replace("Z", "+00:00"))
            hour_of_day = ts.hour
        except Exception:
            hour_of_day = 12

        # Geo anomaly: any suspicious geo location?
        suspicious_geos = {"Moscow, RU", "Pyongyang, KP", "Unknown", "Tor Exit Node", "Lagos, NG"}
        geo_locations = set(e.get("geo", "") for e in events)
        geo_anomaly = 1 if geo_locations & suspicious_geos else 0

        return {
            "window_start": events[0].get("timestamp", datetime.now(timezone.utc).isoformat()),
            "source_ip": source_ip,
            "event_count": total,
            "primary_user": max(set(e.get("user", "unknown") for e in events), key=lambda u: sum(1 for e in events if e.get("user", "unknown") == u)) if events else "unknown",
            "primary_geo": next(iter(geo_locations)) if geo_locations else "unknown",
            "features": {
                "login_attempt_rate": login_count,
                "failed_login_ratio": float(f"{failed_login_ratio:.4f}"),
                "unique_ports": unique_ports,
                "connection_frequency": float(f"{connection_frequency:.4f}"),
                "avg_payload_size": float(f"{avg_payload:.2f}"),
                "unique_users": unique_users,
                "session_variation": float(f"{session_variation:.4f}"),
                "hour_of_day": hour_of_day,
                "geo_anomaly": geo_anomaly,
            },
        }

    def _empty_window(self, source_ip: str) -> dict:
        return {
            "window_start": datetime.now(timezone.utc).isoformat(),
            "source_ip": source_ip,
            "event_count": 0,
            "primary_user": "unknown",
            "primary_geo": "unknown",
            "features": {
                "login_attempt_rate": 0,
                "failed_login_ratio": 0.0,
                "unique_ports": 0,
                "connection_frequency": 0.0,
                "avg_payload_size": 0.0,
                "unique_users": 0,
                "session_variation": 0.0,
                "hour_of_day": 12,
                "geo_anomaly": 0,
            },
        }
