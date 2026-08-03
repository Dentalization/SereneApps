#!/usr/bin/env bash
# Repeated measurement runner for the six SereneApps core API k6 scripts.
# It deliberately never prints credentials, tokens, or request headers.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
RESULTS_DIR="${RESULTS_DIR:-$SCRIPT_DIR/results/repeated}"
SUMMARY_DIR="${SUMMARY_DIR:-$SCRIPT_DIR/summary}"
ANALYZER="$SCRIPT_DIR/analyze_repeated.py"
LOG_FILE="$RESULTS_DIR/run_log.txt"
MANIFEST_FILE="$RESULTS_DIR/manifest.csv"

RUNS="${RUNS:-3}"
VUS="${VUS:-10}"
DURATION="${DURATION:-3m}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-600}"
BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_PREFIX="${API_PREFIX:-/v1}"
DRY_RUN="${DRY_RUN:-0}"
FORCE="${FORCE:-0}"
ALLOW_REMOTE_TARGET="${ALLOW_REMOTE_TARGET:-0}"
K6_BIN="${K6_BIN:-k6}"
CURL_BIN="${CURL_BIN:-curl}"
SAMPLE_IMAGE_PATH="${SAMPLE_IMAGE_PATH:-$SCRIPT_DIR/fixtures/sample-dental.jpg}"

# Use the variable names already supported by scripts/utils.js. TEST_EMAIL and
# TEST_PASSWORD remain compatible aliases for older invocations.
REPEAT_PATIENT_EMAIL="${PATIENT_EMAIL:-${TEST_EMAIL:-}}"
REPEAT_PATIENT_PASSWORD="${PATIENT_PASSWORD:-${TEST_PASSWORD:-}}"
REPEAT_DENTIST_EMAIL="${DENTIST_EMAIL:-}"
REPEAT_DENTIST_PASSWORD="${DENTIST_PASSWORD:-${TEST_PASSWORD:-}}"
REPEAT_DENTIST_PROFILE_ID="${DENTIST_PROFILE_ID:-${DENTIST_ID:-}}"

ENDPOINTS=(
  "01-login.k6.js|Login pengguna|01-login-summary.json"
  "02-fetch-appointments.k6.js|Daftar appointment|02-appointment-list-summary.json"
  "03-create-appointment.k6.js|Membuat appointment|03-appointment-create-summary.json"
  "04-fetch-consultation-detail.k6.js|Detail konsultasi|04-consultation-detail-summary.json"
  "05-send-chat-message.k6.js|Pesan konsultasi|05-consultation-message-summary.json"
  "06-upload-attachment.k6.js|Unggah citra gigi|06-image-upload-summary.json"
)

timestamp() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 2
}

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
}

require_positive_integer() {
  local value="$1" name="$2"
  [[ "$value" =~ ^[0-9]+$ ]] && (( value > 0 )) || die "$name harus berupa bilangan bulat positif."
}

require_nonnegative_integer() {
  local value="$1" name="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || die "$name harus berupa bilangan bulat nol atau positif."
}

require_boolean() {
  local value="$1" name="$2"
  [[ "$value" == '0' || "$value" == '1' ]] || die "$name harus bernilai 0 atau 1."
}

base_host() {
  local authority="${BASE_URL#*://}"
  authority="${authority%%/*}"
  authority="${authority##*@}"
  if [[ "$authority" == \[*\]* ]]; then
    printf '%s\n' "${authority#\[}" | sed 's/]\(:[0-9]*\)\?$//'
  else
    printf '%s\n' "${authority%%:*}"
  fi
}

is_local_target() {
  local host
  host="$(base_host)"
  [[ "$host" == 'localhost' || "$host" == '127.0.0.1' || "$host" == '::1' ]]
}

json_string() {
  # Send a value through stdin, never as a Python command-line argument.
  python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()))'
}

credential_payload() {
  local email="$1" password="$2"
  local escaped_email escaped_password
  escaped_email="$(printf '%s' "$email" | json_string)"
  escaped_password="$(printf '%s' "$password" | json_string)"
  printf '{"email":%s,"password":%s}' "$escaped_email" "$escaped_password"
}

verify_login() {
  local role="$1" email="$2" password="$3" payload response_code
  payload="$(credential_payload "$email" "$password")"
  set +e
  response_code=$(printf '%s' "$payload" | "$CURL_BIN" \
    --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 5 --max-time 15 \
    --header 'Content-Type: application/json' \
    --data-binary @- \
    "$BASE_URL$API_PREFIX/auth/login" 2>/dev/null)
  local curl_status=$?
  set -e
  if (( curl_status != 0 )) || [[ "$response_code" != '200' ]]; then
    die "Login preflight untuk ${role} gagal (HTTP ${response_code:-000}). Periksa akun uji tanpa mencetak nilainya."
  fi
  log "✓ Login preflight ${role}: HTTP 200"
}

summary_state() {
  local summary_file="$1"
  if [[ ! -e "$summary_file" ]]; then
    printf 'missing\n'
  elif python3 "$ANALYZER" --validate-file "$summary_file" >/dev/null 2>&1; then
    printf 'valid\n'
  else
    printf 'invalid\n'
  fi
}

append_manifest() {
  local endpoint="$1" run="$2" status="$3" exit_code="$4" started="$5" finished="$6" source_file="$7"
  printf '%s,%s,%s,%s,%s,%s,%s\n' \
    "$endpoint" "$run" "$status" "$exit_code" "$started" "$finished" "$source_file" >> "$MANIFEST_FILE"
}

cooldown() {
  local remaining="$1" next_run="$2" label="$3"
  log "⏳ Cooldown ${remaining}s sebelum Run ${next_run} — ${label}."
  while (( remaining > 0 )); do
    log "   ${remaining} detik tersisa..."
    if (( remaining >= 60 )); then
      sleep 60
      remaining=$(( remaining - 60 ))
    else
      sleep "$remaining"
      remaining=0
    fi
  done
}

require_positive_integer "$RUNS" 'RUNS'
require_positive_integer "$VUS" 'VUS'
require_nonnegative_integer "$COOLDOWN_SECONDS" 'COOLDOWN_SECONDS'
require_boolean "$DRY_RUN" 'DRY_RUN'
require_boolean "$FORCE" 'FORCE'
require_boolean "$ALLOW_REMOTE_TARGET" 'ALLOW_REMOTE_TARGET'
[[ "$RUNS" == '3' ]] || die 'RUNS harus bernilai 3 karena desain pengukuran ini adalah n=3.'
[[ "$DURATION" =~ ^[0-9]+([.][0-9]+)?(ms|s|m|h)$ ]] || die 'DURATION harus seperti 3m, 15s, atau 500ms.'
[[ "$BASE_URL" =~ ^https?://[^/]+/?$ ]] || die 'BASE_URL harus berupa origin HTTP(S), misalnya http://127.0.0.1:4000.'
BASE_URL="${BASE_URL%/}"

if ! is_local_target && [[ "$ALLOW_REMOTE_TARGET" != '1' ]]; then
  die 'Target non-lokal ditolak. Set ALLOW_REMOTE_TARGET=1 hanya setelah persetujuan eksplisit.'
fi

for command in "$K6_BIN" python3 "$CURL_BIN"; do
  command -v "$command" >/dev/null 2>&1 || die "Command tidak ditemukan: $command"
done
[[ -f "$ANALYZER" ]] || die "Analyzer tidak ditemukan: $ANALYZER"
[[ -f "$SAMPLE_IMAGE_PATH" ]] || die "File citra uji tidak ditemukan: $SAMPLE_IMAGE_PATH"
for endpoint in "${ENDPOINTS[@]}"; do
  script_file="${endpoint%%|*}"
  [[ -f "$SCRIPTS_DIR/$script_file" ]] || die "Skrip k6 tidak ditemukan: $SCRIPTS_DIR/$script_file"
done

[[ -n "$REPEAT_PATIENT_EMAIL" ]] || die 'PATIENT_EMAIL atau TEST_EMAIL wajib diisi.'
[[ -n "$REPEAT_PATIENT_PASSWORD" ]] || die 'PATIENT_PASSWORD atau TEST_PASSWORD wajib diisi.'
[[ -n "$REPEAT_DENTIST_EMAIL" ]] || die 'DENTIST_EMAIL wajib diisi.'
[[ -n "$REPEAT_DENTIST_PASSWORD" ]] || die 'DENTIST_PASSWORD atau TEST_PASSWORD wajib diisi.'
[[ -n "$REPEAT_DENTIST_PROFILE_ID" ]] || die 'DENTIST_PROFILE_ID atau DENTIST_ID wajib diisi.'

# Export only to k6's child process environment. No secret is placed in a k6
# command argument, a result file, the manifest, or the runner output.
export PATIENT_EMAIL="$REPEAT_PATIENT_EMAIL"
export PATIENT_PASSWORD="$REPEAT_PATIENT_PASSWORD"
export DENTIST_EMAIL="$REPEAT_DENTIST_EMAIL"
export DENTIST_PASSWORD="$REPEAT_DENTIST_PASSWORD"
export DENTIST_PROFILE_ID="$REPEAT_DENTIST_PROFILE_ID"
export BASE_URL API_PREFIX VUS DURATION SAMPLE_IMAGE_PATH

if [[ "$DRY_RUN" == '1' ]]; then
  printf '%s\n' '=== DRY RUN — tidak ada request atau file hasil yang dibuat ==='
  printf 'Target: %s | VUS: %s | Durasi: %s | Run: %s | Cooldown: %ss\n' \
    "$BASE_URL$API_PREFIX" "$VUS" "$DURATION" "$RUNS" "$COOLDOWN_SECONDS"
  for endpoint in "${ENDPOINTS[@]}"; do
    script_file="${endpoint%%|*}"
    rest="${endpoint#*|}"
    label="${rest%%|*}"
    summary_name="${rest##*|}"
    for run in $(seq 1 "$RUNS"); do
      if (( run > 1 )); then
        printf '  cooldown %ss sebelum Run %s — %s\n' "$COOLDOWN_SECONDS" "$run" "$label"
      fi
      output_file="$RESULTS_DIR/run_$run/$summary_name"
      printf 'Run %s/%s — %s\n' "$run" "$RUNS" "$label"
      if [[ -e "$output_file" && "$FORCE" != '1' ]]; then
        printf '  tidak akan menimpa hasil yang sudah ada: %s (gunakan FORCE=1 untuk menimpa)\n' "$output_file"
      else
        printf '  k6 run --summary-trend-stats avg,p(95),count %s  # kredensial dari environment\n' "$script_file"
      fi
    done
  done
  exit 0
fi

mkdir -p "$RESULTS_DIR" "$SUMMARY_DIR"
if [[ ! -f "$MANIFEST_FILE" ]]; then
  printf 'endpoint,run,status,k6_exit_code,started_at,finished_at,source_file\n' > "$MANIFEST_FILE"
fi
touch "$LOG_FILE"

log '====== SereneApps API Inti Repeated Measurement ======'
log "Mulai: $(timestamp)"
log "Target lokal: $BASE_URL$API_PREFIX | VUS: $VUS | Durasi: $DURATION | Run: $RUNS"
log "K6: $($K6_BIN version 2>&1 | head -n 1)"

log "Memeriksa layanan lokal: $BASE_URL/health"
if ! "$CURL_BIN" --fail --silent --show-error --connect-timeout 5 --max-time 15 --output /dev/null "$BASE_URL/health"; then
  die "Layanan lokal tidak siap di $BASE_URL/health. Tidak ada pengujian dijalankan."
fi
log '✓ Health check: HTTP 2xx'
verify_login 'pasien' "$REPEAT_PATIENT_EMAIL" "$REPEAT_PATIENT_PASSWORD"
verify_login 'dokter' "$REPEAT_DENTIST_EMAIL" "$REPEAT_DENTIST_PASSWORD"

TECHNICAL_FAILURES=0
THRESHOLD_FAILURES=0

for endpoint in "${ENDPOINTS[@]}"; do
  script_file="${endpoint%%|*}"
  rest="${endpoint#*|}"
  label="${rest%%|*}"
  summary_name="${rest##*|}"
  for run in $(seq 1 "$RUNS"); do
    run_dir="$RESULTS_DIR/run_$run"
    mkdir -p "$run_dir"
    output_file="$run_dir/$summary_name"
    state="$(summary_state "$output_file")"

    log "Run $run/$RUNS — $label"
    if [[ "$state" == 'valid' && "$FORCE" != '1' ]]; then
      log "  ↷ Hasil valid sudah ada; dilewati: $output_file"
      # Keep the original completed/threshold_failed manifest row, including
      # its timestamp. A resume action is recorded in run_log.txt only.
      continue
    fi
    if [[ "$state" == 'invalid' && "$FORCE" != '1' ]]; then
      log "  ✗ Hasil yang ada tidak valid dan tidak akan ditimpa tanpa FORCE=1: $output_file"
      append_manifest "$summary_name" "$run" 'existing_invalid' 'NA' "$(timestamp)" "$(timestamp)" "$output_file"
      TECHNICAL_FAILURES=$((TECHNICAL_FAILURES + 1))
      continue
    fi

    if (( run > 1 )); then
      cooldown "$COOLDOWN_SECONDS" "$run" "$label"
    fi

    started_at="$(timestamp)"
    export SUMMARY_FILE="$output_file"
    set +e
    "$K6_BIN" run --summary-trend-stats 'avg,p(95),count' "$SCRIPTS_DIR/$script_file" 2>&1 | tee -a "$LOG_FILE"
    k6_exit_code=${PIPESTATUS[0]}
    set -e
    finished_at="$(timestamp)"

    if ! python3 "$ANALYZER" --validate-file "$output_file" >/dev/null 2>&1; then
      log "  ✗ Ringkasan k6 hilang, rusak, tidak lengkap, atau mengandung data sensitif: $output_file"
      append_manifest "$summary_name" "$run" 'invalid_result' "$k6_exit_code" "$started_at" "$finished_at" "$output_file"
      TECHNICAL_FAILURES=$((TECHNICAL_FAILURES + 1))
      continue
    fi

    if (( k6_exit_code == 0 )); then
      status='completed'
      log "  ✓ Selesai: $output_file"
    elif (( k6_exit_code == 99 )); then
      status='threshold_failed'
      THRESHOLD_FAILURES=$((THRESHOLD_FAILURES + 1))
      log "  ⚠ Threshold k6 tidak terpenuhi; hasil tetap disimpan untuk analisis."
    else
      status='k6_failed'
      TECHNICAL_FAILURES=$((TECHNICAL_FAILURES + 1))
      log "  ✗ k6 berakhir dengan status $k6_exit_code; hasil ditandai gagal teknis."
    fi
    append_manifest "$summary_name" "$run" "$status" "$k6_exit_code" "$started_at" "$finished_at" "$output_file"

  done
done

log 'Menganalisis tiga run per endpoint...'
set +e
python3 "$ANALYZER" \
  --results-dir "$RESULTS_DIR" \
  --summary-dir "$SUMMARY_DIR" \
  --manifest "$MANIFEST_FILE" \
  --vus "$VUS" \
  --duration "$DURATION" \
  2>&1 | tee -a "$LOG_FILE"
analyzer_exit_code=${PIPESTATUS[0]}
set -e

if (( analyzer_exit_code != 0 || TECHNICAL_FAILURES > 0 )); then
  log "✗ Analisis belum lengkap. Perbaiki hasil invalid lalu jalankan ulang; hasil valid akan dilewati."
  exit 1
fi
if (( THRESHOLD_FAILURES > 0 )); then
  log "⚠ Ada $THRESHOLD_FAILURES run dengan threshold gagal. Ini dicatat sebagai hasil penelitian, bukan kegagalan runner."
fi
log '✓ Semua hasil tersedia dan laporan n=3 telah dibuat.'
