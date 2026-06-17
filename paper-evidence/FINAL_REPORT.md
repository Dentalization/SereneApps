# Final Research Evidence Report

Generated at: 2026-06-17.

## What Was Done

- Audited repository structure, commands, existing test artifacts, k6 scripts, Sonar/ESLint/Radon setup, X-Core upload endpoint, and CDSS processing flow.
- Added reproducible synthetic-image fixture generation for CDSS benchmarking.
- Added CDSS asynchronous latency and concurrent upload benchmark scripts with benchmark-only event extraction.
- Added high-load k6 script and runner for 100/200 VU scenarios.
- Added a technical CDSS/X-Core description grounded in repository code.
- Added 5 mobile Jest tests for appointment API mapping and CDSS/AI analysis sync behavior.
- Added 5 backend consultation/chat service tests for mock Twilio adapter, actor-role handling, observer TTL, and waiting-room ended state.
- Ran mobile Jest coverage and backend chat coverage.
- Ran ESLint and Radon maintainability analysis.
- Applied safe mechanical web ESLint fixes only.
- Generated paper-ready tables and evidence summaries.

## Commands Executed

```bash
node paper-evidence/scripts/generate-synthetic-dental-fixtures.cjs --count 30
TEST_DENTIST_EMAIL='dentist10.clinic2@dentists.com' TEST_DENTIST_PASSWORD='<redacted>' node paper-evidence/scripts/xcore-cdss-benchmark.cjs latency --runs 30
TEST_DENTIST_EMAIL='dentist10.clinic2@dentists.com' TEST_DENTIST_PASSWORD='<redacted>' node paper-evidence/scripts/xcore-cdss-benchmark.cjs concurrent --concurrency 2,5,10
node paper-evidence/scripts/xcore-cdss-benchmark.cjs baseline
TEST_PATIENT_EMAIL='adrianhhhalim@gmail.com' TEST_PATIENT_PASSWORD='<redacted>' node paper-evidence/scripts/run-k6-load-tests.cjs --vus 100,200 --duration 5m

cd mobile
npm test -- --coverage --runInBand
npm test -- --coverage --runInBand --json --outputFile ../paper-evidence/testability/mobile_jest_results.json

cd ../backend
node --test --test-concurrency=1 tests/communications.adapter.mock.test.js tests/communications.testability.extra.test.js
env TWILIO_MOCK_MODE=false node --test --experimental-test-coverage '--test-coverage-exclude=tests/**' --test-concurrency=1 tests/communications*.test.js

cd ..
npm run maintainability:eslint
npm run maintainability:radon
npm run maintainability:validate
node paper-evidence/scripts/generate-paper-ready-tables.cjs
```

## Generated Files

| File | Purpose |
|---|---|
| `paper-evidence/00_repository_audit.md` | Repository audit and assumptions |
| `paper-evidence/.env.example` | Non-secret experiment environment template |
| `paper-evidence/cdss_description.md` | Technical CDSS/X-Core description |
| `paper-evidence/fixtures/synthetic_dental_images/*.png` | Synthetic benchmark images |
| `paper-evidence/cdss_latency/cdss_latency_results.csv` | CDSS latency result CSV |
| `paper-evidence/cdss_latency/cdss_latency_summary.md` | CDSS latency summary |
| `paper-evidence/cdss_concurrent/cdss_concurrent_results.csv` | Concurrent CDSS upload result CSV |
| `paper-evidence/cdss_concurrent/cdss_concurrent_summary.md` | Concurrent upload summary |
| `paper-evidence/cdss_baseline/sync_baseline_not_possible.md` | Sync baseline explanation |
| `paper-evidence/load_tests/core_api_high_vu.k6.js` | 100/200 VU k6 script |
| `paper-evidence/load_tests/load_100vu_summary.json` | 100 VU k6 result summary |
| `paper-evidence/load_tests/load_200vu_summary.json` | 200 VU k6 result summary |
| `paper-evidence/load_tests/load_test_summary.md` | Load-test summary |
| `paper-evidence/testability/mobile_testability_summary.md` | Mobile testability summary |
| `paper-evidence/testability/chat_testability_summary.md` | Chat testability summary |
| `paper-evidence/maintainability/eslint_fix_summary.md` | ESLint cleanup summary |
| `paper-evidence/maintainability/cdss_complexity_refactor_plan.md` | CDSS complexity refactor plan |
| `paper-evidence/paper_ready_tables.md` | Insertable manuscript tables |
| `paper-evidence/FINAL_REPORT.md` | This report |

## New Results

| Area | Result |
|---|---|
| Mobile testability | 23/23 Jest tests passed; line coverage 2.44%, up from 1.15% |
| Backend consultation/chat testability | 36/36 Node.js tests passed; line coverage 20.47%, up from 19.61% |
| Web ESLint | errors reduced from 69 to 62; warnings 1921 |
| Backend ESLint | 0 errors, 162 warnings |
| Mobile ESLint | 0 errors, 1017 warnings |
| CDSS Radon | average CC 7.75, max CC 48, average MI 17.78 |
| CDSS latency n>=30 | 30/30 successful synthetic uploads; mean end-to-end 562.85 ms; p95 653.54 ms |
| CDSS concurrent upload | 2/2 and 5/5 successful; 10 concurrent had 9/10 success and 10.00% error rate |
| k6 100 VU | failed configured threshold; avg 140.12 ms, p95 573.17 ms, p99 776.32 ms, throughput 255.38 req/s, error rate 25.00% |
| k6 200 VU | failed configured threshold; avg 545.47 ms, p95 2175.91 ms, p99 2559.29 ms, throughput 249.99 req/s, error rate 25.00% |

## Code Changes

- Added mobile service tests in `mobile/__tests__/mobile-services.test.js`.
- Added backend chat tests in `backend/tests/communications.adapter.mock.test.js` and `backend/tests/communications.testability.extra.test.js`.
- Added benchmark-only event logging in `backend/python_service/services/vti_converter.py` for 2D image generation and manifest persistence.
- Fixed benchmark event timestamp formatting in `backend/python_service/services/vti_converter.py`.
- Fixed benchmark event log pathing in `backend/src/controllers/xCoreController.js` so backend queue timestamps are traceable from repository-local raw event files.
- Updated k6 load-test reporting so threshold failures preserve full k6 metrics and include p99.
- Added ESLint compatibility shim in `web/eslint.config.cjs`.
- Removed one duplicate unreachable `break` in `web/src/pages/dentist-portal/patient-emr/jquery.odontogram.js`.
- Restored root maintainability scripts under `scripts/maintainability/`.

## Failed or Incomplete Tasks

- k6 100/200 VU scenarios completed measurement but failed the configured `http_req_failed < 5%` threshold. These are valid load-limit findings, not passing performance results.
- Concurrent CDSS at 10 uploads completed measurement with 1 failed upload. The 10.00% error rate should be reported and discussed rather than hidden.
- Synchronous baseline was not implemented as a risky production-route change; the report explains why no direct synchronous route exists.
- SonarCloud final dashboard metrics were not retrieved in this local run; GitHub Actions/SonarCloud still needs to be run with the repository `SONAR_TOKEN` secret.

## Manuscript Claim Updates Needed

- CDSS latency can now be reported for 30 successful synthetic submissions, with the caveat that measurements are from a local environment and synthetic images.
- 100/200 VU load testing should be reported as threshold-failed results because error rate reached 25.00% in both scenarios.
- Update mobile testability from 1.15% to 2.44% line coverage if using this evidence.
- Update consultation/chat testability from 31 to 36 tests and line coverage from 19.61% to 20.47%.
- Describe CDSS/X-Core as visualization, structured extraction, screening, and triage support. Do not claim clinical diagnostic accuracy.
- Report maintainability honestly: web ESLint errors were reduced but not eliminated.

## Recommended Limitations Wording

The CDSS/X-Core evaluation used synthetic benchmark images and measured software execution behavior only. The repository does not include evidence of clinical diagnostic validation or calibrated disease-classification confidence. Therefore, the CDSS output should be interpreted as screening and decision-support information rather than an autonomous diagnostic conclusion.

The high-load benchmarks were executed in a local environment and crossed the configured request-failure threshold. Therefore, the 100/200 VU results should be interpreted as evidence of current load limits under the local test setup, not as passing scalability evidence for production deployment.

## Recommended Future Work Wording

Future work should repeat the CDSS and 100/200 VU experiments in a controlled deployment environment, investigate the high request-failure rate observed in k6, and add deeper instrumentation for external service and database bottlenecks. Maintainability work should prioritize duplicate translation key cleanup, route-level chat authorization tests, and a staged refactor of `scan_dicom_series` and `convert_study_to_vti` after expanding CDSS fixture coverage.

## Readiness Assessment

| Target | Assessment |
|---|---|
| SINTA 1 readiness | Improved; CDSS n>=30 evidence is now available, but load-test threshold failures and low mobile coverage still need careful discussion. |
| Scopus Q3 readiness | More viable with the new reproducible evidence, provided the manuscript reports threshold failures honestly and limits CDSS claims to software support/screening. |
| Scopus Q2 readiness | Still not ready; needs stronger CDSS validation/ablation detail, deeper scalability remediation, and larger maintainability cleanup. |

## Reproduction Checklist

1. Start backend and Python CDSS services.
2. Export non-production test credentials from `paper-evidence/.env.example`.
3. Run CDSS latency and concurrent benchmark commands.
4. Run 100/200 VU k6 command.
5. Run `node paper-evidence/scripts/generate-paper-ready-tables.cjs`.
6. Copy completed rows and threshold-failed rows from `paper-evidence/paper_ready_tables.md` into the manuscript with their status labels intact.
