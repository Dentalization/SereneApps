# Paper-Ready Evidence Tables

Generated at: 2026-06-17T05:55:34.079Z

## 1. CDSS Latency n>=30 Result Table
| Status | Requested n | Successful n | Failed n | Evidence |
| --- | --- | --- | --- | --- |
| not_run | 30 | 0 | 0 | paper-evidence/cdss_latency/cdss_latency_results.csv |

## 2. CDSS Latency Summary Statistics
| Metric | n | Mean ms | Median ms | Min ms | Max ms | SD ms | p90 ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| End-to-end processing | 0 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

Interpretation: No successful CDSS latency rows were generated because the backend and Python CDSS services were unavailable during this run.

## 3. Load Testing 100/200 VU
| Scenario | Status | Avg ms | p90 ms | p95 ms | p99 ms | Throughput req/s | Total requests | Failed requests | Error rate / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 VU | not_run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Backend unavailable at http://localhost:4000/health: {"ok":false,"error":"fetch failed"} |
| 200 VU | not_run | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Backend unavailable at http://localhost:4000/health: {"ok":false,"error":"fetch failed"} |

Interpretation: 100/200 VU results should be inserted only when status is `completed`. A `not_run` row documents missing local services and is not performance evidence.

## 4. Concurrent CDSS Upload
| Concurrent uploads | Total | Success | Error rate | Avg initial ms | Avg queue ms | Avg inference ms | Avg end-to-end ms | p95 end-to-end ms | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A | not_run |
| 5 | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A | not_run |
| 10 | 0 | 0 | N/A | N/A | N/A | N/A | N/A | N/A | not_run |

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
