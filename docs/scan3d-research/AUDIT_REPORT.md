# Phase 1–18 audit and implementation report

Date: 2026-09-24. Repository: Dentalization/SereneApps. Existing branch: ADRIANHHALIM. No branch creation, commit, push, reset or discard. This report records software work and controlled tests, not a completed clinical product or empirical research study.

**IMPLEMENTED ≠ EXPERIMENTALLY VALIDATED ≠ CLINICALLY VALIDATED**

Real smartphone capture videos, repeated captures, project reference STL/PLY and raw research DICOM: **DATASET_UNAVAILABLE**. No trueness, precision, surface deviation, reconstruction accuracy, clinical accuracy, smartphone-versus-reference or DICOM model performance is claimed.

## 1. Phase 1–12 audit

The current implementation column below describes the resulting code. The problem column records the original implementation and its consequence. Automated software verification is distinct from device/clinical acceptance.

| Phase / current implementation | Actual status | Original problem and impact | Fix applied |
|---|---|---|---|
| 1 — Dentist mobile foundation | partial | Token/storage and role timing could mount protected effects | Session expiry reaches Redux; server-verified role guard before effects; navigation identity isolation |
| 2 — Patient and scan creation | implemented | Global discovery and ambiguous identity/ownership exposed patient links | Canonical patient resolution, scoped discovery, UUID scan IDs, ownership and clinic checks |
| 3 — Video capture | partial | Requested FPS/resolution and stale timer presented as observed values | Monotonic capture timing, interruption cleanup, requested versus measured metadata |
| 4 — Upload and video validation | implemented | File extension/MIME and public paths trusted | Private storage, bounded upload, ffprobe and full decode, checksum and confinement |
| 5 — Asynchronous processing | implemented | Concurrent claims, stale worker writes and retry inflation possible | Atomic audited claims, lease fencing, heartbeat, bounded retry/backoff, timeout, queue pagination |
| 6 — Acquisition intelligence / LIDRA | experimental | Placeholder frames, quality scores and coverage misrepresented | Measured sharpness/exposure/redundancy on actual frames; coverage and confidence unavailable |
| 7 — Engine abstraction | partial | Named research engines delegated to procedural fallback | Explicit unavailable scaffold descriptors; no silent fallback; OpenCV sparse SfM only runnable research engine |
| 8 — Pose and reconstruction | experimental | Procedural arch independent of video | Image-feature matching, essential matrix, triangulated sparse geometry and actual estimated poses |
| 9 — Dental mesh processing | partial | Anatomical deformation could conceal geometric error | Identity by default; finite/index checks and explicit crop utility; preserve source |
| 10 — X-Core integration | experimental | Initialization failure, unverified assets and geometry reload on style changes | Existing viewer repaired; authorized manifest assets, checksum, bounded loads and disposal |
| 11 — Measurements and annotations | partial | Arbitrary coordinates labelled mm; annotations not asset-version scoped | Visualization-only gating; coordinates preserved; annotations keyed to user/scan/checksum |
| 12 — Tooth segmentation and FDI | blocked | Procedural heuristic could appear as AI with uncalibrated confidence | Endpoints fail explicitly; provenance contract; no inferred FDI or fake confidence |

## 2. Critical findings

The previous native/Python paths produced procedural dental arches independent of input anatomy. Named COLMAP, DUSt3R, MASt3R, Neuralangelo and ABot implementations did not execute those external systems. LIDRA fallback frames, scores, camera poses and confidence could make simulation appear measured. Those research paths now fail explicitly or perform actual image computation; legacy procedural generation is available only through explicitly permitted nonproduction software fixtures and cannot enter the research queue.

Public storage and incomplete ownership checks endangered patient isolation. Concurrent worker updates could publish stale output. X-Core had initialization and style-driven geometry-reload problems. Arbitrary-scale distance labels and procedural tooth labels were unsafe grounds for clinical inference. These were corrected or disabled explicitly at the capability boundary; normal visualization and annotations remain available.

## 3. Enhancements applied

Backend controllers/routes now enforce patient/dentist/clinic scope, private media inspection/storage, asset manifests and audited job transitions. The worker uses fenced leases, bounded retries and isolated attempts. Engine adapters reject fake backends, record versions/configuration/checksums and retain raw geometry. Python computes actual frame features, image-derived camera poses and sparse geometry. Research modules add offline validation and DICOM auditing. Mobile separates requested capture settings from observed media and protects screen effects with verified auth. Existing X-Core separates actor styling from mesh creation and ties annotations to asset identity. Public copy removes or marks unsupported performance, clinical and certification claims; remaining illustrative research descriptions are explicitly labelled as proposals. External bibliography summaries, partner assertions and unrelated testimonial marketing still require independent editorial/source verification and are not accepted as study evidence.

Exact file inventory is in `changed-files.txt`; phase evidence is in `capability-matrix.json`.

## 4. Phase 13 result

Implemented STL/PLY/OBJ triangle-surface loading, area-weighted deterministic samples, nearest triangle-surface distances, rigid initial transform validation, rigid alignment/optional ICP and recorded convergence parameters. Metrics are defined separately: directional mean absolute/median/RMS/sample maximum, sampled bidirectional Hausdorff, symmetric mean-distance Chamfer, reference sample coverage at an explicit tolerance, and optional independently specified global/local scale landmarks. Sampled maxima and completeness are approximations, not exact continuum values. Rigid ICP can reach local minima; researchers must review alignment and capture the initial transform.

Repeated captures are grouped by object/device/operator/protocol with explicit sessions. Pairwise within/between-session surface differences do not become reference trueness or independent confidence intervals. Synthetic/test provenance is rejected; physical units and independently evidenced asset scale must already exist. Current arbitrary-scale SfM output is ineligible for physical measurement. Reports are immutable JSON plus Markdown. Actual reference/repeatability results: **DATASET_UNAVAILABLE**.

The scientific anchor is Li et al., *Obtaining Full-Arch Implant Scan with Smartphone Video and Deep Learning: An In Vitro Investigation on Trueness and Precision* ([paper](https://onlinelibrary.wiley.com/doi/full/10.1111/jopr.14041), [PubMed](https://pubmed.ncbi.nlm.nih.gov/40055947/)). Its implant scan-body, in-vitro setting is a precedent for an evaluation protocol, not proof of natural-tooth scanning or this implementation. Its numerical results are not used as SereneApps expectations. This implementation does not reproduce its COLMAP/Neuralangelo pipeline.

## 5. Phase 14 result

Read-only DICOM inventory records pseudonymous study/series, hashes, modality, dimensions, spacing, thickness and orientation, plus explicit exclusions for corrupted/unsupported/inconsistent/duplicate series. Pixel decode and anatomical review are distinct from header audit. No silent sample removal. Raw/derived/processed/labels/references layout is available. Optional reviewed intensity-threshold extraction produces a derived LPS surface and derivation record, never an automatically approved dental reference. No custom ML training occurred.

Study count, usable samples, jaw coverage, tooth visibility, labels, cohort diversity and available reference geometry are unknown. Actual dataset/model results: **DATASET_UNAVAILABLE**.

## 6. Phase 15 result

`reports/scan3d/pipeline-fixture-profile.json` records three controlled synthetic feature-video software runs: 519,128-byte 640×480, 12-frame MJPG input; total processing 260.116 / 167.646 / 167.092 ms; acquisition 83.033 / 67.002 / 65.347 ms; pose estimation 54.911 / 13.974 / 14.295 ms; mesh generation 14.698 / 12.184 / 15.474 ms. Process-lifetime peak RSS was 155,959,296 bytes; OBJ 8,795, PLY 8,477, STL 7,584 and preview 215,408 bytes. These costs characterize this tiny fixture, not clinical throughput or quality. JSON is the detailed evidence and scope definition.

Real camera duration/codec/device performance and upload duration: unavailable. GPU memory: unavailable (CPU path). No candidate-engine ranking or resolution/FPS versus geometric-quality conclusion is possible. Operational bounds (512 MiB upload, 180-second video, 128 MiB viewer asset, bounded sampling and retries) are containment controls, not empirically accepted clinical performance budgets.

## 7. Phase 16 result

The existing viewer was retained. A controlled browser triangle rendered with no observed console errors. Changing color did not redownload geometry; point annotation, rotation and zoom remained usable. The observed initial load was 138.0 ms, point pick 2.3 ms, CPU input-to-render interval 1.0 ms, and browser-reported heap 37,299,791 bytes. Initial CPU render rounded to 0.0 ms; this is not GPU time. These are single observations, not distributional benchmarks.

The controlled parser report covers 1k/25k/100k/500k triangles, with parse times 3.814/5.940/20.050/8.286 ms and RSS deltas 704,512/1,998,848/7,471,104/32,079,872 bytes. Nonmonotonic timings reflect single runs/JIT/GC; no speed claim follows. Reducer tests at 1/100/1000 annotations are not browser annotation latency. Real dense point-cloud, high-poly camera/annotation/measurement interaction, sustained FPS and GPU budgets remain unmeasured. No decimation, LOD or progressive representation was introduced without evidence that it preserves the research coordinates.

## 8. Phase 17 result

Blocked by prerequisite gates. No validated tooth segmentation, FDI assignment, scan-specific AI finding model or scan-to-CDSS workflow was created. Segmentation endpoints explicitly refuse the old heuristic. No automatic diagnosis or fake human-review state exists. Existing unrelated clinical review/external AI integrations remain separate. A future finding model needs immutable input/model/version/confidence provenance plus reviewer identity, timestamp and accepted/rejected/modified state before any integration.

## 9. Phase 18 result

Authentication/authorization precede uploads and asset reads; public scan paths and Python compute proxies are blocked. Uploaded bytes are inspected and hashed. Attempt outputs have confined paths and hashes. Worker claims and publication are fenced, retry attempts capped, stale processing recovered, and long-running Python computation guarded by a filesystem lock. Provenance captures input identity/metadata, pipeline versions, parameters and asset identity; confidence is null when uncalibrated. Existing SecurityEvent infrastructure records server scan/job/asset events rather than introducing a second audit system.

Audit coverage is partial: browser-local annotations and native camera lifecycle events do not yet form a server-side longitudinal clinical audit. Deployment controls, retention and backups still require operational review. Experimental status does not auto-promote after software tests. Engineering references are [ISO 14971:2019](https://www.iso.org/standard/72704.html), [IEC 62304:2006](https://webstore.iec.ch/en/publication/6792) and [IEC 62366-1:2015](https://webstore.iec.ch/en/publication/21863); no certification or compliance is asserted.

## 10. Remaining limitations

The image-derived path is two-view sparse SfM with partial image-plane triangulation, not dense full-arch reconstruction. Intrinsics may be estimated; lens distortion, intraoral specularity and motion remain unresolved. No physical scale, natural-tooth completeness or smartphone clinical data has been established. Raw geometry is preserved; anatomical smoothing would not make it accurate. Native hardware capture/permissions and live full-product E2E acceptance remain pending. No production deployment or full unrelated application regression was performed. Python dependencies need a pinned research environment. Orphan attempt retention/cleanup, distributed worker deployment, server-side annotation persistence/audit and broad device/asset load tests remain work.

## 11. Research blockers

Supply authorized smartphone videos, repeats and suitable reference meshes with documented protocols. Establish independent physical scale, camera calibration, representative sample criteria, reference uncertainty and approved regions. Supply/review raw DICOM and labels before any ML objective. Review registration and metric assumptions, record environment versions and hardware, and perform repeated matched-input experiments. All dataset-dependent evaluation currently reports DATASET_UNAVAILABLE.

## 12. Clinical blockers

No prospective clinical evaluation, qualified usability validation, calibrated findings, validated segmentation/FDI or formal lifecycle/risk/security process has been completed. No diagnostic or measurement claims are warranted. Existing marketing/library examples are not clinical evidence. Formal deployment review and clinical governance remain required before patient-care reliance.

## 13. Tests executed

| Test | Command (from repository root unless specified) | Result |
|---|---|---|
| Backend contracts/integrity | `node --test backend/tests/scan3d.engines.test.js backend/tests/scan3d.integrity.test.js` | 25 passed |
| Isolated PostgreSQL route/integrity integration | `bash backend/scripts/test-scan3d-integrity.sh` | 20 passed in temporary test database; application DB untouched |
| Python research/service | `.venv/bin/python -m unittest discover -s backend/python_service/tests -p 'test_scan3d_*.py' -v` | 16 passed |
| Web asset/viewer units | `node --test web/tests/scan3DAssetSafety.test.mjs web/tests/xCore3DScanViewer.test.mjs` | 11 passed |
| Mobile role/capture | from mobile: `npm test -- --runInBand --watchman=false __tests__/mobile-dentist-role.test.js __tests__/mobile-dentist-scan.test.js __tests__/scan-capture-provenance.test.js` | 32 passed; hardware not tested |
| Web bundle | from web: `npm run build` | Passed; existing large-bundle, Browserslist/PostCSS warnings |
| Pipeline software profile | `PYTHONPATH=backend/python_service .venv/bin/python -m research.software_profile --output reports/scan3d/pipeline-fixture-profile.json` | Controlled synthetic timing report only |
| Viewer parser profile | `node web/scripts/profile-scan3d-fixtures.mjs` | Controlled synthetic parser/reducer report only |
| Browser smoke | existing X-Core through `/tests/browser/scan3d-fixture.html` | Triangle/style/annotation/rotation/zoom checked; no real study |
| Missing-data CLI | `research validate` / `research dataset-audit` | DATASET_UNAVAILABLE, no metrics |
| Whitespace | `git diff --check` | Passed at final check |

Tests overlap across suites; counts are not unique clinical scenarios. Algorithm tests use explicitly labelled mathematical/video/DICOM fixtures. They verify software behavior and exclusion gates, not reconstruction accuracy. Initial contract path handling and watchman sandbox issues were corrected or rerun with the watcher disabled; final results above reflect corrected runs.

## 14. Files changed

See `changed-files.txt` for exact repository-relative paths. Core changes are under backend/src/services/scan3D, backend/python_service/services and research, the scan controller/routes, mobile Dentist screens/auth/capture, and existing X-Core 3D components. Tests, reports and research docs are additive. Public page/translation changes are claim wording only.

## 15. Files not changed

No Prisma schema migration or second patient/annotation/viewer system was created. Existing appointments, payment/billing, patient mobile feature screens, general radiology/DICOM visualization, and unrelated external AI service implementations were preserved. The legacy tooth heuristic file remains on disk but is disconnected from scan segmentation endpoints. Existing reconstruction engine names remain discoverable as explicit unavailable scaffolds. This is not evidence that every unrelated route was regression-tested.

## 16. Final capability matrix

`capability-matrix.json` provides phase, feature, implementation state, real/simulated distinction, test evidence, research/clinical status, risk and required enhancement. No phase is labelled clinically validated. Runnable image computation and research infrastructure exist; empirical and clinical acceptance are still blocked. Final acceptance A/B (live smartphone workflow and real smartphone reconstruction) and F (representative viewer stability) are not demonstrated by controlled fixtures. C/E/G have implemented safeguards and targeted software evidence, with deployment limitations. D is dataset-ready infrastructure subject to calibration; H remains gated.
