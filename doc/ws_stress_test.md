# ws_stress_test.py Documentation

## Purpose
`ws_stress_test.py` is the most comprehensive diagnostic and performance benchmarking tool for the AegisAI WebSocket architecture. It rigorously tests connection resilience, multi-client scaling, schema integrity, and data freshness.

## Key Features
- **Connection Resilience**: Tests connect/disconnect/reconnect cycles to ensure the server handles churn gracefully.
- **Multi-Client Scaling**: Spawns multiple concurrent clients to stress the server's broadcast performance.
- **Channel Completeness**: Verifies that all 10 standard channels (TELEMETRY, STATS, THREATS, INSIGHTS, SIMULATION, FLEET, IDENTITY, GRAPH, RISK_HISTORY, LOCATION) are delivering data.
- **Deep Schema Validation**: Performs field-level payload integrity checks for every message on every channel.
- **Delta Compression Audit**: Detects if the backend is correctly suppressing redundant data.
- **Latency & Throughput Profiling**: Provides detailed timing metrics, jitter analysis, and throughput (KB/s) benchmarks.
- **Report Card**: Generates a final scorecard with letter grades for various performance categories.

## Implementation Details
- Uses `asyncio` and `websockets` for high-concurrency client simulation.
- Implements a suite of `VALIDATORS` for each channel's specific JSON structure.
- Calculates statistics (Histogram, Jitter, Drift) for inter-message intervals.
- Supports command-line arguments for `--duration`, `--clients`, and a `--quick` smoke test mode.

## Dependencies
- `websockets`: For high-performance WebSocket client simulation.
- `argparse`: For flexible test configuration.
- `hashlib`: For delta/duplication detection.

## Usage
```bash
python ws_stress_test.py --clients 5 --duration 30
```
This is the standard tool for "stress-testing" the backend before production deployment or after major architectural changes.
