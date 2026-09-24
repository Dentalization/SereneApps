---
type: "codebase"
date: "2026-09-24T17:06:12.922530+00:00"
question: "What mobile capture and queue integrity gaps were fixed for real dental 3D scans?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["DentistScan3DScreen.jsx", "scan3DService.js"]
---

# Q: What mobile capture and queue integrity gaps were fixed for real dental 3D scans?

## Answer

DentistScan3DScreen uses Expo CameraView to record a real local video URI and scan3DService uploads that original file. The mobile fix waits for onCameraReady, surfaces mount and missing-file errors, locks camera settings while recording, labels requested resolution honestly, reconciles queue failures with server status, keeps failed queueing recoverable, and distinguishes service outages from rejected footage. The backend acquisition failure occurs after upload and is not caused by a synthetic mobile fallback. Focused Jest suite passed 24 tests with watchman disabled.

## Outcome

- Signal: useful

## Source Nodes

- DentistScan3DScreen.jsx
- scan3DService.js