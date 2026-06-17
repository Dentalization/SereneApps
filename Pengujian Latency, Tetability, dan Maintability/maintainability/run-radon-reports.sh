#!/usr/bin/env bash

set -u -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESULTS_DIR="${ROOT_DIR}/maintainability-results"
PYTHON_BIN="${PYTHON:-python3}"
VENV_DIR="${ROOT_DIR}/.maintainability-venv"
CDSS_DIR="${ROOT_DIR}/backend/python_service"
RADON_EXCLUDES="*/tests/*,*/__pycache__/*,*/.venv/*,*/venv/*"

mkdir -p "${RESULTS_DIR}"

RADON_PYTHON="${PYTHON_BIN}"

if ! "${RADON_PYTHON}" -m radon --version >/dev/null 2>&1; then
  echo "Radon is not installed for ${PYTHON_BIN}; creating ${VENV_DIR}."
  if [ ! -x "${VENV_DIR}/bin/python" ]; then
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
  fi
  RADON_PYTHON="${VENV_DIR}/bin/python"
  "${RADON_PYTHON}" -m pip install --upgrade pip >/dev/null
  "${RADON_PYTHON}" -m pip install radon==6.0.1 >/dev/null
fi

echo "== Radon cyclomatic complexity: CDSS Python service =="
"${RADON_PYTHON}" -m radon cc "${CDSS_DIR}" \
  --json \
  --exclude "${RADON_EXCLUDES}" \
  > "${RESULTS_DIR}/radon-cdss-cc.json"

echo "== Radon maintainability index: CDSS Python service =="
"${RADON_PYTHON}" -m radon mi "${CDSS_DIR}" \
  --json \
  --exclude "${RADON_EXCLUDES}" \
  > "${RESULTS_DIR}/radon-cdss-mi.json"

echo "== Radon raw metrics: CDSS Python service =="
"${RADON_PYTHON}" -m radon raw "${CDSS_DIR}" \
  --json \
  --exclude "${RADON_EXCLUDES}" \
  > "${RESULTS_DIR}/radon-cdss-raw.json"

"${RADON_PYTHON}" "${SCRIPT_DIR}/summarize-radon-reports.py" \
  --results-dir "${RESULTS_DIR}"

echo "Radon reports generated in ${RESULTS_DIR}"
