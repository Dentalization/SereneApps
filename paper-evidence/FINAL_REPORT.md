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
WRITE_NOT_RUN=true node paper-evidence/scripts/xcore-cdss-benchmark.cjs latency --runs 30
WRITE_NOT_RUN=true node paper-evidence/scripts/xcore-cdss-benchmark.cjs concurrent --concurrency 2,5,10
node paper-evidence/scripts/xcore-cdss-benchmark.cjs baseline
WRITE_NOT_RUN=true node paper-evidence/scripts/run-k6-load-tests.cjs --vus 100,200 --duration 5m

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
| `paper-evidence/load_tests/load_100vu_summary.json` | 100 VU k6 result or not_run record |
| `paper-evidence/load_tests/load_200vu_summary.json` | 200 VU k6 result or not_run record |
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
| CDSS latency n>=30 | not run because backend and Python CDSS services were unavailable |
| CDSS concurrent upload | not run because backend and Python CDSS services were unavailable |
| k6 100/200 VU | not run because backend service was unavailable |

## Code Changes

- Added mobile service tests in `mobile/__tests__/mobile-services.test.js`.
- Added backend chat tests in `backend/tests/communications.adapter.mock.test.js` and `backend/tests/communications.testability.extra.test.js`.
- Added benchmark-only event logging in `backend/python_service/services/vti_converter.py` for 2D image generation and manifest persistence.
- Fixed benchmark event timestamp formatting in `backend/python_service/services/vti_converter.py`.
- Added ESLint compatibility shim in `web/eslint.config.cjs`.
- Removed one duplicate unreachable `break` in `web/src/pages/dentist-portal/patient-emr/jquery.odontogram.js`.
- Restored root maintainability scripts under `scripts/maintainability/`.

## Failed or Incomplete Tasks

- CDSS latency n>=30 did not produce timing metrics because `http://localhost:4000/health` and `http://localhost:8000/health` were unavailable.
- Concurrent CDSS upload tests did not run for the same reason.
- k6 100/200 VU load tests did not run because the backend was unavailable.
- Synchronous baseline was not implemented as a risky production-route change; the report explains why no direct synchronous route exists.
- SonarCloud final dashboard metrics were not retrieved in this local run; GitHub Actions/SonarCloud still needs to be run with the repository `SONAR_TOKEN` secret.

## Manuscript Claim Updates Needed

- Do not claim CDSS latency n>=30, concurrent upload behavior, or 100/200 VU load performance until the services are running and the scripts are rerun.
- Update mobile testability from 1.15% to 2.44% line coverage if using this evidence.
- Update consultation/chat testability from 31 to 36 tests and line coverage from 19.61% to 20.47%.
- Describe CDSS/X-Core as visualization, structured extraction, screening, and triage support. Do not claim clinical diagnostic accuracy.
- Report maintainability honestly: web ESLint errors were reduced but not eliminated.

## Recommended Limitations Wording

The CDSS/X-Core evaluation used synthetic benchmark images and measured software execution behavior only. The repository does not include evidence of clinical diagnostic validation or calibrated disease-classification confidence. Therefore, the CDSS output should be interpreted as screening and decision-support information rather than an autonomous diagnostic conclusion.

The high-load and CDSS asynchronous benchmarks require backend and Python CDSS services to be running in a controlled environment. In this local run, those services were unavailable, so reproducible scripts and not-run artifacts were generated, but no performance values should be reported from those scenarios yet.

## Recommended Future Work Wording

Future work should repeat CDSS latency with at least 30 successful synthetic submissions, evaluate concurrent upload behavior at 2/5/10 parallel uploads, and run 100/200 VU load tests in a controlled deployment environment. Maintainability work should prioritize duplicate translation key cleanup, route-level chat authorization tests, and a staged refactor of `scan_dicom_series` and `convert_study_to_vti` after expanding CDSS fixture coverage.

## Readiness Assessment

| Target | Assessment |
|---|---|
| SINTA 1 readiness | Improved but not ready until CDSS latency n>=30 and 100/200 VU load results are produced. |
| Scopus Q3 readiness | Potentially viable after rerunning performance experiments and adding clear limitations around CDSS clinical validity. |
| Scopus Q2 readiness | Not yet ready; needs real performance results, stronger CDSS validation/ablation detail, and larger maintainability cleanup. |

## Reproduction Checklist

1. Start backend and Python CDSS services.
2. Export non-production test credentials from `paper-evidence/.env.example`.
3. Run CDSS latency and concurrent benchmark commands.
4. Run 100/200 VU k6 command.
5. Run `node paper-evidence/scripts/generate-paper-ready-tables.cjs`.
6. Copy only completed rows from `paper-evidence/paper_ready_tables.md` into the manuscript.
