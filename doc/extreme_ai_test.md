# extreme_ai_test.py Documentation

## Purpose
`extreme_ai_test.py` is an advanced stress-testing script designed to evaluate the AI Decision Engine's performance under a simulated "Mass Compromise" scenario. It bypasses conventional telemetry and forces a high-severity context into the LLM (Ollama) to verify that the SOAR (Security Orchestration, Automation, and Response) logic triggers correctly for critical threats.

## Key Features
- **Extreme Threat Simulation**: Uses a pre-defined `EXTREME_THREAT_CONTEXT` describing a multi-stage attack (Ransomware, DLL injection, 50GB exfiltration, Pass-The-Hash).
- **Ollama Integration**: Streams prompts to a local Ollama instance (running `llama3`) to generate an AI verdict.
- **Graceful Fallback**: Includes a hardcoded mock response if the local Ollama service is unavailable, ensuring the test can still validate the downstream `decision_engine` logic.
- **SOAR Gating Verification**: Explicitly enables `autonomy_mode` on the `decision_engine` and verifies that the resulting action (e.g., `isolate_host`) is correctly generated and marked as "auto-executed".
- **Evidence Extraction**: Prints the specific evidence and anomalies identified by the AI during the decision process.

## Implementation Details
- Uses `httpx` for streaming asynchronous POST requests to the Ollama API.
- Leverages the `EVENT_ANALYSIS_TEMPLATE` from `backend.ai.prompts` for consistent prompting.
- Directly interacts with `decision_engine.decide_action()` to perform a native loop execution.

## Dependencies
- `httpx`: For asynchronous HTTP requests to Ollama.
- `backend.ai.decision_engine`: The core engine being tested.
- `backend.ai.prompts`: Standardized prompt templates.

## Usage
```bash
python extreme_ai_test.py
```
This script is essential for validating the "Autonomous" mode of AegisAI under the most severe conditions.
