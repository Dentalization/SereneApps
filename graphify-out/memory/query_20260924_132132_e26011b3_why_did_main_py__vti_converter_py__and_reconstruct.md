---
type: "debugging"
date: "2026-09-24T13:21:32.924423+00:00"
question: "Why did main.py, vti_converter.py, and reconstruction_service.py show errors, and what runtime integrity fixes were made?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend/python_service/main.py", "backend/python_service/services/vti_converter.py", "backend/python_service/services/reconstruction_service.py"]
---

# Q: Why did main.py, vti_converter.py, and reconstruction_service.py show errors, and what runtime integrity fixes were made?

## Answer

Both Pyright configurations referenced missing backend/python_service/venv; both now resolve repository .venv. All three modules compiled and imported in that environment. Scan endpoints now return 400 for malformed JSON; LIDRA rejects non-object configuration. Reconstruction validates configuration and camera intrinsics and checks preview write. DICOM VTI conversion now fails on MONAI orientation, spacing, or intensity errors rather than silently emitting a geometrically unreliable fallback. Python suite: 57 tests passed. Research data unavailable; no validation metrics claimed.

## Outcome

- Signal: useful

## Source Nodes

- backend/python_service/main.py
- backend/python_service/services/vti_converter.py
- backend/python_service/services/reconstruction_service.py