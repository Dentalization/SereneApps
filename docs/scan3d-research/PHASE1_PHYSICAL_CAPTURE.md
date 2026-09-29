# Phase 1 — physical dental capture runbook and evidence

**Execution boundary:** Phase 1 only. The locked roadmap continues with dental segmentation, dental-aware LIDRA, learned matching, true multi-view SfM, dense reconstruction, learned and dental-specific benchmarks, independent STL validation, X-Core refinement, measurement validation, FDI segmentation, and clinical validation in Phases 2–13. None of those phases is established by this capture milestone.

**Current status: IMPLEMENTED BUT NOT EXPERIMENTALLY VERIFIED for the new controlled-cast mobile workflow.** Existing private patient videos support a retrospective engineering smoke test, not a prospective physical-cast test or dental geometry validation. Paired smartphone/reference data remain **DATASET_UNAVAILABLE**. IMPLEMENTED ≠ EXPERIMENTALLY VALIDATED ≠ CLINICALLY VALIDATED.

## Audited execution path

`DentistScan3DScreen.jsx` records a continuous video with Expo Camera and passes capture metadata to `scan3DService.js`. `xCoreScanController.js` authenticates the upload, inspects codec/container/duration/resolution/fps with ffprobe, decodes the whole video with ffmpeg, hashes it, and stores the private original. The queue invokes `scan3DWorker.js`, `reconstructionEngineAdapter.js`, and `lidraService.js`. The authenticated Python LIDRA service calls `analyze_video_acquisition` in `lidra_service.py`; selected decoded frames feed `pythonServiceEngine.js` and `reconstruction_service.py`. The Node worker records geometry quality/provenance or an explicit diagnostic failure. X-Core's `Scan3DMeshViewer.jsx` displays the result and capture evidence.

The reconstruction engine remains the existing experimental OpenCV baseline: SIFT matching, RANSAC verification, PnP, sparse multi-view tracks, a bundle-adjustment attempt, and conditional StereoSGBM dense processing. In whole-image `capture_evidence` mode, dental origin is **unverified** and the engine may output only diagnostic, arbitrary-scale geometry. Registered camera count alone does not prove that the mesh used those views; the current diagnostic mesh can still come from a best pair. No algorithm in this phase identifies teeth automatically.

## First controlled experiment

1. Use an actual physical dental cast. Record upper and lower arches separately. Keep the cast and camera in stable light; avoid a monitor, printed photo, render, mirror image, or phone screen as the target. Do not include patient data in this first experiment.
2. In Dentist Mobile choose one arch, use the rear wide lens where the device exposes it, request zero digital zoom, and keep focus and exposure stable. The app records the requested setting; it cannot prove which physical lens or actual optical zoom the operating system used. Use continuous video, keeping crown surfaces large and visible in the frame.
3. Translate slowly left → front → right while retaining overlap between adjacent views; add an occlusal angle without losing the previously visible area. Avoid a stationary pivot, abrupt motion, and long featureless or blurred spans. The UI gives time-based prompts, not a measured trajectory or dental-coverage percentage.
4. After recording, select `Model gigi fisik`, declare that physical crowns were visible, and optionally identify the views seen. These fields are **operator self-report, unverified by the server**. If the target is not clearly visible, record again. Upload and queue with `capture_evidence` frame selection.
5. Inspect the saved original, server probe/decode/hash, LIDRA report, selected/rejected frame reasons and hashes, screen suspicion, reconstruction input frame count, and any registered-view/sparse/dense/mesh metrics. Review the actual selected images before asserting that their features lie on the cast. A global feature match can come from the holder, hands, face, room, or background.
6. Repeat the same protocol three times for each arch when a cast is available. Keep source video, per-run JSON, and any later independently acquired reference private; do not commit patient or cast media simply to make a test pass.

A private, unpopulated storage layout may use `phase1-dental-capture/cast_upper/capture_01.mp4`, `cast_lower/capture_01.mp4`, and `metadata/capture_01.json`. Those names are **a protocol template, not existing files**. Preserve source SHA-256, device/platform, requested and observed camera fields, server-observed video properties, timestamps, LIDRA version/configuration, frame indices/hashes/reasons, engine/version, and failure codes in each real run. Unknown lens, focus, intrinsics, distortion, or metric scale must stay `unknown`/`unavailable`.

## Phase 1 capture report contract

The server stores the original video with a checksum after full decode. `captureMetadata.operatorReview` accepts only a physical cast or patient teeth, explicit visible-crown declaration, optional left/front/right/occlusal labels, and a review timestamp. Its status is `operator_declared_unverified`; it cannot override a screen-suspicion result or promote acquisition to dental-ready. The server's ffprobe fields are separate from client-requested camera values. Frame count and orientation are recorded only if the source reports them; OpenCV's decoded frame count is recorded independently.

LIDRA `capture_evidence` deterministically analyzes up to three times the requested selected-frame limit. Its whole-image observations include sharpness, luminance, under/overexposure, glare fraction, ORB feature count, pairwise global match count, overlap proxy, image displacement, timestamp, screen-border cue, and an accepted/rejected reason. Selected frames and image hashes are persisted. Temporal spacing and measurable global overlap/displacement reject redundant or unconnected candidates. These are **acquisition proxies**, not verified camera translation, tooth coverage, anatomical completeness, or dental correspondence. A strong persistent display-border cue yields `CAPTURE_TARGET_SCREEN_SUSPECTED`; insufficient selected evidence yields `CAPTURE_MULTIVIEW_EVIDENCE_INSUFFICIENT`. The report survives an early acquisition rejection so the failure remains inspectable.

The viewer shows acquisition counts and per-frame reasons. Diagnostic geometry remains explicitly visualization-only at arbitrary/unvalidated scale. It does not unlock clinical measurements, FDI labels, or accuracy claims.

## Local retrospective evidence (2026-09-25)

The private scan directory contained seven prior videos. A manual mid-frame spot check found three with visible physical patient teeth and four with a dental graphic on a monitor. A mid-frame check does **not** establish that all frames contain teeth or that the selected feature tracks lie on teeth. No controlled physical-cast capture was available for this run. For privacy, this report uses aliases rather than local scan IDs, paths, or patient images.

| Retrospective input | Source frames / duration | Analyzed → selected | Screen cue | LIDRA time | Interpretation |
| --- | ---: | ---: | --- | ---: | --- |
| Physical patient video P1 | 368 / 12.27 s | 72 → 24 | 0 positive frames | ~5.18 s | Global multi-view evidence only; dental ROI unverified |
| Physical patient video P2 | 458 / 15.27 s | 72 → 20 | 0 positive frames | ~5.05 s | Global multi-view evidence only; dental ROI unverified |
| Physical patient video P3 | 396 / 13.20 s | 72 → 24 | 0 positive frames | ~4.96 s | Global multi-view evidence only; dental ROI unverified |
| Prior monitor-negative input | 928 frames | 72 → 24 | 67/72 positive frames | ~5.10 s | Rejected: `CAPTURE_TARGET_SCREEN_SUSPECTED` |

The selected-frame global mean match counts for P1/P2/P3 were approximately 202/160/165; these counts must **not** be interpreted as dental features. The unchanged reconstruction engine was smoke-tested on P2's 20 selected frames: 7 registered views, 103 sparse multi-view points, 134 mesh vertices, 172 faces. The generated mesh still reported `best_pair_sparse_triangulation` and dense processing `disabled_global_diagnostic`; it is **not evidence of reconstructed teeth or multi-view mesh support**. Scale is arbitrary and the result is diagnostic only. These runs did not traverse the newly changed Dentist Mobile UX on a physical cast, so they cannot close the prospective Phase 1 acceptance gate. Upload and full-resolution mobile performance on the new flow remain unmeasured.

## Acceptance audit

| Gate | Current evidence |
| --- | --- |
| A Physical target via new Dentist Mobile flow | **OPEN** — controlled cast/mobile run unavailable; retrospective patient videos only |
| B Continuous video reaches backend intact | Implemented with probe, full decode, SHA-256; new cast upload **unverified** |
| C Reproducible metadata | Implemented for available source/server fields, unknowns explicit; device fields need real-run inspection |
| D Measured acquisition evidence | Implemented and retrospectively smoke-tested; whole-image only |
| E Deterministic keyframes | Software test and retrospective runs; exact repeatability tested with controlled fixture |
| F Multiple useful dental views | **OPEN** — multiple global views selected, dental origin and physical translation unverified |
| G Selected real frames reach reconstruction | Retrospective P2 smoke test; new cast flow **unverified** |
| H Inspectable result or diagnostic failure | Implemented; failed LIDRA report retained |
| I Screen/display suspicious | Prior monitor video rejected; heuristic has unknown sensitivity/specificity |
| J/K No clinical or fabricated anatomy claim | Preserved: no tooth coverage %, segmentation, FDI, metric scale or clinical claim |
| L Reconstruction and X-Core preserved | Existing engine retained; focused integration tests/build must remain green |

**Exact next experiment:** acquire one controlled cast video through the updated Dentist Mobile flow for each arch, then inspect selected frames for physical crown evidence and track origin, backend checksum/decode, report, and diagnostic reconstruction. If the selected features are mostly background, Phase 1 is **not passed** even if many cameras register or a mesh appears. The principal unresolved blocker for Phase 2 is reliable, reviewable dental-region localization; Phase 2 may then replace operator review with actual segmentation evidence. Independent geometric and clinical validation remain later phases and require real paired data.
