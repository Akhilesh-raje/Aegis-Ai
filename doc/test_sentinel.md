# test_sentinel.py Documentation

## Purpose
`test_sentinel.py` is a unit test for the `decision_engine`'s SOAR (Security Orchestration, Automation, and Response) capabilities. It verifies that the engine can correctly parse a mitigation command from AI output and flag it for auto-execution.

## Key Features
- **SOAR Command Parsing**: Tests the extraction of `[MITIGATION: action|{params}]` strings from unstructured text.
- **Autonomy Mode Verification**: Confirms that when `autonomy_mode` is enabled, the action is marked as `auto_executed: True`.
- **Mock Context Testing**: Uses static risk scores and threat data to provide a deterministic environment for the decision loop.

## Implementation Details
- Directly imports and uses the `decision_engine` singleton from `backend.ai.decision_engine`.
- Manually overrides `decision_engine.autonomy_mode = True` for the duration of the test.
- Checks `mitigation_result` to see how the engine handles the simulated block command.

## Dependencies
- `backend.ai.decision_engine`: The core component under test.

## Usage
```bash
python test_sentinel.py
```
This is a quick way to ensure the regex-based command extractor and autonomy logic in the Decision Engine are functioning correctly.
