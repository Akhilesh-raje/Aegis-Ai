import asyncio
import json
import uuid
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import WebSocket, WebSocketDisconnect # type: ignore

class AgentServer:
    """
    Central Admin component that manages connected Agent WebSockets.
    Handles token validation, telemetry ingestion, and bi-directional command routing.
    """
    def __init__(self):
        # node_id -> auth_token
        self.registered_agents: Dict[str, str] = {}
        # node_id -> WebSocket
        self.active_sockets: Dict[str, WebSocket] = {}
        # node_id -> last_seen timestamp
        self.agent_heartbeats: Dict[str, datetime] = {}
        # node_id -> dict of pending commands (command_id -> details)
        self.pending_commands: Dict[str, Dict[str, Any]] = {}

    def register_agent(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Issue a secure token to a new agent."""
        node_id = payload.get("node_id")
        if not node_id:
            raise ValueError("node_id is required for registration")
        
        # In a real system, you might validate hostname/IP here
        token = secrets.token_hex(32)
        self.registered_agents[node_id] = token
        
        # Update Fleet Manager safely via import
        try:
            from backend.engine.fleet_manager import fleet_manager # type: ignore
            hostname = payload.get("hostname", f"Node-{node_id}")
            fleet_manager.register_node(node_id, hostname, payload.get("os", "Unknown"))
        except ImportError:
            pass

        return {
            "status": "registered",
            "token": token,
            "node_id": node_id
        }

    def validate_token(self, node_id: str, token: str) -> bool:
        """Check if token is valid for the given node."""
        expected = self.registered_agents.get(node_id)
        if not expected or expected != token:
            return False
        return True

    async def connect_agent(self, websocket: WebSocket, node_id: str, token: str) -> bool:
        """Accept agent WebSocket connection if authenticated. Returns True on success."""
        if not self.validate_token(node_id, token):
            await websocket.close(code=1008, reason="Invalid token")
            return False

        await websocket.accept()
        self.active_sockets[node_id] = websocket
        self.agent_heartbeats[node_id] = datetime.now(timezone.utc)
        print(f"[AgentServer] Agent {node_id} securely connected.")
        return True

    async def disconnect_agent(self, node_id: str):
        """Handle agent disconnection."""
        self.active_sockets.pop(node_id, None)
        print(f"[AgentServer] Agent {node_id} disconnected.")

    async def listen(self, websocket: WebSocket, node_id: str):
        """Main loop for listening to incoming Agent telemetry and responses."""
        try:
            while True:
                raw_msg = await websocket.receive_text()
                try:
                    params = json.loads(raw_msg)
                    msg_type = params.get("type")
                    
                    self.agent_heartbeats[node_id] = datetime.now(timezone.utc)
                    
                    if msg_type == "TELEMETRY":
                        await self._process_telemetry(node_id, params.get("data", {}))
                    elif msg_type == "HEARTBEAT":
                        pass # Already updated timestamp
                    elif msg_type == "RESPONSE":
                        await self._process_response(node_id, params)
                except json.JSONDecodeError:
                    print(f"[AgentServer] Invalid JSON from {node_id}")
        except WebSocketDisconnect:
            await self.disconnect_agent(node_id)
        except Exception as e:
            print(f"[AgentServer] Error listening to {node_id}: {e}")
            await self.disconnect_agent(node_id)

    async def _process_telemetry(self, node_id: str, data: Dict[str, Any]):
        """Route incoming telemetry to the core engine and update fleet metrics."""
        # Update fleet_manager with live metrics from the agent
        try:
            from backend.engine.fleet_manager import fleet_manager # type: ignore
            system_data = data.get("system", {})
            cpu = system_data.get("cpu_usage", system_data.get("cpu_percent", 0))
            mem = system_data.get("ram_usage", system_data.get("memory_percent", 0))
            fleet_manager.update_node(node_id, 0, {"cpu": round(cpu, 1), "mem": round(mem, 1)})
        except Exception as e:
            print(f"[AgentServer] Fleet metric update error: {e}")
        
        # Route to the central analysis pipeline
        try:
            from backend.engine.normalization import EventNormalizer # type: ignore
            from backend.engine.identity_engine import identity_engine # type: ignore
            from backend.storage.database import Database # type: ignore
            
            if isinstance(data, dict):
                data["source_node"] = node_id
                
            db = Database()
            
            if isinstance(data, list):
                for event_data in data:
                    event_data["source_node"] = node_id
                    normalized = EventNormalizer.normalize_generic_event(event_data)
                    identity_engine.process_event(normalized)
                    db.insert_event(normalized.event_type, normalized.source_node, normalized.data)
            else:
                normalized_events = EventNormalizer.normalize_telemetry(data)
                for event in normalized_events:
                    event.source_node = node_id
                    identity_engine.process_event(event)
                    db.insert_event(event.event_type, event.source_node, event.data)
                    
        except Exception as e:
            print(f"[AgentServer] Telemetry processing error: {e}")

    async def _process_response(self, node_id: str, msg: Dict[str, Any]):
        """Handle Command Acknowledgement from Agent."""
        cmd_id = msg.get("command_id")
        status = msg.get("status")
        print(f"[AgentServer] Agent {node_id} executed command {cmd_id} with status {status}")
        
        try:
            del self.pending_commands[cmd_id] # type: ignore
        except KeyError:
            pass
            
        # Broadcast the update to the dashboard UI
        try:
            from backend.engine.stream_manager import ws_manager # type: ignore
            await ws_manager.broadcast_channel("COMMAND_UPDATES", {
                "node_id": node_id,
                "command_id": cmd_id,
                "status": status,
                "detail": msg.get("detail", "")
            })
        except Exception:
            pass

    async def send_command(self, node_id: str, action: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Push a remediation command to a connected Agent."""
        if node_id not in self.active_sockets:
            raise ValueError(f"Agent {node_id} is not connected.")
            
        cmd_id = str(uuid.uuid4())
        command_payload = {
            "type": "COMMAND",
            "command_id": cmd_id,
            "action": action,
            "params": params or {}
        }
        
        self.pending_commands[cmd_id] = command_payload
        
        ws = self.active_sockets[node_id]
        await ws.send_text(json.dumps(command_payload))
        print(f"[AgentServer] Dispatched {action} to {node_id} (Cmd ID: {cmd_id})")
        return cmd_id

agent_server = AgentServer()
