# Phase 6 — Backup & Disaster Recovery

## What is included

- PostgreSQL custom-format archive created by `pg_dump`
- Structural verification with `pg_restore --list`
- SHA-256 checksum stored in a JSON manifest
- Daily systemd timer at 02:30
- Configurable retention cleanup, default 14 days
- Optional full restore drill into a disposable PostgreSQL database
- Authenticated admin API at `GET /api/backups/status`
- Backup & Recovery workspace in the POS sidebar

## Production installation

Install the PostgreSQL client tools:

```bash
apt-get update
apt-get install -y postgresql-client
```

Add these settings to `/opt/maharshwe/maharshwe-pos/.env`:

```bash
BACKUP_DIR=/var/backups/mahar-pos/postgres
BACKUP_RETENTION_DAYS=14
BACKUP_STALE_HOURS=30
BACKUP_MIN_BYTES=1024
```

Install the timer and create the first backup:

```bash
cd /opt/maharshwe/maharshwe-pos
bash scripts/install-backup-timer.sh
```

Check the schedule and logs:

```bash
systemctl list-timers --all | grep mahar-pos-backup
journalctl -u mahar-pos-backup.service -n 100 --no-pager
ls -lah /var/backups/mahar-pos/postgres
```

## Manual verified backup

```bash
cd /opt/maharshwe/maharshwe-pos
npm run backup:postgres
```

## Structural restore verification

```bash
npm run backup:verify
```

This checks the archive structure and SHA-256 checksum without changing a database.

## Full restore drill

Create a disposable database that is not used by production. Set its URL temporarily:

```bash
export RESTORE_VERIFY_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/mahar_pos_restore_test'
npm run backup:verify
unset RESTORE_VERIFY_DATABASE_URL
```

The verification script refuses to continue when `RESTORE_VERIFY_DATABASE_URL` equals the production `DATABASE_URL`.

## Backup status API

After browser login:

```text
GET /api/backups/status
GET /api/backups/status?verify=1
```

The second endpoint recalculates the archive SHA-256 checksum. It can be slower on large backups.

## Recovery rules

- Never restore a test archive directly into the production database.
- Keep `.env` and backup files readable only by root or the backup operator.
- Copy at least one recent verified archive to a different server or object-storage account.
- Perform a full disposable-database restore drill regularly.
- Do not treat an archive as valid unless its manifest says `VERIFIED` and its SHA-256 matches.
