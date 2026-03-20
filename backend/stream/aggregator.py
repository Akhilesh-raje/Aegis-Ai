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
                continue  # Skip events with no identifiable source
            # Ensure source_ip key exists for downstream processing
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

        # Helper to get value from top-level or 'data' sub-dict (AegisEvent compatibility)
        def gf(ev, key, default=0):
            res = ev.get(key)
            if res is None:
                res = ev.get("data", {}).get(key, default)
            return res

        # Login metrics
        login_events = [e for e in events if gf(e, "event_type", "") == "login_attempt"]
        login_count = len(login_events)
        failed_logins = sum(1 for e in login_events if not gf(e, "success", True))
        failed_login_ratio = failed_logins / login_count if login_count > 0 else 0.0

        # Port metrics
        unique_ports = len(set(gf(e, "port", 0) for e in events))

        # Payload metrics
        payloads = [gf(e, "payload_size", 0) for e in events]
        avg_payload = sum(payloads) / len(payloads) if payloads else 0.0

        # Connection frequency (events per second in this window)
        connection_frequency = total / self.window_seconds

        # User diversity (credential stuffing indicator)
        unique_users = len(set(gf(e, "user", "unknown") for e in events))

        # Session variation (coefficient of variation of payload sizes — low = automated)
        if len(payloads) > 1:
            mean_p = avg_payload
            variance = sum((p - mean_p) ** 2 for p in payloads) / len(payloads)
            session_variation = variance ** 0.5 / (mean_p + 1)
        else:
            session_variation = 0.0

        # Time-based feature
        try:
            raw_ts = gf(events[0], "timestamp", datetime.now(timezone.utc).isoformat())
            if isinstance(raw_ts, (int, float)):
                ts = datetime.fromtimestamp(raw_ts, tz=timezone.utc)
            else:
                ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            hour_of_day = ts.hour
        except Exception:
            hour_of_day = 12

        # Geo anomaly flag
        suspicious_geos = {"Moscow, RU", "Pyongyang, KP", "Unknown", "Tor Exit Node", "Lagos, NG"}
        geo_locations = set(gf(e, "geo", "") for e in events)
        geo_anomaly = 1 if geo_locations & suspicious_geos else 0

        return {
            "window_start": gf(events[0], "timestamp", datetime.now(timezone.utc).isoformat()) if isinstance(gf(events[0], "timestamp"), str) else datetime.now(timezone.utc).isoformat(),
            "source_ip": source_ip,
            "event_count": total,
            "primary_user": max(
                set(gf(e, "user", "unknown") for e in events),
                key=lambda u: sum(1 for e in events if gf(e, "user", "unknown") == u),
            ),
            "primary_geo": next(iter(geo_locations)) if geo_locations else "Unknown",
            "agent_id": gf(events[0], "agent_id", "local-node"),
            "is_simulation": any(gf(e, "is_simulation", False) for e in events),
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
