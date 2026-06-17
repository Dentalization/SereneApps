# CDSS Asynchronous Latency Benchmark

## Metadata
- Generated at: 2026-06-17T06:21:16.830Z
- Environment: darwin/arm64, Node v22.12.0
- API base URL: http://localhost:4000/v1
- Python service URL: http://localhost:8000
- Synthetic fixture directory: `paper-evidence/fixtures/synthetic_dental_images`
- Requested runs: 30
- Successful runs: 30
- Failed runs: 0

## Summary Statistics
| Metric | n | Mean ms | Median ms | Min ms | Max ms | SD ms | p90 ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Initial response | 30 | 58.79 | 51.70 | 31.63 | 177.97 | 29.93 | 59.52 | 142.58 |
| Queue time | 30 | 6.53 | 5.00 | 4.00 | 28.00 | 4.36 | 9.00 | 11.00 |
| Inference/conversion | 30 | 5.10 | 5.00 | 4.00 | 9.00 | 1.21 | 6.00 | 8.00 |
| Persistence | 30 | 1.00 | 1.00 | 0.00 | 3.00 | 0.69 | 2.00 | 2.00 |
| End-to-end | 30 | 562.85 | 554.82 | 535.61 | 682.67 | 30.95 | 565.34 | 653.54 |

## Interpretation
The benchmark uses synthetic dental-like PNG images and the existing asynchronous X-Core upload/conversion flow. It does not use real patient data and does not evaluate clinical diagnostic accuracy. Initial response time represents the backend upload response. Queue, inference/conversion, and persistence timings are derived from benchmark event logs emitted by the backend and Python service when `X-Benchmark-Run-Id` headers are present.

## Cold-Start Notes
First successful end-to-end run: 653.54 ms; median of later successful runs: 554.60 ms.

## Limitations
- If queue/inference/persistence values are blank, the current services did not expose the corresponding benchmark event for that run.
- Results are local-environment performance evidence and should be reported with hardware/service assumptions.
