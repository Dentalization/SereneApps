---
type: "architecture"
date: "2026-09-24T17:04:38.147511+00:00"
question: "Why did the live 3D scan report acquisition unavailable and what backend diagnostics prevent recurrence?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend/src/services/scan3D/lidraService.js", "backend/src/services/scan3D/reconstructionEngineAdapter.js", "backend/src/services/scan3D/scan3DQueueService.js", "backend/src/services/scan3D/scan3DWorker.js"]
---

# Q: Why did the live 3D scan report acquisition unavailable and what backend diagnostics prevent recurrence?

## Answer

The running Node and Python processes predated the shared scan service token, so scan 1469 failed acquisition under stale runtime code. The backend now rejects enqueue when its token is absent and classifies HTTP 400/401/404/422/503, network errors, and timeouts into distinct failure codes with bounded retry policy. No captured video is fabricated or silently substituted. This is service diagnosis, not reconstruction or clinical validation.

## Outcome

- Signal: useful

## Source Nodes

- backend/src/services/scan3D/lidraService.js
- backend/src/services/scan3D/reconstructionEngineAdapter.js
- backend/src/services/scan3D/scan3DQueueService.js
- backend/src/services/scan3D/scan3DWorker.js