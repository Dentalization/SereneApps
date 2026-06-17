# Core API Load Test Summary

## Metadata
- Generated at: 2026-06-17T08:35:03.391Z
- API URL: http://localhost:4000/v1
- Duration per scenario: 5m
- k6 script: `paper-evidence/load_tests/core_api_high_vu.k6.js`

## Results
| Scenario | Status | Avg ms | p90 ms | p95 ms | p99 ms | Throughput req/s | Total requests | Failed requests | Error rate / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 200 VU | failed_threshold | 809.65 | 3412.39 | 4000.42 | 4613.82 | 187.31 | 57108 | 0 | 0.00% |

## Bottleneck Notes
Interpret bottlenecks from p95/p99 latency, error rate, and backend logs. If a scenario is marked `not_run`, the local backend was unavailable when this report was generated. If a 200 VU scenario fails, keep that failure as machine-limit evidence rather than deleting it.
