import asyncio
import websockets  # type: ignore
import json

async def test_websocket():
    uri = "ws://127.0.0.1:8000/api/ws"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected to backend WS")
            await ws.send(json.dumps({"channel": "test"}))
            res = await ws.recv()
            print("Received:", res)
    except Exception as e:
        print("Failed to connect:", e)

if __name__ == "__main__":
    asyncio.run(test_websocket())
