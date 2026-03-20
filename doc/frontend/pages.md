# frontend/src/pages/ Documentation

## Purpose
The `pages/` directory contains the top-level views for the AegisAI "Elite SOC" Command Center. Each page is designed for high-density information display and rapid decision-making.

## Key Pages

### `Dashboard.jsx` (Central Command)
- **Layout**: Implements a strict **70/30 Enterprise Grid**.
- **Left Panel (70%)**: Operational focus featuring the **AI Advisor**, **Attack Flow Story**, and the **Live Intelligence Nexus** (telemetry and security feeds).
- **Right Panel (30%)**: The "Control Tower" containing the global **Security Score**, **World Map**, and health matrices for Fleet, Identity, and Exposure.

### `NetworkMonitor.jsx` (Infrastructure Topology)
- **Visualization**: A custom SVG-based logical map of the infrastructure (Perimeter → Security Cluster → Core).
- **Interactive States**: Dynamically updates connection paths (e.g., Red glow during an attack) and node status based on the live `STATS` and `THREATS` socket channels.
- **Analytics**: Includes real-time protocol distribution charts and perimeter performance metrics.

### `SOAR.jsx` (Orchestration & Response)
- **Incident Console**: A high-priority queue of "Unresolved Threats" with quick-action panels for IP blocking and rate limiting.
- **Playbook Orchestrator**: View and toggle status for automated playbooks (e.g., `AUTO_BLOCK_CRITICAL`).
- **Mitigation Timeline**: A persistent feed of successful system counter-measures and their impact.

### `Investigation.jsx` (Forensic Deep-Dive)
- **Ticket Queue**: Lists all recent incidents for selection and analysis.
- **AI Evidence Chain**: Displays the specific indicators and reasoning used by the AI engine for a detection.
- **Asset Correlation**: Maps the threat to specific source vectors, target identities, and confidence scores.
- **Topology Correlation**: Integrates the `SecurityGraph` to visualize lateral movement patterns.
- **Reporting**: Provides a gateway to generate printable HTML Executive Briefings.

### `Simulation.jsx` (Threat Emulation)
- **Scenario Library**: Interface to trigger various attack types (Brute Force, DDoS, etc.) and intensity levels.
- **Feedback Loop**: Monitors the "Detection vs Mitigation" cycle in real-time as the simulation progresses.

## Data Integration
All pages utilize the `useAegisSocket` hook to stay synchronized with the backend without manual refreshing.
