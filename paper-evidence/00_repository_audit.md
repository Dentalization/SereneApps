# Repository Audit for Paper Evidence

Generated at: 2026-06-17, local workspace `/Users/adrianhalim/SereneApps`.

## Detected Folders

| Component | Folder | Evidence |
|---|---|---|
| Backend service | `backend/` | Express/Node service, `backend/package.json`, `backend/src/server.js` |
| Web application | `web/` | Vite React app, `web/package.json` |
| Mobile application | `mobile/` | Expo React Native app, `mobile/package.json` |
| CDSS/X-Core Python service | `backend/python_service/` | FastAPI service, `backend/python_service/main.py` |
| Existing thesis latency artifacts | `Pengujian Latency, Tetability, dan Maintability/latency/` | k6 scripts and prior latency summaries |
| Existing thesis testability artifacts | `Pengujian Latency, Tetability, dan Maintability/testability/` | component summaries and coverage reports |
| Existing thesis maintainability artifacts | `Pengujian Latency, Tetability, dan Maintability/maintainability/` | ESLint, Radon, Sonar summary files |
| New paper evidence artifacts | `paper-evidence/` | scripts, synthetic fixtures, generated summaries |

## Available Commands

| Area | Command |
|---|---|
| Backend start | `cd backend && npm start` |
| Backend tests | `cd backend && npm test` |
| Backend consultation/chat focused tests | `cd backend && node --test --test-concurrency=1 tests/communications*.test.js` |
| Web start | `cd web && npm start` |
| Web tests | `cd web && npm test` |
| Mobile start | `cd mobile && npm start` |
| Mobile Jest coverage | `cd mobile && npm test -- --coverage` |
| CDSS Python service | `cd backend/python_service && uvicorn main:app --host 0.0.0.0 --port 8000` |
| Existing load test | `cd "Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna" && bash run-load-by-vu.sh` |
| New CDSS fixtures | `node paper-evidence/scripts/generate-synthetic-dental-fixtures.cjs --count 30` |
| New CDSS latency | `node paper-evidence/scripts/xcore-cdss-benchmark.cjs latency --runs 30` |
| New CDSS concurrent upload | `node paper-evidence/scripts/xcore-cdss-benchmark.cjs concurrent --concurrency 2,5,10` |
| New k6 100/200 VU runner | `node paper-evidence/scripts/run-k6-load-tests.cjs --vus 100,200 --duration 5m` |
| ESLint maintainability | `npm run maintainability:eslint` |
| Radon maintainability | `npm run maintainability:radon` |

## Existing k6 Scripts

| File | Purpose |
|---|---|
| `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/01-login.k6.js` | Login latency |
| `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/02-fetch-appointments.k6.js` | Appointment list latency |
| `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/03-create-appointment.k6.js` | Appointment creation latency |
| `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/04-fetch-consultation-detail.k6.js` | Consultation detail latency |
| `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/05-send-chat-message.k6.js` | Chat message latency |
| `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/06-upload-attachment.k6.js` | Chat attachment upload latency |
| `Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js` | Existing mixed endpoint load test up to 50 VU |
| `paper-evidence/load_tests/core_api_high_vu.k6.js` | New high-load 100/200 VU script |

## Existing Test Scripts

| Component | Tool | Command |
|---|---|---|
| Backend | Node.js test runner | `cd backend && npm test` |
| Web | Node.js test runner | `cd web && npm test` |
| Mobile | Jest / jest-expo | `cd mobile && npm test -- --coverage` |
| CDSS Python service | pytest-style Python tests present | `cd backend/python_service && python -m pytest tests` if pytest is installed |

## Existing Static Analysis Configuration

| Tool | Detected configuration |
|---|---|
| SonarCloud/SonarQube | `sonar-project.properties`, `.github/workflows/sonarqube-maintainability.yml` |
| ESLint backend | `backend/eslint.config.cjs`, `backend/package.json` `lint:report` |
| ESLint web | `web/eslint.config.cjs`, `web/package.json` `lint:report` |
| ESLint mobile | `mobile/eslint.config.cjs`, `mobile/package.json` `lint:report` |
| Radon CDSS | `scripts/maintainability/run-radon-reports.sh` |

## Upload Endpoint and CDSS Flow

| Stage | Location | Behavior |
|---|---|---|
| Dental image/study upload | `POST /v1/x-core/upload` in `backend/src/routes/xCoreRoutes.js` and `backend/src/controllers/xCoreController.js` | Authenticated multipart upload; stores files under `backend/uploads/x-core/`; returns backend response after metadata persistence |
| Python conversion trigger | `POST /convert/{study_id}` in `backend/python_service/main.py` | Starts conversion as a background task and returns `status: converting` |
| Polling endpoint | `GET /status/{study_id}` in `backend/python_service/main.py` | Reports `pending`, `converting`, or `ready` |
| CDSS/X-Core conversion | `convert_study_to_vti()` in `backend/python_service/services/vti_converter.py` | Classifies 2D/3D series, generates thumbnails/JPEGs/VTI volumes, optional heuristic labels, and manifest |
| Benchmark event logging | Backend and Python benchmark log helpers | Writes JSONL event logs only when benchmark headers are present |

## Existing Seed/Test Data

The repository contains historical uploaded X-Core folders under `backend/uploads/x-core/`, but these are not used by the new paper evidence scripts because they may contain real patient imaging data. New scripts generate synthetic dental-like PNG files under `paper-evidence/fixtures/synthetic_dental_images/`.

## Missing Dependencies / Runtime Conditions

| Item | Status |
|---|---|
| k6 | Installed locally as `/opt/homebrew/bin/k6`; version observed: `k6 v2.0.0` |
| Node.js | Installed; version observed: `v22.12.0` |
| npm | Installed; version observed: `10.9.0` |
| Python | Installed; version observed: `Python 3.14.0` |
| Radon | Not found globally during audit; `scripts/maintainability/run-radon-reports.sh` creates `.maintainability-venv` if needed |
| sonar-scanner | Not found globally during audit; GitHub Actions workflow uses the SonarSource scan action |
| Backend local service | Not listening on port 4000 during audit |
| Python CDSS local service | Not listening on port 8000 during audit |

## Assumptions

- Experiments use synthetic images only.
- Authenticated benchmarks require non-production test credentials supplied through environment variables.
- CDSS latency metrics for queue, inference/conversion, and persistence depend on benchmark event logs emitted by backend and Python service.
- Load-test results are local-machine evidence unless repeated in a controlled server environment.
- The CDSS/X-Core output is screening/triage and visualization support, not a clinical diagnosis.

## Risks

- The workspace was already dirty before this evidence task, including existing backend/X-Core/web changes and deleted historical result files.
- 100/200 VU load tests can overload a local laptop; failed 200 VU runs should be reported rather than hidden.
- The route file currently enables `XCORE_BENCHMARK_MODE` in code, which is useful for benchmark cleanup but should be reviewed before production deployment.
- Existing translation duplicate-key ESLint errors may require product/content review because changing them can alter visible UI text.
- SonarCloud final metrics still require a real workflow run with valid `sonar.projectKey`, `sonar.organization`, and `SONAR_TOKEN` secret.
