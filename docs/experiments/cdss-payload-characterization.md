# Characterization of the Real X-Core CDSS Pipeline Across Payload Tiers

## 1. Experimental Environment and Configuration

| Parameter | Specification |
|:---|:---|
| **Operating System** | macOS 26.6.2 (25G83) |
| **Processor (SoC)** | Apple M3 |
| **Physical Memory (RAM)** | 8192 MB (8 GB) |
| **Node.js Runtime** | v22.12.0 |
| **Python Environment** | Python 3.14.0 (`backend/python_service/venv`) |
| **FastAPI Version** | 0.129.0 |
| **Uvicorn Version** | 0.40.0 |
| **MONAI Version** | 1.5.2 |
| **PyTorch Version** | 2.10.0 |
| **Pydicom Version** | 3.0.1 |
| **Preflight Max Swap Allowed** | 500 MB |
| **Preflight Min Available Memory** | 3000 MB |
| **Preflight AC Power Required** | true |
| **Preflight Thermal Throttling Required Normal** | true |
| **Disk Space Guard Minimum Free** | 5 GB |

---

## 2. Scaling Table: Time and Memory versus Slice Count ($N$)

All qualifying runs in this table satisfied the unconditional preflight gate and were executed in seeded random order. FastAPI was started fresh per run, with a 3.0 s pre-upload idle RSS baseline sampling. Polling occurred immediately ($t=0$) and every 100 ms thereafter.

Sample size per tier: $n = 5$ (or actual completed runs). Statistics report **Mean ± SD**, **Median**, **Min**, and **Max** (percentiles such as p95 are omitted at $n=5$).

| Tier ($N$) | Upload Size (MB) | Upload Duration (s) | Response-to-Ready (s) | Total Upload-to-Ready (s) | Python Volume Prep (s) | Idle RSS (MB) | Peak RSS (MB) | Delta RSS (MB) | Swap Growth (MB) | Implied Capacity [DERIVED] (jobs/s) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **N=25**<br>($n=5$) | 15.0 | 0.09 ± 0.04<br>[0.10; 0.05–0.12] | 0.99 ± 0.01<br>[0.99; 0.97–1.00] | 1.07 ± 0.03<br>[1.09; 1.04–1.10] | 0.91 ± 0.01<br>[0.91; 0.90–0.92] | 101.3 ± 0.2<br>[101.4; 101.1–101.5] | 643.6 ± 14.5<br>[639.1; 624.7–658.2] | 542.3 ± 14.5<br>[538.0; 523.3–557.1] | 0.0 ± 0.0<br>[0.0; 0.0–0.0] | **1.098** |
| **N=50**<br>($n=5$) | 30.1 | 0.16 ± 0.08<br>[0.19; 0.07–0.24] | 1.11 ± 0.03<br>[1.10; 1.08–1.15] | 1.27 ± 0.09<br>[1.33; 1.15–1.34] | 1.04 ± 0.02<br>[1.03; 1.03–1.07] | 101.4 ± 0.2<br>[101.3; 101.2–101.7] | 923.3 ± 22.2<br>[930.4; 899.6–943.5] | 821.9 ± 22.0<br>[829.1; 798.4–841.8] | 0.0 ± 0.0<br>[0.0; 0.0–0.0] | **0.964** |
| **N=100**<br>($n=5$) | 60.1 | 0.26 ± 0.16<br>[0.38; 0.09–0.39] | 1.39 ± 0.04<br>[1.40; 1.36–1.44] | 1.66 ± 0.18<br>[1.74; 1.45–1.84] | 1.28 ± 0.01<br>[1.28; 1.27–1.29] | 101.4 ± 0.1<br>[101.3; 101.2–101.5] | 1531.3 ± 0.3<br>[1531.3; 1530.9–1531.6] | 1429.9 ± 0.3<br>[1429.9; 1429.4–1430.3] | 0.0 ± 0.0<br>[0.0; 0.0–0.0] | **0.782** |
| **N=200**<br>($n=5$) | 120.3 | 0.50 ± 0.34<br>[0.30; 0.23–0.93] | 2.18 ± 0.66<br>[1.91; 1.85–3.36] | 2.69 ± 0.93<br>[2.15; 2.14–4.30] | 2.02 ± 0.62<br>[1.75; 1.73–3.13] | 101.4 ± 0.1<br>[101.4; 101.3–101.5] | 2686.3 ± 83.9<br>[2723.7; 2536.3–2724.1] | 2584.9 ± 83.8<br>[2622.2; 2435.0–2622.7] | 0.0 ± 0.0<br>[0.0; 0.0–0.0] | **0.494** |
| **N=401**<br>($n=5$) | 241.1 | 1.12 ± 0.52<br>[1.32; 0.53–1.62] | 3.72 ± 0.09<br>[3.68; 3.63–3.82] | 4.84 ± 0.53<br>[5.01; 4.24–5.44] | 3.47 ± 0.05<br>[3.45; 3.43–3.54] | 101.4 ± 0.1<br>[101.4; 101.3–101.4] | 3038.8 ± 427.2<br>[2965.8; 2683.4–3734.7] | 2937.4 ± 427.2<br>[2864.4; 2582.1–3633.3] | 7.1 ± 15.9<br>[0.0; 0.0–35.6] | **0.288** |

*Note: Format in cells is `Mean ± SD` followed by `[Median; Min–Max]`. Implied Single-Worker Capacity is derived as $1 / \text{mean}(\text{volume\_prep\_duration\_s})$.*

---

## 3. Peak & Delta Memory Footprint (RSS) versus Slice Count

| Tier ($N$) | Slices | Upload Size (MB) | Idle RSS Median (MB) | Peak RSS Median (MB) | Delta RSS Mean ± SD (MB) | Delta RSS Median (MB) | Delta RSS [Min–Max] (MB) | Payload Memory Tier Classification |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **N=25** | 25 | 15.0 | 101.4 | 639.1 | 542.3 ± 14.5 | 538.0 | [523.3–557.1] | **Large (Delta > 500 MB)** |
| **N=50** | 50 | 30.1 | 101.3 | 930.4 | 821.9 ± 22.0 | 829.1 | [798.4–841.8] | **Large (Delta > 500 MB)** |
| **N=100** | 100 | 60.1 | 101.3 | 1531.3 | 1429.9 ± 0.3 | 1429.9 | [1429.4–1430.3] | **Large (Delta > 500 MB)** |
| **N=200** | 200 | 120.3 | 101.4 | 2723.7 | 2584.9 ± 83.8 | 2622.2 | [2435.0–2622.7] | **Large (Delta > 500 MB)** |
| **N=401** | 401 | 241.1 | 101.4 | 2965.8 | 2937.4 ± 427.2 | 2864.4 | [2582.1–3633.3] | **Large (Delta > 500 MB)** |

---

## 4. Polling Artifact Analysis: Immediate (100 ms) vs Legacy (500 ms) Polling

A legacy polling routine used an initial 500 ms sleep followed by 500 ms intervals. Below is a direct comparison on tier $N=25$ under identical server conditions:

| Metric | Immediate Polling (0 ms initial, 100 ms interval, $n=5$) | Legacy Polling (500 ms initial, 500 ms interval, $n=5$) | Difference (Legacy - Immediate) |
|:---|:---|:---|:---|
| **Upload Duration** | 0.09 ± 0.04 s | 0.07 ± 0.03 s | -0.01 s |
| **Response-to-Ready** | 0.99 ± 0.01 s | 1.01 ± 0.00 s | **+0.02 s** (2.4%) |
| **Total Upload-to-Ready** | 1.07 ± 0.03 s | 1.08 ± 0.03 s | **+0.01 s** (0.8%) |

---

## 5. Concurrency Probe Results

| Concurrency Level ($L$) | Repetitions | Mean Upload Duration (s) | Mean Response-to-Ready (s) | Mean Total Duration (s) | Max Total Duration (s) | Idle RSS (MB) | Peak Total RSS (MB) | Delta RSS (MB) | Max Overlapping Jobs | Swap Growth (MB) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **L=1** | 3 | 0.07 s | 0.97 s | 1.04 s | 1.04 s | 101.3 MB | 658.2 MB | 556.7 MB | **1** / 1 | 0.0 MB |
| **L=2** | 3 | 0.14 s | 1.06 s | 1.20 s | 1.29 s | 101.3 MB | 948.6 MB | 846.4 MB | **2** / 2 | 0.0 MB |
| **L=4** | 3 | 0.10 s | 1.20 s | 1.31 s | 1.32 s | 101.3 MB | 1530.2 MB | 1427.9 MB | **4** / 4 | 0.0 MB |

---

## 6. Excluded Runs and Artifacts

Per protocol, smoke runs and runs that failed preflight or encountered errors are explicitly excluded from the statistical scaling curves above:

| Run ID | Tier ($N$) | Polling Mode | Status | Reason Excluded |
|:---|:---|:---|:---|:---|
| *(None)* | — | — | — | All recorded rows met validation criteria. |

---

## 7. Limitations of Characterization

1. **Synthetic Phantom vs. Real Anatomy:**
   Synthetic phantom series use deterministic geometric ellipsoids and pseudo-random Gaussian noise. While matrix dimensions (561×561), bit depth (16-bit signed), slice thickness (0.25 mm), and pixel spacing (0.25 mm) match real CBCT scans exactly, real clinical anatomy exhibits varying tissue gradients and scanner metal artifacts that may alter VTK ZLib compression ratios.

2. **Single-Worker Uvicorn Architecture:**
   FastAPI was tested with a single Uvicorn worker process (`--app-dir python_service main:app`). `BackgroundTasks` runs CPU-bound operations in the server event loop threadpool. Under concurrency ($L > 1$), tasks queue or serialize CPU execution, directly reflected in the measured `maxOverlappingConversions` metric.

3. **Memory Budget & Hardware Bounds:**
   Measurements reflect an Apple M3 unified memory system (8 GB RAM). As verified in preflight checks, running concurrent heavy jobs or unconstrained slice counts on an un-rebooted host can induce OS paging (swap growth), which distorts wall-clock execution latency.
