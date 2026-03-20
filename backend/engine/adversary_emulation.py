"""
AegisAI v4 — Adversary Emulation Engine
Provides stateful attack simulations mapped to MITRE ATT&CK techniques.
"""

import random
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.simulator.log_generator import _make_event, SUSPICIOUS_IPS, NORMAL_IPS, ADMIN_USERS
from backend.engine.fleet_manager import fleet_manager

class AdversaryEmulationEngine:
    def __init__(self, app_state: Dict[str, Any]):
        self.app_state = app_state
        self.active_simulations: Dict[str, Dict[str, Any]] = {}

    async def start_simulation(self, scenario: str) -> str:
        """Starts a stateful attack simulation."""
        sim_id = f"SIM_{random.randint(1000, 9999)}"
        
        self.active_simulations[sim_id] = {
            "id": sim_id,
            "scenario": scenario,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "status": "running",
            "current_step": "initializing",
            "progress": 0,
            "mitigation_triggered": False
        }

        if scenario == "ransomware_chain":
            asyncio.create_task(self._run_ransomware_chain(sim_id))
        elif scenario == "data_exfil_lateral":
            asyncio.create_task(self._run_data_exfil_lateral(sim_id))
        else:
            return "Unknown scenario"
            
        return sim_id

    async def _run_ransomware_chain(self, sim_id: str):
        """
        Simulates: Recon (T1046) -> Credential Access (T1110) -> Impact (T1486)
        """
        sim = self.active_simulations[sim_id]
        attacker_ip = random.choice(SUSPICIOUS_IPS)
        if "local-node" in fleet_manager.nodes:
            fleet_manager.nodes["local-node"].is_simulation_active = True
        
        try:
            # Step 1: Reconnaissance (Port Scanning)
            sim["current_step"] = "Reconnaissance (T1046)"
            sim["progress"] = 25
            sim["active_node"] = "src"
            print(f"[AegisSim] {sim_id}: Starting Recon...")
            for port in [22, 80, 443]:
                event = _make_event("network_request", attacker_ip, "anonymous", False, port, 64, "Unknown", is_simulation=True)
                self._inject_event(event)
                await asyncio.sleep(1.5)

            # Step 2: Credential Access (Brute Force)
            sim["current_step"] = "Credential Access (T1110)"
            sim["progress"] = 50
            sim["active_node"] = "entry"
            print(f"[AegisSim] {sim_id}: Starting Brute Force...")
            for _ in range(4):
                event = _make_event("login_attempt", attacker_ip, "admin", False, 22, 128, "Unknown", role="admin", is_simulation=True)
                self._inject_event(event)
                await asyncio.sleep(1)

            # Step 3: Success & Lateral Movement Simulation
            sim["current_step"] = "Lateral Movement (T1021)"
            sim["progress"] = 75
            sim["active_node"] = "core"
            print(f"[AegisSim] {sim_id}: Lateral Movement...")
            # SUCCESSFUL LOGIN - Guaranteed critical trigger
            event = _make_event("login_attempt", attacker_ip, "admin", True, 22, 256, "Unknown", 
                               role="admin", privilege_level=5, is_simulation=True,
                               data_override={"anomaly_score": 0.99, "threat_type": "brute_force_success"})
            self._inject_event(event)
            await asyncio.sleep(4)

            # Step 4: Impact (Encrypted Process Activity)
            sim["current_step"] = "Impact (T1486)"
            sim["progress"] = 90
            sim["active_node"] = "target"
            print(f"[AegisSim] {sim_id}: Simulating Ransomware Impact...")
            event = _make_event("process_start", "127.0.0.1", "admin", True, 0, 0, "Local", 
                               data_override={"process_name": "encryptor.exe", "is_high_risk": True, "anomaly_score": 0.95}, 
                               is_simulation=True)
            self._inject_event(event)
            await asyncio.sleep(5)
            
            sim["status"] = "completed"
            sim["current_step"] = "Finished"
            sim["progress"] = 100
            sim["active_node"] = None
            if "local-node" in fleet_manager.nodes:
                fleet_manager.nodes["local-node"].is_simulation_active = False
            print(f"[AegisSim] {sim_id}: Simulation Complete.")

        except Exception as e:
            if "local-node" in fleet_manager.nodes:
                fleet_manager.nodes["local-node"].is_simulation_active = False
            sim["status"] = "error"
            sim["error"] = str(e)
            print(f"[AegisSim] {sim_id}: Error: {e}")

    async def _run_data_exfil_lateral(self, sim_id: str):
        """
        Simulates: Compromised User -> Lateral Movement -> Data Exfiltration (T1041)
        """
        sim = self.active_simulations[sim_id]
        insider_ip = random.choice(NORMAL_IPS)
        user = "alice"
        if "local-node" in fleet_manager.nodes:
            fleet_manager.nodes["local-node"].is_simulation_active = True
        
        try:
            sim["current_step"] = "Initial Access (T1078)"
            sim["progress"] = 30
            sim["active_node"] = "entry"
            print(f"[AegisSim] {sim_id}: Simulating Compromised Account Activity...")
            # Step 1: Highly unusual process start
            event = _make_event("process_start", insider_ip, user, True, 0, 0, "Local", 
                               role="analyst", data_override={"process_name": "mimikatz.exe", "anomaly_score": 0.98}, 
                               is_simulation=True)
            self._inject_event(event)
            await asyncio.sleep(2)

            sim["current_step"] = "Exfiltration (T1041)"
            sim["progress"] = 70
            sim["active_node"] = "target"
            print(f"[AegisSim] {sim_id}: Simulating Large Data Outbound...")
            # Step 2: Large data transfer to suspicious IP
            dest_ip = random.choice(SUSPICIOUS_IPS)
            event = _make_event("network_request", insider_ip, user, True, 443, 800000, "Unknown", 
                               data_override={"dest_ip": dest_ip, "anomaly_score": 0.99, "threat_type": "data_exfiltration"}, 
                               is_simulation=True)
            self._inject_event(event)
            await asyncio.sleep(3)

            sim["status"] = "completed"
            sim["current_step"] = "Finished"
            sim["progress"] = 100
            sim["active_node"] = None
            if "local-node" in fleet_manager.nodes:
                fleet_manager.nodes["local-node"].is_simulation_active = False
            print(f"[AegisSim] {sim_id}: Simulation Complete.")
            
        except Exception as e:
            if "local-node" in fleet_manager.nodes:
                fleet_manager.nodes["local-node"].is_simulation_active = False
            sim["status"] = "error"
            sim["error"] = str(e)

    def _inject_event(self, event: Dict[str, Any]):
        """Injects a simulated event into the background processing queue."""
        if "simulation_events" in self.app_state:
            self.app_state["simulation_events"].append(event)
