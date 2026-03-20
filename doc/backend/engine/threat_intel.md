# backend/engine/threat_intel.py Documentation

## Purpose
`threat_intel.py` serves as the "Technical Narrator" of AegisAI. It translates complex ML features and anomaly scores into human-readable explanations, providing analysts with clear "Indicators of Compromise" (IoCs) and actionable recommendations.

## Key Features
- **Heuristic Evidence Extraction**: Analyzes the raw features of a threat (e.g., login rates, port counts, payload sizes) and generates natural language justifications for why an event was flagged.
- **MITRE ATT&CK Mapping**: Maps classified threat types to their corresponding MITRE technique IDs, names, and tactics.
- **Contextual Recommendations**: Generates specific remediation advice tailored to the type of threat detected (e.g., "Activate DDoS mitigation" for DDoS, "Isolate service" for Exfiltration).
- **Baseline Comparison**: Compares incoming metrics against pre-defined "Normal" thresholds to highlight deviations in a way that makes sense to human operators.
- **Zero-Day Description**: Provides generic but descriptive markers for novel behavioral anomalies that don't fit a known signature.

## Implementation Details
- `generate_explanation()`: The core function that takes classification results and returns a structured "Threat Intelligence Report".
- `BASELINES`: A dictionary of typical system thresholds used for deviation analysis.
- `MITRE_ATTACK`: A library of MITRE framework metadata.

## Usage
Used by the `MLWorker` to enrich raw detections with the intelligence needed for the frontend display and SOAR playbooks.
