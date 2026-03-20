# backend/ml/classifier.py Documentation

## Purpose
`classifier.py` is the "Diagnostic Specialist" of AegisAI. Once an anomaly is detected, this engine uses a supervised Random Forest model to categorize the activity into specific known threat types (e.g., Brute Force, Exfiltration).

## Key Features
- **Random Forest Classification**: Utilizes an ensemble of 100 decision trees to provide robust, high-confidence threat labels.
- **Standardized Threat Taxonomy**: Classifies events into 5 primary categories: `brute_force`, `ddos`, `port_scan`, `exfiltration`, and `insider_threat`.
- **Heuristic Confidence Gating**: If the model's highest probability score is below a strict threshold (0.6), the event is downgraded to an `unknown_anomaly`, preventing "forced" misclassification of novel attacks.
- **Probability Distribution**: Returns a full breakdown of the classifier's reasoning (e.g., "70% Brute Force, 20% Port Scan").
- **Synthetic Training Harness**: Includes `generate_synthetic_training_data()`, an internal generator that uses the simulator's attack patterns to self-train the model.

## Implementation Details
- `ThreatClassifier.classify()`: Inputs a scaled feature vector and returns a detailed intelligence dictionary.
- Metadata exposure via `model_info` for dashboard transparency.

## Usage
Invoked by the `MLWorker` as the second stage of the detection pipeline, providing the "What" once the detector provides the "That."
