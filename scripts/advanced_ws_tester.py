import asyncio
# pyre-ignore[21]
import websockets
import json
import time
import sys
from collections import defaultdict
import statistics
from typing import Any

# Advanced terminal colors
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Storage for metrics
class ChannelMetrics:
    def __init__(self):
        self.count = 0
        self.total_bytes = 0
        self.latencies = []
        self.last_seen = 0.0
        self.schema_errors = 0
        self.error_details = []

metrics = defaultdict(ChannelMetrics)

def validate_schema(channel: str, payload: Any) -> list[str]:
    """Validate the exact structure of incoming websocket channel payloads."""
    errors = []
    
    if channel == "TELEMETRY":
        if not isinstance(payload, dict):
            errors.append("Payload must be a dict.")
        else:
            if "system" not in payload: errors.append("Missing 'system' object")
            if "network_io" not in payload: errors.append("Missing 'network_io' block")
            if "context" not in payload: errors.append("Missing 'context' block")
            
    elif channel == "STATS":
        if not isinstance(payload, dict):
            errors.append("Payload must be a dict.")
        else:
            expected_keys = ["total_events", "threats_detected", "active_threats", "risk_level", "risk_score", "event_rate"]
            for k in expected_keys:
                if k not in payload: errors.append(f"Missing key '{k}'")
                
    elif channel == "THREATS":
        if not isinstance(payload, list):
            errors.append("Payload must be a list of threats.")
        elif len(payload) > 0 and not isinstance(payload[0], dict):
            errors.append("Threat items must be objects.")
            
    elif channel == "INSIGHTS":
        if not isinstance(payload, dict):
            errors.append("Payload must be a dict.")
        else:
            if "verdict" not in payload: errors.append("Missing 'verdict'")
            if "score" not in payload: errors.append("Missing 'score'")
            if "observations" not in payload: errors.append("Missing 'observations'")
            
    elif channel == "FLEET":
        if not isinstance(payload, dict):
            errors.append("Payload must be a dict.")
            
    elif channel == "IDENTITY":
        if not isinstance(payload, list):
            errors.append("Payload must be a list.")
            
    elif channel == "GRAPH":
        if not isinstance(payload, dict):
            errors.append("Payload must be a dict.")
        else:
            if "nodes" not in payload: errors.append("Missing 'nodes'")
            if "links" not in payload: errors.append("Missing 'links'")

    elif channel == "RISK_HISTORY":
        if not isinstance(payload, list):
            errors.append("Payload must be a list.")

    return errors

async def track_efficiency(websocket, duration=30):
    start_time = time.time()
    print(f"{Colors.OKCYAN}[*] Starting Deep WebSocket Diagnostics for {duration} seconds...{Colors.ENDC}\n")
    
    try:
        while time.time() - start_time < duration:
            try:
                # 1s timeout to keep the live spinner ticking
                message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                now = time.time()
                
                # Payload parsing and byte calculation
                msg_bytes = len(message.encode('utf-8'))
                data = json.loads(message)
                
                channel = data.get("channel", "UNKNOWN_CHANNEL")
                payload = data.get("data")
                
                # Update Metrics
                m = metrics[channel]
                m.count += 1
                m.total_bytes += msg_bytes
                
                if m.last_seen > 0:
                    delta = now - m.last_seen
                    m.latencies.append(delta)
                m.last_seen = now
                
                # Live Validation
                schema_errors = validate_schema(channel, payload)
                if schema_errors:
                    m.schema_errors += 1
                    for err in schema_errors:
                        if err not in m.error_details:
                            m.error_details.append(err)
                
                # Live CLI UI
                elapsed = time.time() - start_time
                total_pkts = sum(x.count for x in metrics.values())
                sys.stdout.write(f"\r{Colors.BOLD}[Live]{Colors.ENDC} Time: {elapsed:.1f}s | Pkts: {total_pkts} | Last Channel: {Colors.OKGREEN}{channel:<15}{Colors.ENDC} ({msg_bytes:>5} bytes)")
                sys.stdout.flush()
                
            except asyncio.TimeoutError:
                continue # Tick UI
                
    except websockets.exceptions.ConnectionClosed as e:
        print(f"\n{Colors.FAIL}[!] Server disconnected: {e}{Colors.ENDC}")
    except Exception as e:
        print(f"\n{Colors.FAIL}[!] Unexpected read error: {e}{Colors.ENDC}")

    # Generate Final Report
    print(f"\n\n{Colors.HEADER}" + "="*80)
    print("🚀 ADVANCED WEBSOCKET EFFICIENCY & INTEGRITY REPORT")
    print("="*80 + f"{Colors.ENDC}")
    
    total_pkts = sum(m.count for m in metrics.values())
    total_bytes = sum(m.total_bytes for m in metrics.values())
    real_duration = time.time() - start_time
    
    print(f"{Colors.BOLD}Total Test Duration:{Colors.ENDC}   {real_duration:.2f}s")
    print(f"{Colors.BOLD}Total Messages:{Colors.ENDC}        {total_pkts}")
    print(f"{Colors.BOLD}Total Data Transfer:{Colors.ENDC}   {total_bytes / 1024:.2f} KB")
    print(f"{Colors.BOLD}Overall Throughput:{Colors.ENDC}    {total_bytes / 1024 / real_duration:.2f} KB/s\n")
    
    print(f"{Colors.BOLD}{'CHANNEL':<16} | {'COUNT':<6} | {'SIZE(KB)':<10} | {'AVG LAT(s)':<10} | {'JITTER(s)':<10} | {'SCHEMA ERR'}{Colors.ENDC}")
    print("-" * 80)
    
    for channel, m in sorted(metrics.items()):
        kb = m.total_bytes / 1024
        
        # Calculate Latency & Jitter (Standard Deviation of Latency)
        if len(m.latencies) > 0:
            avg_lat = statistics.mean(m.latencies)
            jitter = statistics.stdev(m.latencies) if len(m.latencies) > 1 else 0.0
        else:
            avg_lat = 0.0
            jitter = 0.0
            
        errStr = f"{Colors.FAIL}{m.schema_errors}{Colors.ENDC}" if m.schema_errors > 0 else f"{Colors.OKGREEN}0{Colors.ENDC}"
        print(f"{channel:<16} | {m.count:<6} | {kb:<10.2f} | {avg_lat:<10.3f} | {jitter:<10.3f} | {errStr}")
        
    print("\n" + "="*80)
    
    # Detail any schema errors
    has_errors = any(m.schema_errors > 0 for m in metrics.values())
    if has_errors:
        print(f"{Colors.FAIL}⚠️ SCHEMA VIOLATIONS DETECTED:{Colors.ENDC}")
        for channel, m in metrics.items():
            if m.schema_errors > 0:
                print(f"  - {channel}: {', '.join(m.error_details)}")
    else:
        print(f"{Colors.OKGREEN}✅ ALL PAYLOADS PASSED SCHEMA INTEGRITY CHECKS!{Colors.ENDC}")
        
    print("="*80 + "\n")

async def main():
    uri = "ws://localhost:8000/api/ws"
    print(f"{Colors.BOLD}Target URI:{Colors.ENDC} {uri}")
    
    try:
        # We ping the server quickly to verify connection before entering diagnostic mode
        async with websockets.connect(uri) as websocket:
            print(f"{Colors.OKGREEN}[+] Connection Established successfully.{Colors.ENDC}")
            # Run diagnostic for 30 Seconds by default
            await track_efficiency(websocket, duration=30)
            
    except ConnectionRefusedError:
        print(f"{Colors.FAIL}[-] Connection refused. Ensure the AegisAI backend is running on port 8000.{Colors.ENDC}")
    except Exception as e:
        print(f"{Colors.FAIL}[-] Fatal Error: {e}{Colors.ENDC}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}[!] Diagnostics manually aborted by user.{Colors.ENDC}")
