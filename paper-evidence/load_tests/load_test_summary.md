# Core API Load Test Summary

## Metadata
- Generated at: 2026-06-17T06:56:23.459Z
- API URL: http://localhost:4000/v1
- Duration per scenario: 5m
- k6 script: `paper-evidence/load_tests/core_api_high_vu.k6.js`

## Results
| Scenario | Status | Avg ms | p90 ms | p95 ms | p99 ms | Throughput req/s | Total requests | Failed requests | Error rate / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 VU | failed_threshold | 140.12 | 538.23 | 573.17 | 776.32 | 255.38 | 77034 | 19262 | 25.00% |
| 200 VU | failed_threshold | 545.47 | 2133.14 | 2175.91 | 2559.29 | 249.99 | 75782 | 18945 | 25.00% |

## Bottleneck Notes
Interpret bottlenecks from p95/p99 latency, error rate, and backend logs. If a scenario is marked `not_run`, the local backend was unavailable when this report was generated. If a 200 VU scenario fails, keep that failure as machine-limit evidence rather than deleting it.
