---
type: "debugging"
date: "2026-09-24T17:10:52.904673+00:00"
question: "Why did the real Android camera scan repeatedly fail with ACQUISITION_UNAVAILABLE and how was it recovered?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend/python_service/main.py", "backend/src/services/scan3D/lidraService.js", "backend/src/services/scan3D/scan3DQueueService.js", "backend/src/services/scan3D/scan3DWorker.js", "backend/scripts/start-scan3d-local.mjs", "mobile/src/features/dentist/screens/3D/DentistScan3DScreen.jsx", "web/src/pages/dentist-portal/x-core/components/Gallery.jsx"]
---

# Q: Why did the real Android camera scan repeatedly fail with ACQUISITION_UNAVAILABLE and how was it recovered?

## Answer

Live scan 1469 had verified 26 MB H264 video. Local acquisition accepted 24/24 sampled frames, and isolated image-derived sparse reconstruction completed. Existing Node and Python processes started at 20:42 before shared scan token was added to backend/.env at 23:34. Python main.py did not load backend/.env on standalone startup; auth probe after restart returned 503, proving recurrence. Fixed Python local startup to load only scan token/storage if absent; backend queue fails fast without token and acquisition now classifies auth/config/path/transport errors. Restarted Python and Node; health checks both 200 and authenticated invalid-folder probe returns 400 (token accepted). Retried scan 1469 through official queue/worker; DB status ready, second attempt, checksummed mesh, image_derived, synthetic=false, validated=false. Mobile capture/queue integrity and portal status gating fixed. Screenshot showed a misleading mesh card because Gallery previously synthesized cards regardless of scan status. Backend 30 focused tests, Python 59, mobile 24, web 235 and Vite build passed. No clinical or accuracy validation claimed.

## Outcome

- Signal: useful

## Source Nodes

- backend/python_service/main.py
- backend/src/services/scan3D/lidraService.js
- backend/src/services/scan3D/scan3DQueueService.js
- backend/src/services/scan3D/scan3DWorker.js
- backend/scripts/start-scan3d-local.mjs
- mobile/src/features/dentist/screens/3D/DentistScan3DScreen.jsx
- web/src/pages/dentist-portal/x-core/components/Gallery.jsx