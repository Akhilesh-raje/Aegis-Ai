# backend/api/settings.py Documentation

## Purpose
`settings.py` provides the administrative interface for AegisAI. It handles the management of external integrations (webhooks), user account lifecycle, and audit logging for sensitive configuration changes.

## Key Features
- **Webhook Management**:
    - `GET /api/settings/webhooks`: Lists all registered external notification endpoints.
    - `POST /api/settings/webhooks`: Adds a new webhook URL and immediately reloads the `webhook_engine` memory cache.
    - `DELETE /api/settings/webhooks/{id}`: Removes an integration.
- **User Identity Management**:
    - `GET /api/settings/users`: Lists all active analyst and system accounts.
    - `POST /api/settings/users`: Creates new users with hashed passwords and assigned roles.
    - `DELETE /api/settings/users/{id}`: Deactivates an account.
- **Audit Integration**: Every administrative action (adding/removing hooks or users) is automatically logged to the system's persistent audit trail via the `Database`.

## Implementation Details
- Uses `hashlib.sha256` for secure password storage.
- Directly interacts with the `webhook_engine` to ensure configuration changes take effect without a restart.
- Leverages the shared `db` instance for persistent settings storage.

## Security Note
Endpoints in this module are intended for `system_admin` use. In the current "Elite SOC" deployment, authentication is handled at the gateway or neutralized for direct expert access.

## Usage
Included as a sub-router in `backend/main.py` under the `/api/settings` prefix.
