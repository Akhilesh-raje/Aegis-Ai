"""
AegisAI — WebSocket Streaming Hub
Manages WebSocket connections and broadcasts channel-based delta updates.
Replaces the SSE StreamManager with a production-grade event system.
"""

import asyncio
import json
import hashlib
from typing import Dict, Any, Set, Optional, List, Tuple
from itertools import islice

# pyre-ignore[21]
from fastapi import WebSocket


class WebSocketManager:
    """
    Production-grade WebSocket connection manager.
    - Priority-based broadcasting via asyncio.PriorityQueue
    - Dedicated background worker for non-blocking sends
    - Channel-based delta detection
    - Dead socket auto-cleanup
    """

    def __init__(self):
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._last_sent_hash: Dict[str, str] = {}  # channel -> hash of last sent data
        self._channel_cache: Dict[str, Any] = {}   # channel -> last sent payload
        self._queue: asyncio.PriorityQueue[tuple[int, str]] = asyncio.PriorityQueue()
        self._worker_task: Optional[asyncio.Task[None]] = None
        
        # Priority mapping (lower = higher priority)
        self.PRIORITIES = {
            "AI_DECISIONS": 10,
            "AI_ADVISOR": 10,
            "THREATS": 10,
            "AI_CHAT": 15,
            "INSIGHTS": 50,
            "TELEMETRY": 55,
            "STATS": 90,
            "FLEET": 90,
            "IDENTITY": 95,
            "COMMAND_UPDATES": 20,
            "GRAPH": 100,
            "SIMULATION": 100,
            "WAR_ROOM_STATUS": 5,
            "WAR_ROOM_LOGS": 10,
            "WAR_ROOM_FINAL": 5
        }

    def start_worker(self):
        """Initialize the background broadcast worker."""
        worker = self._worker_task
        if worker is None or worker.done():
            # pyre-ignore[8]
            self._worker_task = asyncio.create_task(self._broadcast_worker())
            print("[WebSocket] Background broadcast worker started.")

    async def _broadcast_worker(self):
        """Continuously pulls from priority queue and sends to clients."""
        while True:
            try:
                priority, message = await self._queue.get()
                
                async with self._lock:
                    clients = list(self._clients)
                
                if not clients:
                    self._queue.task_done()
                    continue

                # Parallel broadcast
                async def _safe_send(ws: WebSocket):
                    try:
                        await ws.send_text(message)
                        return None
                    except Exception:
                        return ws

                results = await asyncio.gather(*[_safe_send(c) for c in clients])
                
                # Check for dead clients
                dead = [ws for ws in results if ws is not None]
                if dead:
                    async with self._lock:
                        for ws in dead:
                            self._clients.discard(ws)
                
                self._queue.task_done()
            except Exception as e:
                print(f"[WebSocket Worker] Error: {e}")
                await asyncio.sleep(0.1)

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket client, then send initial state."""
        await websocket.accept()
        
        # Ensure worker is running
        self.start_worker()
        
        # Send current cache to the new client immediately
        async with self._lock:
            for channel, data in self._channel_cache.items():
                try:
                    message = json.dumps({"channel": channel, "data": data}, default=str)
                    await websocket.send_text(message)
                except Exception:
                    pass
            self._clients.add(websocket)
            
        print(f"[WebSocket] Client connected and synced. Active: {len(self._clients)}")

    async def disconnect(self, websocket: WebSocket):
        """Remove a disconnected client."""
        async with self._lock:
            self._clients.discard(websocket)
        print(f"[WebSocket] Client disconnected. Active: {len(self._clients)}")

    def _data_hash(self, data: Any) -> str:
        """Fast hash of serialized data for delta detection."""
        raw = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(raw.encode()).hexdigest()

    async def broadcast_channel(self, channel: str, data: Any, force: bool = False):
        """
        Enqueue data for priority broadcasting — only if data has changed or forced.
        """
        # Ensure worker is running
        if self._worker_task is None:
            self.start_worker()

        # Update cache
        self._channel_cache[channel] = data
        
        # Delta check: skip if data hasn't changed
        if not force:
            data_hash = self._data_hash(data)
            if self._last_sent_hash.get(channel) == data_hash:
                return
            self._last_sent_hash[channel] = data_hash

        # Enqueue with priority
        priority = self.PRIORITIES.get(channel, 100)
        message = json.dumps({"channel": channel, "data": data}, default=str)
        
        # Non-blocking put
        await self._queue.put((priority, message))

    @property
    def client_count(self) -> int:
        return len(self._clients)


# Global instance
ws_manager = WebSocketManager()

