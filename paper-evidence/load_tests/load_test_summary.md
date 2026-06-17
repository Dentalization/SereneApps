# Core API Load Test Summary

## Metadata
- Generated at: 2026-06-17T05:46:50.025Z
- API URL: http://localhost:4000/v1
- Duration per scenario: 5m
- k6 script: `paper-evidence/load_tests/core_api_high_vu.k6.js`

## Results
| Scenario | Status | Avg ms | p90 ms | p95 ms | p99 ms | Throughput req/s | Total requests | Failed requests | Error rate / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 VU | not_run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Backend unavailable at http://localhost:4000/health: {"ok":false,"error":"fetch failed"} |
| 200 VU | not_run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Backend unavailable at http://localhost:4000/health: {"ok":false,"error":"fetch failed"} |

## Bottleneck Notes
Interpret bottlenecks from p95/p99 latency, error rate, and backend logs. If a scenario is marked `not_run`, the local backend was unavailable when this report was generated. If a 200 VU scenario fails, keep that failure as machine-limit evidence rather than deleting it.
