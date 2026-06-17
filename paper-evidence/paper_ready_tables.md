# Paper-Ready Evidence Tables

Generated at: 2026-06-17T07:03:28.095Z

## 1. CDSS Latency n>=30 Result Table
| Status | Requested n | Successful n | Failed n | Evidence |
| --- | --- | --- | --- | --- |
| completed | 30 | 30 | 0 | paper-evidence/cdss_latency/cdss_latency_results.csv |

## 2. CDSS Latency Summary Statistics
| Metric | n | Mean ms | Median ms | Min ms | Max ms | SD ms | p90 ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| End-to-end processing | 30 | 562.85 | 554.82 | 535.61 | 682.67 | 30.95 | 565.34 | 653.54 |

Interpretation: Successful synthetic CDSS uploads were measured through the asynchronous upload/conversion flow.

## 3. Load Testing 100/200 VU
| Scenario | Status | Avg ms | p90 ms | p95 ms | p99 ms | Throughput req/s | Total requests | Failed requests | Error rate / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 VU | failed_threshold | 140.12 | 538.23 | 573.17 | 776.32 | 255.38 | 77034 | 19262 | 25.00% |
| 200 VU | failed_threshold | 545.47 | 2133.14 | 2175.91 | 2559.29 | 249.99 | 75782 | 18945 | 25.00% |

Interpretation: `completed` means the scenario met k6 thresholds. `failed_threshold` rows still contain valid k6 measurements, but the configured error-rate or latency threshold was crossed and should be discussed as a load-limit finding.

## 4. Concurrent CDSS Upload
| Concurrent uploads | Total | Success | Error rate | Avg initial ms | Avg queue ms | Avg inference ms | Avg end-to-end ms | p95 end-to-end ms | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 2 | 2 | 0.00% | 62.95 | 4.50 | 5.50 | 567.16 | 570.27 | completed |
| 5 | 5 | 5 | 0.00% | 58.98 | 8.00 | 7.00 | 562.85 | 568.52 | completed |
| 10 | 10 | 9 | 10.00% | 77.99 | 9.44 | 8.56 | 580.92 | 595.87 | completed_with_errors |

Interpretation: concurrent CDSS upload behavior should be inferred from queue and end-to-end latency growth once service runs are available.

## 5. Updated Testability Table
| Component | Tool | Before tests | After tests | Passed | Failed | Before line coverage | After line coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aplikasi mobile | Jest | 18 | 23 | 23 | 0 | 1.15% | 2.44% |
| Backend - Consultation / Chat | Node.js test runner | 31 | 36 | 36 | 0 | 19.61% | 20.47% |

Interpretation: additional service-level tests increased mobile line coverage from 1.15% to 2.44% and chat line coverage from 19.61% to 20.47% without requiring device hardware or external Twilio credentials.

## 6. Updated Maintainability Table
| Component | ESLint files | ESLint errors | ESLint warnings |
| --- | --- | --- | --- |
| Backend | 148 | 0 | 162 |
| Web application | 407 | 62 | 1921 |
| Mobile application | 139 | 0 | 1017 |

| CDSS metric | Value |
| --- | --- |
| Radon average cyclomatic complexity | 7.75 |
| Radon max cyclomatic complexity | 48 |
| Radon average maintainability index | 17.78 |
| Highest complexity blocks | convert_study_to_vti (48, F); scan_dicom_series (43, F) |

Interpretation: ESLint web errors decreased from 69 to 62 after safe mechanical fixes. Remaining web errors are duplicate translation keys and unreachable code that need separate review to avoid changing UI/business behavior.
