#!/usr/bin/env bash
# Apply the billing migrations, then seeds, in filename order, with plain psql.
# Safe to run repeatedly. It writes to whatever DATABASE_URL points at, so run it
# against a scratch database first. Do not point it at the live Supabase project
# without Audrey's approval (HUMAN-STEPS.md, step 7).
# Usage: DATABASE_URL=postgres://... bash products/revenue-billing/db/apply.sh
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
cd "$(dirname "$0")"
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
for f in migrations/*.sql seed/*.sql; do
  echo ">> $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "Done."
