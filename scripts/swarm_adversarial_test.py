import asyncio
import websockets  # type: ignore
import json
import sqlite3
import uuid
import sys
import os
from datetime import datetime, timezone

# Ensure project root is in path for linter/runtime
sys.path.append(os.getcwd())

DB_PATH = "backend/aegis.db"
WS_URI = "ws://127.0.0.1:8000/api/ws"

def inject_threat(threat_type, severity, desc, score):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    threat_id = f"SWARM-{str(uuid.uuid4()).split('-')[0]}"
    cursor.execute("""
        INSERT INTO threats (id, timestamp, threat_type, severity, confidence, source_ip, explanation, mitre_id, mitre_tactic, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        threat_id, 
        datetime.now(timezone.utc).isoformat(), 
        threat_type, 
        severity, 
        score / 100.0, 
        "185.15.20.10", 
        desc, 
        "T1071", 
        "Command and Control", 
        "active"
    ))
    conn.commit()
    conn.close()

async def simulate_apt():
    async with websockets.connect(WS_URI) as websocket:
        print("[*] Target Acquired. Initiating APT Sandbox Simulation...")

        # Stage 1: Network Recon & C2 Beaconing (Picked up by NetSec Persona)
        inject_threat(
            "DNS Tunneling Payload / C2 Beaconing", 
            "high", 
            "Suspicious rhythmic outbound DNS requests targeting maldet.io", 
            85.0
        )
        print("[*] Deployed Stage 1: C2 Beaconing... Waiting for initial analysis...")
        
        await asyncio.sleep(4)

        # Stage 2: Endpoint Escalation (Picked up by Endpoint Persona)
        inject_threat(
            "Privilege Escalation via LSASS Dump", 
            "critical", 
            "powershell.exe attempting to dump lsass.exe memory using rundll32 proxy. Process ID: 8832", 
            98.0
        )
        print("[*] Deployed Stage 2: Privilege Escalation. Waiting for Commander Verdict...")
        
        # Read WebSocket stream until AI_DECISION hits
        while True:
            try:
                response = await websocket.recv()
                data = json.loads(response)
                
                if data.get("channel") == "AI_DECISIONS":
                    decision = data.get("payload", {})
                    print("\n\n[== AEGIS COMMANDER SWARM DECISION RECEIVED ==]")
                    print(json.dumps(decision, indent=2))
                    break
            except Exception as e:
                print(f"Error receiving: {e}")
                break

if __name__ == "__main__":
    asyncio.run(simulate_apt())
