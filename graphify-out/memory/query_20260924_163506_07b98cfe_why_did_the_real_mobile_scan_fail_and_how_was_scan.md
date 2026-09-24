---
type: "debugging"
date: "2026-09-24T16:35:06.009334+00:00"
question: "Why did the real mobile scan fail and how was scan 1468 recovered?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["backend/src/services/scan3D/lidraService.js", "backend/src/services/scan3D/reconstructionEngineAdapter.js", "backend/src/services/scan3D/scan3DWorker.js", "mobile/src/features/dentist/screens/3D/DentistScan3DScreen.jsx"]
---

# Q: Why did the real mobile scan fail and how was scan 1468 recovered?

## Answer

Scan 1468 failed on first attempt with ACQUISITION_UNAVAILABLE and generic public reason. Stored 13.2s H264 video passed isolated LIDRA acquisition (24/24 sampled frames) and isolated sparse reconstruction. Local backend .env lacked SCAN3D_SERVICE_TOKEN and Python endpoint at 127.0.0.1:8000 was offline when inspected; exact original transport error was discarded, so cannot prove which of those occurred during original attempt. Generated a private local token in gitignored backend/.env, started authenticated Python service, retried scan through queue/worker. Official second attempt succeeded: DB ready, checksummed mesh, image_derived provenance, synthetic=false, validated=false. Code now distinguishes service configuration/unavailability from rejected capture and shows safe failure code. Backend 28 tests and mobile 18 tests passed. No accuracy/clinical claims.

## Outcome

- Signal: useful

## Source Nodes

- backend/src/services/scan3D/lidraService.js
- backend/src/services/scan3D/reconstructionEngineAdapter.js
- backend/src/services/scan3D/scan3DWorker.js
- mobile/src/features/dentist/screens/3D/DentistScan3DScreen.jsx