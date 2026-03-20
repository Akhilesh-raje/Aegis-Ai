# backend/engine/telemetry.py Documentation

## Purpose
`telemetry.py` is the primary data acquisition layer for AegisAI. It interacts directly with the host operating system to capture real-time performance metrics, network status, and system logs.

## Key Features
- **System Metrics**: Uses `psutil` to fetch CPU usage, RAM stats, and disk I/O.
- **Network I/O**: Calculates real-time upload and download speeds in Mbps by monitoring network interface counters.
- **Geo-Contextual Intelligence**:
    - Periodically fetches public IP, ISP, and city/country data using `ip-api.com`.
    - Detects active VPN connections using interface name heuristics.
- **OS Log Integration**: Executes prioritized PowerShell commands to fetch the most recent Windows System/Security logs without blocking.
- **Process & Connection Auditing**:
    - Identifies top processes by CPU/Memory usage.
    - Monitors active network connections (netstat-style) including PIDs and remote addresses.
- **Background Fetcher**: Uses a dedicated daemon thread to refresh slow network context data every 5 minutes, ensuring the main telemetry calls remain fast.

## Implementation Details
- `TelemetryEngine.get_full_telemetry()`: The master method that aggregates all stats into a single dictionary for the dashboard.
- Uses `subprocess.run` with `CREATE_NO_WINDOW` flags to silently execute PowerShell commands.
- Implements a caching mechanism for internet speedtests (where available) to avoid high-latency calls.

## Dependencies
- `psutil`: For low-level system metrics.
- `urllib.request`: For Geo-IP API calls.
- `json`: For log and API response parsing.

## Usage
Initialised as a singleton in `backend/main.py` and queried every 3 seconds by the telemetry stream task.
