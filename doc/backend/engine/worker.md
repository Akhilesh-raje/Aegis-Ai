# backend/engine/worker.py Documentation

## Purpose
`worker.py` implements the "Deep Analysis Path" for AegisAI. It is an asynchronous background consumer that offloads compute-intensive machine learning inference and policy evaluation from the primary telemetry stream, ensuring the system remains responsive under high event loads.

## Key Features
- **Asynchronous ML Inference**: Pulls batches of telemetry features from an `asyncio.Queue` and processes them through the `ThreatClassifier`.
- **Batch Processing**: Optimizes performance by classifying multiple anomalous windows simultaneously using vectorized operations (NumPy).
- **SOAR v2.5 Integration**: Automatically evaluates every detected threat against the `PolicyEngine` to determine the appropriate response mode (Autonomous vs Manual).
- **Real-Time Threat Persistence**: Inserts confirmed threats into the database with enriched intelligence (explanations, recommendations, asset context).
- **Autonomous Remediation Trigger**: Directly invokes the `ResponseEngine` to execute containment if a policy permits autonomous action.
- **Late Intelligence Push**: Forces an immediate WebSocket broadcast on the `THREATS` channel after processing, ensuring the dashboard reflects the results of the deep analysis as soon as they are ready.

## Implementation Details
- `MLWorker`: A lifecycle-managed component that runs an infinite `_process_queue` loop.
- `analyze_async()`: The non-blocking entry point for the main telemetry loop.
- Uses `time.time()` for precise event tracking and `uuid` for threat record identification.

## Dependencies
- `numpy`: For vectorized classification efficiency.
- `backend.engine.threat_intel`: For explanation generation.
- `backend.engine.stream_manager`: For priority broadcasting.

## Usage
Initialized and started in `backend/main.py`. Acts as the "analytical backbone" of the platform's detection pipeline.
