import asyncio
import json
import os
import platform
import socket
import logging
from typing import Dict, Any, Optional

# Depending on environment, we try standard WS clients
try:
    import websockets # type: ignore
except ImportError:
    print("[AgentClient] 'websockets' not installed. Please install it.")

try:
    import httpx # type: ignore
except ImportError:
    try:
        import requests # type: ignore
    except ImportError:
        pass

class AgentClient:
    """
    Standalone Agent Client for distributed AegisAI nodes.
    Registers with the Admin, obtains a token, and streams telemetry via WebSocket.
    Listens for mitigation commands from the Admin.
    """
    def __init__(self, admin_url: str, node_id: Optional[str] = None):
        self.admin_url = admin_url.rstrip("/")
        # ws://... or wss://... depending on http://...
        self.admin_ws_url = self.admin_url.replace("http://", "ws://").replace("https://", "wss://")
        
        self.node_id = node_id or platform.node() or "unknown-node"
        self.token = None
        self.connected = False

    def get_system_info(self) -> Dict[str, str]:
        return {
            "node_id": self.node_id,
            "hostname": socket.gethostname(),
            "os": platform.system(),
            "release": platform.release()
        }

    async def register(self) -> bool:
        """Register via HTTPS/HTTP POST to get a secure WebSocket token."""
        print(f"[AgentClient] Registering with Admin at {self.admin_url}/api/fleet/register")
        payload = self.get_system_info()
        
        try:
            import urllib.request
            import urllib.parse
            import json
            req = urllib.request.Request(
                f"{self.admin_url}/api/fleet/register", 
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            # Use asyncio.to_thread to make the blocking call async-friendly
            def _do_request():
                with urllib.request.urlopen(req) as response:
                    return json.loads(response.read().decode('utf-8'))
            
            data = await asyncio.to_thread(_do_request) # type: ignore
            self.token = data.get("token")
            print(f"[AgentClient] Registered successfully via urllib.")
            return True
        except Exception as e:
            print(f"[AgentClient] Registration error: {e}")
            return False

    async def connect_and_stream(self):
        """Establish persistent WebSocket, stream telemetry, and listen for commands."""
        if not self.token:
            if not await self.register():
                print("[AgentClient] Halting due to registration failure.")
                return

        ws_url = f"{self.admin_ws_url}/ws/agent/{self.node_id}?token={self.token}"
        print(f"[AgentClient] Connecting to WebSockets at {ws_url}")

        while True:
            try:
                import websockets # type: ignore
                async with websockets.connect(ws_url) as ws:
                    self.connected = True
                    print("[AgentClient] Connected to Admin WebSocket successfully.")
                    
                    # Run listener and streamer concurrently
                    listener_task = asyncio.create_task(self._listen_for_commands(ws))
                    streamer_task = asyncio.create_task(self._stream_telemetry(ws))
                    
                    # Wait until one of them fails or connection closes
                    await asyncio.gather(listener_task, streamer_task)

            except Exception as e:
                self.connected = False
                print(f"[AgentClient] WebSocket Error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def _listen_for_commands(self, ws):
        """Listen for incoming mitigation commands from the Admin."""
        try:
            async for message in ws:
                data = json.loads(message)
                if data.get("type") == "COMMAND":
                    cmd_id = data.get("command_id")
                    action = data.get("action")
                    params = data.get("params", {})
                    
                    print(f"[AgentClient] Received COMMAND {action} (ID: {cmd_id})")
                    
                    # Execute locally
                    success = await self._execute_local_action(action, params)
                    
                    # Send ACK
                    ack_payload = {
                        "type": "RESPONSE",
                        "command_id": cmd_id,
                        "status": "success" if success else "failed"
                    }
                    await ws.send(json.dumps(ack_payload))
        except Exception as e:
            print(f"[AgentClient] Listener closed: {e}")

    async def _execute_local_action(self, action: str, params: Dict[str, Any]) -> bool:
        """Execute the remediation action on the local machine."""
        print(f"[AgentClient] Executing {action} with {params}...")
        try:
            if action == "isolate_node":
                print(f"[Exec] Isolating network interfaces (simulation)...")
                await asyncio.sleep(1) # simulate work
                return True
            elif action == "block_ip":
                ip = params.get("target_ip")
                print(f"[Exec] Blocking IP {ip} in local firewall rules...")
                await asyncio.sleep(1) # simulate firewall command
                return True
            elif action == "kill_process":
                pid = params.get("pid")
                print(f"[Exec] Killing process {pid}...")
                await asyncio.sleep(0.5)
                return True
            else:
                print(f"[Exec] Unknown action: {action}")
                return False
        except Exception as e:
            print(f"[AgentClient] Action execution failed: {e}")
            return False

    async def _stream_telemetry(self, ws):
        """Continuously push telemetry to the Admin node."""
        from backend.engine.telemetry import TelemetryEngine # type: ignore
        telemetry_engine = TelemetryEngine()
        
        while self.connected:
            try:
                # Collect local telemetry
                stats = await asyncio.to_thread(telemetry_engine.get_system_stats)
                
                # Bundle and send
                payload = {
                    "type": "TELEMETRY",
                    "data": {
                        "system": stats,
                        "events": [] # Normally we would tail local audit logs here
                    }
                }
                await ws.send(json.dumps(payload))
                
                # Push every 3 seconds
                await asyncio.sleep(3)
            except Exception as e:
                print(f"[AgentClient] Streamer error: {e}")
                break # breaks loop, reconnects

# Entry point for running the agent
if __name__ == "__main__":
    admin_url = os.environ.get("ADMIN_URL", "http://localhost:8000")
    node_id = os.environ.get("NODE_ID", platform.node())
    
    client = AgentClient(admin_url, node_id)
    asyncio.run(client.connect_and_stream())
