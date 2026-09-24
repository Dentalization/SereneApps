# Smartphone 3D research runbook

IMPLEMENTED ≠ EXPERIMENTALLY VALIDATED ≠ CLINICALLY VALIDATED.
Research inputs and all dataset-dependent results: **DATASET_UNAVAILABLE**.

## Service setup

Use the existing backend and Python environments. Python requirements are in `backend/python_service/requirements.txt`; ffmpeg and ffprobe must be installed on the backend host. Configure the same absolute `SCAN3D_STORAGE_ROOT` on Node and Python, and the same secret `SCAN3D_SERVICE_TOKEN` in their deployment environments. Never expose that token to the browser/mobile client or commit it. The services need shared private storage; production deployments must verify permissions, proxy routing, TLS, backups and retention. Python uses a POSIX advisory per-scan lock; isolated hosts without shared lock/storage need an equivalent deployment design.

Keep the private directory outside public static roots. The backend handles authenticated video upload/asset reads and the worker; the Python service handles authenticated computation. Configure `PY_SERVICE_BASE_URL` (default `http://127.0.0.1:8000`) on the backend. Inspect the existing application startup scripts rather than starting a second application stack. Unknown/disabled engines fail explicitly. Do not enable procedural fixtures on a production path.

## Experiment contract

JSON Schemas describe experiment requests, complete physical-validation inputs, and validation outputs. They are interchange contracts; runtime validators enforce semantic constraints such as calibrated provenance and rigid transforms. The intentionally incomplete `validation.example.json` does not pass the complete-input schema until real inputs and study decisions are supplied.

`experiment.example.json` is a request template, not a capture record. Fill the protocol and requested settings; the server stores observed video metadata separately. Submit the configuration with enqueue. Supported frame sampling is uniform; algorithm parameter validation is implemented by `services/reconstruction_service.py`. Requested model versions are not proof of execution: engine/runtime versions come from the actual result provenance. Output contains hashes, configuration, measured stages, coordinate system and uncalibrated scale. Original assets and attempt provenance are preserved.

Current OpenCV output is a partial two-view sparse reconstruction in arbitrary units. It cannot enter physical-scale evaluation just by setting `units: mm` in a config. First provide independent calibration, version the transformed geometry and its provenance, and review the experiment. No automatic clinical promotion exists.

## Offline evaluation

From the repository root, use a new output directory for every run:

```sh
PYTHONPATH=backend/python_service .venv/bin/python -m research validate --config docs/scan3d-research/validation.example.json --output /private/tmp/scan3d-validation-new
PYTHONPATH=backend/python_service .venv/bin/python -m research dataset-audit --output /private/tmp/scan3d-dicom-audit-new
```

These empty-data examples emit DATASET_UNAVAILABLE, with no geometric results. Supply real files only after the study protocol, physical scale and reference suitability are documented. Reference STL/PLY/OBJ must contain triangle surfaces. A point cloud alone is not a surface reference. Record initial alignment, units, coordinate system, inclusion/exclusion, scanner/device/resolution, and generation method. Cropped ROIs must be separately prepared and versioned; evaluation never silently masks an error region.

`repeatability` takes a config with `validation` (the common validation config) and `scans` records containing scanId, reconstructionPath, provenancePath, objectId, device, operator, captureProtocol and sessionId. Object/device/operator/protocol must match, scan IDs must be unique. Every comparator must independently pass provenance and calibrated-scale checks. Pairwise within/between-session summaries are dependent observations, not confidence intervals or trueness.

## DICOM preparation

`dataset-init --output <new-root>` creates raw/derived/processed/labels/references directories, not fake data. Import authorized raw files without rewriting them. `dataset-audit --raw <raw-root> --output <new-evidence-dir>` inventories headers and checksums; anatomical review and pixel integrity remain separate. Header consistency cannot prove complete acquisition. Pseudonymous manifests still require access controls.

`derive-reference --config <config.json> --output <new-derived-dir>` accepts rawSeriesPath, threshold, scientificJustification and reviewer. It requires one consistent supported series, decodes/rescales pixels, extracts an intensity isosurface in DICOM LPS physical coordinates, and records derivation. This is not tooth segmentation, an approved reference, or a gold standard. Enhanced multiframe, unresolved geometry or inconsistent series are rejected. A qualified reviewer must assess anatomy, artifacts, modality-dependent thresholds and reference suitability. Raw and output paths must be separate.

## Reproduction and performance

Run the commands recorded in AUDIT_REPORT.md. `research.software_profile` generates and discards explicitly synthetic feature-video inputs and records algorithm costs only. `web/scripts/profile-scan3d-fixtures.mjs` measures controlled STL parser/reducer costs. Neither evaluates dental accuracy. The browser fixture is an explicit one-triangle viewer exercise, not an authenticated real-patient E2E test.

Archive source revision plus working diff, dependency versions/lockfiles, configuration, machine characteristics, checksums and reports for each real experiment. Python dependencies currently lack a complete pinned research lock; resolve that before inter-machine reproducibility claims. Research output directories refuse overwrites. Do not publish sensitive paths, tokens, videos or patient identifiers in shared reports.
