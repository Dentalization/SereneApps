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
| **Preflight Max Swap Allowed** | 6000 MB |
| **Preflight Min Available Memory** | 500 MB |
| **Preflight AC Power Required** | false |
| **Preflight Thermal Throttling Required Normal** | true |
| **Disk Space Guard Minimum Free** | 5 GB |

---

## 2. Scaling Table: Time and Memory versus Slice Count ($N$)

All qualifying runs in this table satisfied the unconditional preflight gate and were executed in seeded random order. FastAPI was started fresh per run, with a 3.0 s pre-upload idle RSS baseline sampling. Polling occurred immediately ($t=0$) and every 100 ms thereafter.

Sample size per tier: $n = 5$ (or actual completed runs). Statistics report **Mean ± SD**, **Median**, **Min**, and **Max** (percentiles such as p95 are omitted at $n=5$).

| Tier ($N$) | Upload Size (MB) | Upload Duration (s) | Response-to-Ready (s) | Total Upload-to-Ready (s) | Python Volume Prep (s) | Idle RSS (MB) | Peak RSS (MB) | Delta RSS (MB) | Swap Growth (MB) | Implied Capacity [DERIVED] (jobs/s) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **N=25**<br>($n=5$) | 15.0 | 0.10 ± 0.03<br>[0.11; 0.06–0.12] | 1.01 ± 0.03<br>[1.02; 0.98–1.04] | 1.11 ± 0.03<br>[1.09; 1.08–1.15] | 0.93 ± 0.01<br>[0.93; 0.91–0.94] | 101.4 ± 0.1<br>[101.4; 101.4–101.5] | 630.0 ± 18.0<br>[619.1; 616.5–658.3] | 528.5 ± 18.0<br>[517.6; 515.1–556.9] | -6.4 ± 6.7<br>[-8.0; -16.0–0.0] | **1.078** |
| **N=50**<br>($n=5$) | 30.1 | 0.20 ± 0.11<br>[0.23; 0.08–0.35] | 1.34 ± 0.30<br>[1.21; 1.15–1.88] | 1.55 ± 0.39<br>[1.46; 1.23–2.23] | 1.20 ± 0.28<br>[1.08; 1.05–1.70] | 101.5 ± 0.1<br>[101.5; 101.3–101.6] | 938.2 ± 8.1<br>[942.9; 924.8–943.5] | 836.7 ± 8.1<br>[841.4; 823.3–842.2] | -36.8 ± 27.5<br>[-48.0; -64.0–0.0] | **0.835** |
| **N=100**<br>($n=5$) | 60.1 | 0.43 ± 0.29<br>[0.38; 0.12–0.90] | 1.45 ± 0.03<br>[1.45; 1.40–1.49] | 1.88 ± 0.31<br>[1.85; 1.55–2.35] | 1.30 ± 0.02<br>[1.30; 1.28–1.34] | 101.4 ± 0.1<br>[101.4; 101.3–101.6] | 1531.0 ± 0.4<br>[1530.9; 1530.7–1531.7] | 1429.6 ± 0.4<br>[1429.4; 1429.3–1430.2] | -24.0 ± 40.4<br>[-8.0; -96.0–0.0] | **0.768** |
| **N=200**<br>($n=5$) | 120.3 | 0.81 ± 0.08<br>[0.83; 0.68–0.87] | 2.18 ± 0.34<br>[2.03; 1.96–2.78] | 2.99 ± 0.37<br>[2.81; 2.79–3.65] | 2.00 ± 0.32<br>[1.85; 1.81–2.57] | 101.5 ± 0.1<br>[101.4; 101.4–101.7] | 2443.0 ± 404.9<br>[2723.1; 1843.3–2724.9] | 2341.5 ± 404.8<br>[2621.7; 1741.9–2623.3] | -30.4 ± 31.2<br>[-32.0; -80.0–0.0] | **0.501** |
| **N=401**<br>($n=5$) | 241.1 | 1.51 ± 0.33<br>[1.64; 0.99–1.85] | 4.38 ± 0.41<br>[4.40; 4.00–5.00] | 5.88 ± 0.67<br>[6.11; 4.99–6.64] | 4.15 ± 0.40<br>[4.21; 3.72–4.72] | 101.5 ± 0.1<br>[101.5; 101.4–101.7] | 2287.8 ± 629.4<br>[2043.6; 1705.8–3244.0] | 2186.3 ± 629.4<br>[1941.9; 1604.4–3142.4] | 323.2 ± 410.1<br>[246.1; -44.8–963.4] | **0.241** |

*Note: Format in cells is `Mean ± SD` followed by `[Median; Min–Max]`. Implied Single-Worker Capacity is derived as $1 / \text{mean}(\text{volume\_prep\_duration\_s})$.*

---

## 3. Peak & Delta Memory Footprint (RSS) versus Slice Count

| Tier ($N$) | Slices | Upload Size (MB) | Idle RSS Median (MB) | Peak RSS Median (MB) | Delta RSS Mean ± SD (MB) | Delta RSS Median (MB) | Delta RSS [Min–Max] (MB) | Payload Memory Tier Classification |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **N=25** | 25 | 15.0 | 101.4 | 619.1 | 528.5 ± 18.0 | 517.6 | [515.1–556.9] | **Large (Delta > 500 MB)** |
| **N=50** | 50 | 30.1 | 101.5 | 942.9 | 836.7 ± 8.1 | 841.4 | [823.3–842.2] | **Large (Delta > 500 MB)** |
| **N=100** | 100 | 60.1 | 101.4 | 1530.9 | 1429.6 ± 0.4 | 1429.4 | [1429.3–1430.2] | **Large (Delta > 500 MB)** |
| **N=200** | 200 | 120.3 | 101.4 | 2723.1 | 2341.5 ± 404.8 | 2621.7 | [1741.9–2623.3] | **Large (Delta > 500 MB)** |
| **N=401** | 401 | 241.1 | 101.5 | 2043.6 | 2186.3 ± 629.4 | 1941.9 | [1604.4–3142.4] | **Large (Delta > 500 MB)** |

---

## 4. Polling Artifact Analysis: Immediate (100 ms) vs Legacy (500 ms) Polling

A legacy polling routine used an initial 500 ms sleep followed by 500 ms intervals. Below is a direct comparison on tier $N=25$ under identical server conditions:

| Metric | Immediate Polling (0 ms initial, 100 ms interval, $n=5$) | Legacy Polling (500 ms initial, 500 ms interval, $n=5$) | Difference (Legacy - Immediate) |
|:---|:---|:---|:---|
| **Upload Duration** | 0.10 ± 0.03 s | 0.07 ± 0.02 s | -0.03 s |
| **Response-to-Ready** | 1.01 ± 0.03 s | 1.01 ± 0.00 s | **+0.00 s** (0.3%) |
| **Total Upload-to-Ready** | 1.11 ± 0.03 s | 1.08 ± 0.02 s | **+-0.03 s** (-2.6%) |

---

## 5. Concurrency Probe Results

| Concurrency Level ($L$) | Repetitions | Mean Upload Duration (s) | Mean Response-to-Ready (s) | Mean Total Duration (s) | Max Total Duration (s) | Idle RSS (MB) | Peak Total RSS (MB) | Delta RSS (MB) | Max Overlapping Jobs | Swap Growth (MB) |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **L=1** | 3 | 0.07 s | 1.06 s | 1.13 s | 1.15 s | 101.5 MB | 658.6 MB | 556.7 MB | **1** / 1 | -13.3 MB |
| **L=2** | 3 | 0.10 s | 1.10 s | 1.20 s | 1.30 s | 101.5 MB | 942.1 MB | 835.9 MB | **2** / 2 | -8.0 MB |
| **L=4** | 3 | 0.15 s | 1.24 s | 1.40 s | 1.45 s | 101.4 MB | 1530.8 MB | 1428.2 MB | **4** / 4 | -10.7 MB |

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
