# CDSS Concurrent Upload Benchmark

## Metadata
- Generated at: 2026-06-17T07:02:50.304Z
- API base URL: http://localhost:4000/v1
- Python service URL: http://localhost:8000
- Synthetic fixture directory: `paper-evidence/fixtures/synthetic_dental_images`
- Source CSV: `paper-evidence/cdss_concurrent/cdss_concurrent_results.csv`

## Results
| Concurrent uploads | Total | Success | Error rate | Avg initial ms | Avg queue ms | Avg inference ms | Avg end-to-end ms | p95 end-to-end ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 2 | 2 | 0.00% | 62.95 | 4.50 | 5.50 | 567.16 | 570.27 |
| 5 | 5 | 5 | 0.00% | 58.98 | 8.00 | 7.00 | 562.85 | 568.52 |
| 10 | 10 | 9 | 10.00% | 77.99 | 9.44 | 8.56 | 580.92 | 595.87 |

## Queue Saturation Notes
Queue saturation should be inferred from increasing queue/end-to-end times and failed uploads. Blank queue fields indicate missing benchmark timestamp events, not zero queueing.
