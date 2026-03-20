import asyncio
import sqlite3
import uuid
import json
import time
# pyre-ignore[21]
import websockets
from datetime import datetime, timezone

# Configuration
DB_PATH = "backend/aegis.db"
WS_URI = "ws://127.0.0.1:8000/api/ws"

async def monitor_ai_decisions():
    print(f"[*] Connecting to WebSocket: {WS_URI}")
    try:
        async with websockets.connect(WS_URI) as websocket:
            print("[+] Connected. Waiting for AI Decisions...")
            
            # Phase 1: Inject the threat
            inject_critical_threat()
            
            # Phase 2: Listen for broadcast
            t_start = time.time()
            found_decision = False
            found_advisory = False
            
            while time.time() - t_start < 60: # 60s timeout for the cycle
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    channel = data.get("channel")
                    payload = data.get("data")
                    
                    if channel == "AI_DECISIONS":
                        print(f"\n[🔥 AI_DECISION] ACTION: {payload.get('action')}")
                        print(f"    Confidence: {payload.get('confidence')}%")
                        print(f"    Severity: {payload.get('severity')}")
                        print(f"    Target: {payload.get('target')}")
                        print(f"    Auto-Executed: {payload.get('auto_executed')}")
                        found_decision = True
                        
                    elif channel == "AI_ADVISOR":
                        print(f"\n[🧠 AI_ADVISOR] {payload}")
                        found_advisory = True
                        
                    if found_decision and found_advisory:
                        print("\n[✅] SUCCESS: Both AI Advisor and Decision Engine triggered correctly.")
                        return
                        
                except asyncio.TimeoutError:
                    continue
            
            print("\n[❌] TIMEOUT: Did not see both AI events within 60s.")
            
    except Exception as e:
        print(f"[-] WebSocket Error: {e}")

def inject_critical_threat():
    print("[*] Injecting critical Ransomware threat into DB...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Use split instead of slice to satisfy strict type checkers
        threat_id = f"ADV-{str(uuid.uuid4()).split('-')[0]}"
        threat = {
            "id": threat_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "threat_type": "Ransomware / Mass File Encryption",
            "severity": "critical",
            "confidence": 0.98,
            "source_ip": "10.0.0.99",
            "explanation": "EXTREME: Rapid encryption of user home directory [ADVERSARIAL TEST].",
            "mitre_id": "T1486",
            "mitre_tactic": "Impact",
            "status": "active"
        }
        
        cursor.execute("""
            INSERT INTO threats (id, timestamp, threat_type, severity, confidence, source_ip, explanation, mitre_id, mitre_tactic, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (threat["id"], threat["timestamp"], threat["threat_type"], threat["severity"], threat["confidence"], threat["source_ip"], threat["explanation"], threat["mitre_id"], threat["mitre_tactic"], threat["status"]))
        
        conn.commit()
        conn.close()
        print(f"[+] Injected threat: {threat_id}")
    except Exception as e:
        print(f"[-] DB Injection Error: {e}")

if __name__ == "__main__":
    asyncio.run(monitor_ai_decisions())
