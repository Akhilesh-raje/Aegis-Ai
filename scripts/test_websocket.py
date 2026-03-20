import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/api/ws"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected!")
            
            messages_received = 0
            while messages_received < 5:
                message = await websocket.recv()
                data = json.loads(message)
                
                channel = data.get("channel")
                payload = data.get("data")
                
                print(f"\n[{messages_received+1}/5] Received on channel: {channel}")
                
                if channel == "STATS":
                    print(f"   -> Events: {payload.get('total_events')} | Threats: {payload.get('active_threats')}")
                elif channel == "TELEMETRY":
                    print(f"   -> Packet count: {len(payload)}")
                elif channel == "THREATS":
                    print(f"   -> Threat feed size: {len(payload)}")
                elif channel == "SIMULATION":
                    print(f"   -> Active sims: {len(payload)}")
                elif channel == "CONNECTIONS":
                    print(f"   -> Geo map points: {len(payload)}")
                else:
                    print(f"   -> {str(payload)[:100]}...")  # pyre-ignore[16]
                
                messages_received += 1
                
            print("\n✅ Successfully verified real-time multiplexed WebSocket streaming!")

    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
