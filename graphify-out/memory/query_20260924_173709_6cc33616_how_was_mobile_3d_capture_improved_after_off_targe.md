---
type: "implementation"
date: "2026-09-24T17:37:09.460455+00:00"
question: "How was mobile 3D capture improved after off-target mesh?"
contributor: "graphify"
source_nodes: ["DentistScan3DScreen.jsx", "mobile-dentist-scan.test.js"]
---

# Q: How was mobile 3D capture improved after off-target mesh?

## Answer

DentistScan3DScreen now defaults to one upper arch per session, disables combined full arch capture, fixes CameraView to rear camera, guides a slow overlapping left-front-right-occlusal pass, warns about short or 720p clips without claiming anatomical coverage, and maps RECONSTRUCTION_GEOMETRY_INSUFFICIENT to recapture while preserving server diagnostics. Mobile Jest: 67 tests passed. These are capture safeguards, not tooth reconstruction validation.

## Source Nodes

- DentistScan3DScreen.jsx
- mobile-dentist-scan.test.js