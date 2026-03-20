# verify_aura_regional.py Documentation

## Purpose
`verify_aura_regional.py` is a browser-based automation script used to test the "Aura" regional UI themes in the AegisAI dashboard. It simulates location changes and verifies that the frontend correctly transitions its visual style (e.g., `BHARAT_VIBE` for India, `DEUTSCHLAND_GLOW` for Germany).

## Key Features
- **UI Theme Verification**: Specifically tests the CSS transitions and color schemes associated with different geographic regions.
- **Location Spoofing**: Uses `page.evaluate` to inject `LOCATION_UPDATE` events directly into the frontend's `aegisStream` object.
- **Visual Regression Checks**: Captures screenshots of the dashboard in different regional states (`india_aura.png`, `germany_aura.png`) for manual or automated comparison.

## Implementation Details
- Uses `playwright` (Chromium) to orchestrate the browser interaction.
- Targets the local development server at `http://localhost:5173/`.
- Leverages the `window.aegisStream.notify` bridge to bypass the actual WebSocket server for isolated UI testing.

## Dependencies
- `playwright`: For browser automation and screenshots.
- `asyncio`: For asynchronous orchestration.

## Usage
```bash
python verify_aura_regional.py
```
Ensure the React dev server is running on port 5173 before executing.
