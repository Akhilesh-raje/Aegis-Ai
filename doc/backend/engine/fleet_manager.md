# backend/engine/fleet_manager.py Documentation

## Purpose
`fleet_manager.py` provides the management and monitoring layer for all hosts (nodes) registered with the AegisAI system. It tracks the health, risk, and current activity of the entire fleet.

## Key Features
- **Node Registration**: Tracks `node_id`, `hostname`, and `asset_type` (e.g., Workstation, Command Console, Critical DB).
- **Dynamic Status Tracking**: Derives a node's status (`nominal`, `warning`, `critical`) based on its current `risk_score`.
- **Resource Monitoring**: Stores the most recent CPU and Memory metrics for each node.
- **Simulation Awareness**: Tracks whether a node is currently under a simulated attack via the `is_simulation_active` flag.
- **Fleet Summary**: Provides a consolidated view of all nodes for the frontend "Fleet Hub" or "Infrastructure" views.

## Implementation Details
- `FleetNode`: A data class representing an individual agent/host.
- `FleetManager`: A singleton that manages the collection of nodes.
- `update_node()`: Updates a node's metrics and recalculates its derived status and risk level.

## Asset Types
- `Command_Console`: The primary SOC control point.
- `Critical_DB_Tier`: Highly sensitive database servers.
- `Workstation`: Standard end-user machines.

## Usage
The global `fleet_manager` instance is updated by the main streaming tasks using real telemetry data and is queried by the `FLEET` WebSocket channel.
