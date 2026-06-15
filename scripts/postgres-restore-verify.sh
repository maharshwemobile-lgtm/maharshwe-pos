#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DUMP_FILE="${1:-${BACKUP_DIR:-/var/backups/mahar-pos/postgres}/latest.dump}"

for command_name in pg_restore sha256sum stat; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 1
  }
done

[[ -f "$DUMP_FILE" ]] || {
  echo "Backup file not found: $DUMP_FILE" >&2
  exit 1
}

pg_restore --list "$DUMP_FILE" >/dev/null
SIZE_BYTES="$(stat -c '%s' "$DUMP_FILE")"
SHA256="$(sha256sum "$DUMP_FILE" | awk '{print $1}')"
MANIFEST_FILE="${DUMP_FILE%.dump}.json"

if [[ -f "$MANIFEST_FILE" ]]; then
  EXPECTED_SHA="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(data.sha256||'')" "$MANIFEST_FILE")"
  if [[ -n "$EXPECTED_SHA" && "$EXPECTED_SHA" != "$SHA256" ]]; then
    echo "SHA256 mismatch" >&2
    echo "Expected: $EXPECTED_SHA" >&2
    echo "Actual:   $SHA256" >&2
    exit 1
  fi
fi

RESTORE_TEST_STATUS="STRUCTURAL_ONLY"

if [[ -n "${RESTORE_VERIFY_DATABASE_URL:-}" ]]; then
  : "${DATABASE_URL:?DATABASE_URL is required when RESTORE_VERIFY_DATABASE_URL is set}"
  if [[ "$RESTORE_VERIFY_DATABASE_URL" == "$DATABASE_URL" ]]; then
    echo "RESTORE_VERIFY_DATABASE_URL must never equal DATABASE_URL" >&2
    exit 1
  fi

  command -v psql >/dev/null 2>&1 || {
    echo "Missing required command: psql" >&2
    exit 1
  }

  pg_restore \
    --clean \
    --if-exists \
    --exit-on-error \
    --no-owner \
    --no-privileges \
    --dbname="$RESTORE_VERIFY_DATABASE_URL" \
    "$DUMP_FILE"

  psql "$RESTORE_VERIFY_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" >/dev/null
  RESTORE_TEST_STATUS="FULL_RESTORE_PASSED"
fi

echo "Restore verification passed"
echo "File: $DUMP_FILE"
echo "Size: $SIZE_BYTES bytes"
echo "SHA256: $SHA256"
echo "Mode: $RESTORE_TEST_STATUS"
