#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/opt/maharshwe/maharshwe-pos}"
SUPER_ROOT="${SUPER_ROOT:-/var/www/super.maharshwe.shop}"
DIST_FINAL_JS="$ROOT/dist/grand-admin-final-fix.js"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/var/backups/maharshwe-super-before-grand-admin-final-fix-$STAMP"

cd "$ROOT"
test -f "$DIST_FINAL_JS" || { echo "Missing $DIST_FINAL_JS. Run npm run build first."; exit 1; }
mkdir -p "$BACKUP"
rsync -a "$SUPER_ROOT/" "$BACKUP/"
cp "$DIST_FINAL_JS" "$SUPER_ROOT/grand-admin-final-fix.js"

python3 <<'PY'
from pathlib import Path
index = Path('/var/www/super.maharshwe.shop/index.html')
s = index.read_text()
final = '<script src="/grand-admin-final-fix.js"></script>'
if '/grand-admin-final-fix.js' not in s:
    s = s.replace('</body>', '  ' + final + '\n</body>')
index.write_text(s)
PY

chown -R www-data:www-data "$SUPER_ROOT"
nginx -t
systemctl reload nginx
echo "Backup saved to: $BACKUP"
echo "Final fix deployed"
