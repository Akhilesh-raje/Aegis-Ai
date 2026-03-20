# backend/engine/graph_engine.py Documentation

## Purpose
`graph_engine.py` builds a temporal relationship graph of entities across the network. It visualizes how users, machines, processes, and remote IPs interact, helping analysts identify lateral movement and complex attack chains.

## Key Features
- **Entity Correlation**: Automatically creates nodes and links based on incoming security events:
    - `User -> logs_into -> Machine`
    - `Machine -> connects -> IP`
    - `User -> interacts -> Machine` (for file or process events).
- **Threat Highlighting**: Correlates active threats from the database to specific nodes in the graph, assigning threat scores and severity-based styling.
- **Temporal Relationship Tracking**: Maintains a list of edges with timestamps and relationship types.
- **Visualization Ready**: Exposes data in a format optimized for D3.js or Vis.js frontends, including `value` fields to control particle animation speeds (e.g., faster for C2 beacons).

## Implementation Details
- `SecurityGraphEngine`: The core engine that processes events into nodes and links.
- `get_graph_data()`: Merges the topological graph with active threat intelligence to produce the final "Security Mesh".
- Implements a `max_edges` pruning limit (FIFO) to maintain performance during high-volume event streams.

## Node Types
- `user`: Identity principal.
- `machine`: Host or terminal.
- `process`: Individual execution instance (v4).
- `ip`: External or internal network destination.

## Usage
Initialized as a singleton and updated every 5-15 seconds via the main backend stream. Data is delivered to the frontend on the `GRAPH` WebSocket channel.
