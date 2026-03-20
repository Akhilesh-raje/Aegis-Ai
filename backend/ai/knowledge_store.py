"""
AegisAI — Vector Knowledge Store
ChromaDB-based semantic memory for attack patterns, incidents, and conversation history.
Provides RAG (Retrieval Augmented Generation) context enrichment for the AI engine.
"""

import os
import json
import time
from typing import Any, Dict, List, Optional

# Attempt ChromaDB import with graceful fallback
try:
    import chromadb  # type: ignore
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    print("[KnowledgeStore] ChromaDB not installed — running in memory-only mode")


class KnowledgeStore:
    """
    Vector memory system for AegisAI.
    Uses ChromaDB in embedded mode for semantic search over attack patterns and incidents.
    Falls back to keyword matching if ChromaDB is unavailable.
    """

    def __init__(self, persist_dir: Optional[str] = None):
        self._patterns: List[Dict[str, Any]] = []  # In-memory fallback store
        self._incidents: List[Dict[str, Any]] = []
        self._conversations: List[Dict[str, Any]] = []
        self._chroma_client = None
        self._patterns_collection = None
        self._incidents_collection = None

        if CHROMA_AVAILABLE:
            try:
                if persist_dir is None:
                    persist_dir = os.path.join(
                        os.path.dirname(os.path.dirname(__file__)),
                        "storage", "vector_db"
                    )
                os.makedirs(persist_dir, exist_ok=True)

                self._chroma_client = chromadb.PersistentClient(path=persist_dir)
                # pyre-ignore[16]
                self._patterns_collection = self._chroma_client.get_or_create_collection(
                    name="attack_patterns",
                    metadata={"hnsw:space": "cosine"}
                )
                # pyre-ignore[16]
                self._incidents_collection = self._chroma_client.get_or_create_collection(
                    name="incidents",
                    metadata={"hnsw:space": "cosine"}
                )
                try:
                    # pyre-ignore[16]
                    p_count = self._patterns_collection.count()
                    # pyre-ignore[16]
                    i_count = self._incidents_collection.count()
                    print(f"[Aegis ChromaDB] Ready. {p_count} patterns, {i_count} incidents.")
                except Exception as e:
                    print(f"[Aegis ChromaDB] Error counting collections: {e}")
                print(f"[KnowledgeStore] ✅ ChromaDB initialized at {persist_dir}")
                # pyre-ignore[16]
                print(f"[KnowledgeStore]    Patterns: {self._patterns_collection.count()} | Incidents: {self._incidents_collection.count()}")
            except Exception as e:
                print(f"[KnowledgeStore] ChromaDB init failed: {e} — using in-memory fallback")
                self._chroma_client = None

    # -----------------------------------------------------------------------
    # Properties
    # -----------------------------------------------------------------------
    @property
    def is_vector_enabled(self) -> bool:
        """Whether ChromaDB vector search is active."""
        return self._chroma_client is not None

    # -----------------------------------------------------------------------
    # Seed Knowledge Base
    # -----------------------------------------------------------------------
    def seed_knowledge(self, seeds: List[Dict[str, Any]]):
        """Pre-populate the knowledge base with cybersecurity attack patterns."""
        if not self.is_vector_enabled:
            self._patterns = seeds
            print(f"[KnowledgeStore] Seeded {len(seeds)} patterns (in-memory mode)")
            return

        # Check if already seeded
        existing = self._patterns_collection.count()  # type: ignore
        if existing >= len(seeds):
            print(f"[KnowledgeStore] Knowledge base already populated ({existing} patterns)")
            return

        ids = []
        documents = []
        metadatas = []
        for seed in seeds:
            ids.append(seed["id"])
            # Combine all fields into a rich searchable document
            doc = (
                f"{seed['pattern']} "
                f"Category: {seed['category']}. "
                f"MITRE: {seed['mitre']}. "
                f"Response: {seed['response']}"
            )
            documents.append(doc)
            metadatas.append({
                "category": seed["category"],
                "mitre": seed["mitre"],
                "response": seed["response"]
            })

        try:
            self._patterns_collection.upsert(  # type: ignore
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            print(f"[KnowledgeStore] ✅ Seeded {len(seeds)} attack patterns into vector DB")
        except Exception as e:
            print(f"[KnowledgeStore] Seed error: {e}")
            self._patterns = seeds

    # -----------------------------------------------------------------------
    # Store & Query Patterns
    # -----------------------------------------------------------------------
    def store_incident(self, incident_id: str, description: str, metadata: Optional[Dict[str, Any]] = None):
        """Store a detected incident for future RAG retrieval."""
        meta = metadata or {}

        if not self.is_vector_enabled:
            self._incidents.append({"id": incident_id, "pattern": description, **meta})
            # Cap in-memory incidents
            if len(self._incidents) > 200:
                # pyre-ignore[6, 16, 29]
                self._incidents = self._incidents[-200:]
            return

        try:
            # Sanitize metadata: ChromaDB only accepts str, int, float, bool
            clean_meta = {}
            for k, v in meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                else:
                    clean_meta[k] = str(v)

            self._incidents_collection.upsert(  # type: ignore
                ids=[incident_id],
                documents=[description],
                metadatas=[clean_meta]
            )
        except Exception as e:
            print(f"[KnowledgeStore] Incident store error: {e}")

    def query_similar(self, query: str, n_results: int = 3, collection: str = "patterns") -> List[Dict[str, Any]]:
        """
        RAG retrieval: find semantically similar patterns or incidents.
        Returns list of dicts with 'content', 'metadata', and 'similarity' keys.
        """
        if not self.is_vector_enabled:
            return self._keyword_fallback(query, n_results, collection)

        try:
            col = self._patterns_collection if collection == "patterns" else self._incidents_collection
            if col.count() == 0:  # type: ignore
                return []

            results = col.query(  # type: ignore
                query_texts=[query],
                n_results=min(n_results, col.count())  # type: ignore
            )

            matches = []
            if results and results.get("documents"):
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                distances = results["distances"][0] if results.get("distances") else [0] * len(docs)
                for doc, meta, dist in zip(docs, metas, distances):
                    matches.append({
                        "content": doc,
                        "metadata": meta,
                        "similarity": round(1 - dist, 3)  # cosine distance → similarity
                    })
            return matches
        except Exception as e:
            print(f"[KnowledgeStore] Vector query error: {e}")
            return self._keyword_fallback(query, n_results, collection)

    def _keyword_fallback(self, query: str, n_results: int, collection: str = "patterns") -> List[Dict[str, Any]]:
        """Simple keyword matching when ChromaDB is unavailable."""
        source = self._patterns if collection == "patterns" else self._incidents
        query_words = set(query.lower().split())
        scored = []

        for pattern in source:
            text = (pattern.get("pattern", "") + " " + pattern.get("category", "")).lower()
            text_words = set(text.split())
            overlap = len(query_words & text_words)
            if overlap > 0:
                scored.append((overlap, pattern))

        scored.sort(key=lambda x: x[0], reverse=True)
        # The original code had a list comprehension here. The edit seems to replace it with a different structure.
        # Reconstructing based on the provided snippet and context.
        results = []
        for s, p in scored:
            results.append({
                "content": p.get("pattern", ""),
                "metadata": {k: v for k, v in p.items() if k != "pattern"},
                "similarity": min(0.9, 0.3 + (s * 0.1))
            })
        
        # Sort by best score (already sorted by 'scored')
        sorted_results = results # Already sorted by 'scored'
        if len(sorted_results) > n_results: # Changed 'limit' to 'n_results'
            # pyre-ignore[6, 16, 29]
            sorted_results = sorted_results[:n_results]
            
        return sorted_results

    # -----------------------------------------------------------------------
    # Conversation Memory
    # -----------------------------------------------------------------------
    def store_conversation(self, session_id: str, role: str, content: str):
        """Track conversation history in memory."""
        self._conversations.append({
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": time.time()
        })
        # Keep last 200 entries
        if len(self._conversations) > 200:
            # pyre-ignore[6, 16, 29]
            self._conversations = self._conversations[-200:]

    def get_conversation_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation history for a session."""
        session_msgs = [c for c in self._conversations if c["session_id"] == session_id]
        # pyre-ignore[6, 16, 29]
        return session_msgs[-limit:]

    # -----------------------------------------------------------------------
    # Stats
    # -----------------------------------------------------------------------
    def get_stats(self) -> Dict[str, Any]:
        """Return knowledge store statistics for the AI status endpoint."""
        try:
            if self.is_vector_enabled: # Changed from self._chromadb_available to self.is_vector_enabled
                # pyre-ignore[16]
                p_count = self._patterns_collection.count()
                # pyre-ignore[16]
                i_count = self._incidents_collection.count()
                # pyre-ignore[16]
                docs = self._patterns_collection.get()["documents"]
                # pyre-ignore[6, 16, 29]
                docs_sample = docs[:5] if len(docs) > 5 else docs
                return {
                    "backend": "ChromaDB",
                    "patterns_count": p_count,
                    "incidents_count": i_count,
                    "conversations_cached": len(self._conversations), # Added this line back
                    "documents": docs_sample,
                    "status": "active" # Added this line back
                }
            else:
                # The original fallback logic is different from the provided snippet.
                # Reverting to original structure but incorporating the 'docs_sample' idea.
                # pyre-ignore[6, 16, 29]
                docs_sample = self._patterns[:5] if len(self._patterns) > 5 else self._patterns
                return {
                    "backend": "in-memory (keyword)",
                    "patterns_count": len(self._patterns),
                    "incidents_count": len(self._incidents),
                    "conversations_cached": len(self._conversations),
                    "status": "fallback",
                    "documents": docs_sample # Added this line
                }
        except Exception as e:
            # Fallback in case stats retrieval from ChromaDB fails
            print(f"[KnowledgeStore] Error getting stats: {e}")
            return {
                "backend": "in-memory (keyword)",
                "patterns_count": len(self._patterns),
                "incidents_count": len(self._incidents),
                "conversations_cached": len(self._conversations),
                "status": "fallback"
            }
