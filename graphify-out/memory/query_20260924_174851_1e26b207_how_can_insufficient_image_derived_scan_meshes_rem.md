---
type: "query"
date: "2026-09-24T17:48:51.511582+00:00"
question: "How can insufficient image-derived scan meshes remain visible for diagnosis without being presented as ready dental reconstructions?"
contributor: "graphify"
outcome: "useful"
---

# Q: How can insufficient image-derived scan meshes remain visible for diagnosis without being presented as ready dental reconstructions?

## Answer

Keep scan status failed and qualityAssessment insufficient. For verified private image-derived meshes only, expose a separate diagnosticMesh descriptor and authenticated /v1/x-core/3d-scans/:id/diagnostic-mesh route, with owner authorization, storage confinement, checksum verification, no-store response and audit event. The X-Core viewer loads it under an explicit Mesh Diagnostik warning while disabling measurements, annotations, segmentation and ready-asset download. Existing scan 1470 live check: status 200 failed, diagnostic endpoint 200 with matching checksum, ready asset endpoint 404. No dental accuracy claim.

## Outcome

- Signal: useful