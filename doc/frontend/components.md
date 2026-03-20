# frontend/src/components/dashboard/ Documentation

## Purpose
The components in `src/components/dashboard/` are the building blocks of the AegisAI "Elite SOC" interface. They are designed for high-performance, real-time data visualization and actionable security intelligence.

## Component Categories

### 1. AI & Intelligence (The Decision Layer)
- **`AIAdvisor.jsx`**: The central intelligence hub. It consumes the `INSIGHTS` socket channel to present:
    - **Risk Trajectory**: Temporal trends in system vulnerability.
    - **Attack Narrative**: Human-readable explanations of complex security events.
    - **Proactive Remediation**: One-click SOAR actions based on AI findings.
- **`AIChatAssistant.jsx`**: A streaming natural language interface for forensic querying.
- **`AttackFlowStory.jsx`**: An "Event Narrative" engine that builds a visual node-based story of a breach as it unfolds.

### 2. Visual Analytics (Spatial Intelligence)
- **`SecurityGraph.jsx`**: A D3-powered 2D Force Graph. It maps the logical relationship between User, Host, and External entities. Features include pulsing threat nodes, directional data-flow particles, and a forensic inspector sidebar.
- **`WorldMap.jsx`**: A geospatial visualization mapping incoming traffic to global coordinates, highlighting suspicious geo-origins (e.g., Tor Exit Nodes).
- **`TrafficGraph.jsx`**: Real-time line charts for connection frequency and payload volume.

### 3. Core SOC Panels (Real-Time Feeds)
- **`StreamingAuditLog.jsx`**: A high-velocity, low-latency feed of every telemetry event processed by the system.
- **`SecurityFeed.jsx`**: A filtered "Alert Queue" focusing on validated anomalies and classifications.
- **`FleetHealthMatrix.jsx`**: A grid-based status monitor for all monitored nodes/agents.
- **`IdentityPanel.jsx`**: Tracks user session lifecycle and credential risk levels.

### 4. Forensic Tools
- **`InvestigationPanel.jsx`**: A deep-dive workspace triggered by specific alerts, integrating evidence chains and graph snapshots.
- **`ForensicTimeline.jsx`**: A chronological trail of system-level activities surrounding a specific incident.

## Technical Implementation
- **Data Source**: Almost all components use the `useAegisSocket` hook for zero-latency updates.
- **Styling**: Uses the "Aegis Design System" (CSS variables, glass-morphism, and custom animations defined in `App.css` and `index.css`).
- **Performance**: Heavy use of `useMemo` and `useCallback` to maintain 60FPS even during high-velocity attack simulations.
