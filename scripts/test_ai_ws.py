import asyncio
import websockets
import json
import uuid

async def test_ai_ws():
    uri = "ws://127.0.0.1:8001/api/ws"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("âœ… Connected!")
            
            # Send AI Chat Query
            session_id = str(uuid.uuid4())
            query = "What is the current system health?"
            print(f"Sending AI_CHAT query: {query}")
            await websocket.send(json.dumps({
                "channel": "AI_CHAT",
                "query": query,
                "session_id": session_id
            }))
            
            # Listen for responses
            ai_chat_meta = False
            ai_chat_tokens = 0
            ai_chat_done = False
            
            while not ai_chat_done:
                message = await websocket.recv()
                data = json.loads(message)
                
                channel = data.get("channel")
                
                if channel == "AI_CHAT":
                    event = data.get("event")
                    if event == "meta":
                        ai_chat_meta = True
                        print(f"   [Meta] Mode: {data.get('mode')}")
                    elif event == "token":
                        ai_chat_tokens += 1
                        print(data.get("token"), end="", flush=True)
                    elif event == "done" or data.get("done") == True:
                        ai_chat_done = True
                        print("\n   [Done] Stream complete.")
                        
            print(f"\nâœ… Successfully verified AI_CHAT over WS! ({ai_chat_tokens} tokens received)")

    except Exception as e:
        print(f"âŒ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_ws())
