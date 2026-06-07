#!/bin/bash

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

BASE_URL=${BASE_URL:-"http://127.0.0.1:4000"}
API_PREFIX=${API_PREFIX:-"/v1"}

# Configurable durations with defaults
DURATION_BASELINE=${DURATION_BASELINE:-"1m"}
DURATION_LIGHT=${DURATION_LIGHT:-"3m"}
DURATION_MEDIUM=${DURATION_MEDIUM:-"5m"}
DURATION_HIGH=${DURATION_HIGH:-"5m"}

echo "=== Starting SereneApps API Load Tests by Virtual Users ==="
echo "Target: $BASE_URL$API_PREFIX"
echo "=========================================================="

# Create results and reports directory if not exists
mkdir -p "$SCRIPT_DIR/results"
mkdir -p "$SCRIPT_DIR/reports"

# 1. Baseline: 1 VU
echo "Running Baseline Scenario (1 VU, $DURATION_BASELINE)..."
k6 run \
  -e VUS=1 \
  -e DURATION="$DURATION_BASELINE" \
  -e BASE_URL="$BASE_URL" \
  -e API_PREFIX="$API_PREFIX" \
  -e SUMMARY_FILE="$SCRIPT_DIR/results/load-baseline-1vu-summary.json" \
  "$SCRIPT_DIR/scripts/load-by-vu.k6.js"

# 2. Light Load: 10 VUs
echo "Running Light Load Scenario (10 VUs, $DURATION_LIGHT)..."
k6 run \
  -e VUS=10 \
  -e DURATION="$DURATION_LIGHT" \
  -e BASE_URL="$BASE_URL" \
  -e API_PREFIX="$API_PREFIX" \
  -e SUMMARY_FILE="$SCRIPT_DIR/results/load-light-10vu-summary.json" \
  "$SCRIPT_DIR/scripts/load-by-vu.k6.js"

# 3. Medium Load: 25 VUs
echo "Running Medium Load Scenario (25 VUs, $DURATION_MEDIUM)..."
k6 run \
  -e VUS=25 \
  -e DURATION="$DURATION_MEDIUM" \
  -e BASE_URL="$BASE_URL" \
  -e API_PREFIX="$API_PREFIX" \
  -e SUMMARY_FILE="$SCRIPT_DIR/results/load-medium-25vu-summary.json" \
  "$SCRIPT_DIR/scripts/load-by-vu.k6.js"

# 4. High Load: 50 VUs
echo "Running High Load Scenario (50 VUs, $DURATION_HIGH)..."
k6 run \
  -e VUS=50 \
  -e DURATION="$DURATION_HIGH" \
  -e BASE_URL="$BASE_URL" \
  -e API_PREFIX="$API_PREFIX" \
  -e SUMMARY_FILE="$SCRIPT_DIR/results/load-high-50vu-summary.json" \
  "$SCRIPT_DIR/scripts/load-by-vu.k6.js"

echo "=== All Load Tests Completed ==="
echo "Generating reports..."
node "$SCRIPT_DIR/generate-table-4-5.js"
