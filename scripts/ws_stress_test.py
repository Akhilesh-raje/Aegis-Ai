"""
AegisAI — Ultimate WebSocket Stress & Integrity Test Suite v2.0
================================================================
Tests EVERY aspect of the WebSocket streaming architecture:

  1. CONNECTION RESILIENCE   - Connect/disconnect/reconnect cycles
  2. MULTI-CLIENT SCALING    - Concurrent client connections
  3. CHANNEL COMPLETENESS    - Verifies all 10 channels deliver data
  4. DEEP SCHEMA VALIDATION  - Field-level payload integrity per channel
  5. DELTA COMPRESSION AUDIT - Detects how often identical data is suppressed
  6. LATENCY PROFILING       - Per-channel inter-message timing + histograms
  7. THROUGHPUT BENCHMARKS   - Bytes/sec, messages/sec, per-channel bandwidth
  8. DATA FRESHNESS          - Verifies data changes over time (not stale)
  9. PAYLOAD SIZE ANALYSIS   - Min/Max/Avg payload size per channel
 10. FINAL REPORT CARD       - Letter-graded scorecard

Usage:
  python ws_stress_test.py                    # Full 60-second suite
  python ws_stress_test.py --duration 30      # Custom duration
  python ws_stress_test.py --clients 5        # Multi-client stress test
  python ws_stress_test.py --quick            # Quick 15-second smoke test
"""

import asyncio
import websockets  # type: ignore
import json
import time
import sys
import hashlib
import argparse
import math
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, cast, List

# ============================================================================
# TERMINAL STYLING
# ============================================================================
class C:
    RST   = '\033[0m'
    BOLD  = '\033[1m'
    DIM   = '\033[2m'
    UL    = '\033[4m'
    RED   = '\033[91m'
    GRN   = '\033[92m'
    YEL   = '\033[93m'
    BLU   = '\033[94m'
    MAG   = '\033[95m'
    CYN   = '\033[96m'
    WHT   = '\033[97m'
    BG_RED = '\033[41m'
    BG_GRN = '\033[42m'
    BG_BLU = '\033[44m'

def banner(text: str, color: str = C.CYN):
    w = 88
    print(f"\n{color}{C.BOLD}{'═' * w}")
    print(f"  {text}")
    print(f"{'═' * w}{C.RST}\n")

def section(text: str):
    print(f"\n{C.BLU}{C.BOLD}── {text} ──{C.RST}")

def ok(msg: str):    print(f"  {C.GRN}✓{C.RST} {msg}")
def warn(msg: str):  print(f"  {C.YEL}⚠{C.RST} {msg}")
def fail(msg: str):  print(f"  {C.RED}✗{C.RST} {msg}")
def info(msg: str):  print(f"  {C.DIM}•{C.RST} {msg}")

# ============================================================================
# EXPECTED CHANNELS + BROADCAST INTERVALS
# ============================================================================
ALL_CHANNELS: dict[str, dict[str, Any]] = {
    "TELEMETRY":    {"interval": 3,  "type": "dict",  "priority": "HIGH"},
    "STATS":        {"interval": 3,  "type": "dict",  "priority": "HIGH"},
    "THREATS":      {"interval": 5,  "type": "list",  "priority": "HIGH"},
    "INSIGHTS":     {"interval": 5,  "type": "dict",  "priority": "MEDIUM"},
    "SIMULATION":   {"interval": 5,  "type": "dict",  "priority": "MEDIUM"},
    "FLEET":        {"interval": 10, "type": "dict",  "priority": "LOW"},
    "IDENTITY":     {"interval": 10, "type": "list",  "priority": "LOW"},
    "GRAPH":        {"interval": 15, "type": "dict",  "priority": "LOW"},
    "RISK_HISTORY": {"interval": 15, "type": "list",  "priority": "LOW"},
    "LOCATION":     {"interval": 120,"type": "dict",  "priority": "LOW"},
}

# ============================================================================
# DEEP SCHEMA VALIDATORS (field-level)
# ============================================================================
def _validate_telemetry(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, dict): return ["payload must be dict"]
    # System block
    sys = d.get("system")
    if not isinstance(sys, dict):
        errs.append("missing 'system' block")
    else:
        for k in ["cpu_usage", "ram_usage", "ram_total_gb", "ram_used_gb"]:
            if k not in sys: errs.append(f"system.{k} missing")
        if "cpu_usage" in sys and not isinstance(sys["cpu_usage"], (int, float)):
            errs.append("system.cpu_usage must be numeric")
    # Network block
    net = d.get("network_io")
    if not isinstance(net, dict):
        errs.append("missing 'network_io' block")
    else:
        for k in ["download_mbps", "upload_mbps"]:
            if k not in net: errs.append(f"network_io.{k} missing")
    # Context block
    ctx = d.get("context")
    if not isinstance(ctx, dict):
        errs.append("missing 'context' block")
    else:
        for k in ["public_ip", "isp"]:
            if k not in ctx: errs.append(f"context.{k} missing")
    # OS Logs
    logs = d.get("os_logs")
    if logs is not None and not isinstance(logs, list):
        errs.append("os_logs must be a list if present")
    return errs

def _validate_stats(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, dict): return ["payload must be dict"]
    required = ["total_events", "threats_detected", "active_threats", "mitigated_threats",
                 "risk_level", "risk_score", "uptime_seconds", "event_rate"]
    for k in required:
        if k not in d: errs.append(f"missing '{k}'")
    if "risk_level" in d and d["risk_level"] not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        errs.append(f"risk_level invalid: {d['risk_level']}")
    if "risk_score" in d and not isinstance(d["risk_score"], (int, float)):
        errs.append("risk_score must be numeric")
    return errs

def _validate_threats(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, list): return ["payload must be list"]
    # pyre-ignore[6]
    for i, t in enumerate(d[:3]):  # validate first 3
        if not isinstance(t, dict):
            errs.append(f"threat[{i}] must be dict")
        else:
            for k in ["id", "threat_type", "severity", "source_ip", "confidence"]:
                if k not in t: errs.append(f"threat[{i}].{k} missing")
            if "severity" in t and t["severity"] not in ("low", "medium", "high", "critical"):
                errs.append(f"threat[{i}].severity invalid: {t['severity']}")
    return errs

def _validate_insights(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, dict): return ["payload must be dict"]
    for k in ["verdict", "score", "observations"]:
        if k not in d: errs.append(f"missing '{k}'")
    if "score" in d:
        sc = d["score"]
        if isinstance(sc, dict):
            if "total" not in sc: errs.append("score.total missing")
            if "breakdown" not in sc: errs.append("score.breakdown missing")
        else:
            errs.append("score must be dict with total + breakdown")
    if "observations" in d and not isinstance(d["observations"], list):
        errs.append("observations must be list")
    return errs

def _validate_graph(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, dict): return ["payload must be dict"]
    if "nodes" not in d: errs.append("missing 'nodes'")
    if "links" not in d: errs.append("missing 'links'")
    if "nodes" in d:
        if not isinstance(d["nodes"], list): errs.append("nodes must be list")
        elif len(d["nodes"]) > 0:
            n = d["nodes"][0]
            for k in ["id", "label", "type"]:
                if k not in n: errs.append(f"nodes[0].{k} missing")
    return errs

def _validate_fleet(d: Any) -> list[str]:
    if not isinstance(d, (dict, list)): return ["payload must be dict or list"]
    return []

def _validate_identity(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, list): return ["payload must be list"]
    # pyre-ignore[6]
    for i, p in enumerate(d[:3]):
        if not isinstance(p, dict):
            errs.append(f"profile[{i}] must be dict")
        else:
            for k in ["username", "role", "risk_score"]:
                if k not in p: errs.append(f"profile[{i}].{k} missing")
    return errs

def _validate_risk_history(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, list): return ["payload must be list"]
    # pyre-ignore[6]
    for i, item in enumerate(d[:3]):
        if not isinstance(item, dict):
            errs.append(f"entry[{i}] must be dict")
        else:
            for k in ["timestamp", "score", "level"]:
                if k not in item: errs.append(f"entry[{i}].{k} missing")
    return errs

def _validate_simulation(d: Any) -> list[str]:
    if not isinstance(d, dict): return ["payload must be dict"]
    return []

def _validate_location(d: Any) -> list[str]:
    errs = []
    if not isinstance(d, dict): return ["payload must be dict"]
    for k in ["lat", "lon", "city"]:
        if k not in d: errs.append(f"missing '{k}'")
    return errs

VALIDATORS = {
    "TELEMETRY":    _validate_telemetry,
    "STATS":        _validate_stats,
    "THREATS":      _validate_threats,
    "INSIGHTS":     _validate_insights,
    "GRAPH":        _validate_graph,
    "FLEET":        _validate_fleet,
    "IDENTITY":     _validate_identity,
    "RISK_HISTORY": _validate_risk_history,
    "SIMULATION":   _validate_simulation,
    "LOCATION":     _validate_location,
}

# ============================================================================
# METRICS COLLECTOR
# ============================================================================
@dataclass
class ChannelStats:
    msg_count: int = 0
    total_bytes: int = 0
    latencies: list[float] = field(default_factory=list)
    sizes: list[int] = field(default_factory=list)
    last_seen: float = 0.0
    schema_pass: int = 0
    schema_fail: int = 0
    error_details: list[str] = field(default_factory=list)
    hashes: list[str] = field(default_factory=list)       # for delta detection
    first_payload_hash: str = ""
    data_changed: bool = False                        # freshness tracker

@dataclass
class TestResults:
    channels: dict = field(default_factory=lambda: defaultdict(ChannelStats))
    connect_time_ms: float = 0.0
    reconnect_times_ms: list = field(default_factory=list)
    multi_client_results: list = field(default_factory=list)
    total_duration: float = 0.0
    connection_drops: int = 0

# ============================================================================
# TEST 1: SINGLE CONNECTION DATA COLLECTION
# ============================================================================
async def collect_stream_data(uri: str, duration: float, results: TestResults,
                              client_id: int = 0, quiet: bool = False):
    """Connect and collect all WebSocket data for `duration` seconds."""
    t0 = time.time()
    try:
        ws_start = time.time()
        async with websockets.connect(uri, ping_interval=20, ping_timeout=10) as ws:
            connect_ms = (time.time() - ws_start) * 1000
            if client_id == 0:
                results.connect_time_ms = connect_ms

            while time.time() - t0 < duration:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    now = time.time()
                    msg_bytes = len(raw.encode('utf-8'))
                    data = json.loads(raw)
                    channel = data.get("channel", "UNKNOWN")
                    payload = data.get("data")

                    cs = results.channels[channel]
                    cs.msg_count += 1
                    cs.total_bytes += msg_bytes
                    cs.sizes.append(msg_bytes)

                    # Inter-message latency
                    if cs.last_seen > 0:
                        cs.latencies.append(now - cs.last_seen)
                    cs.last_seen = now

                    # Schema validation
                    validator = VALIDATORS.get(channel)
                    if validator:
                        errs = validator(payload)
                        if errs:
                            cs.schema_fail += 1
                            for e in errs:
                                if e not in cs.error_details:
                                    cs.error_details.append(e)
                        else:
                            cs.schema_pass += 1

                    # Delta / freshness tracking
                    payload_hash = hashlib.md5(
                        json.dumps(payload, sort_keys=True, default=str).encode()
                    ).hexdigest()
                    cs.hashes.append(payload_hash)
                    if not cs.first_payload_hash:
                        cs.first_payload_hash = payload_hash
                    elif payload_hash != cs.first_payload_hash:
                        cs.data_changed = True

                    # Live progress (client 0 only)
                    if not quiet and client_id == 0:
                        elapsed = time.time() - t0
                        total_msgs = sum(c.msg_count for c in results.channels.values())
                        bar_len = 30
                        progress = min(elapsed / duration, 1.0)
                        filled = int(bar_len * progress)
                        bar = f"{'█' * filled}{'░' * (bar_len - filled)}"
                        sys.stdout.write(
                            f"\r  {C.CYN}[{bar}]{C.RST} {elapsed:.0f}s/{duration:.0f}s "
                            f"| {C.GRN}{total_msgs}{C.RST} msgs "
                            f"| {C.MAG}{channel:<15}{C.RST} ({msg_bytes:>5}B)"
                        )
                        sys.stdout.flush()

                except asyncio.TimeoutError:
                    continue

    except websockets.exceptions.ConnectionClosed:
        results.connection_drops += 1
    except ConnectionRefusedError:
        if not quiet:
            fail("Connection refused — is the backend running?")
    except Exception as e:
        if not quiet:
            fail(f"Client {client_id} error: {e}")

    results.total_duration = time.time() - t0

# ============================================================================
# TEST 2: RECONNECTION RESILIENCE
# ============================================================================
async def test_reconnection(uri: str, cycles: int = 3) -> list[float]:
    """Connect → disconnect → reconnect N times, measuring reconnect latency."""
    times = []
    for i in range(cycles):
        try:
            t0 = time.time()
            async with websockets.connect(uri, ping_interval=20) as ws:
                # Wait for first message as proof of full connection
                # Backend broadcasts every 3-15s, so allow up to 20s
                await asyncio.wait_for(ws.recv(), timeout=20.0)
                elapsed = (time.time() - t0) * 1000
                times.append(elapsed)
        except Exception:
            times.append(-1)  # failure sentinel
    return times

# ============================================================================
# TEST 3: MULTI-CLIENT STRESS
# ============================================================================
async def test_multi_client(uri: str, num_clients: int, duration: float) -> list[TestResults]:
    """Spawn N concurrent WebSocket clients collecting data simultaneously."""
    all_results = [TestResults() for _ in range(num_clients)]
    tasks = [
        collect_stream_data(uri, duration, all_results[i], client_id=i, quiet=True)
        for i in range(num_clients)
    ]
    await asyncio.gather(*tasks)
    return all_results

# ============================================================================
# HISTOGRAM HELPER
# ============================================================================
def ascii_histogram(values: list[float], bins: int = 8, width: int = 30, label: str = "ms") -> str:
    if not values:
        return "    (no data)"
    mn, mx = min(values), max(values)
    if mn == mx:
        return f"    all values = {mn:.1f}{label}"
    bin_width = (mx - mn) / bins
    counts = [0] * bins
    for v in values:
        idx = min(int((v - mn) / bin_width), bins - 1)
        counts[idx] += 1
    max_count = max(counts) if max(counts) > 0 else 1
    lines = []
    for i, c in enumerate(counts):
        lo = mn + i * bin_width
        hi = lo + bin_width
        bar_len = int((c / max_count) * width)
        bar = '▓' * bar_len + '░' * (width - bar_len)
        lines.append(f"    {lo:>7.1f}-{hi:<7.1f}{label} |{bar}| {c}")
    return "\n".join(lines)

# ============================================================================
# SCORING ENGINE
# ============================================================================
def compute_grade(results: TestResults, multi_results: list[TestResults],
                  reconnect_times: list[float], duration: float) -> dict:
    scores = {}

    # 1. Channel coverage (0-100)
    received = set(results.channels.keys())
    # LOCATION has 120s interval, may not appear in short tests
    expected_core = set(ALL_CHANNELS.keys()) - {"LOCATION"}
    coverage = len(received & expected_core) / len(expected_core) * 100
    scores["Channel Coverage"] = coverage

    # 2. Schema integrity (0-100)
    total_pass = sum(c.schema_pass for c in results.channels.values())
    total_fail = sum(c.schema_fail for c in results.channels.values())
    total = total_pass + total_fail
    scores["Schema Integrity"] = (total_pass / total * 100) if total > 0 else 0

    # 3. Data freshness (0-100) — did values actually change?
    changed = sum(1 for c in results.channels.values() if c.data_changed)
    total_with_data = sum(1 for c in results.channels.values() if c.msg_count > 1)
    scores["Data Freshness"] = (changed / total_with_data * 100) if total_with_data > 0 else 0

    # 4. Connection resilience (0-100)
    successful = sum(1 for t in reconnect_times if t > 0)
    scores["Reconnect Resilience"] = (successful / len(reconnect_times) * 100) if reconnect_times else 100

    # 5. Multi-client fairness (0-100) — all clients received similar message counts
    if multi_results:
        client_msgs = [
            sum(c.msg_count for c in r.channels.values())
            for r in multi_results
        ]
        if client_msgs and max(client_msgs) > 0:
            fairness = min(client_msgs) / max(client_msgs) * 100
        else:
            fairness = 0
        scores["Multi-Client Fairness"] = fairness
    else:
        scores["Multi-Client Fairness"] = 100

    # 6. Throughput health (0-100)
    total_bytes = sum(c.total_bytes for c in results.channels.values())
    kbps = (total_bytes / 1024) / max(duration, 1)
    # Expect at least 0.5 KB/s, grade linearly up to 5 KB/s
    scores["Throughput"] = min(kbps / 5 * 100, 100)

    # 7. Latency consistency (0-100) — low jitter is good
    all_lats: list[float] = []
    for c in results.channels.values():
        all_lats.extend(c.latencies)
    if len(all_lats) > 2:
        mean_lat = sum(all_lats) / len(all_lats)
        variance = sum((x - mean_lat) ** 2 for x in all_lats) / len(all_lats)
        stdev = math.sqrt(variance)
        cv = stdev / mean_lat if mean_lat > 0 else 0.0
        scores["Latency Consistency"] = max(0.0, 100.0 - cv * 100.0)
    else:
        scores["Latency Consistency"] = 50.0

    return scores

def letter_grade(pct: float) -> str:
    if pct >= 95: return f"{C.GRN}A+{C.RST}"
    if pct >= 90: return f"{C.GRN}A{C.RST}"
    if pct >= 85: return f"{C.GRN}A-{C.RST}"
    if pct >= 80: return f"{C.BLU}B+{C.RST}"
    if pct >= 75: return f"{C.BLU}B{C.RST}"
    if pct >= 70: return f"{C.BLU}B-{C.RST}"
    if pct >= 60: return f"{C.YEL}C{C.RST}"
    if pct >= 50: return f"{C.YEL}D{C.RST}"
    return f"{C.RED}F{C.RST}"

# ============================================================================
# FINAL REPORT
# ============================================================================
def print_report(results: TestResults, multi_results: list[TestResults],
                 reconnect_times: list[float], duration: float, num_clients: int):

    banner("🔬 AEGISAI WEBSOCKET STRESS & INTEGRITY REPORT v2.0")

    # ── Connection Summary ──
    section("CONNECTION SUMMARY")
    ok(f"Initial handshake: {results.connect_time_ms:.1f}ms")
    info(f"Test duration: {results.total_duration:.1f}s")
    if results.connection_drops:
        fail(f"Connection drops during test: {results.connection_drops}")
    else:
        ok("Zero connection drops")

    # ── Reconnection ──
    section("RECONNECTION RESILIENCE  (3 cycles)")
    for i, t in enumerate(reconnect_times):
        if t < 0:
            fail(f"  Cycle {i+1}: FAILED")
        elif t < 5000:
            ok(f"  Cycle {i+1}: {t:.0f}ms")
        else:
            warn(f"  Cycle {i+1}: {t:.0f}ms (slow)")
    avg_reconnect = sum(t for t in reconnect_times if t > 0) / max(1, sum(1 for t in reconnect_times if t > 0))
    info(f"Average reconnect time: {avg_reconnect:.0f}ms")

    # ── Channel Coverage ──
    section("CHANNEL COVERAGE")
    received = set(results.channels.keys())
    for ch, meta in ALL_CHANNELS.items():
        if ch in received:
            cs = results.channels[ch]
            ok(f"{ch:<16} │ {cs.msg_count:>4} msgs │ {cs.total_bytes/1024:>7.1f} KB │ {meta['priority']}")
        else:
            if ch == "LOCATION" and duration < 120:
                info(f"{ch:<16} │ (120s interval — not expected in {duration:.0f}s test)")
            else:
                fail(f"{ch:<16} │ NOT RECEIVED  ({meta['interval']}s interval)")

    unexpected = received - set(ALL_CHANNELS.keys())
    for ch in unexpected:
        warn(f"{ch:<16} │ UNEXPECTED CHANNEL")

    # ── Schema Validation ──
    section("DEEP SCHEMA VALIDATION")
    for ch in sorted(results.channels.keys()):
        cs = results.channels[ch]
        total = cs.schema_pass + cs.schema_fail
        if total == 0:
            info(f"{ch:<16} │ no validator")
            continue
        rate = cs.schema_pass / total * 100
        if rate == 100:
            ok(f"{ch:<16} │ {total} payloads validated │ {C.GRN}100% PASS{C.RST}")
        else:
            fail(f"{ch:<16} │ {cs.schema_fail}/{total} failed │ {C.RED}{rate:.0f}% PASS{C.RST}")
            for e in cs.error_details[:5]:
                print(f"      {C.DIM}→ {e}{C.RST}")

    # ── Delta Compression Audit ──
    section("DELTA COMPRESSION AUDIT")
    for ch in sorted(results.channels.keys()):
        cs = results.channels[ch]
        if len(cs.hashes) < 2:
            info(f"{ch:<16} │ insufficient data")
            continue
        unique = len(set(cs.hashes))
        total = len(cs.hashes)
        dup_pct = (1 - unique / total) * 100
        if unique == total:
            ok(f"{ch:<16} │ {total} msgs, ALL unique (delta working perfectly)")
        elif dup_pct < 20:
            ok(f"{ch:<16} │ {total} msgs, {unique} unique ({dup_pct:.0f}% suppressed)")
        else:
            warn(f"{ch:<16} │ {total} msgs, {unique} unique ({dup_pct:.0f}% duplicates — delta may be off)")

    # ── Data Freshness ──
    section("DATA FRESHNESS  (did values actually change?)")
    for ch in sorted(results.channels.keys()):
        cs = results.channels[ch]
        if cs.msg_count <= 1:
            info(f"{ch:<16} │ single message (not enough to check)")
        elif cs.data_changed:
            ok(f"{ch:<16} │ LIVE — data changed over test window")
        else:
            warn(f"{ch:<16} │ STATIC — same payload entire test (may be expected for stable channels)")

    # ── Latency Profiling ──
    section("LATENCY PROFILING  (inter-message intervals)")
    for ch in sorted(results.channels.keys()):
        cs = results.channels[ch]
        if len(cs.latencies) < 2:
            info(f"{ch:<16} │ insufficient data for profiling")
            continue
        lats = cs.latencies
        avg_l = sum(lats) / len(lats)
        min_l = min(lats)
        max_l = max(lats)
        variance = sum((x - avg_l) ** 2 for x in lats) / len(lats)
        jitter = math.sqrt(variance)
        expected = float(ALL_CHANNELS.get(ch, {}).get("interval", 0))
        drift = abs(avg_l - expected) if expected > 0 else 0.0

        status = C.GRN + "OK" + C.RST
        if drift > expected * 0.5 and expected > 0:
            status = C.YEL + "DRIFT" + C.RST
        if jitter > avg_l * 0.5:
            status = C.RED + "JITTERY" + C.RST

        print(f"  {ch:<16} │ avg:{avg_l:>6.2f}s │ min:{min_l:>5.2f}s │ max:{max_l:>5.2f}s │ jitter:{jitter:>5.3f}s │ [{status}]")

    # One histogram for the highest-volume channel
    if not results.channels:
        print(f"\n  {C.RED}No data received on any channel.{C.RST}")
        return

    top_ch = max(results.channels.keys(), key=lambda k: results.channels[k].msg_count)
    top_cs = results.channels[top_ch]
    if len(top_cs.latencies) >= 4:
        print(f"\n  {C.DIM}Latency distribution for {top_ch}:{C.RST}")
        print(ascii_histogram([l * 1000 for l in top_cs.latencies], label="ms"))

    # ── Payload Size Analysis ──
    section("PAYLOAD SIZE ANALYSIS")
    print(f"  {C.BOLD}{'CHANNEL':<16} │ {'MIN':<8} │ {'AVG':<8} │ {'MAX':<8} │ {'TOTAL':<10}{C.RST}")
    print(f"  {'─'*60}")
    for ch in sorted(results.channels.keys()):
        cs = results.channels[ch]
        if not cs.sizes:
            continue
        mn = min(cs.sizes)
        mx = max(cs.sizes)
        avg = sum(cs.sizes) / len(cs.sizes)
        print(f"  {ch:<16} │ {mn:>5}B  │ {avg:>5.0f}B  │ {mx:>5}B  │ {cs.total_bytes/1024:>7.1f}KB")

    # ── Multi-Client Stress ──
    if num_clients > 1:
        section(f"MULTI-CLIENT STRESS TEST  ({num_clients} concurrent clients)")
        all_ok = True
        for i, r in enumerate(multi_results):
            msgs = sum(c.msg_count for c in r.channels.values())
            chs = len(r.channels)
            drops = r.connection_drops
            if drops:
                fail(f"Client {i}: {msgs} msgs across {chs} channels — {drops} DROPS")
                all_ok = False
            else:
                ok(f"Client {i}: {msgs} msgs across {chs} channels")
        if all_ok:
            ok(f"All {num_clients} clients received data without drops")

    # ── Throughput Summary ──
    section("THROUGHPUT SUMMARY")
    total_msgs = sum(c.msg_count for c in results.channels.values())
    total_bytes = sum(c.total_bytes for c in results.channels.values())
    dur = max(results.total_duration, 0.1)
    info(f"Total messages:   {total_msgs}")
    info(f"Total data:       {total_bytes / 1024:.1f} KB")
    info(f"Message rate:     {total_msgs / dur:.1f} msg/s")
    info(f"Throughput:       {total_bytes / 1024 / dur:.2f} KB/s")
    info(f"Avg msg size:     {total_bytes / max(total_msgs, 1):.0f} bytes")

    # ── REPORT CARD ──
    scores = compute_grade(results, multi_results, reconnect_times, duration)
    banner("📊 FINAL REPORT CARD", C.MAG)
    total_score = 0
    for category, pct in scores.items():
        grade = letter_grade(pct)
        bar_len = 20
        filled = int(pct / 100 * bar_len)
        bar = '█' * filled + '░' * (bar_len - filled)
        print(f"  {category:<28} │ {bar} │ {pct:>5.1f}% │ {grade}")
        total_score += pct

    overall = total_score / len(scores)
    print(f"\n  {C.BOLD}{'OVERALL':<28} │ {'':>20} │ {overall:>5.1f}% │ {letter_grade(overall)}{C.RST}")
    print()

    if overall >= 90:
        print(f"  {C.BG_GRN}{C.BOLD} ✅ EXCELLENT — WebSocket infrastructure is production-ready {C.RST}")
    elif overall >= 70:
        print(f"  {C.BG_BLU}{C.BOLD} ℹ️  GOOD — Minor improvements possible {C.RST}")
    elif overall >= 50:
        print(f"  {C.YEL}{C.BOLD} ⚠️  NEEDS WORK — Some channels or metrics underperforming {C.RST}")
    else:
        print(f"  {C.BG_RED}{C.BOLD} ❌ CRITICAL — Significant WebSocket issues detected {C.RST}")

    print()

# ============================================================================
# MAIN ENTRY
# ============================================================================
async def main():
    parser = argparse.ArgumentParser(description="AegisAI WebSocket Stress & Integrity Test Suite")
    parser.add_argument("--duration", type=int, default=60, help="Test duration in seconds (default: 60)")
    parser.add_argument("--clients", type=int, default=1, help="Number of concurrent clients for stress test (default: 1)")
    parser.add_argument("--quick", action="store_true", help="Quick 15-second smoke test")
    parser.add_argument("--uri", type=str, default="ws://127.0.0.1:8000/api/ws", help="WebSocket URI")
    args = parser.parse_args()

    duration = 15 if args.quick else args.duration
    uri = args.uri
    num_clients = args.clients

    banner("🛡️  AEGISAI WEBSOCKET STRESS TEST SUITE v2.0")
    info(f"Target:    {uri}")
    info(f"Duration:  {duration}s")
    info(f"Clients:   {num_clients}")
    print()

    # ── Phase 1: Reconnection Resilience ──
    section("PHASE 1: RECONNECTION RESILIENCE")
    info("Testing connect → disconnect → reconnect cycles...")
    reconnect_times = await test_reconnection(uri, cycles=3)
    for i, t in enumerate(reconnect_times):
        if t > 0:
            ok(f"Cycle {i+1}: {t:.0f}ms")
        else:
            fail(f"Cycle {i+1}: FAILED")

    # ── Phase 2: Main Stream Collection ──
    section(f"PHASE 2: STREAM COLLECTION  ({duration}s)")
    results = TestResults()
    await collect_stream_data(uri, duration, results)
    print()  # newline after progress bar

    # ── Phase 3: Multi-Client Stress ──
    multi_results: list[TestResults] = []
    if num_clients > 1:
        section(f"PHASE 3: MULTI-CLIENT STRESS  ({num_clients} clients × {min(duration, 20)}s)")
        info("Spawning concurrent WebSocket clients...")
        multi_results = await test_multi_client(uri, num_clients, min(duration, 20))
        total_multi_msgs = sum(sum(c.msg_count for c in r.channels.values()) for r in multi_results)
        ok(f"All clients finished. Total messages across all clients: {total_multi_msgs}")

    # ── Final Report ──
    print_report(results, multi_results, reconnect_times, duration, num_clients)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{C.YEL}[!] Test aborted by user.{C.RST}")
