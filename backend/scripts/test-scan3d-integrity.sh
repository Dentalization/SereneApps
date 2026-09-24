#!/usr/bin/env bash
set -eu
TEST_CLUSTER=$(mktemp -d /private/tmp/serene-scan-test.XXXXXX)
cleanup() {
  pg_ctl -D "$TEST_CLUSTER/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$TEST_CLUSTER"
}
trap cleanup EXIT
initdb -D "$TEST_CLUSTER/data" --auth=trust --no-locale >/dev/null
pg_ctl -D "$TEST_CLUSTER/data" -l "$TEST_CLUSTER/postgres.log" -o "-h 127.0.0.1 -p 55439 -k $TEST_CLUSTER" -w start >/dev/null
createdb -h 127.0.0.1 -p 55439 scan3d_integrity_test
export SCAN3D_TEST_DATABASE_URL="postgresql://$(id -un)@127.0.0.1:55439/scan3d_integrity_test"
export DATABASE_URL="$SCAN3D_TEST_DATABASE_URL"
export SCAN3D_STORAGE_ROOT="$TEST_CLUSTER/private-scans"
cd "$(dirname "$0")/.."
./node_modules/.bin/prisma db push --skip-generate
node --test tests/scan3d.integrity.test.js tests/xcore.3d-scan.routes.test.js
