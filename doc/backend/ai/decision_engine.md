# backend/ai/decision_engine.py Documentation

## Purpose
`decision_engine.py` acts as the "Commander" of AegisAI. It bridges the gap between AI reasoning (talking) and SOAR execution (acting), converting high-level signals and system context into specific, executable security actions.

## Key Features
- **Autonomous Decision Logic**: Analyzes threats from the neural engine and telemetry context to produce recommended or auto-executed "SOAR Commands."
- **Autonomy Mode**: When enabled, the engine can automatically execute "Critical" actions (e.g., blocking an IP) if the AI's confidence exceeds a strict threshold (98%).
- **Multi-Factor Confidence Scoring**: Combines base heuristic scores with AI certainty indicators and threat-density boosters to reach a weighted final confidence.
- **Swarm Consensus Parsing**: Specifically extracts "Swarm Consensus" and "Sentinel Commands" from the AI's structured output to ensure alignment between reasoning and action.
- **Self-Learning Loop**: Automatically "memorizes" successful autonomous mitigations by adding them back into the `KnowledgeStore`, enabling a "Swarm Memory" effect for future similar threats.
- **Post-Mitigation Verification**: Spawns background threads to observe the target post-action. If a threat "respawns," it triggers a "Multi-Host Containment Escalation" (e.g., revoking AD sessions).

## Key SOAR Actions
- `AUTO_BLOCK_IP`: Firewall-level blocking of source IPs.
- `ISOLATE_HOST`: Quarantining affected nodes.
- `KILL_PROCESS`: Terminating malicious process trees.
- `CAPTURE_FORENSICS`: Triggering automated PCAP and memory dumps via the `forensics.tracer`.

## Implementation Details
- `DecisionEngine.decide_action()`: The primary logic gate for mapping threat context to an action dictionary.
- `run_verification()`: A background loop that ensures the defensive action was effective.
- Integrates with the `sentinel` (RemediationController) for execution.

## Usage
Used by the `MLWorker` and `AegisAIEngine` to translate detections into defensive responses.
