# Real reconstruction path, integrity and reproducibility audit

Inspected revision: `3cf19ee`, current working tree; no branch change, commit or push. Implementation and tests below are software evidence, not experimental or clinical validation.

## Exact execution path

1. Mobile `DentistScan3DScreen.jsx` records video and submits it through `scan3DService.js`.
2. `backend/src/routes/xCoreRoutes.js` protects `POST /v1/x-core/3d-scans/:id/video` with authentication, Dentist role and scan authorization before accepting bytes.
3. `backend/src/controllers/xCoreScanController.js::upload3DScanVideo` calls media inspection (ffprobe plus full ffmpeg decode), stores the input privately and records observed media properties and SHA-256.
4. The queue and `scan3DWorker.js::processStudy` claim the study with an atomic lease and pass a unique attempt directory to `runReconstruction`.
5. `reconstructionEngineAdapter.js` resolves the explicit engine, checks the uploaded video hash and runs measured acquisition. `opencv_sparse_sfm` is the default; `python_reconstruction_service` is an alias. Native procedural geometry is excluded and named external research engines are unavailable scaffolds.
6. `engines/pythonServiceEngine.js::process` calls authenticated `POST /reconstruct/3d-scan`. `backend/python_service/main.py` confines input/output paths and holds the per-scan filesystem lock while running the Python function.
7. `services/reconstruction_service.py::process_3d_scan_reconstruction` verifies and reuses the same attempt's persisted LIDRA report, selected-frame checksums, video checksum and sampling configuration. Direct offline calls without a report run measured acquisition once. It computes SIFT features and ratio-filtered matches, estimates the essential matrix, calls recoverPose, and triangulates points with positive-depth, reprojection and parallax checks. It chooses the best TWO views, creates image-plane Delaunay triangles with edge/depth limits, and writes OBJ, point-cloud PLY, STL and preview.
8. Node verifies the returned input identity, selected-frame identities against its acquisition report, and every output hash/size. It writes immutable attempt provenance, and the worker publishes only under its held lease. X-Core discovers the registered assets and fetches them through the authenticated scan asset route.

This is image-derived sparse two-view computation. It is not dense full-arch reconstruction, calibrated geometry or clinical evidence. The production path now decodes/selects frames once per attempt and checks that the published reconstruction used exactly that measured selection. This is an integrity and execution-efficiency improvement, not an accuracy result.

## Gaps corrected before Phase 13 changes

- **Input identity:** Python's claimed input hash was not compared to the inspected upload at publication. Node now requires equality and re-hashes the current source; Python also checks that the video did not change during reconstruction.
- **Output identity:** Node previously generated a new hash without comparing it to Python's output claim. A size/hash mismatch now rejects publication with a permanent integrity error.
- **Execution provenance:** Runtime engine version, image-derived status, coordinates, resolved configuration and reproducibility metadata are now required. The immutable Node manifest stores both requested and resolved settings, selected-frame hashes, actual intrinsic matrix, intrinsic origin and camera poses.
- **Reproduction:** The Python report records Python/NumPy/OpenCV/platform/thread-count, OpenCV build fingerprint, and hashes of the reconstruction/acquisition/STL-export sources. Selected frame bytes are checked before use. Existing reconstruction artifacts cannot be silently overwritten by a second run.
- **Intrinsic resize:** Supplied camera intrinsics now follow the actual rounded width/height ratios independently, rather than assuming an identical scalar after rounding.
- **Unsupported settings:** Unknown reconstruction-level settings, including an invented requested version, are rejected instead of silently discarded.

Engine implementation version is now `2.1.0`. The Node and Python changes must be deployed together: older service responses lacking execution evidence are intentionally rejected.

## Reproduce the baseline

The minimal offline dependency pins are `backend/python_service/requirements-scan3d-baseline.txt` (NumPy 2.4.4 and opencv-python-headless 4.13.0.92), recorded from Python 3.14.0 on macOS arm64. This is not a full API/VTK environment lock or a claim of portable bitwise determinism. The OpenCV build/source fingerprints distinguish runtimes that have identical package version strings.

From the repository root, with an EXISTING authorized video and a new output directory:

```sh
PYTHONPATH=backend/python_service .venv/bin/python -m research.reproduce \
  --video /absolute/path/to/supplied-video.mp4 \
  --config docs/scan3d-research/experiment.example.json \
  --output /absolute/path/to/new-run \
  --input-kind real_capture
```

No video is supplied by this example. A missing input reports DATASET_UNAVAILABLE without creating a mesh. Use `--input-kind synthetic_fixture` for software test assets; that manifest retains test/synthetic markers and is rejected by research validation. `real_capture` is an operator declaration, not independent proof of dataset origin or study eligibility. Preserve the actual input, config, source checkout/diff, dependency pins and output evidence. Repeat into another NEW directory and compare asset SHA-256 values; differing environments may require numerical review rather than byte equality.

The offline command invokes the SAME Python reconstruction function as the HTTP service and saves provenance. It does not create patient records, compare a reference, or promote measurement/clinical status.

## Phase 13: only after the baseline checks

The existing rigid surface-validation infrastructure is retained. Its input contract is tightened:

- `sourceCoordinateSystem` must match the reconstruction manifest.
- `referenceCoordinateSystem` is explicit; `coordinateSystem` identifies the reference frame in which aligned results are reported.
- `referenceSource.sha256` must match the actual reference bytes.
- Reconstruction/reference/provenance hashes must remain unchanged during evaluation; the final report includes all three.
- Repeatability binds each comparator's hash and coordinate frame separately. Each source capture supplies its own source frame and calibration evidence.

Update these fields in `validation.example.json` only when real evidence is supplied. A schema/template is not a dataset. Rigid alignment still cannot fit scale or deformation to conceal errors; independent calibration is required. No validation results were generated in this audit.

## Verification and limits

- `node --test backend/tests/scan3d.engines.test.js backend/tests/scan3d.integrity.test.js`: **25 passed**. Contract test now rejects mismatched service input/output hashes and checks persisted resolved settings.
- `.venv/bin/python -m unittest discover -s backend/python_service/tests -p 'test_scan3d_*.py' -v`: **24 passed**. The controlled-video test executes the service function and offline replay independently and observes identical OBJ/PLY/STL/preview hashes in this runtime. It also verifies overwrite refusal and synthetic replay exclusion. New Phase 13 tests reject coordinate/reference identity mismatches without computing research metrics.
- `git diff --check`: passed.

No new live smartphone capture, deployment, database integration or browser performance run was performed. No real smartphone/reference/repeat-capture research dataset was supplied. Historical B001 CBCT benchmark evidence remains distinct from raw data availability and smartphone validation. The previously checked raw B001 path is unavailable in this environment; no new DICOM inventory is inferred.

**Status:** baseline integrity and replay controls implemented and software-tested; Phase 13 infrastructure strengthened; empirical results DATASET_UNAVAILABLE; clinical validation not performed.
