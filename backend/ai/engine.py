"""
AegisAI — Core AI Reasoning Engine
Integrates Ollama LLM with real-time telemetry context for intelligent
cybersecurity analysis, conversational chat, and proactive advisory generation.

Architecture:
    Telemetry → Context Builder → Knowledge Store (RAG) → LLM (Ollama) → Response
                                                          ↓
                                                    Fallback Engine (if LLM unavailable)
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
import sys
import os
from typing import TYPE_CHECKING, Any, AsyncGenerator, Dict, List, Optional
from collections import deque
from statistics import mean
from itertools import islice

if TYPE_CHECKING:
    from .decision_engine import DecisionEngine  # type: ignore

# httpx for async Ollama API calls
try:
    import httpx  # type: ignore
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("[AegisAI] httpx not installed — LLM engine will use fallback mode")

from backend.ai.prompts import (  # type: ignore
    SYSTEM_PROMPT,
    CONTEXT_TEMPLATE,
    CHAT_TEMPLATE,
    ADVISORY_TEMPLATE,
    EVENT_ANALYSIS_TEMPLATE,
    INCIDENT_SUMMARY_TEMPLATE,
    FALLBACK_RESPONSES,
)
from backend.ai.knowledge_store import KnowledgeStore  # type: ignore


class AegisAIEngine:
    """
    The Brain of AegisAI.
    Converts raw telemetry + ML signals into human-understandable intelligence
    via local LLM (Ollama) with RAG context enrichment.
    """

    def __init__(
        self,
        knowledge_store: KnowledgeStore,
        ollama_url: str = "http://localhost:11434",
        model: str = "llama3.2",
    ):
        self.knowledge_store = knowledge_store
        self.ollama_url = ollama_url
        self.model = model
        self._ollama_available: Optional[bool] = None
        self._last_health_check: float = 0
        self._health_check_interval: float = 30  # seconds
        self._last_advisory: str = ""
        self._last_advisory_time: float = 0
        self._app_state: Optional[Dict[str, Any]] = None
        
        # Performance/Health heuristics
        self._request_count: int = 0
        self._total_tokens: int = 0
        self._risk_history: deque[float] = deque(maxlen=20)
        self._threat_count_history: deque[int] = deque(maxlen=20)
        
        # Phase 12: LLM Deadlock Circuit Breaker
        self.llm_failures: int = 0

        print(f"[AegisAI Brain] Initialized | Model: {model} | Ollama: {ollama_url}")
        
        # Phase 12: Bind memory to Decision Engine for Swarm Self-Learning
        try:
            # Local import to avoid circular dependency
            from . import decision_engine as de  # type: ignore
            if hasattr(de, 'decision_engine'):
                de.decision_engine.bind_memory(self.knowledge_store)
        except Exception as e:
            print(f"[AegisAI Brain] decision_engine memory binding failed: {e}")

    @property
    def ollama_available(self) -> bool:
        """Type-safe access to status."""
        # pyre-ignore[7]
        return self._ollama_available if self._ollama_available is not None else False

    def set_app_state(self, app_state: Dict[str, Any]):
        """Wire the shared app_state for live telemetry access."""
        self._app_state = app_state

    # -----------------------------------------------------------------------
    # Health Check
    # -----------------------------------------------------------------------
    async def check_ollama(self) -> bool:
        """Check if Ollama is running and the model is available."""
        now = time.time()
        if (
            self._ollama_available is not None
            and now - self._last_health_check < self._health_check_interval
        ):
            return bool(self._ollama_available)

        if not HTTPX_AVAILABLE:
            self._ollama_available = False
            return False

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    # Check if our model (or a variant) is available
                    model_base = self.model.split(":")[0]
                    self._ollama_available = any(model_base in m for m in models)
                    if not self._ollama_available:
                        print(f"[AegisAI Brain] Model '{self.model}' not found. Available: {models}")
                else:
                    self._ollama_available = False
        except Exception:
            self._ollama_available = False

        self._last_health_check = now
        status = "🟢 CONNECTED" if self._ollama_available else "🟡 FALLBACK"
        print(f"[AegisAI Brain] Ollama status: {status}")
        return True if self._ollama_available else False

    # -----------------------------------------------------------------------
    # Context Builder — THE MOST IMPORTANT METHOD
    # -----------------------------------------------------------------------
    def build_context(self) -> str:
        """
        Aggregate all live system data into a structured prompt context.
        This is what makes the AI 'see' the actual system state.
        """
        state = self._app_state
        if state is None:
            return "System state unavailable — no telemetry connected."

        try:
            telemetry_engine = state.get("telemetry_engine")
            db = state.get("db")
            risk_scorer = state.get("risk_scorer")
            insights_engine = state.get("security_insights_engine")

            if telemetry_engine is None or db is None or risk_scorer is None:
                return "System components not fully initialized."

            # Explicit type help for linter
            t_engine = telemetry_engine
            d_base = db
            r_scorer = risk_scorer

            # pyre-ignore[16]
            telemetry = t_engine.get_full_telemetry()
            # pyre-ignore[16]
            stats = d_base.get_stats()
            # pyre-ignore[16]
            threats = d_base.get_threats(limit=5)

            # pyre-ignore[16, 29]
            system = telemetry.get("system", {})
            # pyre-ignore[16, 29]
            context_data = telemetry.get("context", {})
            # pyre-ignore[16, 29]
            network_io = telemetry.get("network_io", {})
            # pyre-ignore[16, 29]
            processes = telemetry.get("processes", [])
            # pyre-ignore[16, 29]
            connections = telemetry.get("connections", [])

            # Format connections
            conn_lines: List[str] = []
            listen_ports: List[str] = []
            # pyre-ignore[6]
            for conn in list(islice(connections, 10)):
                # pyre-ignore[29]
                status = conn.get("status", "UNKNOWN")
                # pyre-ignore[29]
                local = conn.get("local_address", "?")
                # pyre-ignore[29]
                remote = conn.get("remote_address", "?")
                if status == "LISTEN":
                    listen_ports.append(local)
                    conn_lines.append(f"  - LISTEN on {local}")
                elif status == "ESTABLISHED":
                    conn_lines.append(f"  - {local} → {remote} ({status})")

            # Format processes
            proc_lines: List[str] = []
            # pyre-ignore[6]
            for p in list(islice(processes, 8)):
                # pyre-ignore[29]
                name = p.get("name", "unknown")
                # pyre-ignore[29]
                cpu = p.get("cpu_percent", 0)
                # pyre-ignore[29]
                mem = p.get("memory_percent", 0)
                if cpu > 0 or mem > 0.5:
                    proc_lines.append(f"  - {name}: CPU {cpu}%, RAM {mem:.1f}%")

            # Format observations
            obs_lines: List[str] = []
            if insights_engine is not None:
                try:
                    # pyre-ignore[16]
                    signals = insights_engine.get_security_signals()
                    # pyre-ignore[16, 29]
                    for obs in list(islice(signals.get("observations", []), 5)):
                        # pyre-ignore[29]
                        obs_lines.append(
                            f"  - [{obs.get('risk_level', 'info').upper()}] "
                            f"{obs.get('title', 'Unknown')}: {obs.get('description', '')}"
                        )
                except Exception:
                    obs_lines.append("  - Observation engine temporarily unavailable")

            # Format threats
            threat_lines: List[str] = []
            # pyre-ignore[6]
            for t in list(islice(threats, 5)):
                # pyre-ignore[16, 29]
                threat_lines.append(
                    f"  - [{t.get('severity', 'unknown').upper()}] "
                    f"{t.get('explanation', t.get('threat_type', 'Unknown'))} "
                    f"(Source: {t.get('source_ip', '?')}, "
                    f"Confidence: {t.get('confidence', 0):.0f}%, "
                    f"MITRE: {t.get('mitre_id', 'N/A')})"
                )

            # Calculate Trends
            if r_scorer is not None:
                # pyre-ignore[16]
                current_risk = float(r_scorer.get_score())
                self._risk_history.append(current_risk)
                
                risk_trend_msg = "STABLE"
                # Type-safe list conversion for slicing
                rh_list = list(islice(self._risk_history, len(self._risk_history)))
                if len(rh_list) > 5:
                    # pyre-ignore[6]
                    avg_risk = mean(list(islice(rh_list, 0, len(rh_list)-1)))
                    diff = current_risk - avg_risk
                    if diff > 10: risk_trend_msg = f"SPIKING (+{diff:.1f} pts)"
                    elif diff > 3: risk_trend_msg = f"RISING (+{diff:.1f} pts)"
                    elif diff < -5: risk_trend_msg = f"DECREASING ({diff:.1f} pts)"
            else:
                current_risk = 50.0 # Default if no scorer
                risk_trend_msg = "STABLE"
            
            current_threats = int(stats.get("active_threats", 0))
            self._threat_count_history.append(current_threats)
            
            th_list = list(islice(self._threat_count_history, len(self._threat_count_history)))
            threat_trend = "STEADY"
            if len(th_list) > 5:
                # pyre-ignore[6]
                prev_avg = mean(list(islice(th_list, 0, len(th_list)-1)))
                if current_threats > prev_avg * 1.5: threat_trend = "ACCELERATING"
                elif current_threats < prev_avg * 0.5: threat_trend = "SUBSIDING"

            context = CONTEXT_TEMPLATE.format(
                # pyre-ignore[16, 29]
                cpu_usage=system.get("cpu_usage", 0),
                # pyre-ignore[16, 29]
                ram_usage=system.get("ram_usage", 0),
                # pyre-ignore[16, 29]
                ram_used_gb=system.get("ram_used_gb", 0),
                # pyre-ignore[16, 29]
                ram_total_gb=system.get("ram_total_gb", 0),
                # pyre-ignore[16, 29]
                public_ip=context_data.get("public_ip", "Unknown"),
                # pyre-ignore[16, 29]
                isp=context_data.get("isp", "Unknown"),
                # pyre-ignore[16, 29]
                location=context_data.get("location", "Unknown"),
                # pyre-ignore[16, 29]
                vpn_active="Yes" if context_data.get("vpn_active") else "No",
                # pyre-ignore[16, 29]
                upload_mbps=network_io.get("upload_mbps", 0),
                # pyre-ignore[16, 29]
                download_mbps=network_io.get("download_mbps", 0),
                connections_summary="\n".join(conn_lines) if conn_lines else "  - No active connections",
                exposed_ports="\n".join(f"  - {p}" for p in listen_ports) if listen_ports else "  - None detected",
                top_processes="\n".join(proc_lines) if proc_lines else "  - All processes nominal",
                # pyre-ignore[16]
                risk_score=current_risk,
                # pyre-ignore[16]
                risk_level=r_scorer.get_level(),
                risk_trend=risk_trend_msg,
                # pyre-ignore[16]
                active_threats=current_threats,
                threat_trend=threat_trend,
                # pyre-ignore[16]
                mitigated_threats=stats.get("mitigated_threats", 0),
                # pyre-ignore[16]
                total_events=stats.get("total_events", 0),
                observations="\n".join(obs_lines) if obs_lines else "  - No anomalies detected",
                recent_threats="\n".join(threat_lines) if threat_lines else "  - No recent threats",
            )
            return context

        except Exception as e:
            print(f"[AegisAI Brain] Context build error: {e}")
            return f"Context build error: {e}"

    # -----------------------------------------------------------------------
    # Core Chat — LLM-Powered Conversation
    # -----------------------------------------------------------------------
    async def chat(self, query: str, session_id: Optional[str] = None) -> str:
        """
        Process a user query with full system context.
        Uses Ollama if available, falls back to enhanced rule-based responses.
        """
        if session_id is None:
            session_id = str(uuid.uuid4())

        # Store user message
        self.knowledge_store.store_conversation(session_id, "user", query)

        # Build live context
        context = self.build_context()

        # RAG: find similar patterns
        similar = self.knowledge_store.query_similar(query, n_results=3)
        rag_context = ""
        if similar:
            rag_lines: List[str] = []
            for match in similar:
                # pyre-ignore[29]
                match_content = str(match.get("content", ""))
                # pyre-ignore[16]
                rag_lines.append(f"  - {match_content[:200]}")
            rag_context = "\n\nRelevant knowledge base matches:\n" + "\n".join(rag_lines)

        # Get conversation history for continuity
        history = self.knowledge_store.get_conversation_history(session_id, limit=6)

        # Try LLM first
        is_available = await self.check_ollama()
        if is_available:
            try:
                response = await self._ollama_chat(query, context + rag_context, history)
                self.knowledge_store.store_conversation(session_id, "assistant", response)
                self._request_count += 1
                return response
            except Exception as e:
                print(f"[AegisAI Brain] Ollama chat error: {e}")

        # Fallback to rule-based
        response = self._fallback_response(query)
        self.knowledge_store.store_conversation(session_id, "assistant", response)
        return response

    # -----------------------------------------------------------------------
    # Streaming Chat — Token-by-Token SSE
    # -----------------------------------------------------------------------
    async def stream_chat(self, query: str, session_id: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Async generator that yields response tokens for SSE streaming.
        Falls back to yielding the full response in chunks if Ollama unavailable.
        """
        if session_id is None:
            session_id = str(uuid.uuid4())

        self.knowledge_store.store_conversation(session_id, "user", query)

        context = self.build_context()

        # RAG enrichment
        similar = self.knowledge_store.query_similar(query, n_results=3)
        if similar:
            # pyre-ignore[29]
            rag_lines: List[str] = [f"  - {str(m.get('content', ''))[:200]}" for m in similar]
            context += "\n\nRelevant knowledge base matches:\n" + "\n".join(rag_lines)

        history = self.knowledge_store.get_conversation_history(session_id, limit=6)

        is_available = await self.check_ollama()
        if is_available and HTTPX_AVAILABLE:
            try:
                full_response = ""
                async for token in self._ollama_stream(query, context, history):
                    full_response += token
                    yield token

                self.knowledge_store.store_conversation(session_id, "assistant", full_response)
                self._request_count += 1
                return
            except Exception as e:
                print(f"[AegisAI Brain] Stream error: {e}")

        # Fallback: yield response word-by-word for animation effect
        response = self._fallback_response(query)
        words = response.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            await asyncio.sleep(0.03)  # Simulate typing speed
        self.knowledge_store.store_conversation(session_id, "assistant", response)

    # -----------------------------------------------------------------------
    # Websocket Streaming Chat — Unified Protocol
    # ---------------------------------------------------------------------------
    async def stream_chat_ws(self, query: str, session_id: str, websocket: Any) -> None:
        """
        Streams chat completion tokens directly over a provided WebSocket connection.
        Sends JSON packets formatted for the frontend AI_CHAT channel listener.
        """
        self.knowledge_store.store_conversation(session_id, "user", query)

        context = self.build_context()

        # RAG enrichment
        similar = self.knowledge_store.query_similar(query, n_results=3)
        if similar:
            # pyre-ignore[29]
            rag_lines: List[str] = [f"  - {str(m.get('content', ''))[:200]}" for m in similar]
            context += "\n\nRelevant knowledge base matches:\n" + "\n".join(rag_lines)

        history = self.knowledge_store.get_conversation_history(session_id, limit=6)

        is_available = await self.check_ollama()
        
        # Send mode indicator meta event
        try:
            await websocket.send_text(json.dumps({
                "channel": "AI_CHAT",
                "data": {
                    "event": "meta",
                    "mode": "ai" if is_available else "fallback",
                    "model": self.model if is_available else "rule-engine",
                    "session_id": session_id
                }
            }))
        except Exception:
            return

        if is_available and HTTPX_AVAILABLE:
            try:
                full_response = ""
                async for token in self._ollama_stream(query, context, history):
                    full_response += token
                    try:
                        await websocket.send_text(json.dumps({
                            "channel": "AI_CHAT",
                            "data": {"event": "token", "token": token, "done": False}
                        }))
                    except Exception:
                        break

                self.knowledge_store.store_conversation(session_id, "assistant", full_response)
                self._request_count += 1
            except Exception as e:
                print(f"[AegisAI Brain] Stream WS error: {e}")
                try:
                    err_msg = str(e)
                    await websocket.send_text(json.dumps({
                        "channel": "AI_CHAT",
                        # pyre-ignore[16]
                        "data": {"event": "error", "error": err_msg[:200]}
                    }))
                except Exception:
                    pass
        else:
            # Fallback: yield response word-by-word
            response = self._fallback_response(query)
            words = response.split(" ")
            for i, word in enumerate(words):
                token = word + (" " if i < len(words) - 1 else "")
                try:
                    await websocket.send_text(json.dumps({
                        "channel": "AI_CHAT",
                        "data": {"event": "token", "token": token, "done": False}
                    }))
                except Exception:
                    break
                await asyncio.sleep(0.03)
            self.knowledge_store.store_conversation(session_id, "assistant", response)

        # Signal completion
        try:
            await websocket.send_text(json.dumps({
                "channel": "AI_CHAT",
                "data": {"event": "done", "done": True}
            }))
        except Exception:
            pass

    # -----------------------------------------------------------------------
    # Proactive Advisory — AI-Generated Dashboard Narrative
    # -----------------------------------------------------------------------
    async def generate_advisory(self) -> Dict[str, Any]:
        """
        Generate a proactive security advisory for the AI_ADVISOR WebSocket channel.
        Called periodically (every 30s) to provide live AI narratives.
        """
        context = self.build_context()

        is_available = await self.check_ollama()
        if is_available:
            try:
                prompt = ADVISORY_TEMPLATE.format(context=context)
                response = await self._ollama_generate(prompt)
                self._last_advisory = response
                self._last_advisory_time = time.time()
                return {
                    "advisory": response,
                    "generated_at": time.time(),
                    "source": "llm",
                    "model": self.model
                }
            except Exception as e:
                print(f"[AegisAI Brain] Advisory generation error: {e}")

        # Fallback advisory
        advisory = self._build_fallback_advisory()
        return {
            "advisory": advisory,
            "generated_at": time.time(),
            "source": "fallback",
            "model": "rule-engine"
        }

    # -----------------------------------------------------------------------
    # Deep Event Analysis — Forensic AI
    # -----------------------------------------------------------------------
    async def analyze_event(self, threat: Dict[str, Any]) -> str:
        """Deep-analyze a specific threat/event with RAG-enriched context."""
        threat_type = threat.get("threat_type", "Unknown")
        source_ip = threat.get("source_ip", "Unknown")
        
        # Phase 12: Self-Learning Swarm Memory Pre-Emptive Gating
        memory_tag = f"[SWARM_MEMORY] THREAT:{threat_type} | IP:{source_ip}"
        memory_matches = self.knowledge_store.query_similar(memory_tag, n_results=1)
        if memory_matches and memory_tag in memory_matches[0].get("content", ""):
            print("[AegisAI Brain] Instant Swarm Memory Recall! Tripping neural inference bypass.")
            return memory_matches[0]["content"]
            
        context = self.build_context()

        # RAG: find similar historical patterns
        search_query = f"{threat.get('threat_type', '')} {threat.get('explanation', '')} {threat.get('mitre_tactic', '')}"
        similar = self.knowledge_store.query_similar(search_query, n_results=3)
        similar_text = "\n".join(
            f"  - [{m.get('metadata', {}).get('mitre', 'N/A')}] {m['content'][:300]}"
            for m in similar
        ) if similar else "None found"

        prompt = EVENT_ANALYSIS_TEMPLATE.format(
            event_type=threat.get("threat_type", "Unknown"),
            severity=threat.get("severity", "unknown"),
            confidence=threat.get("confidence", 0),
            source_ip=threat.get("source_ip", "Unknown"),
            anomaly_score=threat.get("anomaly_score", 0),
            explanation=threat.get("explanation", "No description"),
            mitre_id=threat.get("mitre_id", "N/A"),
            mitre_tactic=threat.get("mitre_tactic", "N/A"),
            similar_patterns=similar_text,
            context=context,
        )

        is_available = await self.check_ollama()
        if is_available:
            try:
                return await self._ollama_generate(prompt)
            except Exception as e:
                print(f"[AegisAI Brain] Event analysis error: {e}")

        return f"**Automated Analysis (Rule-Based)**\n\nThreat: {threat.get('explanation', 'Unknown')}\nSeverity: {threat.get('severity', 'unknown').upper()}\nConfidence: {threat.get('confidence', 0):.0f}%\nMITRE: {threat.get('mitre_id', 'N/A')} ({threat.get('mitre_tactic', 'N/A')})\n\nRecommendation: {threat.get('recommendation', 'Review and respond via SOAR Center.')}"

    # -----------------------------------------------------------------------
    # Status / Info
    # -----------------------------------------------------------------------
    async def get_status(self) -> Dict[str, Any]:
        """Return AI engine status for the /api/ai/status endpoint."""
        is_available = await self.check_ollama()
        memory_stats = self.knowledge_store.get_stats()

        return {
            "engine": "AegisAI Brain v1.0",
            "llm": {
                "provider": "Ollama (Local)",
                "model": self.model,
                "url": self.ollama_url,
                "connected": is_available,
                "status": "connected" if is_available else "fallback",
            },
            "memory": memory_stats,
            "stats": {
                "total_requests": self._request_count,
                "last_advisory": self._last_advisory_time,
            },
            "mode": "ai" if is_available else "fallback",
        }

    # -----------------------------------------------------------------------
    # Private: Ollama API methods
    # -----------------------------------------------------------------------
    async def _ollama_chat(
        self,
        query: str,
        context: str,
        history: List[Dict[str, Any]],
    ) -> str:
        """Send a chat completion request to Ollama."""
        if self.llm_failures >= 3:
            return "[CIRCUIT BREAKER] Artificial Neural Network unresponsive. Falling back to deterministic SOC analysis."
            
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history
        # pyre-ignore[6]
        recent_history = history[-6:] if len(history) > 6 else history
        for msg in recent_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current query with context
        user_prompt = CHAT_TEMPLATE.format(context=context, query=query)
        messages.append({"role": "user", "content": user_prompt})

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {"temperature": 0.3, "num_predict": 500},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                self.llm_failures = 0
                return content.strip()
        except Exception as e:
            self.llm_failures += 1
            print(f"[AegisAI Brain] Chat LLM Timeout: {e}")
            return f"[SYSTEM FAULT] AI Model Connection Timeout."
        
        return "[SYSTEM ERROR] Request lifecycle terminated prematurely."

    async def _ollama_stream(
        self,
        query: str,
        context: str,
        history: List[Dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion tokens from Ollama."""
        if self.llm_failures >= 3:
            yield "[CIRCUIT BREAKER] LLM Subsystem offline. Operating under robust deterministic fallback...\n"
            return
            
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history
        # pyre-ignore[6]
        recent_history = history[-6:] if len(history) > 6 else history
        for msg in recent_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        user_prompt = CHAT_TEMPLATE.format(context=context, query=query)
        messages.append({"role": "user", "content": user_prompt})

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": True,
                        "options": {"temperature": 0.3, "num_predict": 500},
                    },
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.strip():
                            try:
                                chunk = json.loads(line)
                                token = chunk.get("message", {}).get("content", "")
                                if token:
                                    yield token
                            except json.JSONDecodeError:
                                continue
            self.llm_failures = 0
        except Exception as e:
            self.llm_failures += 1
            print(f"[AegisAI Brain] Stream WS LLM timeout: {e}")
            yield f"\n[SYSTEM DEGRADATION] Pipeline deadlock detected. Neural stream terminating."

    async def _ollama_generate(self, prompt: str) -> str:
        """Simple generate (non-chat) request to Ollama."""
        if self.llm_failures >= 3:
            return "[CIRCUIT BREAKER ACTIVATED] Analysis bypassed."
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "system": SYSTEM_PROMPT,
                        "stream": False,
                        "options": {"temperature": 0.3, "num_predict": 500},  # increased to allow massive swarm parsing
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                self.llm_failures = 0
                return data.get("response", "").strip()
        except Exception as e:
            self.llm_failures += 1
            print(f"[AegisAI Brain] LLM Generate Timeout: {e}")
            return f"[TIMEOUT FAULT] AI Engine generation failed due to latency."
        
        return "[SYSTEM ERROR] Generation request failed."

    # -----------------------------------------------------------------------
    # Private: Fallback Response Engine
    # -----------------------------------------------------------------------
    def _fallback_response(self, query: str) -> str:
        """Enhanced rule-based response when Ollama is unavailable."""
        query_lower = query.lower()

        # Gather current data for template variables
        fallback_vars = self._gather_fallback_vars()

        # Match query intent
        if any(w in query_lower for w in ["score", "posture", "health", "rating"]):
            return FALLBACK_RESPONSES["score"].format(**fallback_vars)
        elif any(w in query_lower for w in ["risk", "danger", "safe", "secure"]):
            return FALLBACK_RESPONSES["risk"].format(**fallback_vars)
        elif any(w in query_lower for w in ["network", "vpn", "ip", "connection", "internet"]):
            return FALLBACK_RESPONSES["network"].format(**fallback_vars)
        elif any(w in query_lower for w in ["threat", "attack", "malicious", "incident", "breach"]):
            return FALLBACK_RESPONSES["threat"].format(**fallback_vars)
        elif any(w in query_lower for w in ["cpu", "memory", "ram", "resource", "spike", "load"]):
            return FALLBACK_RESPONSES["cpu"].format(**fallback_vars)
        elif any(w in query_lower for w in ["process", "program", "application", "running"]):
            return FALLBACK_RESPONSES["process"].format(**fallback_vars)
        elif any(w in query_lower for w in ["port", "exposed", "service", "listen", "open", "firewall"]):
            return FALLBACK_RESPONSES["port"].format(**fallback_vars)
        elif any(w in query_lower for w in ["help", "what can", "command", "how", "capability"]):
            return FALLBACK_RESPONSES["help"]
        else:
            return FALLBACK_RESPONSES["default"].format(**fallback_vars)

    def _gather_fallback_vars(self) -> Dict[str, Any]:
        """Build template variables from live system state for fallback responses."""
        defaults: Dict[str, Any] = {
            "score": 100, "verdict": "UNKNOWN", "risk_level": "unknown",
            "active_threats": 0, "top_issue": "No critical issues detected",
            "observation_summary": "System analysis unavailable",
            "vpn_status": "Unknown", "exposed_count": 0,
            "network_detail": "", "threat_detail": "",
            "cpu_usage": 0, "ram_usage": 0, "cpu_detail": "",
            "process_list": "N/A", "process_detail": "",
            "exposed_ports": "None detected", "port_detail": "",
            "summary": "System state nominal",
        }

        app_state_raw = self._app_state
        if app_state_raw is None:
            return defaults
        
        # Rigid narrowing
        app_state: Dict[str, Any] = app_state_raw

        try:
            # pyre-ignore[16]
            telemetry_engine = app_state.get("telemetry_engine")
            # pyre-ignore[16]
            db = app_state.get("db")
            # pyre-ignore[16]
            risk_scorer = app_state.get("risk_scorer")
            # pyre-ignore[16]
            insights_engine = app_state.get("security_insights_engine")

            if telemetry_engine is not None:
                # pyre-ignore[16]
                system_stats = telemetry_engine.get_system_stats()
                # pyre-ignore[16]
                ctx = telemetry_engine.get_network_context() or {}
                
                # Rigid narrowing for system_stats
                if system_stats is not None:
                    # pyre-ignore[16]
                    defaults["cpu_usage"] = system_stats.get("cpu_usage", 0)
                    # pyre-ignore[16]
                    defaults["ram_usage"] = system_stats.get("ram_usage", 0)
                
                # pyre-ignore[16]
                defaults["vpn_status"] = "Active" if ctx.get("vpn_active") else "Disconnected"

                if defaults["cpu_usage"] > 80:
                    defaults["cpu_detail"] = "CPU load exceeds 80% security threshold — audit active processes for anomalies."
                elif defaults["cpu_usage"] > 50:
                    defaults["cpu_detail"] = "Elevated CPU load — monitor for sustained anomalous spikes."
                else:
                    defaults["cpu_detail"] = "CPU utilization within nominal parameters."

                # Process list
                # pyre-ignore[16]
                procs = telemetry_engine.get_active_processes(limit=5)
                # pyre-ignore[29]
                proc_strs = [f"{str(p.get('name', '?'))} ({p.get('cpu_percent', 0)}% CPU)" for p in list(islice(procs, 5))]
                defaults["process_list"] = ", ".join(proc_strs) if proc_strs else "No high-usage processes"
                defaults["process_detail"] = "Process activity appears nominal." if defaults["cpu_usage"] < 80 else "High-consumption processes detected — investigate for unauthorized executables."

                # Connections / ports
                # pyre-ignore[16]
                conns = telemetry_engine.get_active_connections(limit=20)
                # pyre-ignore[29]
                listen = [c for c in list(islice(conns, 20)) if c.get("status") == "LISTEN"]
                defaults["exposed_count"] = len(listen)
                # pyre-ignore[6, 29]
                port_strs = [str(c.get("local_address", "?")) for c in listen[:5]]
                defaults["exposed_ports"] = ", ".join(port_strs) if port_strs else "None detected"
                defaults["port_detail"] = f"{len(listen)} listening service(s) on local interfaces." if listen else "No exposed services detected."
                defaults["network_detail"] = f"Public IP monitored. {len(listen)} local listener(s) active."

            if db is not None:
                # pyre-ignore[16]
                stats = db.get_stats()
                # pyre-ignore[16]
                defaults["active_threats"] = stats.get("active_threats", 0)
                # pyre-ignore[16]
                threats = db.get_threats(limit=3)
                if threats:
                    # pyre-ignore[6]
                    t_list = list(islice(threats, 1))
                    if t_list:
                        latest_t = t_list[0]
                        # pyre-ignore[16, 29]
                        defaults["threat_detail"] = f"Latest: {latest_t.get('explanation', 'Unknown')} (Severity: {latest_t.get('severity', '?')})"
                else:
                    defaults["threat_detail"] = "No active threats in the detection pipeline."

            if risk_scorer is not None:
                # pyre-ignore[16]
                defaults["score"] = int(risk_scorer.get_score())
                # pyre-ignore[16]
                defaults["risk_level"] = risk_scorer.get_level()

            if insights_engine is not None:
                try:
                    # pyre-ignore[16]
                    signals = insights_engine.get_security_signals()
                    # pyre-ignore[16]
                    defaults["verdict"] = signals.get("verdict", "UNKNOWN")
                    # pyre-ignore[16]
                    obs = signals.get("observations", [])
                    if obs:
                        top_obs = list(islice(obs, 1))[0]
                        # pyre-ignore[29]
                        defaults["top_issue"] = f"Primary concern: {top_obs.get('title', 'Unknown')}"
                        # pyre-ignore[29]
                        obs_titles = [str(o.get("title", "")) for o in list(islice(obs, 3))]
                        defaults["observation_summary"] = "; ".join(obs_titles)
                    else:
                        defaults["observation_summary"] = "No anomalies detected"
                    # pyre-ignore[16]
                    defaults["summary"] = f"{len(obs)} observation(s) active. Risk trajectory: {signals.get('trajectory', {}).get('direction', 'stable')}."
                except Exception:
                    pass

        except Exception as e:
            print(f"[AegisAI Brain] Fallback vars error: {e}")

        return defaults

    def _build_fallback_advisory(self) -> str:
        """Build a rule-based advisory when LLM is unavailable."""
        v = self._gather_fallback_vars()
        score = v["score"]
        threats = v["active_threats"]

        if threats > 0:
            return f"**ALERT**: {threats} active threat(s) detected. Security score at {score}/100. {v.get('threat_detail', '')}. Immediate review in the SOAR Center is recommended."
        elif score < 60:
            return f"Security posture is **degraded** (Score: {score}/100). {v.get('top_issue', 'Multiple observations require attention')}. Review the Neural Advisor for detailed signal analysis."
        elif score < 85:
            return f"System posture is **elevated** (Score: {score}/100). {v.get('observation_summary', 'Minor observations detected')}. Routine monitoring recommended."
        else:
            return f"All systems nominal. Security score: **{score}/100**. No active threats. Network and host telemetry within baseline parameters. Next audit cycle in 30 seconds."
