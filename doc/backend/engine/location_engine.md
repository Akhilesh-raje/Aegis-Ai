# backend/engine/location_engine.py Documentation

## Purpose
`location_engine.py` provides the "Geospatial Awareness" for AegisAI. It monitors the host's public network presence, geolocates the node, and implements heuristic detection for VPN or Proxy usage.

## Key Features
- **Real-Time Geolocation**: Fetches city, country, latitude, longitude, and ISP details using `ip-api.com`.
- **Public IP Tracking**: Monitors for changes in the public IP address, which may indicate a network shift or VPN activation.
- **Heuristic VPN Detection**:
    - **ISP Keywords**: Scans ISP and AS information for keywords like `vpn`, `proxy`, `cloud`, `nord`, etc.
    - **Baseline Shift**: Detects if the current ISP or Country differs from the "Baseline" (the first location detected at startup).
- **TTL-Based Caching**: Implements a 5-minute cache for geo-data to avoid redundant API calls and rate-limiting.
- **Background Monitor**: Runs an independent 120-second polling loop to maintain network context without impacting main telemetry performance.

## Implementation Details
- `LocationEngine.start()`: Spawns the background monitoring loop.
- Uses `asyncio.to_thread` for synchronous `requests` calls to prevent blocking the event loop.
- Broadcasts updates immediately upon detecting a network shift via the `LOCATION` WebSocket channel.

## Dependencies
- `requests`: For external IP and Geo-API interaction.
- `backend.engine.stream_manager`: To broadcast location updates.

## Usage
Started automatically by `backend/main.py`. Provides the data displayed in the "Global Presence" or "Network Context" sections of the frontend.
