# backend/engine/identity_engine.py Documentation

## Purpose
`identity_engine.py` translates raw events into user-centric "Identity Profiles". It tracks active sessions, calculates per-user risk scores, and detects identity-related anomalies like privilege escalation attempts.

## Key Features
- **Identity Profiling**: Maintains a persistent state for every detected principal, including their `role`, `privilege_level`, and `obs_count`.
- **Session Correlation**: Maps incoming events to specific `active_sessions`, tracking the source IP, auth method, and start time.
- **Behavioural Risk Scoring**:
    - **Privilege Escalation**: Increases a user's risk score (+20) if an event signals a privilege level higher than their recorded maximum.
    - **Impossible Travel**: (Framework ready) Logical hooks for detecting rapid IP changes for a single user.
- **Liveness Detection**: Determines if an identity is "Active" based on whether an event has been seen within the last 30 seconds.
- **Priority Sorting**: Provides a list of identities sorted by risk score and activity state for "Top Suspect" analysis.

## Implementation Details
- `IdentityProfile`: Stores the state and session mappings for a single user.
- `IdentityContextEngine`: The singleton processor that ingests normalized events and updates internal profiles.
- `get_identity_insights()`: Aggregates profile data for the dashboard "Identity Intelligence" tab.

## Usage
Queried by the main backend stream every 10 seconds. Data is broadcast on the `IDENTITY` channel to provide the SOC with a per-user view of network activity.
