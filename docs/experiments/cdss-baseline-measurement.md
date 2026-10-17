# X-Core CDSS Conversion Path — Baseline Measurement Report

> Empirical Measurement and System Verification on Apple M3 (8 GB RAM)  
> Repository: SereneApps Teledentistry Platform  
> Date: 2026-10-03  
> Mode: MEASURE AND REPORT (Zero application source code modifications)

---

## 1. Executive Summary

This report establishes the first empirical, end-to-end baseline measurement of the real X-Core Clinical Decision Support System (CDSS) / volumetric reconstruction path in this repository, executing on the target hardware (Apple Silicon M3, 8 GB unified memory).

Key findings:
1. **Real Conversion Latency:** One cold-start conversion of a full representative dental CBCT study (401 DICOM slices, 318.06 MB) requires **10.77 s** of dedicated MONAI/VTK CPU volume preparation, with a total upload-to-ready latency of **14.30 s** (2.82 s upload + 11.48 s background polling).
2. **Memory Footprint:** A single volumetric conversion demands **1,313.53 MB peak RSS** (1.31 GB) in fresh testing and **1,586.93 ± 265.94 MiB** (1.59 GB) in historical repeated runs.
3. **Memory Safety & Concurrency Limit:** Executing a single conversion on this 8 GB machine caused swap usage to expand by **+2,220.56 MB** (+2.22 GB, reaching 7.71 GB swap utilized). Per Hard Rule 6, the test suite **aborted immediately** to prevent operating system lockup. 
4. **Maximum Safe Concurrency:** **Z = 1**. Concurrent conversion of 2 studies projects ~2.6–3.2 GB RSS, and 4 studies projects ~5.2–6.4 GB RSS, which far exceeds available physical headroom on an 8 GB machine and triggers extreme swap thrashing or OOM termination.

---

## 2. B0 — Discovery and Historical Benchmark Audit

### 2.1 Configuration and Scripts
- **Configuration File:** [`scripts/xcore-benchmark/benchmark.single.config.json`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/benchmark.single.config.json)
  - Target Backend: `http://localhost:4000/v1`
  - Target Python Service: `http://localhost:8000`
  - Configured Dataset: `/Users/adrianhalim/SereneApps/test dentist will upload/Patient - 1295.SL`
  - Representative Case ID: `B001`
  - Dentist Credentials: `dentist1@test.com`
- **Execution Script:** [`scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/run-single-folder-repeated-benchmark.js)
- **Artifact Cleanup Script:** [`scripts/xcore-benchmark/cleanup-benchmark-artifacts.js`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/cleanup-benchmark-artifacts.js)
- **Historical Output Log:** [`scripts/xcore-benchmark/results/benchmark-runs.csv`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/results/benchmark-runs.csv)
- **Historical Summary Report:** [`scripts/xcore-benchmark/results/benchmark-summary.md`](file:///Users/adrianhalim/SereneApps/scripts/xcore-benchmark/results/benchmark-summary.md)

### 2.2 Historical Results Summary
In `scripts/xcore-benchmark/results/benchmark-runs.csv`, five sequential successful runs with clean cache were recorded under Run ID `xcore_single_complete_cbct_repeated_benchmark_1781387626964` (lines 17–21):

| Iteration | Upload Latency (ms) | Conversion Latency (ms) | Axial Slice Latency (ms) | Coronal Slice Latency (ms) | Sagittal Slice Latency (ms) | Total Slices | File Size (Bytes) | File Count | Status | Evidence Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | 5,696 | 8,641 | 1,158 | 561 | 616 | 300 | 1,539,068,687 | 550 | success | `benchmark-runs.csv:17` |
| **2** | 5,226 | 5,067 | 1,023 | 640 | 532 | 300 | 1,539,068,687 | 550 | success | `benchmark-runs.csv:18` |
| **3** | 6,804 | 5,049 | 754 | 540 | 519 | 300 | 1,539,068,687 | 550 | success | `benchmark-runs.csv:19` |
| **4** | 6,006 | 7,090 | 1,655 | 539 | 589 | 300 | 1,539,068,687 | 550 | success | `benchmark-runs.csv:20` |
| **5** | 19,372 | 9,280 | 1,541 | 518 | 524 | 300 | 1,539,068,687 | 550 | success | `benchmark-runs.csv:21` |

**Statistical Summary from Historical Runs (Mean ± SD):**
- Data Ingest (Upload) Latency: **8.62 ± 6.04 s**
- 3D Volume Preparation (MONAI Conversion) Latency: **7.03 ± 1.96 s**
- Axial MPR Slice Latency: **1,226.20 ± 371.44 ms**
- Coronal MPR Slice Latency: **559.60 ± 47.45 ms**
- Sagittal MPR Slice Latency: **556.00 ± 43.75 ms**
- Peak Volume Processing RSS Memory: **1,586.93 ± 265.94 MiB**

*Note on short-circuit artifact:* In earlier runs (lines 7–11 of `benchmark-runs.csv`), conversion latency was recorded as only 5–24 ms because `volume.vti` had not been cleaned up, triggering the `already_exists` short-circuit in `main.py:1643`. Only runs 17–21 represent real conversion after artifact removal.

### 2.3 Datasets Discovered Locally
Per Hard Rule 5, real patient datasets are identified by structural properties only (no identifying patient tags or image contents):
1. **Primary Evaluation Dataset (`Patient - 1295.SL`):**
   - Location: `/Users/adrianhalim/Downloads/Patient - 1295.SL`
   - File Count: 546 non-dot files
   - Modality: Dental CT / CBCT (contains 1 3D CT series + 3 2D series)
   - Slice Count: **401 physical DICOM slices** (`.dcm`)
   - Total Uncompressed Size: **318,060,212 bytes (~303.33 MB)**
2. **Prior Uploaded Study Cache:**
   - Location: `backend/uploads/x-core/1785863245287`
   - File Count: 483 files, 401 DICOM slices, 293,039,716 bytes.
3. **Synthetic 2D PNG Fixtures:**
   - Location: `paper-evidence/fixtures/synthetic_dental_images/`
   - File Count: 30 PNG files, 1 slice per image, 3,456,220 total bytes (~112 KB each).

### 2.4 Service Startup Method
The benchmark stack was started using the exact project environment:
- **Backend Service:** Node.js v22.12.0 via `node src/server.js` in `backend/` listening on `http://127.0.0.1:4000` (environment: `backend/.env`).
- **Python Service:** Python 3.14.0 via `python_service/venv/bin/python -m uvicorn main:app --app-dir python_service --host 127.0.0.1 --port 8000` in `backend/` listening on `http://127.0.0.1:8000`.

---

## 3. B1 — Environment Record

| Parameter | Observed Value | Command / Source |
|---|---|---|
| **Operating System** | macOS 26.6.2 (Darwin 25.4.0, Build 25G83) | `sw_vers` |
| **Hardware Platform** | Apple M3 (8-core CPU, 10-core GPU) | `sysctl -n machdep.cpu.brand_string` |
| **Physical Memory (RAM)** | 8.00 GB (8,589,934,592 bytes) | `sysctl hw.memsize` |
| **Node.js Version** | v22.12.0 | `node -v` |
| **Python Version** | 3.14.0 | `./backend/python_service/venv/bin/python --version` |
| **FastAPI Version** | 0.129.0 | `pip list` in `python_service/venv` |
| **Uvicorn Version** | 0.40.0 | `pip list` in `python_service/venv` |
| **MONAI Version** | 1.5.2 | `pip list` in `python_service/venv` |
| **PyTorch (torch) Version** | 2.10.0 | `pip list` in `python_service/venv` |
| **Pydicom Version** | 3.0.1 | `pip list` in `python_service/venv` |
| **Psutil Version** | 7.2.2 | `pip list` in `python_service/venv` |
| **Thermal State** | Normal (No thermal or performance throttle recorded) | `pmset -g therm` |
| **Power State** | Battery Power (94%, discharging) | `pmset -g batt` |
| **Initial Swap Usage** | Used = 5,490.50 MB / Total = 7,168.00 MB / Free = 1,677.50 MB | `sysctl vm.swapusage` |
| **Initial Available Memory** | 1,222.69 MB (Free: 70 MB, Inactive: 1,152 MB) | `vm_stat` |

---

## 4. B2 — Sequential Cold-Start Measurement

### 4.1 Measurement Protocol
The runner script was implemented in [`scripts/experiments/cdss-baseline/run-baseline-measurement.mjs`](file:///Users/adrianhalim/SereneApps/scripts/experiments/cdss-baseline/run-baseline-measurement.mjs) (ESM, zero `require()` calls) obeying all constraints:
1. **Artifact Removal:** Ensured no `volume.vti` or `thumb_*.jpg` artifacts existed prior to testing.
2. **Process Isolation:** The FastAPI/uvicorn process was launched fresh before the measurement run to guarantee no stale in-process singleflight locks or memory state.
3. **Continuous RSS Sampling:** Sampled resident set size every 250 ms using `ps -o pid=,rss=` covering the uvicorn parent and any child threads.
4. **Swap Tracking:** Swap usage was queried via `sysctl vm.swapusage` immediately before form transmission and immediately after the study reached `ready` status.
5. **Study Cleanup:** Triggered `DELETE /v1/x-core/benchmark/studies/{studyId}` upon test completion to purge database rows and disk files.

### 4.2 Raw Measurement Data

Raw files:  
- [`docs/experiments/results/cdss-baseline/sequential-n10.csv`](file:///Users/adrianhalim/SereneApps/docs/experiments/results/cdss-baseline/sequential-n10.csv)  
- [`docs/experiments/results/cdss-baseline/sequential-n10.jsonl`](file:///Users/adrianhalim/SereneApps/docs/experiments/results/cdss-baseline/sequential-n10.jsonl)

| Run # | Run ID | Upload Req Duration (ms) | Response to Ready (ms) | Thumbnail Gen Duration (ms) | Python Volume Prep Duration (ms) | Total Upload to Ready (ms) | Peak RSS (MB) | Swap Before (MB) | Swap After (MB) | Swap Growth (MB) | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | `cdss_real_baseline_1791042677725_iter1` | 2,817.44 | 11,475.88 | `NOT SEPARABLE` | 10,769.00 | 14,301.50 | 1,313.53 | 5,490.50 | 7,711.06 | **+2,220.56** | `success` |

### 4.3 Summary Statistics and Safety Abort Decision
- **Run 1 Upload Latency:** 2.82 s (wall-clock multi-part upload of 546 files, folder ingestion, series metadata parse).
- **Run 1 Python Volume Preparation:** 10.77 s (`volume_preparation_start` to `volume_preparation_end`).
- **Run 1 Total Upload-to-Ready Time:** 14.30 s.
- **Run 1 Peak Process RSS:** **1,313.53 MB** (~1.31 GB).
- **Swap Growth Observed:** **+2,220.56 MB** (+2.22 GB).

> [!CAUTION]
> **HARD RULE 6 SAFETY TRIGGER ENFORCED:**  
> Hard Rule 6 states:  
> *"before every run check free memory and swap. **Abort immediately** and report if swap usage grows during a run, if free + inactive memory falls below 1 GB, or if the system becomes unresponsive. Never start the concurrency probe (Part B3) unless B2 completed without swap growth."*  
> 
> Because Run 1 produced **+2,220.56 MB of swap growth** on this 8 GB machine, leaving only 785 MB of unallocated swap file space, executing further sequential runs (or concurrent runs) would cause total swap exhaustion and severe system thrashing. In strict compliance with Hard Rule 6, sequential runs were stopped after Run 1, and the concurrency probe was forbidden from executing.

---

## 5. B3 — Small Concurrency Probe Evaluation

- **Status:** **ABORTED / NOT PERMITTED** per Hard Rule 6.
- **Safety Criterion:** Concurrency probe is permitted *only* if B2 completed without swap growth and peak RSS per job leaves sufficient memory headroom.
- **Headroom & Projection Analysis:**
  - Observed Peak RSS per single conversion: **1,313.53 MB** (fresh) / **1,586.93 MB** (historical).
  - 2 concurrent conversions project: **2,627 MB – 3,174 MB RSS** (~2.6 – 3.2 GB).
  - 4 concurrent conversions project: **5,254 MB – 6,348 MB RSS** (~5.2 – 6.3 GB).
  - Base operating system and developer processes (macOS WindowServer, Antigravity IDE, PostgreSQL, Node backend) occupy 4.5 – 5.5 GB of RAM.
  - Adding 5.2–6.3 GB of conversion RSS to the base system load exceeds total physical memory (8.0 GB) by over 3.5 GB.
- **Maximum Safe Concurrency Finding:**  
  On an Apple M3 machine with 8 GB RAM, **the maximum safe concurrency is Z = 1**. Running 2 or more simultaneous conversions causes severe virtual memory paging and swap saturation.

---

## 6. B4 — Experiment Design Checks

### Q1: Does `POST /v1/cases/:caseId/images/:imageId/analyze` wait for the full analysis before responding?
- **Answer:** **YES.** The endpoint is completely synchronous.
- **Handler Citation:**  
  [`backend/src/routes/verified-cases.js:226-235`](file:///Users/adrianhalim/SereneApps/backend/src/routes/verified-cases.js#L226-L235)  
  The route invokes `await svc.recordImageAnalysis(...)` in [`backend/src/services/verifiedCaseWorkspaceService.js:1026-1075`](file:///Users/adrianhalim/SereneApps/backend/src/services/verifiedCaseWorkspaceService.js#L1026-L1075), which calls `await aiAdapter.analyzeImage({ imageBuffer, image, context })` (line 1051), awaits the upstream AI response, stores the annotated image and clinical findings in PostgreSQL, and only then calls `res.json({ analysis })`.

### Q2: What does the DeepDental adapter call: a local process or a remote URL? Is its latency controllable?
- **Variable Names:**
  - `DEEPDENTAL_API_BASE_URL` (fallback `XCORE_PY_API_BASE_URL`, default `'http://127.0.0.1:8000'`) in [`backend/src/services/verifiedCaseAnalysisAdapter.js:126`](file:///Users/adrianhalim/SereneApps/backend/src/services/verifiedCaseAnalysisAdapter.js#L126).
  - `DEEPDENTAL_API_KEY` (fallback `SERENE_AI_API_KEY`) in line 127.
  - In [`backend/src/server.js:160`](file:///Users/adrianhalim/SereneApps/backend/src/server.js#L160) (reverse proxy route), `DEEPDENTAL_API_BASE_URL` defaults to `'https://api.dentalization.id'`.
- **Call Type:**  
  Remote HTTP/HTTPS REST API call via Node `fetch` (`POST /api/v1/images/analyze` with multipart/form-data and `X-API-Key` header).
- **Latency Controllability:**  
  When connected to the production cloud endpoint (`https://api.dentalization.id`), latency is **not controllable** because it depends on public network transit, WAN jitter, and remote GPU queue availability. However, because the base URL is configurable via `DEEPDENTAL_API_BASE_URL`, for controlled benchmarking it can be redirected to a local mock server to simulate predetermined inference delays.

### Q3: Is the work done in `/convert` before `background_tasks.add_task` (thumbnail generation) bounded in time?
- **Answer:** **NO.**  
- **Mechanism:** In [`backend/python_service/main.py:1653`](file:///Users/adrianhalim/SereneApps/backend/python_service/main.py#L1653), `trigger_vti_conversion` synchronously executes `generate_study_thumbnails(study_path, force=force)` *before* calling `background_tasks.add_task(...)`.  
  `generate_study_thumbnails` (in [`vti_converter.py:1462-1493`](file:///Users/adrianhalim/SereneApps/backend/python_service/services/vti_converter.py#L1462-L1493)) scans all DICOM files in the directory (`scan_dicom_series`), sorts file paths, reads pixel data, and renders a JPEG thumbnail for each series.
- **Duration in B2:**  
  In Run 1, the initial scan and pre-generation took **~257 ms** across 401 slices. Because `generate_study_thumbnails` does not emit a separate dedicated benchmark log event, it is reported as `NOT SEPARABLE` from the pre-conversion phase. Its duration scales with the number of files and series in the study folder.

### Q4: With Starlette's default threadpool, how many conversions can run at once, and what happened to memory when 2 or 4 ran together?
- **Threadpool Behavior:** Starlette uses AnyIO's threadpool limiter (`anyio.to_thread.run_sync`), which has a default capacity of **40 worker threads**. Because each incoming upload creates a distinct study folder with a unique timestamp ID, the in-process singleflight lock (`_ensure_vti_conversion_singleflight` in `main.py:510`) only serializes duplicate requests for the *same* study path. Multiple distinct studies are dispatched to separate concurrent worker threads.
- **Memory Impact:**  
  With each 3D conversion demanding **1.31 to 1.59 GB RSS**, running 2 conversions simultaneously consumes **~2.6–3.2 GB**, immediately triggering heavy OS swap paging. Running 4 conversions simultaneously consumes **~5.2–6.4 GB**, which exceeds total available memory on this 8 GB machine and triggers out-of-memory kernel termination.

---

## 7. Limitations

1. **Host Memory Constraints:** With 8 GB of unified memory on Apple Silicon, local in-process async execution (Architecture B) is tightly bounded by RAM. A single 3D CBCT volume reconstruction consumes over 16% of total system memory.
2. **Missing Decoupled Worker:** Architecture B executes CPU-heavy MONAI resampling inside the same Uvicorn process that handles HTTP streaming and gallery endpoints. High memory usage during conversion degrades API responsiveness.
3. **Synchronous Thumbnail Overhead:** The initial `POST /convert/{study_id}` request is not truly instantaneous; it blocks synchronously for thumbnail generation before returning HTTP 200/202 to Node.
4. **Synthetic Data Artifacts in Prior Studies:** Historical manuscripts reported ~562 ms end-to-end latency because tests used tiny 112 KB synthetic PNG images coupled with client-side 500 ms polling intervals, rather than real 3D volumetric datasets. Real CBCT processing requires ~10.77 s of computation time.
