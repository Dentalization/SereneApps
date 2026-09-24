---
type: "query"
date: "2026-09-24T17:41:24.227854+00:00"
question: "Why did the first real smartphone 3D scan show non-tooth mesh and what engineering improvements were made?"
contributor: "graphify"
outcome: "useful"
---

# Q: Why did the first real smartphone 3D scan show non-tooth mesh and what engineering improvements were made?

## Answer

Direct frame reprojection found all 86 sparse 3D points below the mouth on chin/clothing; zero supported tooth surface. The best pair was selected by point count, mouth changed non-rigidly, and generic acquisition accepted frames without dental coverage evidence. Added multi-view PnP pose verification and mesh topology/feature-support diagnostics; real dry run verified seven views but still the same 86 non-dental points. Added fail-closed Node geometry gate and historical read-time reclassification, plus rear-camera single-arch guided mobile capture and recapture messaging. This is not per-tooth, research, or clinical validation; reference/repeats still DATASET_UNAVAILABLE.

## Outcome

- Signal: useful