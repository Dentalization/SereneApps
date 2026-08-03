#!/usr/bin/env bash
# SereneApps k6 repeated-measurement runner.
# Usage: ./run_all.sh
#
# Environment overrides are intentionally available for a controlled dry run:
#   TOTAL_RUNS=1 COOLDOWN_SECONDS=0 DURATION=15s ./run_all.sh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
RESULTS_DIR="${RESULTS_DIR:-$SCRIPT_DIR/results}"
SUMMARY_DIR="${SUMMARY_DIR:-$SCRIPT_DIR/summary}"
LOG_FILE="$RESULTS_DIR/run_log.txt"
TOTAL_RUNS="${TOTAL_RUNS:-3}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-600}"
K6_BIN="${K6_BIN:-k6}"
BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
BASE_URL="${BASE_URL%/}"
HEALTH_URL="${HEALTH_URL:-$BASE_URL/health}"
CURL_BIN="${CURL_BIN:-curl}"
SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-0}"

# Export the resolved URL so k6 receives exactly the same target that the
# preflight check verifies.
export BASE_URL

# The filenames are deliberately kept separate so every VU scenario remains
# traceable in the raw files and in the final statistical report.
SCENARIOS=(
  "test_1vu.js|1 VU"
  "test_10vu.js|10 VU"
  "test_50vu.js|50 VU"
  "test_100vu.js|100 VU"
  "test_200vu.js|200 VU"
)

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
}

require_positive_integer() {
  local value="$1"
  local name="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]] || (( value < 1 )); then
    printf '%s must be a positive integer; received %q\n' "$name" "$value" >&2
    exit 2
  fi
}

require_nonnegative_integer() {
  local value="$1"
  local name="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    printf '%s must be a non-negative integer; received %q\n' "$name" "$value" >&2
    exit 2
  fi
}

cooldown() {
  local remaining="$1"
  local next_run="$2"

  log ""
  log "  ⏳ Cooldown ${remaining}s sebelum Run ${next_run}..."
  while (( remaining > 0 )); do
    log "     ${remaining} detik tersisa..."
    if (( remaining >= 60 )); then
      sleep 60
      ((remaining -= 60))
    else
      sleep "$remaining"
      remaining=0
    fi
  done
  log "  ✅ Cooldown selesai. Melanjutkan ke Run ${next_run}."
}

require_positive_integer "$TOTAL_RUNS" "TOTAL_RUNS"
require_nonnegative_integer "$COOLDOWN_SECONDS" "COOLDOWN_SECONDS"

mkdir -p "$RESULTS_DIR"

if ! command -v "$K6_BIN" >/dev/null 2>&1; then
  printf 'k6 executable not found: %s\nInstall k6 or set K6_BIN to its path.\n' "$K6_BIN" >&2
  exit 127
fi

if ! command -v "$CURL_BIN" >/dev/null 2>&1; then
  printf 'curl executable not found: %s\nInstall curl or set CURL_BIN to its path.\n' "$CURL_BIN" >&2
  exit 127
fi

for scenario in "${SCENARIOS[@]}"; do
  script_file="${scenario%%|*}"
  if [[ ! -f "$SCRIPTS_DIR/$script_file" ]]; then
    printf 'Scenario script not found: %s\n' "$SCRIPTS_DIR/$script_file" >&2
    exit 2
  fi
done

log "====== SereneApps k6 Repeated Measurement ======"
log "Mulai: $(timestamp)"
log "Total run: ${TOTAL_RUNS} | Cooldown: ${COOLDOWN_SECONDS}s"
log "K6: $($K6_BIN version 2>&1 | head -n 1)"
log "================================================"

if [[ "$SKIP_HEALTHCHECK" == "1" ]]; then
  log "⚠ Health-check dilewati (SKIP_HEALTHCHECK=1)."
else
  log "Memeriksa kesiapan backend: ${HEALTH_URL}"
  set +e
  HEALTH_ERROR=$("$CURL_BIN" --fail --silent --show-error --connect-timeout 5 --max-time 10 --output /dev/null "$HEALTH_URL" 2>&1)
  HEALTH_STATUS=$?
  set -e
  if (( HEALTH_STATUS != 0 )); then
    log "❌ Backend tidak siap (${HEALTH_URL}). Tidak ada pengukuran yang dijalankan."
    log "   ${HEALTH_ERROR:-Health-check tidak mendapat respons HTTP 2xx.}"
    log "   Jalankan backend, pastikan curl ${HEALTH_URL} berhasil, lalu ulangi runner."
    exit 3
  fi
  log "✓ Backend siap. Memulai pengukuran."
fi

FAILED_K6_EXECUTIONS=0

for RUN in $(seq 1 "$TOTAL_RUNS"); do
  RUN_DIR="$RESULTS_DIR/run_$RUN"
  mkdir -p "$RUN_DIR"

  log ""
  log "▶ ===== RUN ${RUN} / ${TOTAL_RUNS} ====="
  log "  Waktu mulai: $(timestamp)"

  for scenario in "${SCENARIOS[@]}"; do
    SCRIPT_FILE="${scenario%%|*}"
    VU_LABEL="${scenario##*|}"
    BASE_NAME="${SCRIPT_FILE%.js}"
    OUTPUT_JSON="$RUN_DIR/${BASE_NAME}_run${RUN}.json"
    OUTPUT_CSV="$RUN_DIR/${BASE_NAME}_run${RUN}.csv"
    START_TS=$(date +%s)

    log "  → Menjalankan: ${SCRIPT_FILE} (${VU_LABEL}) ..."

    # handleSummary() in the existing load test writes the compact, aggregate
    # JSON summary. The CSV output is k6's per-sample evidence for audit.
    # A failed threshold makes k6 return non-zero. Keep collecting every
    # planned measurement anyway: the JSON and CSV remain valid evidence and
    # the final report must show which scenarios failed their target.
    set +e
    "$K6_BIN" run \
      --summary-trend-stats 'avg,p(95)' \
      --out "csv=$OUTPUT_CSV" \
      -e "SUMMARY_FILE=$OUTPUT_JSON" \
      "$SCRIPTS_DIR/$SCRIPT_FILE" \
      2>&1 | tee -a "$LOG_FILE"
    K6_STATUS=${PIPESTATUS[0]}
    set -e

    END_TS=$(date +%s)
    DURATION_SECONDS=$((END_TS - START_TS))
    if (( K6_STATUS == 0 )); then
      log "    ✓ Selesai dalam ${DURATION_SECONDS}s → ${OUTPUT_JSON}"
    else
      FAILED_K6_EXECUTIONS=$((FAILED_K6_EXECUTIONS + 1))
      log "    ⚠ k6 selesai dengan status ${K6_STATUS} dalam ${DURATION_SECONDS}s; output tetap disimpan → ${OUTPUT_JSON}"
      if (( K6_STATUS == 107 )); then
        log "    ❌ Script exception (biasanya setup/login gagal). Pengukuran dihentikan agar tidak menghasilkan data invalid."
        exit "$K6_STATUS"
      fi
    fi
  done

  log "  Run ${RUN} selesai: $(timestamp)"

  if (( RUN < TOTAL_RUNS )); then
    cooldown "$COOLDOWN_SECONDS" "$((RUN + 1))"
  fi
done

log ""
log "====== Semua run selesai: $(timestamp) ======"
log "Membuat tabel statistik..."
set +e
python3 "$SCRIPT_DIR/analyze.py" \
  --results-dir "$RESULTS_DIR" \
  --summary-dir "$SUMMARY_DIR" \
  2>&1 | tee -a "$LOG_FILE"
ANALYZE_STATUS=${PIPESTATUS[0]}
set -e

if (( ANALYZE_STATUS != 0 )); then
  log "⚠ Analyzer gagal dengan status ${ANALYZE_STATUS}. Periksa data yang hilang di results/."
  exit "$ANALYZE_STATUS"
fi

if (( FAILED_K6_EXECUTIONS > 0 )); then
  log "⚠ ${FAILED_K6_EXECUTIONS} eksekusi k6 mengembalikan status non-zero (mis. threshold gagal). Laporan tetap dibuat."
  exit 1
fi
