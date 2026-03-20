# backend/ai/knowledge_store.py Documentation

## Purpose
`knowledge_store.py` provides the "Long-Term Memory" for AegisAI. It utilizes a vector database to store and retrieve cybersecurity knowledge, attack patterns, historical incidents, and conversation history.

## Key Features
- **Vector Memory (ChromaDB)**: Uses embedded ChromaDB for high-performance semantic search, allowing the AI to find "similar" patterns even without exact keyword matches.
- **Hybrid Search Fallback**: Automatically falls back to a custom keyword-overlap scoring system if ChromaDB or its dependencies are unavailable.
- **Knowledge Seeding**: Pre-populates the memory with a target list of known attack techniques (brute force, exfiltration, lateral movement, etc.) mapped to MITRE ATT&CK.
- **Incident Persistence**: Stores all detected system incidents as vector documents, enabling the AI to "remember" past attacks and recognize recurring patterns.
- **Session Memory**: Tracks conversation history for individual session IDs to maintain context throughout multi-turn AI interactions.
- **Metadata Management**: Supports rich metadata filtering (e.g., by category, MITRE ID, or severity) to narrow down RAG results.

## Implementation Details
- `KnowledgeStore.query_similar()`: The primary RAG entry point used by the AI engine.
- `seed_knowledge()`: Idempotent initialization method to ensure the core knowledge base is always present.
- Uses `cosine` similarity for vector comparisons.

## Storage
Vector data is persisted in `backend/storage/vector_db` by default.

## Usage
Initialized once at startup and shared by the `AegisAIEngine` and `DecisionEngine` for context enrichment and self-learning.
