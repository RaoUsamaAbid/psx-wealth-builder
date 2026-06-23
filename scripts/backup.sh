#!/usr/bin/env bash
# MongoDB backup via mongodump. Usage: MONGODB_URI=... ./scripts/backup.sh [outdir]
# MongoDB Atlas also takes managed snapshots; this is for ad-hoc/local archives.
set -euo pipefail
: "${MONGODB_URI:?set MONGODB_URI}"
OUT="${1:-backups/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"
echo "Backing up to $OUT ..."
mongodump --uri="$MONGODB_URI" --out="$OUT" --gzip
echo "Done. Restore with: mongorestore --uri=\"\$MONGODB_URI\" --gzip $OUT"
