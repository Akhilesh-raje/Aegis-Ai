import asyncio
import os
import multiprocessing
import uvicorn # type: ignore
import time
import httpx # type: ignore
from fastapi import FastAPI # type: ignore

# Need to import our routes and main
os.environ["NODE_ROLE"] = "admin"
import backend.main as bmain # type: ignore

def run_admin_server():
    os.environ["NODE_ROLE"] = "admin"
    uvicorn.run(bmain.app, host="127.0.0.1", port=8000, log_level="error")

async def run_client_test():
    # Wait for server to start
    await asyncio.sleep(3)
    
    print("[Test] Starting AgentClient...")
    from backend.engine.agent_client import AgentClient # type: ignore
    client = AgentClient("http://127.0.0.1:8000", node_id="test-agent-007")
    
    # 1. Test Registration
    print("[Test] Testing Registration...")
    success = await client.register()
    if not success:
        print("[Test] Registration FAILED!")
        return False
    
    print(f"[Test] Registration SUCCESS. Token: {client.token}")
    
    # 2. Test WS Connection
    print("[Test] Testing WS Connection...")
    ws_url = f"{client.admin_ws_url}/api/ws/agent/{client.node_id}?token={client.token}"
    
    # Actually, we don't need to do the full connect_and_stream, 
    # just let it run for a bit in background
    task = asyncio.create_task(client.connect_and_stream())
    await asyncio.sleep(2)
    
    if client.connected:
        print("[Test] WS Connection SUCCESS!")
        
        # 3. Test Command Dispatch
        print("[Test] Dispatching command via API...")
        async with httpx.AsyncClient() as http_client:
            res = await http_client.post("http://127.0.0.1:8000/api/fleet/command", json={
                "node_id": "test-agent-007",
                "action": "isolate_node",
                "params": {}
            })
            if res.status_code == 200:
                print(f"[Test] Command Dispatched SUCCESS. Response: {res.json()}")
            else:
                print(f"[Test] Command Dispatch FAILED. Status: {res.status_code}, {res.text}")
    else:
        print("[Test] WS Connection FAILED!")
        
    await asyncio.sleep(2)
    task.cancel()
    return True

if __name__ == "__main__":
    server_process = multiprocessing.Process(target=run_admin_server)
    server_process.start()
    
    try:
        asyncio.run(run_client_test())
    finally:
        server_process.terminate()
        server_process.join()
        print("[Test] Complete.")
