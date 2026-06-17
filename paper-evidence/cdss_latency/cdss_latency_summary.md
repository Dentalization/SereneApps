# CDSS Asynchronous Latency Benchmark

Status: not run

Reason: Required services unavailable. Health checks: {"backend":{"ok":false,"error":"fetch failed"},"python":{"ok":false,"error":"fetch failed"}}

Command: `node paper-evidence/scripts/xcore-cdss-benchmark.cjs latency --runs 30`

| Metric | n | Mean ms | Median ms | Min ms | Max ms | SD ms | p90 ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Initial response | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Queue time | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Inference/conversion | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Persistence | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| End-to-end | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

Interpretation: no latency values were produced because the required backend and Python CDSS services were unavailable. This file is a traceable placeholder and must not be used as performance evidence.
