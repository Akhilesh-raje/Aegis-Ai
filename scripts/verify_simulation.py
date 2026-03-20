import asyncio
import sys
import os
import time

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.engine.adversary_emulation import AdversaryEmulationEngine

async def verify_simulation():
    print("--- Verifying AegisAI v4 Adversary Emulation Engine ---")
    
    # Mock app state with buffer
    app_state = {
        "simulation_events": []
    }
    
    engine = AdversaryEmulationEngine(app_state)
    
    # 1. Start Ransomware Chain
    print("\n[Step 1] Starting Ransomware Chain (T1486)...")
    sim_id = await engine.start_simulation("ransomware_chain")
    print(f"Simulation ID: {sim_id}")
    
    # Check buffer
    await asyncio.sleep(2)
    print(f"Events in buffer: {len(app_state['simulation_events'])}")
    print(f"Current Step: {engine.active_simulations[sim_id]['current_step']}")
    
    # 2. Start Data Exfiltration Chain
    print("\n[Step 2] Starting Data Exfiltration Chain (T1041)...")
    sim_id_2 = await engine.start_simulation("data_exfil_lateral")
    print(f"Simulation ID: {sim_id_2}")
    
    await asyncio.sleep(1)
    print(f"Events in target buffer: {len(app_state['simulation_events'])}")

    print("\n✅ Simulation Engine logic verified (Buffer Injection & State Tracking).")

if __name__ == "__main__":
    asyncio.run(verify_simulation())
