#!/usr/bin/env bash

set -u -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${ROOT_DIR}/maintainability-results"

mkdir -p "${RESULTS_DIR}"

run_component() {
  local component="$1"
  local directory="$2"

  echo "== ESLint maintainability report: ${component} =="
  (
    cd "${ROOT_DIR}/${directory}" && npm run lint:report
  )
}

run_component "Backend" "backend"
run_component "Web application" "web"
run_component "Mobile application" "mobile"

node "${SCRIPT_DIR}/summarize-eslint-reports.js" \
  --results-dir "${RESULTS_DIR}"

echo "ESLint reports generated in ${RESULTS_DIR}"
