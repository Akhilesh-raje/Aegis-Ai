# test_ai_ws.py Documentation

## Purpose
`test_ai_ws.py` is a verification script for the AI Chat WebSocket interface. It tests the ability of the backend to handle natural language queries, stream back tokens in real-time, and provide metadata about the AI's operating mode.

## Key Features
- **Real-time Streaming**: Specifically tests the `token` event type to ensure the UI can provide a smooth "typing" effect for AI responses.
- **Metadata Verification**: Checks for the `meta` event which contains information like the current AI model or processing mode.
- **Session Tracking**: Uses `session_id` to maintain context (though this script focuses on a single-turn interaction).

## Implementation Details
- Connects to `ws://127.0.0.1:8001/api/ws` (Note: Uses port 8001, which is typically the dedicated AI service port in AegisAI's architecture).
- Sends a `channel: AI_CHAT` request with a sample query: "What is the current system health?".
- Loops until a `done` event or flag is received.

## Dependencies
- `websockets`: For bi-directional streaming.
- `uuid`: For unique session identification.

## Usage
```bash
python test_ai_ws.py
```
Verifies that the "Neural Advisor" or "Aegis Assistant" is reachable and capable of streaming responses.
