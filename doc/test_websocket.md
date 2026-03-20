# test_websocket.py Documentation

## Purpose
`test_websocket.py` is a simple connectivity and stream verification utility. It confirms that the main AegisAI WebSocket endpoint is reachable and is actively broadcasting multiplexed data on standard channels.

## Key Features
- **Multi-Channel Verification**: Listens for and identifies messages from:
    - `STATS`: System-wide event and threat counts.
    - `TELEMETRY`: Raw packet/event data.
    - `THREATS`: The active threat feed.
    - `SIMULATION`: Status of background simulation loops.
    - `CONNECTIONS`: Data for the geographic threat map.
- **Payload Inspection**: Prints a brief summary of the data received for the first 5 messages to verify validity.

## Implementation Details
- Uses `asyncio` and `websockets` to connect to `ws://localhost:8000/api/ws`.
- Terminates automatically after receiving 5 messages.

## Dependencies
- `websockets`: For WebSocket client functionality.

## Usage
```bash
python test_websocket.py
```
This is the primary "smoke test" for verifying that the backend's real-time streaming layer is operational.
