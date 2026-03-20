# backend/ai/prompts.py Documentation

## Purpose
`prompts.py` defines the "Persona and Structure" of AegisAI. It contains the carefully crafted system prompts, context builders, and knowledge seeds that shape the AI's behavior as an elite SOC analyst.

## Key Features
- **Elite Persona Definition**: Establishes AEGIS as a precise, action-oriented senior analyst with a focus on quantification and MITRE alignment.
- **Structured Interaction Templates**:
    - `CHAT_TEMPLATE`: Grounds user queries in "Evidence-Based" system state.
    - `ADVISORY_TEMPLATE`: Shapes the periodic dashboard narratives with a focus on temporal trends.
    - `EVENT_ANALYSIS_TEMPLATE`: Implements the "Multi-Agent Swarm" forensic analysis protocol (NetSec vs Endpoint vs Commander).
- **The Sentinel Protocol**: Defines the exact structured format (`[MITIGATION: ... | ...]`) the AI must use to trigger autonomous actions.
- **Knowledge Base Seeds**: A curated collection of 15+ comprehensive cybersecurity pattern definitions (e.g., DNS Tunneling, Credit Dumping, SMB Exposure) used for RAG pre-population.
- **Fallback Response Library**: A comprehensive set of template-based responses used to maintain intelligence functionality even when the LLM is offline.

## Key Components
- `SYSTEM_PROMPT`: The foundational instructions for the LLM.
- `CONTEXT_TEMPLATE`: The schema for the "Live System State" markdown block.
- `KNOWLEDGE_SEEDS`: The list of pre-defined IOVs and remediation advice.

## Usage
Imported by the `AegisAIEngine` and `KnowledgeStore` to construct LLM requests and initialize vector memory.
