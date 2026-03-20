# backend/engine/webhook_engine.py Documentation

## Purpose
`webhook_engine.py` provides the external integration layer for AegisAI. It allows the platform to dispatch critical security alerts to third-party tools like Slack, Microsoft Teams, or custom SOC webhooks.

## Key Features
- **Critical Alert Filtering**: Only dispatches events with `severity: critical`, preventing notification fatigue.
- **Rich Payload Formatting**: Generates Slack-compatible JSON payloads including:
    - Bold headers and emojis.
    - MITRE ATT&CK metadata.
    - Confidence and Risk scores.
    - Source IP and Threat explanation.
- **Silent Dispatch**: Uses `urllib.request` to send data without requiring external heavy libraries like `requests`.
- **Emulated Mode**: Prints alert previews to the console if no webhook URLs are configured, useful for local testing and debugging.

## Implementation Details
- `WebhookEngine.dispatch_alert()`: Standardizes the notification message and iterates through all registered URLs.
- Uses a `timeout` of 5 seconds to ensure slow external servers don't hang the backend process.

## Usage
Invoked by the `DecisionEngine` or `MLWorker` when a critical threat is confirmed and requires immediate external notification.
