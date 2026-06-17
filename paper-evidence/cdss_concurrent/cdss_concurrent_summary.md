# CDSS Concurrent Upload Benchmark

Status: not run

Reason: Required services unavailable. Health checks: {"backend":{"ok":false,"error":"fetch failed"},"python":{"ok":false,"error":"fetch failed"}}

Command: `node paper-evidence/scripts/xcore-cdss-benchmark.cjs concurrent --concurrency 2,5,10`

| Concurrent uploads | Total | Success | Error rate | Avg initial ms | Avg queue ms | Avg inference ms | Avg end-to-end ms | p95 end-to-end ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A |
| 5 | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A |
| 10 | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A |

Queue saturation notes: no queue saturation can be inferred because no upload requests were executed.
