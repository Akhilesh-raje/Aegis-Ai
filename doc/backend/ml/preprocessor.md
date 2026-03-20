# backend/ml/preprocessor.py Documentation

## Purpose
`preprocessor.py` is the "Data Refiner" for AegisAI. It ensures that raw behavioral metrics are properly formatted, scaled, and normalized before being consumed by the machine learning models.

## Key Features
- **Standardized Feature Schema**: Enforces a strict order and presence for the 9 core features used across the training and inference pipelines.
- **Standard Scaling**: Uses `StandardScaler` to transform features into a mean-centered, unit-variance distribution, ensuring that large-scale values (like payload bytes) don't overpower small-scale values (like failure ratios).
- **Vectorization**: Efficiently converts the dictionary-based windows from the `Aggregator` into high-performance NumPy matrices.
- **Zero-Value Imputation**: Handles missing or null features by defaulting to a safe numerical baseline (0).

## Feature Set (The "Elite 9")
1. `login_attempt_rate`
2. `failed_login_ratio`
3. `unique_ports`
4. `connection_frequency`
5. `avg_payload_size`
6. `unique_users`
7. `session_variation`
8. `hour_of_day`
9. `geo_anomaly`

## Implementation Details
- `Preprocessor.extract_features()`: Maps window dictionaries to NumPy arrays.
- `transform()`: Applies the scaling learned during the `fit()` phase.

## Usage
The essential middle-man between the `Aggregator` and the `Detector`. Used in both real-time streaming and offline training.
