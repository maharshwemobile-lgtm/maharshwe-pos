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

: "${DATABASE_URL:?DATABASE_URL is required}"

if [[ "$DATABASE_URL" != postgresql://* && "$DATABASE_URL" != postgres://* ]]; then
  echo "DATABASE_URL must point to PostgreSQL" >&2
  exit 1
fi

for command_name in pg_dump pg_restore sha256sum stat find node; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 1
  }
done

BACKUP_DIR="${BACKUP_DIR:-/var/backups/mahar-pos/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_MIN_BYTES="${BACKUP_MIN_BYTES:-1024}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_NAME="mahar-pos-${TIMESTAMP}"
DUMP_FILE="$BACKUP_DIR/${BACKUP_NAME}.dump"
MANIFEST_FILE="$BACKUP_DIR/${BACKUP_NAME}.json"
TMP_DUMP="${DUMP_FILE}.tmp"
TMP_MANIFEST="${MANIFEST_FILE}.tmp"

cleanup() {
  rm -f "$TMP_DUMP" "$TMP_MANIFEST"
}
trap cleanup EXIT

install -d -m 700 "$BACKUP_DIR"

pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$TMP_DUMP" \
  "$DATABASE_URL"

pg_restore --list "$TMP_DUMP" >/dev/null

SIZE_BYTES="$(stat -c '%s' "$TMP_DUMP")"
if (( SIZE_BYTES < BACKUP_MIN_BYTES )); then
  echo "Backup is unexpectedly small: ${SIZE_BYTES} bytes" >&2
  exit 1
fi

SHA256="$(sha256sum "$TMP_DUMP" | awk '{print $1}')"
mv "$TMP_DUMP" "$DUMP_FILE"
chmod 600 "$DUMP_FILE"

BACKUP_NAME="$BACKUP_NAME" \
DUMP_FILE="$DUMP_FILE" \
SIZE_BYTES="$SIZE_BYTES" \
SHA256="$SHA256" \
BACKUP_RETENTION_DAYS="$BACKUP_RETENTION_DAYS" \
node <<'NODE' > "$TMP_MANIFEST"
const manifest = {
  version: 1,
  status: 'VERIFIED',
  createdAt: new Date().toISOString(),
  name: process.env.BACKUP_NAME,
  file: process.env.DUMP_FILE,
  format: 'PostgreSQL custom archive',
  sizeBytes: Number(process.env.SIZE_BYTES),
  sha256: process.env.SHA256,
  retentionDays: Number(process.env.BACKUP_RETENTION_DAYS),
  structuralVerification: 'pg_restore --list passed',
};
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
NODE

mv "$TMP_MANIFEST" "$MANIFEST_FILE"
chmod 600 "$MANIFEST_FILE"
ln -sfn "$(basename "$DUMP_FILE")" "$BACKUP_DIR/latest.dump"
ln -sfn "$(basename "$MANIFEST_FILE")" "$BACKUP_DIR/latest.json"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mahar-pos-*.dump' -mtime "+$BACKUP_RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'mahar-pos-*.json' -mtime "+$BACKUP_RETENTION_DAYS" -delete

echo "Backup verified: $DUMP_FILE"
echo "SHA256: $SHA256"
echo "Size: $SIZE_BYTES bytes"
