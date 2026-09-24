---
type: "bugfix"
date: "2026-09-24T17:07:57.217358+00:00"
question: "Why did a failed 3D scan appear as a mesh in X-Core Gallery and how does the portal now refresh status?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Gallery.jsx", "scan3DGalleryState.mjs"]
---

# Q: Why did a failed 3D scan appear as a mesh in X-Core Gallery and how does the portal now refresh status?

## Answer

Gallery previously synthesized a mesh series for every 3D_SCAN and used isReady || is3DScan to show the mesh viewer action. It also reused cached study.status and attempted DICOM SSE for scan progress. scan3DGalleryState now requires a ready study with image-derived non-synthetic provenance and a checksummed mesh before labeling it 3D Mesh. Failed or pending scans show capture/status messaging. Gallery refreshes existing 3D scans from the authorized Node study list every 12 seconds and prefers linked patient.name over originalName. Controlled tests and full web suite pass; no empirical reconstruction validation was performed.

## Outcome

- Signal: useful

## Source Nodes

- Gallery.jsx
- scan3DGalleryState.mjs