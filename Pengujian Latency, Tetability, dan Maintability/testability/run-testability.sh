#!/usr/bin/env bash

set -u -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
COVERAGE_DIR="${SCRIPT_DIR}/coverage"
REPORTS_DIR="${SCRIPT_DIR}/reports"
GENERATOR="${SCRIPT_DIR}/generate-table-4-7.js"

mkdir -p "${RESULTS_DIR}" "${COVERAGE_DIR}" "${REPORTS_DIR}"
mkdir -p \
  "${COVERAGE_DIR}/backend-auth" \
  "${COVERAGE_DIR}/backend-appointment" \
  "${COVERAGE_DIR}/backend-consultation-chat" \
  "${COVERAGE_DIR}/backend-cdss" \
  "${COVERAGE_DIR}/web" \
  "${COVERAGE_DIR}/mobile"

run_node_component() {
  local component_id="$1"
  local component="$2"
  local tool="$3"
  local cwd="$4"
  local summary_file="$5"
  local coverage_subdir="$6"
  shift 6

  node "${GENERATOR}" run-node \
    --component-id "${component_id}" \
    --component "${component}" \
    --tool "${tool}" \
    --cwd "${cwd}" \
    --summary "${RESULTS_DIR}/${summary_file}" \
    --coverage-dir "${COVERAGE_DIR}/${coverage_subdir}" \
    -- "$@"
}

echo "== Backend - Authentication =="
run_node_component \
  "backend-auth" \
  "Backend - Authentication" \
  "Node.js test runner" \
  "${ROOT_DIR}/backend" \
  "backend-auth-summary.json" \
  "backend-auth" \
  node --test --experimental-test-coverage --test-coverage-exclude=tests/** --test-concurrency=1 \
    tests/auth.access.test.js \
    tests/otp.service.test.js \
    tests/otp.routes.test.js

echo "== Backend - Appointment =="
run_node_component \
  "backend-appointment" \
  "Backend - Appointment" \
  "Node.js test runner" \
  "${ROOT_DIR}/backend" \
  "backend-appointment-summary.json" \
  "backend-appointment" \
  node --test --experimental-test-coverage --test-coverage-exclude=tests/** --test-concurrency=1 \
    tests/appointments.week2.test.js \
    tests/patient_journey.test.js \
    tests/treatmentPlans.continuity.test.js

echo "== Backend - Consultation / Chat =="
run_node_component \
  "backend-consultation-chat" \
  "Backend - Consultation / Chat" \
  "Node.js test runner" \
  "${ROOT_DIR}/backend" \
  "backend-consultation-chat-summary.json" \
  "backend-consultation-chat" \
  env TWILIO_MOCK_MODE=false node --test --experimental-test-coverage --test-coverage-exclude=tests/** --test-concurrency=1 \
    tests/communications.attachmentConfig.test.js \
    tests/communications.attachments.test.js \
    tests/communications.clinicObserver.test.js \
    tests/communications.clinicalSummary.test.js \
    tests/communications.contract.test.js \
    tests/communications.deprecation.test.js \
    tests/communications.diagnostics.test.js \
    tests/communications.participants.test.js \
    tests/communications.tokenEnvelope.test.js \
    tests/communications.webhookReplay.test.js

echo "== Backend - CDSS Integration =="
run_node_component \
  "backend-cdss" \
  "Backend - CDSS Integration" \
  "Node.js test runner" \
  "${ROOT_DIR}/backend" \
  "backend-cdss-summary.json" \
  "backend-cdss" \
  node --test --experimental-test-coverage --test-coverage-exclude=tests/** --test-concurrency=1 \
    tests/deepDentalProxy.test.js \
    tests/verifiedCaseWorkspace.export.test.js \
    tests/verifiedCaseWorkspace.hardening.test.js \
    tests/verifiedCaseWorkspace.migration.test.js \
    tests/verifiedCaseWorkspace.postgres.test.js \
    tests/verifiedCaseWorkspace.productionGuard.test.js \
    tests/verifiedCaseWorkspace.routes.test.js \
    tests/verifiedCaseWorkspace.service.test.js \
    tests/xcore.annotation.validation.test.js

echo "== Aplikasi web =="
run_node_component \
  "web" \
  "Aplikasi web" \
  "Node.js test runner" \
  "${ROOT_DIR}/web" \
  "web-summary.json" \
  "web" \
  node --test --experimental-test-coverage --test-coverage-exclude=tests/** tests/*.test.mjs

echo "== Aplikasi mobile =="
if node -e "const p=require('${ROOT_DIR}/mobile/package.json'); process.exit(p.scripts && p.scripts.test ? 0 : 1)"; then
  run_node_component \
    "mobile" \
    "Aplikasi mobile" \
    "Jest" \
    "${ROOT_DIR}/mobile" \
    "mobile-summary.json" \
    "mobile" \
    npm test -- --coverage
else
  node "${GENERATOR}" record-missing \
    --component-id "mobile" \
    --component "Aplikasi mobile" \
    --tool "Jest (not configured)" \
    --cwd "${ROOT_DIR}/mobile" \
    --summary "${RESULTS_DIR}/mobile-summary.json" \
    --coverage-dir "${COVERAGE_DIR}/mobile" \
    --reason "mobile/package.json tidak memiliki script test dan tidak ditemukan file *.test.js/*.spec.js; hasil 0 dicatat dari kondisi konfigurasi aktual, bukan angka manual."
fi

echo "== Generate Table 4.7 =="
node "${GENERATOR}" build-report \
  --results-dir "${RESULTS_DIR}" \
  --reports-dir "${REPORTS_DIR}"

echo "Report generated:"
echo "- ${REPORTS_DIR}/table-4-7-testability.md"
echo "- ${REPORTS_DIR}/table-4-7-testability.csv"
echo "- ${REPORTS_DIR}/testability-raw-summary.json"
