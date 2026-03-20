# frontend/src/services/ Documentation

## Purpose
The service layer in the AegisAI frontend acts as the communication backbone, bridging the reactive React UI with the high-concurrency backend. It utilizes a hybrid approach: WebSockets for high-frequency data and REST for discrete actions.

## Key Modules

### `api.js` (Action-Based Client)
- **Role**: Manages all state-changing operations (Mutations) and one-off data fetches.
- **Key Functions**:
    - `simulateAttack()` / `startStatefulSimulation()`: Triggers threat emulation.
    - `executeResponse()`: Dispatches SOAR mitigation commands (e.g., Block IP).
    - `resetSystem()`: Clears all system state for a fresh demo loop.
    - `fetchAIStatus()`: Retrieves high-level health and memory stats for the AI engine.
- **Design Note**: Intentionally avoids polling. High-frequency data (Stats, Threats) has been migrated to WebSockets.

### `useAegisSocket.js` (Real-Time Subscription Hook)
- **Role**: A custom React hook that manages a single, persistent WebSocket connection across the entire application.
- **Key Features**:
    - **Channel-Based Subscriptions**: Allows components to listen to specific streams (e.g., `STATS`, `THREATS`, `TELEMETRY`) without creating multiple connections.
    - **Debounced State Updates**: Implements a configurable `debounceMs` (default 200ms) to prevent "render-storms" when the backend sends hundreds of events per second.
    - **Caching**: Maintains the latest data for every channel to provide immediate "Hydration" for newly mounted components.
    - **Automatic Reconnection**: Implements exponential backoff (1s to 30s) to handle network interruptions gracefully.
    - **Upstream Communication**: Provides a `sendMessage` capability for interactive real-time features like the AI Chat.

## Usage
- Use `api.js` for buttons and form submissions.
- Use `useAegisSocket(channel)` for dashboards, charts, and live activity feeds.
