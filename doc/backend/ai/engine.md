# backend/ai/engine.py Documentation

## Purpose
`engine.py` is the "Brain" of AegisAI. it orchestrates the integration of local LLMs (via Ollama) with real-time system telemetry and a vector knowledge base (RAG) to provide intelligent security analysis and conversational capabilities.

## Key Features
- **Context-Aware Reasoning**: Automatically builds a comprehensive "System Snapshot" from live telemetry, processes, network connections, and security signals to ground the AI's responses in reality.
- **RAG Enrichment**: Queries the `KnowledgeStore` for semantically similar attack patterns and historical incidents to provide "historical perspective" and "expert knowledge" to the LLM.
- **Multi-Modal Generation**:
    - **Conversational Chat**: Interactive natural language interface for analysts.
    - **Proactive Advisories**: Periodic security narratives generated for the dashboard.
    - **Deep Event Analysis**: Multi-agent "Swarm" style forensic deep-dives into specific threats.
- **Deterministic Fallback**: Implements a robust rule-based response engine that takes over if the local LLM is unavailable or times out.
- **Circuit Breaker Pattern**: Monitors LLM health and automatically trips a circuit breaker after 3 consecutive failures to prevent system hangs.
- **Streaming Support**: Provides token-by-token streaming over both SSE and WebSockets for a responsive, real-time user experience.

## Implementation Details
- `AegisAIEngine.build_context()`: The core aggregation method that translates raw system state into a structured markdown prompt.
- `_ollama_chat()` / `_ollama_stream()`: Asynchronous handlers for the Ollama API using `httpx`.
- `_fallback_response()`: A sophisticated template-based generator for zero-latency rule-based interactions.

## Dependencies
- `httpx`: For asynchronous communication with the Ollama API.
- `backend.ai.knowledge_store`: For vector memory retrieval.
- `backend.ai.prompts`: For structured persona and template definitions.

## Usage
The central AI engine is initialized in `backend/main.py` and serves both the API endpoints and the real-time streaming tasks.
