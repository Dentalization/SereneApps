---
type: "architecture"
date: "2026-09-24T17:08:34.568190+00:00"
question: "How does standalone Python scan service load local shared authentication after backend env changes?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend/python_service/main.py", "backend/python_service/tests/test_scan3d_service.py"]
---

# Q: How does standalone Python scan service load local shared authentication after backend env changes?

## Answer

Python main.py now loads only SCAN3D_SERVICE_TOKEN and optional SCAN3D_STORAGE_ROOT from adjacent backend/.env at module import when each process environment key is absent. Explicit environment values, including an explicitly empty token, are never overwritten. The token is not logged. Focused and full Python suites pass; the fallback removes the 503 recurrence when launching Python main.py manually without exported variables.

## Outcome

- Signal: useful

## Source Nodes

- backend/python_service/main.py
- backend/python_service/tests/test_scan3d_service.py