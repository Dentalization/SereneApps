# X-Core CDSS Volumetric Conversion Architecture Benchmark (A/B/C)

## 1. Overview and Research Objective

This experimental harness evaluates and compares three execution architectures for the X-Core CBCT volume-conversion pipeline (the CDSS workflow) in SereneApps:
- **Architecture A (Synchronous)**: Volume conversion executes inline during the upload request. The Node.js controller awaits `/convert/{batchId}`, and the client upload response returns only after conversion completes.
- **Architecture B (FastAPI BackgroundTasks - Production Baseline)**: The upload controller returns immediately (`converting`), and FastAPI executes conversion asynchronously in the background via `BackgroundTasks`.
- **Architecture C (Broker/Worker Queue - Celery + Redis)**: The upload controller returns immediately, and FastAPI dispatches conversion tasks to a Redis-backed Celery worker process (`xcore.convert_study`).

This study addresses the review requirements approved by **Dr. Abdul Karim** for submission to **Jurnal Teknik Informatika (JUTIF)**.

---

## 2. Reviewer Binding Conditions

1. **Identical Hardware and Software Environment**: All architectures tested on the identical host with identical library versions.
2. **Identical CDSS Workloads**: Calibrated synthetic DICOM phantom tiers ($N \in \{25, 100, 200\}$ slices). $N = 401$ is excluded from the comparative matrix due to memory constraints on an 8 GB host.
3. **Fixed Concurrency Configuration**: Worker concurrency is fixed at 4 (`--pool=threads`) in `experiments/config/experiment.json` and recorded in results metadata.
4. **Identical Database Configuration**: PostgreSQL 14.18 with identical schema and seeded fixtures.
5. **Identical Preflight Gate**: Every run enforces:
   - Active swap used $\le 500$ MB (`sysctl vm.swapusage`)
   - Available memory (free + inactive + speculative) $\ge 3,000$ MB (`vm_stat`)
   - Wall-charger AC power connected (`pmset -g batt`)
   - Free disk space $\ge 5$ GB (`shutil.disk_usage`)
6. **Controlled State Reset**: Database state and filesystem study artifacts are cleanly reset before every single run.
7. **Randomized / Interleaved Execution**: 180 total runs ($3\text{ architectures} \times 3\text{ tiers} \times 4\text{ VU levels} \times 5\text{ repetitions}$) are randomized with a fixed seed (`20261013`) and interleaved.
8. **Replication**: At least 5 independent runs per condition cell.
9. **Metric Telemetry**: High-frequency sampling (every 250 ms) of CPU (system and per-process), RSS (uvicorn, celery, node), swap usage, available RAM, and thermal state.
10. **Single-Host Limitation Explicitly Stated**: The benchmark runs on a single host (Apple Silicon M3, 8-core CPU, 8 GB unified memory), and this limitation is documented in the manuscript.

---

## 3. Database and Artifact Reset Procedure

Before every run, `experiments/scripts/reset_env.js` executes the following sequence:
1. Transactional SQL execution in PostgreSQL:
   ```sql
   DELETE FROM xcore_analysis_case_item_renders;
   DELETE FROM xcore_analysis_case_items;
   DELETE FROM xcore_analysis_reports;
   DELETE FROM xcore_analysis_cases;
   UPDATE specialist_cases SET xcore_study_id = NULL WHERE xcore_study_id IS NOT NULL;
   DELETE FROM study_annotations;
   DELETE FROM annotation_snapshots;
   DELETE FROM study_shares;
   DELETE FROM study_dentist_shares;
   DELETE FROM imaging_study_patient_assignments;
   DELETE FROM ai_results;
   DELETE FROM imaging_series;
   DELETE FROM imaging_studies;
   UPDATE dentist_profiles SET storage_usage = 0;
   ```
2. Filesystem purge: Deletes all benchmark study directories in `backend/uploads/x-core/` (matching timestamps or `study_*`), ensuring no residual `volume.vti` exists.
3. Broker flush (Architecture C): Executes `redis-cli FLUSHDB` to ensure an empty task queue.

---

## 4. Known Architectural Limitations & Failure Semantics

1. **Architecture C Progress Visibility**: Progress callbacks run inside the isolated Celery worker process and are not shared via IPC with the FastAPI process. The `/status/{folderName}` endpoint infers readiness from the existence of `volume.vti`. Consequently, an in-progress Celery job reads as `pending` rather than `converting`. Failure detection for Architecture C is audited through Celery worker logs and internal event streams rather than `/status`.
2. **Architecture A Failure Semantics**: In Architecture A, an internal conversion failure does not cause the HTTP upload request to fail with a 500 status code. This preserves parity with the non-blocking upload semantics of Architecture B.
3. **Closed-Loop Load Testing**: Load is generated using k6 with closed-loop Virtual Users (`per-vu-iterations`). While arrival rate is load-dependent, closed-loop testing guarantees controlled concurrency levels ($VU \in \{10, 50, 100, 200\}$) without risk of memory thrashing or disk overflow on the 8 GB host.
4. **Exclusion of N = 401**: The $N = 401$ slice tier requires $> 5.8$ GB RAM per conversion, exceeding available headroom when concurrent processes are active on an 8 GB unified memory system. It is excluded from the primary 3-way factorial design to prevent memory exhaustion.

---

## 5. Directory Structure

```
experiments/
├── README.md                      # Experimental protocol & documentation
├── config/
│   └── experiment.json            # Factorial matrix, gate limits, service configs
├── env/
│   ├── versions.json              # Exact hardware and software stack versions
│   └── pip-freeze.txt             # Frozen Python virtual environment packages
├── load/
│   ├── generate_k6_workloads.py   # Generator for tier-specific k6 scripts
│   ├── k6_workload_N25.js         # 25-slice phantom load workload
│   ├── k6_workload_N100.js        # 100-slice phantom load workload
│   └── k6_workload_N200.js        # 200-slice phantom load workload
├── scripts/
│   └── reset_env.js               # Database and artifact reset utility
├── run_experiment.py              # Main orchestrator (factorial scheduler, gate, metrics)
├── analyze.py                     # Statistical analysis (Kruskal-Wallis, Dunn, Cliff's delta, CI)
├── requirements.txt               # Statistical analysis dependencies
└── results/
    ├── raw/                       # Per-run raw metrics CSVs, k6 JSONLs, metadata JSONs
    ├── summary.csv                # Aggregated summary per (arch, N, VU) cell
    └── stats.csv                  # Statistical hypothesis testing results
```

---

## 6. Execution Instructions

### Preflight Host Preparation (macOS Terminal)
Before launching benchmarks, close non-essential background applications (browsers, IDEs, messaging apps) to meet the preflight gate:
- Connect MacBook to AC wall power.
- Close Chrome, WhatsApp, IDEs.
- Ensure Redis is running: `brew services start redis` (verify `redis-cli ping` -> `PONG`).

### Running the Pilot Verification (Task 4)
```bash
python experiments/run_experiment.py --pilot
```
Phase 1 runs 1 repetition for each architecture at $N=25, VU=10$.
Phase 2 runs 2 repetitions for each architecture at $N=25, VU=10$ to assess repeatability.

### Running the Full 180-Run Experiment (Task 5)
```bash
python experiments/run_experiment.py --full
```

### Generating Statistical Summaries & Figures
```bash
python experiments/analyze.py
```
Outputs `experiments/results/summary.csv`, `experiments/results/stats.csv`, and figures.
