# Assessment of a Microservices-Based Clinical Decision Support System Teledentistry Platform

**Adrian Halim¹\*, Binti Solihah²\*, Ratna Shofiati³, Intan Farizka⁴, Alva Erwin⁵, Abdul Karim⁶**

¹'²'³Informatics Study Program, Faculty of Industrial Technology, Universitas Trisakti, Indonesia  
⁴Faculty of Dentistry, Universitas Trisakti, Indonesia  
²'⁵Center for Artificial Intelligence and Advanced Technology (CAPTIVATE), Institution for Research and Community Services, Universitas Trisakti, Indonesia  
⁶Department of Artificial Intelligence Convergence, Hallym University, Chuncheon 24252, Republic of Korea  

\*Email: binti@trisakti.ac.id, adrianhalim05@gmail.com  
Received: -; Revised: -; Accepted: -; Published: -  

---

### Abstract

| Abstract |
| :--- |
| Teledentistry can help bridge geographical disparities in dental healthcare access in Indonesia. Integrating medical image–based diagnostic tools can introduce processing bottlenecks due to contrasting workload characteristics. Microservices are frequently adopted to decouple high-overhead workflows, but service decomposition introduces inter-service communication overhead, complex operational dependencies, and strict testing boundaries. This study empirically evaluates a mobile- and web-based teledentistry prototype that separates core backend microservices from an asynchronous Clinical Decision Support System (CDSS) / volumetric reconstruction pipeline. Evaluation was conducted across isolated endpoint benchmarks (10 Virtual Users [VUs]) and full-workflow load tests (1–200 VUs), with all core endpoints required to satisfy an internal p95 initial interactive response target of < 2,000 ms. Full-workflow load tests maintained compliance through 100 VUs (p95 = 1,457.12 ± 47.31 ms) and crossed the threshold at 200 VUs (p95 = 3,563.13 ± 272.14 ms), while maintaining a 0.00% HTTP error rate. For 3D dental CBCT imaging, the upload endpoint returns HTTP 200 after the study is received, with a measured upload duration of 0.09 ± 0.04 s for a 15 MB payload (N = 25 slices) and 1.12 ± 0.52 s for a 241 MB payload (N = 401 slices, provisional). Volumetric reconstruction then runs in the background, with a Python volume preparation time of 0.91 ± 0.01 s (N = 25) to 3.47 ± 0.05 s (N = 401, provisional) and total upload-to-ready time of 1.07 ± 0.03 s to 4.84 ± 0.53 s on a single 8 GB Apple M3 host. Under concurrency (N = 25, L ≤ 4), four overlapping conversions completed in 1.31 ± 0.01 s on average, compared with 1.04 s for a single job. Automated testing yielded a 99.47% pass rate (188/189 tests), although code coverage remained uneven across modules. SonarQube Cloud assigned Maintainability Rating 'A' across 39,998 lines of code; however, ESLint and Radon identified localized risks, including 62 web-application lint errors and a CDSS function with cyclomatic complexity 48 (rank F). Overall, asynchronous CDSS decoupling effectively preserves interactive responsiveness, while concurrency boundaries and localized code quality risks require mitigation prior to production deployment. |

**Keywords:** *asynchronous processing; clinical decision support; cone-beam computed tomography; empirical evaluation; latency; maintainability; microservices; teledentistry; testability.*

---

## 1. INTRODUCTION

Dental and oral health remains a major public health concern in Indonesia. According to the 2023 Indonesian Health Survey, 56.9% of individuals aged three years and older experienced dental or oral health problems, yet only 11.2% received care from dental professionals [1]. This gap encompasses not only clinical needs but also issues of access, waiting times, provider distribution, and continuity of care. Teledentistry can mitigate geographical and scheduling barriers through remote consultations, clinical-image exchange, patient monitoring, and store-and-forward reviews [2, 3]. User experience research in telemedicine confirms that dependable communication, straightforward workflows, and timely feedback directly determine whether patients and providers engage with digital services effectively [4].

To complement these digital workflows, modern teledentistry platforms increasingly incorporate Clinical Decision Support Systems (CDSS) to augment—not replace—professional clinical judgment [5]. Recent studies highlight both the potential of AI-assisted decision-making and the operational safeguards required for responsible integration [6, 7]. In dentistry, image-based AI supports preliminary analysis, but its efficacy depends on training data quality, task definition, and practitioner interpretation [8, 9]. Even emerging conversational dental prototypes are positioned as assistive tools rather than autonomous authorities [10]. Accordingly, the CDSS in this work is limited to technical screening and triage support; clinical accuracy is outside the evaluation scope.

The integration of medical image-based diagnostic tools introduces a software-engineering bottleneck: standard functions such as login and appointment retrieval rely on short, bounded request paths, whereas dental-image workflows—encompassing validation, file storage, job creation, volumetric reconstruction, slice extraction, result persistence, and notification—require substantially longer execution times. Executing all these stages within a single synchronous request can delay visible responses and increase tail latency [14]. A modular healthcare architecture can isolate these responsibilities [11, 12], and recent distributed medical architectures similarly emphasize separation, security, and scalability [13]. Microservices are frequently adopted to decouple high-overhead workflows; however, service decomposition introduces inter-service communication overhead, operational dependencies, and strict testing boundaries [15, 16]. Healthcare implementations must additionally account for stringent access control, privacy, and resilience requirements [17–20].

Despite growing interest in both teledentistry systems and microservice quality assessment, no prior work has simultaneously evaluated latency, automated testability, and maintainability in an integrated teledentistry prototype where image-based CDSS executes asynchronously across calibrated multi-tier payloads. Table 1 contrasts representative prior works with the scope of this study.

**Table 1. Comparison of scope with representative prior works**

| Reference | System Type | Latency Test | Testability Assess. | Maintainability Assess. | Async CDSS |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Alabdullah & Daniel [2] | Teledentistry review | ✗ | ✗ | ✗ | ✗ |
| Estai et al. [3] | Teledentistry review | ✗ | ✗ | ✗ | ✗ |
| Gan et al. [14] | Microservice benchmark | ✓ | ✗ | ✗ | ✗ |
| Hassan et al. [15] | Microservice granularity | ✗ | ✗ | ✓ | ✗ |
| Vale et al. [16] | Microservice patterns | ✗ | ✗ | ✓ | ✗ |
| Özdemir & Buzluca [23] | Microservice maintainability | ✗ | ✗ | ✓ | ✗ |
| Moskalenko & Kharchenko [19] | AI medical MLOps | ✓ | ✗ | ✗ | ✓ |
| **This study** | **Teledentistry + Async CDSS** | **✓** | **✓** | **✓** | **✓** |

To address this gap, this study evaluates a mobile- and web-based teledentistry prototype across three ISO/IEC 25010:2023 quality attributes: latency as the primary attribute, with testability and maintainability as supporting attributes. The primary contributions are: (1) an asynchronous CDSS integration pattern that decouples immediate API acknowledgment from heavy image-processing workflows; (2) repeated empirical benchmark data ($n=3$ per scenario) from isolated endpoint and full-workflow load testing through 200 VUs; (3) calibrated empirical payload-tier scaling ($N=25$ to $401$ slices) and concurrency probe measurements ($L \le 4$); and (4) a multi-tool quality evaluation combining automated test coverage with static code analysis. This work does not claim clinical diagnostic validity, production readiness, or national-scale deployment capacity.

---

## 2. METHOD

### 2.1 Research Design and Evaluation Metrics

This study adopts an empirical quantitative design to evaluate system quality attributes. Measurements were collected from a working prototype and interpreted within the specific hardware, software, test data, and configuration used during execution. The ISO/IEC 25010:2023 product quality model [21] provides the baseline framework for evaluating performance efficiency and maintainability. An internal Service Level Objective (SLO) was established requiring a 95th percentile (p95) response time of below 2,000 ms for interactive API requests, including the initial acknowledgment of the upload endpoint. This threshold aligns with human-computer interaction research showing that response times exceeding 1,000–2,000 ms disrupt conversational user flow [26] and is consistent with operational latency targets adopted in comparable healthcare API deployments [27].

To ensure measurement consistency, load-testing scenarios were repeated for $n=3$ runs, with run-level sample mean ($\bar{x}$) and sample standard deviation ($s$) calculated using Equations (1) and (2):

$$\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i \tag{1}$$

$$s = \sqrt{\frac{\sum_{i=1}^{n} (x_i - \bar{x})^2}{n - 1}} \tag{2}$$

Within each k6 run, p95 is the 95th percentile of observed HTTP request durations. Across repeated runs, Equations (1) and (2) are applied to the three run-level p95 values. Throughput is taken from `http_reqs.rate` (not iteration count) because one load-test iteration generates five HTTP requests. Coefficient of variation $CV = (s / \bar{x}) \times 100\%$ is reported where run-to-run variability is notable, with a CV below 20% indicating acceptable measurement stability [28]. Error rate represents requests classified as failed by k6 status checks. The automated-test pass rate is calculated as Equation (3):

$$\text{Pass Rate} = \frac{N_{\text{passed}}}{N_{\text{total}}} \times 100\% \tag{3}$$

Testability is assessed through total tests, passed, failed, skipped, and code coverage. Maintainability is assessed through code smells, technical debt, complexity, duplication, lint findings, cyclomatic complexity, maintainability index, and aggregate maintainability rating [22–25].

---

### 2.2 System Architecture and Asynchronous Workflow

The platform follows a decoupled, microservices-based architecture connecting client applications to core teledentistry workflows. The Client Layer accommodates different user roles through dedicated interfaces: Patient Mobile App, Dentist Web Portal, Clinic Web Portal, and Admin Web Portal. Incoming client requests pass through the Access Layer via an API Gateway that manages traffic across REST endpoints and WebSocket channels while enforcing JWT authentication.

Behind the gateway, the Microservices Layer handles business logic through decoupled services: Authentication, User Management, Appointments, Consultation/Chat, Medical Records, Billing/Payment, Media Upload, Notifications, and CDSS Orchestration. When radiographic studies are submitted, workloads are routed to a high-performance Python service (FastAPI) that performs DICOM validation, affine-spatial reorientation, volume reconstruction (MONAI, PyTorch, VTK), and result persistence. Transactional data resides in PostgreSQL, chat logs in MongoDB, and medical volumes in private storage. External third-party integrations (Twilio for communication, Midtrans for payment) are isolated behind service adapters.

```
+-----------------------------------------------------------------------------------+
|                            CLIENT INTERACTION LAYER                               |
|       [Patient Mobile App]     [Dentist Web Portal]     [Clinic Admin Portal]     |
+-----------------------------------------------------------------------------------+
                                          |
                                          v  REST / WebSockets (JWT Auth)
+-----------------------------------------------------------------------------------+
|                                API GATEWAY LAYER                                  |
|         POST /v1/x-core/upload  ----->  HTTP 200 OK {"status": "converting"}      |
+-----------------------------------------------------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v (In-Process Trigger)                    v (Async BackgroundTask)
+---------------------------------------+    +--------------------------------------+
|        NODE.JS BACKEND CORE           |    |       FASTAPI PYTHON PIPELINE        |
|  • Metadata Ingest & Validation       |    |  • pydicom Axial Slice Reading       |
|  • PostgreSQL Study Registration      |    |  • MONAI RAS Orientation & Spacing   |
|  • File Storage Persistence           |    |  • VTK ZLib VTI Volume Compression   |
|  • Client Status Polling Gateway      |    |  • In-Process ThreadPool Concurrency |
+---------------------------------------+    +--------------------------------------+
```
*Figure 1. Decoupled asynchronous CDSS processing pipeline and measurement boundaries.*

The operational pipeline splits into an **Interactive Request phase** and a **Background Processing phase**. Initially, an authenticated client submits a multi-file DICOM series via a `POST /v1/x-core/upload` request (1. Upload). The Node.js/Express API gateway validates the multipart payload, persists initial metadata, and triggers the Python service at `POST /convert/{study_id}`, which immediately returns an HTTP 200 OK response with status `{"status": "converting"}` (2. Acknowledge). The 2,000-ms p95 SLA target applies strictly to this initial interactive response. In-process FastAPI `BackgroundTasks` then executes volumetric reconstruction (3. Schedule & Process), converting axial DICOM slices into a 3D VTI volume using MONAI and VTK pipelines before saving outputs to local storage and PostgreSQL (4. Persist), enabling client polling via `GET /status/{study_id}`. System performance across this lifecycle is benchmarked through **Initial Upload Response Time** (upload to HTTP 200), **Python Volume Preparation Time** ($T_{\text{prep}}$, DICOM loading to VTI write), and overall **Upload-to-Ready Processing Time**.

---

### 2.3 Testing Protocol and Environment

#### 2.3.1 Test Tools, Environment Setup, and Code Quality Scope
Automated unit and integration testing utilized the native Node.js test runner and Jest, covering authentication, appointments, consultation/chat, CDSS integration, as well as the web and mobile applications. Maintainability and code quality were evaluated using SonarQube Cloud, ESLint, and Radon:
* **SonarQube Cloud:** Configured using `sonar.inclusions` to analyze core application modules (authentication, appointments, consultation/chat, CDSS integration, main web flow, and patient mobile flow).
* **ESLint & Radon:** ESLint supplied technology-specific JavaScript/TypeScript static analysis, while Radon measured Python cyclomatic complexity and maintainability index.

Benchmarks were executed locally on an Apple Silicon M3 host (8-core CPU, 10-core GPU, 8 GB unified memory, macOS Darwin 25.x). The software stack comprised Node.js v22.12.0, Express.js 4.21.2, PostgreSQL 14.18, Python 3.14.0, FastAPI 0.129.0, Uvicorn 0.40.0, PyTorch 2.10.0, MONAI 1.5.2, and VTK 9.6.0, with load testing driven by Grafana k6 (v2.0.0 on darwin/arm64). Preflight hardware cleanliness gates enforced $\le 500$ MB active swap, $\ge 3,000$ MB available RAM, wall-charger AC power, normal thermal state, and $\ge 5$ GB free disk space prior to benchmark execution.

#### 2.3.2 Isolated Endpoint Benchmarks and Multi-VU Load Testing
* **Isolated Endpoint Testing:** Six core endpoints—login, appointment-list retrieval, appointment creation, consultation-detail retrieval, consultation-message submission, and attachment upload—were isolated and benchmarked under a constant load of 10 Virtual Users (VUs) for three minutes per run across three repeated executions with cooldown intervals.
* **Multi-VU Load Testing:** Full-system load tests were executed using constant loads of 1, 10, 50, 100, and 200 VUs for three minutes across three repeated iterations. Each VU sequentially executed login, appointment-list retrieval, consultation-detail retrieval, message submission, and attachment upload, followed by a one-second think time. The database connection pool was configured for a minimum of 20 and maximum of 200 connections.

#### 2.3.3 Calibrated Multi-Tier CDSS Evaluation Protocol
To characterize volumetric reconstruction across realistic clinical scales without relying on uncalibrated single-slice 2D images, evaluation was performed using standardized synthetic phantom DICOM series across five payload tiers ($N \in \{25, 50, 100, 200, 401\}$ slices; upload sizes 15.0 MB to 241.1 MB):
1. **Payload-Tier Scaling Sweep:** Evaluated across five tiers with $n=5$ repeated runs per tier in pseudo-randomized order to measure upload duration, Python volume preparation latency ($T_{\text{prep}}$), total upload-to-ready time, idle/peak RSS memory, and swap memory growth. Polling was executed immediately ($t=0$) and every 100 ms thereafter.
2. **Concurrency Probe:** Evaluated on tier $N=25$ across concurrency levels $L \in \{1, 2, 4\}$ ($n=3$ repetitions per level) to measure overlapping conversion execution, marginal memory footprint per job, and multi-core CPU utilization within the FastAPI threadpool.

---

## 3. RESULTS

### 3.1 Core API Latency

The repeated latency evaluation benchmarked six isolated core API endpoints under a constant load of 10 Virtual Users (VUs) for three minutes per run across three repeated executions. Across all endpoints, as shown in Table 2, the platform maintained a 0.00% error rate and satisfied internal SLA targets in 3 out of 3 runs. System throughput remained uniform across all tested endpoints, ranging between 9.15 ± 0.01 req/s and 9.80 ± 0.01 req/s.

Lightweight read-only endpoints exhibited the lowest latencies: appointment list retrieval averaged 19.24 ± 1.49 ms (p95 = 30.47 ± 1.43 ms) and consultation detail retrieval averaged 22.58 ± 4.04 ms (p95 = 27.72 ± 3.09 ms). Transactional write operations also performed efficiently: appointment creation averaged 30.14 ± 1.20 ms (p95 = 50.18 ± 7.16 ms) and message submission averaged 31.00 ± 4.49 ms (p95 = 48.65 ± 6.39 ms). User login registered a mean latency of 90.01 ± 0.39 ms (p95 = 97.98 ± 3.35 ms) due to password verification and JWT token signing. Media attachment upload recorded an initial interactive response time of 41.69 ± 5.23 ms (p95 = 73.18 ± 38.35 ms). Every endpoint operated comfortably below the 2,000 ms SLA threshold.

**Table 2. Repeated latency results for six core API endpoints (10 VUs, 3 min per run, n=3)**

| No | Endpoint | Mean ± SD (ms) | p95 ± SD (ms) | Throughput ± SD (req/s) | Error | Target (< 2,000 ms) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | User login | 90.01 ± 0.39 | 97.98 ± 3.35 | 9.15 ± 0.01 | 0.00% | Met 3/3 |
| 2 | Appointment list | 19.24 ± 1.49 | 30.47 ± 1.43 | 9.80 ± 0.01 | 0.00% | Met 3/3 |
| 3 | Create appointment | 30.14 ± 1.20 | 50.18 ± 7.16 | 9.68 ± 0.01 | 0.00% | Met 3/3 |
| 4 | Consultation detail | 22.58 ± 4.04 | 27.72 ± 3.09 | 9.75 ± 0.04 | 0.00% | Met 3/3 |
| 5 | Consultation message | 31.00 ± 4.49 | 48.65 ± 6.39 | 9.66 ± 0.04 | 0.00% | Met 3/3 |
| 6 | Attachment upload | 41.69 ± 5.23 | 73.18 ± 38.35 | 9.57 ± 0.04 | 0.00% | Met 3/3 |

---

### 3.2 Repeated Full-Workflow Load Behavior

Table 3 presents full-system load testing across five workload tiers from 1 to 200 VUs, with each scenario running for three minutes across three repeated iterations. At 1 VU, baseline performance yielded a mean response latency of 23.95 ± 1.01 ms (p95 = 90.72 ± 1.17 ms) and throughput of 4.50 ± 0.02 req/s. Scaling to 10 VUs resulted in a mean latency of 34.60 ± 1.16 ms (p95 = 138.50 ± 4.47 ms) and throughput of 42.51 ± 0.17 req/s. At 50 VUs, mean latency reached 176.91 ± 3.74 ms (p95 = 718.24 ± 13.38 ms) at 132.32 ± 1.30 req/s. At 100 VUs, the backend sustained 180.22 ± 4.29 req/s while recording a mean latency of 353.62 ± 13.16 ms (p95 = 1,457.12 ± 47.31 ms), meeting the internal p95 target in all three runs.

**Table 3. Repeated full-workflow load-test results from 1 to 200 virtual users (n=3)**

| Scenario | VU | Mean ± SD (ms) | p95 ± SD (ms) | Throughput ± SD (req/s) | Error | Target (< 2,000 ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Baseline | 1 | 23.95 ± 1.01 | 90.72 ± 1.17 | 4.50 ± 0.02 | 0.00% | Met 3/3 |
| Light load | 10 | 34.60 ± 1.16 | 138.50 ± 4.47 | 42.51 ± 0.17 | 0.00% | Met 3/3 |
| Moderate load | 50 | 176.91 ± 3.74 | 718.24 ± 13.38 | 132.32 ± 1.30 | 0.00% | Met 3/3 |
| High load | 100 | 353.62 ± 13.16 | 1,457.12 ± 47.31 | 180.22 ± 4.29 | 0.00% | Met 3/3 |
| Peak tested load | 200 | 846.26 ± 62.01 | 3,563.13 ± 272.14 | 191.06 ± 11.56 | 0.00% | Exceeded 3/3 |

At 200 VUs, throughput plateaued at 191.06 ± 11.56 req/s, while latencies increased to a mean of 846.26 ± 62.01 ms and p95 of 3,563.13 ± 272.14 ms, crossing the 2,000 ms target in all three runs. Crucially, the system maintained a 0.00% error rate across all load tiers from 1 to 200 VUs, indicating high software reliability without request drops or unhandled exceptions under stress. Because throughput growth diminished past 50 VUs and plateaued between 100 and 200 VUs (~180 to 191 req/s), 100 VUs establishes the system's operational concurrency boundary within the single-node test environment.

---

### 3.3 Asynchronous CDSS Payload-Tier Characterization

Table 4 summarizes empirical characterization of the asynchronous 3D CBCT reconstruction pipeline across calibrated payload tiers ($N=25$ to $401$ slices) and concurrent load levels ($L=1$ to $4$):

**Table 4. Empirical characterization of 3D CBCT volume reconstruction across payload tiers and concurrency**

| Test Configuration | Payload Size (MB) | Upload Duration (s) | Volume Prep ($T_{\text{prep}}$) (s) | Upload-to-Ready Total (s) | Median Peak RSS (MB) | Swap Growth (MB) | Evaluation Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **N=25** ($n=5$) | 15.0 | $0.09 \pm 0.04$ | $0.91 \pm 0.01$ | $1.07 \pm 0.03$ | 639.1 | 0.0 | Confirmed Stable |
| **N=50** ($n=5$) | 30.1 | $0.16 \pm 0.08$ | $1.04 \pm 0.02$ | $1.27 \pm 0.09$ | 930.4 | 0.0 | Confirmed Stable |
| **N=100** ($n=5$) | 60.1 | $0.26 \pm 0.16$ | $1.28 \pm 0.01$ | $1.66 \pm 0.18$ | 1531.3 | 0.0 | Confirmed Stable |
| **N=200** ($n=5$) | 120.3 | $0.50 \pm 0.34$ | $2.02 \pm 0.62$* | $2.69 \pm 0.93$ | 2723.7 | 0.0 | Outlier on Run 4* |
| **N=401** ($n=5$) | 241.1 | $1.12 \pm 0.52$ | $3.47 \pm 0.05$ | $4.84 \pm 0.53$ | 2965.8 | 35.6 (Run 6) | Provisional (RAM Pressure) |
| **L=1** ($N=25, n=3$) | 15.0 | $0.07 \pm 0.01$ | $0.91 \pm 0.01$ | $1.04 \pm 0.00$ | 658.1 | 0.0 | Baseline Single Job |
| **L=2** ($N=25, n=3$) | 30.0 | $0.14 \pm 0.07$ | $0.94 \pm 0.01$ | $1.20 \pm 0.08$ | 947.8 | 0.0 | Overlap 2/2, $\Delta_{\text{job}} \approx 290$ MB |
| **L=4** ($N=25, n=3$) | 60.0 | $0.10 \pm 0.01$ | $1.01 \pm 0.00$ | $1.31 \pm 0.01$ | 1529.3 | 0.0 | Overlap 4/4, $\Delta_{\text{job}} \approx 291$ MB |

*\*Note: Excluding the single 3.13-s outlier in Run 4, N=200 volume prep averages $1.75 \pm 0.01$ s (median 1.75 s).*

Key findings from empirical characterization:
1. **Light to Moderate Scaling ($N=25$ to $100$):** Processing duration exhibited high stability (SD $\le 20$ ms), scaling from 0.91 s ($N=25$) to 1.28 s ($N=100$) without swap growth.
2. **Intermediate Scaling Outlier ($N=200$):** Four iterations ran consistently at $1.73–1.76$ s ($1.75 \pm 0.01$ s), while a single outlier on Run 4 recorded $3.13$ s, raising the overall mean to $2.02 \pm 0.62$ s.
3. **Upper Ceiling ($N=401$, Provisional):** Volume preparation latency was consistent ($3.47 \pm 0.05$ s, CV 1.4%). However, Peak RSS fluctuated across a 1,051 MB range ($2,683.4$ to $3,734.7$ MB, mean $3,038.8$ MB), triggering 35.6 MB of swap memory on Run 6 and depressing available host RAM to $1,303–1,560$ MB (below the preflight threshold of 3,000 MB).
4. **Concurrent Threadpool Execution ($L \le 4$):** On $N=25$, four simultaneous conversions completed in an average total time of $1.31 \pm 0.01$ s with maximum overlapping conversions of 4/4. Individual jobs completed in ~1.01 s, nearly identical to single-job latency (1.04 s). Marginal memory growth per concurrent job was consistent at $\approx 290$ MB ($L=1 \to 2$: $+289.7$ MB; $L=2 \to 4$: $+581.5 / 2 = +290.8$ MB). Concurrency level $L=8$ was safely omitted because projected memory ($2,669$ to $4,405$ MB) exceeded the safety budget of 2,500 MB on the 8 GB host.

---

### 3.4 Testability

The automated test evaluation expanded from an initial total of 179 tests to 189 final tests across six core modules. Out of 189 tests, 188 executed successfully, zero failed, and one test was skipped within the Backend CDSS integration module. Test expansion occurred in Backend Chat (31 to 36 tests, all passed) and the Mobile Application (18 to 23 tests, all passed). Test counts for Backend Authentication (13 tests), Backend Appointments (5 tests), Backend CDSS Integration (34 tests), and the Web Application (78 tests) remained constant, with the Web Application maintaining the largest single test footprint.

Code coverage varied across architectural layers: Backend Appointments achieved 78.90%, Backend CDSS Integration 68.52%, the Web Application 54.58%, and Backend Authentication 45.51%. Incremental coverage gains occurred in Backend Chat (19.61% to 20.47%) and the Mobile Application (1.15% to 2.44%). While the zero-failure rate across 188 executed tests confirms functional reliability for tested pathways, low coverage in the Mobile Application underscores the need for continued test suite expansion.

**Table 5. Automated-test and code-coverage results across core modules**

| Module | Initial tests | Final tests | Passed | Failed | Skipped | Initial coverage | Final coverage |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Backend– authentication | 13 | 13 | 13 | 0 | 0 | 45.51% | 45.51% |
| Backend– appointments | 5 | 5 | 5 | 0 | 0 | 78.90% | 78.90% |
| Backend chat | 31 | 36 | 36 | 0 | 0 | 19.61% | 20.47% |
| Backend– CDSS integration | 34 | 34 | 33 | 0 | 1 | 68.52% | 68.52% |
| Web application | 78 | 78 | 78 | 0 | 0 | 54.58% | 54.58% |
| Mobile application | 18 | 23 | 23 | 0 | 0 | 1.15% | 2.44% |
| **Total** | **179** | **189** | **188** | **0** | **1** | **–** | **–** |

---

### 3.5 Maintainability

SonarQube Cloud evaluation covered 39,998 non-comment lines of code (ncloc) across three primary components: Web application (15,548 ncloc; 715 code smells; complexity 3,508), Backend (13,414 ncloc; 276 code smells; complexity 2,680), and Mobile application (11,036 ncloc; 397 code smells; complexity 2,439). The overall aggregate recorded 1,390 code smells, technical debt of 9,592 minutes (~160 hours), cognitive complexity of 5,542, duplicated code rate of 7.9%, and Maintainability Rating 'A'.

Static analysis using ESLint and Radon identified localized quality risks. Backend and Mobile components showed zero ESLint errors (162 and 1,017 warnings, respectively). The Web application recorded 62 ESLint errors and 1,921 warnings, establishing it as the primary candidate for refactoring. For the Python CDSS service, Radon measured a mean cyclomatic complexity of 7.75, a maximum complexity of 48 (rank F) in `convert_study_to_vti`, and a mean maintainability index of 17.78.

**Table 6. SonarQube Cloud, ESLint, and Radon maintainability findings**

| Component | Tool | Metric | Result |
| :--- | :---: | :--- | :---: |
| Backend | ESLint | Errors / Warnings | 0 errors, 162 warnings |
| Web application | ESLint | Errors / Warnings | 62 errors, 1,921 warnings |
| Mobile application | ESLint | Errors / Warnings | 0 errors, 1,017 warnings |
| CDSS service | Radon | Mean cyclomatic complexity | 7.75 |
| CDSS service | Radon | Maximum complexity | 48 (rank F) |
| CDSS service | Radon | Mean maintainability index | 17.78 |
| Core Scope (39,998 ncloc) | SonarQube | Maintainability Rating / Tech Debt | Rating A, 9,592 min debt |

---

## 4. DISCUSSION

### 4.1 Responsiveness of Core Services

Isolated endpoint benchmarks confirmed high backend efficiency at 10 Virtual Users (VUs), with all core endpoints operating well below the 2,000 ms p95 target. User login recorded the highest p95 latency at 97.98 ± 3.35 ms due to cryptographic operations, while media attachment upload averaged 41.69 ± 5.23 ms (p95 = 73.18 ± 38.35 ms).

Full-workflow load testing revealed system scaling boundaries: the platform met SLA targets through 100 VUs (p95 = 1,457.12 ± 47.31 ms) before crossing thresholds at 200 VUs (p95 = 3,563.13 ± 272.14 ms). Although a 0.00% HTTP error rate was maintained across all tiers, scaling from 100 to 200 VUs yielded only a 6.01% throughput increase (180.22 to 191.06 req/s) while p95 latency surged by 144.53%. This indicates a waiting-time penalty caused by connection-pool and thread saturation under peak concurrency [14].

---

### 4.2 Asynchronous CDSS and Empirical Reconstruction Scalability

The measured upload duration (0.09 s to 1.12 s) and rapid acknowledgment confirm that asynchronous decoupling successfully isolates the API gateway from long-running background tasks. Data shows that Python volume preparation latency increases from 0.91 ± 0.01 s ($N = 25$) to 3.47 ± 0.05 s ($N = 401$, provisional), and peak RSS reaches approximately 2,966 MB on the highest tier. The empirical memory model scales linearly up to $N = 200$:

$$\text{Peak RSS}(N, L) = 101.3 + 230 + (12 \times N) + (L - 1) \times 290 \quad [\text{MB}], \quad N \le 200$$

At $N = 401$, available host memory dropped to 1.3–1.6 GB, swap expanded by 35.6 MB, and memory growth plateaued, demonstrating that $N = 401$ operates under physical memory constraints on an 8 GB host and must be treated as provisional. With volume preparation durations scaling up to several seconds, executing these operations synchronously within the HTTP request cycle would hold client connections and degrade interactive responsiveness. Furthermore, concurrent evaluation ($N = 25$) demonstrates that four simultaneous conversions complete in 1.31 ± 0.01 s, with marginal memory growth of ~290 MB per concurrent job, confirming effective parallel execution within the in-process threadpool.

---

### 4.3 Testability and Coverage

A 99.47% pass rate shows that implemented functional scenarios completed with high stability, but 2.44% mobile coverage and 20.47% consultation/chat coverage leave substantial code paths unexercised. Priority additions include token expiry handling, multi-state appointment transitions, media attachment transmission failures, offline retry behavior, and asynchronous CDSS error visibility.

---

### 4.4 Aggregate Maintainability and Local Risks

Maintainability Rating 'A' across 39,998 lines of code reflects a strong aggregate baseline, but masks concentrated local risks. The Web application is the primary refactoring priority, combining 715 code smells, 62 ESLint errors, 1,921 warnings, and high complexity. The CDSS function `convert_study_to_vti` with complexity 48 (rank F) should be decomposed by separating validation, transformation, and persistence layers. Triangulation across multiple tools is necessary because individual tools aggregate distinct quality signals [24, 25].

---

## 5. LIMITATIONS AND THREATS TO VALIDITY

External validity is constrained by the local Apple Silicon M3 (8 GB) single-node environment; results do not directly represent cloud deployments with separate hosts, network latency, auto-scaling, or managed databases. External integrations (Twilio, Midtrans) were mocked, excluding third-party rate limits and network variability.

Internal validity is bounded because aggregate k6 metrics include setup and warm-up requests, the database was not reset after every run, and the transition threshold between 100 and 200 VUs was not tested at intermediate increments. CDSS volumetric evaluation utilized calibrated synthetic DICOM phantoms; clinical anatomy exhibits varying tissue gradients and metallic artifacts that may alter VTK compression ratios. The $N=401$ tier operates under memory pressure on 8 GB systems, making its memory footprint provisional, and concurrency testing was constrained to $L \le 4$ to prevent memory thrashing. Accordingly, the findings demonstrate technical architecture feasibility, not clinical diagnostic readiness.

---

## 6. CONCLUSION

Because medical image processing can introduce performance bottlenecks in interactive applications, this study evaluated an asynchronous microservices-based teledentistry platform that isolates client requests from background volumetric reconstruction. Isolated core endpoints satisfied interactive response targets (< 2,000 ms), and full-workflow load tests confirmed stable operation up to 100 VUs with a 0.00% error rate. Calibrated payload-tier evaluation demonstrated that 3D CBCT volume preparation scales from 0.91 s ($N=25$) to 3.47 s ($N=401$, provisional), with concurrent execution ($L \le 4$) completing four overlapping conversions in 1.31 s without memory thrashing. Software quality assessments confirmed an aggregate Maintainability Rating 'A' and a 99.47% test pass rate, while identifying localized complexity within the web application and CDSS processing modules. Future work will evaluate distributed multi-node deployments, investigate bounded queueing models under open-arrival workloads, expand mobile test coverage, and assess diagnostic pipelines in clinical collaboration.

---

### CONFLICT OF INTEREST
The authors declare that there is no conflict of interest regarding this research.

### ACKNOWLEDGMENT
The authors thank the Informatics Study Program, Faculty of Industrial Technology, Universitas Trisakti, for supporting the prototype. The authors also thank drg. M. Novo Lubis, Sp.RKG; drg. Dewi Priandini, Sp.PM; drg. Rachendra Tiara Putri, Sp.KG; and drg. Aryadi Subrata, Sp.KG, Subsp.KE(K), for clinical-context input regarding teledentistry workflows. Portions of the manuscript text were assisted using Gemini for language editing. All content was reviewed and validated by the authors.

---

### REFERENCES

[1] Badan Kebijakan Pembangunan Kesehatan, *Survei Kesehatan Indonesia (SKI) dalam Angka*. Jakarta, Indonesia: Badan Kebijakan Pembangunan Kesehatan, 2024. [Online]. Available: https://www.badankebijakan.kemkes.go.id/repositori/id/eprint/5539/  
[2] J. H. Alabdullah and S. J. Daniel, "A systematic review on the validity of teledentistry," *Telemedicine and e-Health*, vol. 24, no. 8, pp. 639–648, 2018.  
[3] M. Estai, Y. Kanagasingam, M. Tennant, and S. Bunt, "A systematic review of the research evidence for the benefits of teledentistry," *Journal of Telemedicine and Telecare*, vol. 24, no. 3, pp. 147–156, 2018.  
[4] S. Khairat, P. Chourasia, K. A. Muellers, et al., "Patient and provider recommendations for improved telemedicine user experience in primary care," *Telemedicine Reports*, vol. 4, no. 1, pp. 21–29, 2023.  
[5] R. T. Sutton, D. Pincock, D. C. Baumgart, et al., "An overview of clinical decision support systems: Benefits, risks, and strategies for success," *npj Digital Medicine*, vol. 3, Art. no. 17, 2020.  
[6] M. Elhaddad and S. Hamam, "AI-driven clinical decision support systems: An ongoing pursuit of potential," *Cureus*, vol. 16, no. 4, Art. no. e57728, 2024.  
[7] S. Guleria, J. Guptill, I. Kumar, et al., "Artificial intelligence integration in healthcare: Perspectives and trends in a survey of U.S. health system leaders," *BMC Digital Health*, vol. 2, Art. no. 80, 2024.  
[8] F. Schwendicke, T. Golla, M. Dreher, and J. Krois, "Convolutional neural networks for dental image diagnostics: A scoping review," *Journal of Dentistry*, vol. 91, Art. no. 103226, 2019.  
[9] F. Schwendicke, J. C. Grano de Oro, A. G. Cantu, et al., "Artificial intelligence for caries detection: Value of data and information," *Journal of Dental Research*, vol. 101, no. 11, pp. 1350–1356, 2022.  
[10] M. S. H. Arian, F. A. Sifat, S. Ahmed, et al., "Dental Loop Chatbot: A prototype large language model framework for dentistry," *Software*, vol. 3, no. 4, pp. 587–594, 2024.  
[11] F. Bathelt, S. Lorenz, J. Weidner, et al., "Application of modular architectures in the medical domain—A scoping review," *Journal of Medical Systems*, vol. 49, no. 1, Art. no. 27, 2025.  
[12] M. A. P. da Silva, V. C. Times, A. M. de C. Araújo, and P. C. da Silva, "A decoupled health software architecture using microservices and OpenEHR archetypes," *International Journal of Computer Applications*, vol. 176, no. 28, pp. 21–29, 2020.  
[13] M. Ileana, P. Petrov, and V. Milev, "AI-enabled secure and scalable distributed web architecture for medical informatics," *Applied Sciences*, vol. 15, no. 19, Art. no. 10710, 2025.  
[14] Y. Gan et al., "An open-source benchmark suite for microservices and their hardware-software implications for cloud and edge systems," in *Proc. 24th ACM Int. Conf. ASPLOS*, 2019, pp. 3–18.  
[15] S. Hassan, R. Bahsoon, and R. Kazman, "Microservice transition and its granularity problem: A systematic mapping study," *Software: Practice and Experience*, vol. 50, no. 9, pp. 1651–1681, 2020.  
[16] G. Vale, F. F. Correia, E. M. Guerra, et al., "Designing microservice systems using patterns: An empirical study on quality trade-offs," in *Proc. 2022 IEEE 19th Int. Conf. ICSA*, 2022, pp. 69–79.  
[17] U. N. C. Cobrado, S. Sharief, N. G. Regahal, et al., "Access control solutions in electronic health record systems: A systematic review," *Informatics in Medicine Unlocked*, vol. 49, Art. no. 101552, 2024.  
[18] A. K. Conduah, S. Ofoe, and D. Siaw-Marfo, "Data privacy in healthcare: Global challenges and solutions," *DIGITAL HEALTH*, vol. 11, 2025.  
[19] V. Moskalenko and V. Kharchenko, "Resilience-aware MLOps for AI-based medical diagnostic system," *Frontiers in Public Health*, vol. 12, Art. no. 1342937, 2024.  
[20] P. Lakkamraju, M. Anumukonda, and S. R. Chowdhury, "Improvements in medical system safety analytics for authentic measure of vital signs using fault-tolerant design approach," *Frontiers in Medical Technology*, vol. 3, Art. no. 666671, 2021.  
[21] International Organization for Standardization, *ISO/IEC 25010:2023, Systems and Software Engineering—Product Quality Model*, 2nd ed. Geneva, Switzerland: ISO, 2023.  
[22] V. Lenarduzzi, N. Saarimäki, and D. Taibi, "Some SonarQube issues have a significant but small effect on faults and changes," *Journal of Systems and Software*, vol. 170, Art. no. 110750, 2020.  
[23] O. Özdemir and F. Buzluca, "Evaluating microservices maintainability: A classification system using code metrics," in *Proc. 2024 13th Int. Conf. ICCA*, 2024, pp. 55–61.  
[24] R.-H. Pfeiffer and M. Lungu, "Technical debt and maintainability: How do tools measure it?," *arXiv preprint arXiv:2202.13464*, 2022.  
[25] S. Wagner et al., "Operationalised product quality models and assessment: The Quamoco approach," *Information and Software Technology*, vol. 62, pp. 101–123, 2015.  
[26] J. Nielsen, "Response Times: The 3 Important Limits," Nielsen Norman Group, 1993 [Updated 2010].  
[27] Emorphis Health, "Healthcare Integration Issues and Their Solutions," White Paper, May 2026.  
[28] B. Kitchenham and S. L. Pfleeger, "Principles of Survey Research: Part 5," *Software Engineering Notes*, vol. 27, no. 5, pp. 17–20, 2002.

---

### SUBMISSION CHECK-LIST (JUTIF-Template)

| General Format | Yes | No |
| :--- | :---: | :---: |
| 1. Prepared using “JUTIF-Template.docx” | V | |
| 2. Single or double column using Times New Roman 11 pt font | V | |
| 3. Title matching focus of manuscript | V | |
| 4. Complete authors information (affiliations, corresponding author, email) | V | |
| 5. Length of manuscript not less than 3,500 words (excl. abstract, references) | V | |
| 6. Contains core sections (Intro, Method, Results, Discussion, Conclusion, References) | V | |
| 7. Maximum 2 level of sections | V | |

| Abstract | Yes | No |
| :--- | :---: | :---: |
| 1. Written between 150 – 250 words | V | |
| 2. Contains purpose, method, results, conclusion, novelty/impact | V | |
| 3. Completed with keywords | V | |

| Figures and Tables | Yes | No |
| :--- | :---: | :---: |
| 1. Figures clear, readable, formal, captioned at bottom | V | |
| 2. Tables clear, formal, captioned on top with consecutive numbers | V | |
| 3. All decimal numbers written with point (.) not comma (,) | V | |
| 4. Cited in text using consecutive numbering (Figure X, Table Y) | V | |

| References | Yes | No |
| :--- | :---: | :---: |
| 1. Consistently follows IEEE style | V | |
| 2. Paper cites at least 25 references (28 cited) | V | |
| 3. Book sources not more than 20%, 80%+ from journals/conferences | V | |
| 4. All references cited in text | V | |
