# Current repository re-audit: Phases 1–18

Inspected local revision **69e0a48a8e20724a9bfa5e4cae2db1e58e60f271**, branch **ADRIANHHALIM**, initially clean working tree. The prompt names main, but also directs work only in the current tree: no checkout, branch creation, commit, push or reset was performed. This is a new source inspection, not a reuse of the original procedural-only assessment. Local files are the evidence; remote GitHub main was not fetched or assumed identical.

**IMPLEMENTED ≠ EXPERIMENTALLY VALIDATED ≠ CLINICALLY VALIDATED**

## A. Phase 1–12 re-audit

Inspected mobile, web, backend controllers/routes/services, Python services/research, Prisma identity/study/audit relations, scripts/xcore-benchmark, docs and paper-evidence. Tracked research-media search found no MP4/MOV/AVI, reference STL/PLY/OBJ, or DCM/DICOM assets. The paper-evidence synthetic dental images are software fixtures, not smartphone/reference cohorts.

| Phase | Current execution | Status | Source evidence | Gap / enhancement |
|---|---|---|---|---|
| 1 | Server-verified Dentist guard and role-specific mobile tabs | partial | `mobile/src/features/dentist/components/DentistRoleGuard.jsx; backend/src/routes/xCoreRoutes.js` | Native deep-link/device restoration acceptance pending |
| 2 | Canonical user/patient relations, UUID study folder, owner/clinic checks | implemented | `backend/src/controllers/xCoreScanController.js; backend/prisma/schema.prisma` | No new patient system; broader deployment concurrency/identity audit still needed |
| 3 | Actual CameraView capture, requested settings separate from observed media | partial | `mobile/src/features/dentist/screens/3D/DentistScan3DScreen.jsx; mobile/src/utils/scanCaptureMetadata.js` | No physical Android/iOS verification of lens/AF/stabilization |
| 4 | Private upload, full decode, checksum, ownership before receiving bytes | implemented | `backend/src/services/scan3D/videoInspection.js; backend/src/services/scan3D/scanStorage.js` | Retention and interrupted-upload operational cleanup need deployment acceptance |
| 5 | Polling worker, CAS claim, lease/heartbeat, bounded retry and isolated attempts | implemented | `backend/src/services/scan3D/scan3DWorker.js` | Suitable bounded prototype; distributed filesystem/lock assumptions remain |
| 6 | Measured sharpness, luminance, exposure and pixel redundancy | experimental | `backend/python_service/services/lidra_service.py; backend/src/services/scan3D/lidraService.js` | Motion/anatomical coverage and calibrated quality score unavailable; duplicate acquisition in pipeline remains |
| 7 | OpenCV default; external model adapters explicitly unavailable | partial | `backend/src/services/scan3D/engines/reconstructionEngineRegistry.js; pluggableResearchEngines.js` | COLMAP/DUSt3R/MASt3R/Neuralangelo/ABot not executed by these adapters |
| 8 | Decoded-video SIFT/matching/essential matrix/recoverPose/triangulation/OBJ-PLY-STL | experimental | `backend/python_service/services/reconstruction_service.py` | Sparse best two views, estimated intrinsics, arbitrary scale, partial mesh; kept intact |
| 9 | Identity processing by default, originals preserved | partial | `backend/src/services/scan3D/pipeline/dentalMeshFilter.js` | New calibration is an explicit versioned derivative; no anatomical deformation |
| 10 | Existing X-Core manifest loading/auth/hash/asset lifecycle | experimental | `web/src/pages/dentist-portal/x-core/components/3D/Scan3DMeshViewer.jsx` | Real representative mesh/browser memory stress still unverified |
| 11 | Visualization-only gate, annotation identity scoped to asset hash | partial | `web/src/pages/dentist-portal/x-core/components/3D/scan3DAssetSafety.mjs` | Scale calibration alone never enables measurement; annotation persistence remains local |
| 12 | Procedural tooth/FDI path explicitly refused | blocked | `backend/src/controllers/xCoreScanController.js; backend/python_service/main.py` | No verified tooth segmentation/FDI execution; no fake confidence |

Targeted tests verify software paths, not deployment, hardware or clinical acceptance. The Node adapter resolves inspected uploaded video in private storage, posts that real path to the authenticated Python service, verifies output provenance/hashes, and publishes manifest assets under a fenced worker lease. Controlled tests execute decoded feature-video reconstruction; no real smartphone study was supplied for a live E2E demonstration. The native procedural engine remains simulation/research-ineligible. No external engine was substituted or installed.

## B. Dataset audit

| Category | Current evidence / status |
|---|---|
| Smartphone videos | SMARTPHONE_VALIDATION_DATASET_UNAVAILABLE; none supplied as a research cohort |
| Repeated smartphone captures | REPEATED_CAPTURE_DATA_UNAVAILABLE |
| Reference STL/PLY | REFERENCE_GEOMETRY_UNAVAILABLE |
| Raw DICOM | RAW_DICOM_UNAVAILABLE_CURRENT_ENVIRONMENT at the configured B001 path |
| Historical/local DICOM benchmark | Present in config, CSV, summary and raw Python events |
| Synthetic/procedural fixtures | Explicit software verification only; never research/clinical accuracy evidence |

The configured `test dentist will upload/Patient - 1295.SL` directory and its parent are absent in this current workspace. This does not mean the dataset never existed or cannot exist elsewhere. No unrestricted machine-wide search was performed. `dataset-evidence.json` records checked availability separately from historical records without reproducing patient identifiers or benchmark login credentials.

Latest recorded run: `xcore_single_complete_cbct_repeated_benchmark_1781387626964`, case B001, five successful software runs, **1,539,068,687 bytes = 1,467.77 MiB**, 550 files, 300 reported slices. Raw events record a CT series classified 3D with 401 files plus 2D Image/Cephalometric/Panoramic classifications. These are log observations, not a fresh DICOM inventory. Earlier CSV runs include failures and a different inventory (559 files); they are retained separately, not pooled into a fabricated cohort. Five software runs do not equal five physical captures. `groundTruthClass: 3D` concerns modality classification, not a reference surface.

## C. Phase 13A / 13B

13A infrastructure exists: rigid alignment/optional ICP, seeded area-weighted triangle sampling, closest-surface distances, repeatability groups, explicit units/ROI/reference provenance, hash verification and immutable reports. Metrics implemented are mean/median absolute deviation, RMS, sampled maximum/Hausdorff, symmetric mean-distance Chamfer, tolerance-based completeness, separate scale-landmark error and pairwise repeatability. Sampled quantities are approximations; none was calculated on a real research dataset here.

The principal engineering gap was the missing traceable conversion from arbitrary-scale SfM into a physically scaled research artifact. Added `research.calibration` and `calibrate` CLI: require independent physical length, landmark definition, instrument/reviewer/time/uncertainty, evidence hash and image-derived original provenance; preserve source; write new OBJ and provenance with exact uniform transform and parent hashes. Reference-based scale fitting is rejected. Validation now requires its configured scale-evidence identifier to match the asset record. Synthetic source rejection remains enforced. Calibration is not geometric validation; uniform scaling cannot repair local distortion. No clinical or measurement capability is promoted.

Added calibration and smartphone study JSON Schemas plus an intentionally incomplete template. These are interchange contracts; Python performs semantic checks. A full external JSON Schema validator was not installed/run. 13B remains blocked by missing real repeated captures, independent scale evidence and justified surface references. Actual trueness, precision, completeness, surface deviation and scale-error results remain DATASET_UNAVAILABLE.

## D. Phase 14

Existing read-only DICOM audit/manifest and explicit reviewed threshold surface derivation are preserved. Current raw unavailability now has the specific status requested. Historical evidence is discoverable with `dataset-evidence` without treating it as raw data. Dimensions, spacing, thickness, orientation, anatomy/jaw/tooth visibility, labels, segmentation, patient diversity and usable samples cannot be freshly determined from unavailable raw files.

Surface extraction is implemented for supported, consistent series with explicit justification/reviewer. It is not dental segmentation or an automatically accepted reference. Tooth detection/segmentation, FDI, jaw segmentation, reconstruction supervision, geometric validation and clinical AI readiness remain unestablished pending raw data, labels, objective and expert review. No raw files were modified and no ML training occurred.

## E. Phase 15: current software measurements

Three NEW runs of the controlled synthetic texture-video test, stored separately from old reports. It exercises actual image computation but is not smartphone or dental validation.

| Run | Total ms | Acquisition ms | Pose/triangulation ms | Mesh/export ms | CPU ms |
|---|---|---|---|---|---|
| 1 | 211.714 | 90.931 | 20.570 | 14.529 | 320.226 |
| 2 | 160.930 | 61.454 | 14.180 | 12.486 | 300.067 |
| 3 | 160.092 | 61.397 | 13.906 | 11.737 | 295.597 |

The JSON contains process-lifetime peak RSS, runtime versions and actual output byte counts. Capture hardware, network upload, GPU memory and geometry-quality/completeness tradeoffs remain unavailable. No resolution/codec/engine quality ranking or speed improvement is inferred. Existing stage instrumentation remains; acquisition is currently performed twice across the adapter/service boundary and is a future profiling-driven optimization candidate.

Historical CBCT software observations are separately 8.6208 s upload, 7.0254 s volume preparation, 1226.2/559.6/556.0 ms axial/coronal/sagittal rendering means. Corrected the summarizer and old narrative's false “sub-100ms” sentence and binary size label. Also removed its assumption of 100% agreement when classification logs are missing and its zero-memory fallback for missing observations. Agreement is explicitly against a series-name heuristic, not independently established ground truth. Historical CSV/raw events and numerical JSON were not rewritten or rerun as new observations.

## F. Phase 16

NEW controlled STL parser measurements (no actual browser/GPU rendering):

| Triangles | Bytes | Parse ms | Process RSS delta bytes |
|---|---|---|---|
| 1,000 | 50,084 | 2.107 | 753,664 |
| 25,000 | 1,250,084 | 6.210 | 2,015,232 |
| 100,000 | 5,000,084 | 17.912 | 7,536,640 |
| 500,000 | 25,000,084 | 7.688 | 32,096,256 |

Reducer costs at 1/100/1000 annotations are recorded in the same report. These are CPU state-update costs, not browser annotation latency. Profile output now supports an explicit new path and refuses overwrites. Existing actor-style separation, cancellation/disposal, bounded downloads and coordinate/hash isolation were re-inspected. No LOD/decimation or coordinate mutation was introduced into X-Core. Dense point-cloud interaction, representative many-measurement rendering, sustained FPS, GPU memory and camera latency are still unavailable. Prior triangle browser smoke observations remain historical software evidence and were not relabelled as new measurements.

## G. Phase 17

Tooth segmentation and FDI remain blocked; AI finding generation and scan-to-CDSS integration have no verified implementation prerequisite. No AI result or diagnosis was fabricated. Existing external AI and human review flows remain separate. A future scan-specific finding must preserve model/input/version/confidence provenance and original/final findings with reviewer and timestamp. Calibration does not open this gate.

## H. Phase 18

Re-inspected server-side role/owner/clinic checks, private upload/asset routes, hash/path confinement, leases/retries, immutable provenance and explicit unavailable segmentation. Existing automated contracts were rerun. SecurityEvent provides server job/asset audit; camera lifecycle and local annotations are not yet a complete server audit trail. Camera-denied/interruption/network failures have mobile handling; corrupt video, worker timeout/lease loss, invalid reconstruction and asset failures have explicit error paths. GPU engines/segmentation/AI remain unavailable instead of producing fake output. Full production deployment, recovery/retention, hardware usability and clinical evaluation remain unverified.

New calibration records are local research artifacts and are not automatically ingested into a patient record. They require an explicit reviewed publication workflow later. Reference provenance and human interpretation of calibration evidence remain necessary; a checksum is not scientific approval.

## I. Capability matrix and verification

`capability-matrix.json` includes implementation/data/real-or-synthetic/test/research/clinical status, risk, blocker and enhancement, with 13A separate from 13B and historical CBCT separate from current raw availability.

Fresh checks:

- Python: `.venv/bin/python -m unittest discover -s backend/python_service/tests -p 'test_scan3d_*.py' -v` — **23 passed**, including seven new calibration/evidence tests. Controlled fixtures remain labelled and temporary.
- Backend contracts: `node --test backend/tests/scan3d.engines.test.js backend/tests/scan3d.integrity.test.js` — **25 passed**.
- Benchmark evidence: `node --test backend/tests/scan3d.benchmark-evidence.test.js` — **2 passed**, including missing-observation failure cases.
- Viewer contracts: `node --test web/tests/scan3DAssetSafety.test.mjs web/tests/xCore3DScanViewer.test.mjs` — **11 passed**.
- Mobile (from mobile): `npm test -- --runInBand --watchman=false __tests__/mobile-dentist-role.test.js __tests__/mobile-dentist-scan.test.js __tests__/scan-capture-provenance.test.js` — **32 passed**. Initial invocation from repository root had no matching npm task; rerun in mobile passed.
- Missing-input CLI: dataset-evidence, validate and dataset-audit — explicit unavailable reports without metric values.
- Fresh software profile commands: `PYTHONPATH=backend/python_service .venv/bin/python -m research.software_profile --output reports/scan3d/re-audit/pipeline-fixture-profile.json` and `node web/scripts/profile-scan3d-fixtures.mjs --output reports/scan3d/re-audit/viewer-fixture-profile.json`.

Prior database integration/build/browser results remain in the original report; they are not claimed as newly executed in this re-audit. No runtime web/mobile components or database schema were changed in this pass. Exact changes are listed in `re-audit-changed-files.txt`.

## J. Remaining blockers and priority

- **Engineering:** Independent-scale artifact bridge is now implemented/tested, but reliable real landmark identification and uncertainty assessment remain required. Sparse two-view geometry, estimated intrinsics, duplicated acquisition, incomplete audit persistence, distributed lock/storage assumptions and representative browser stress coverage remain limitations.
- **Dataset:** No supplied smartphone cohort, repeats, surface references or currently accessible B001 raw DICOM.
- **Research:** Need justified reference uncertainty, calibration/held-out measurements, preregistered capture/ROI/alignment decisions, sufficient sample diversity and reproduced real-input results. Existing schemas do not certify evidence.
- **Clinical validation:** No clinical accuracy, clinically validated segmentation/FDI, prospective evaluation, formal human factors/risk lifecycle or approved deployment claim.
- **Infrastructure:** Shared private storage/token configuration, CPU/ffmpeg dependencies, pinned reproducible research environment and operational retention/backup verification remain necessary.

**Single priority addressed first:** the absent provenance-preserving independent scale-calibration bridge. It no longer requires undocumented manual geometry editing to prepare a qualifying derived asset. Using it scientifically still depends on real independent evidence; no calibration or validation result was invented in this work.
