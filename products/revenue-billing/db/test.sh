#!/usr/bin/env bash
# Test the billing data layer on a SCRATCH Postgres (never the live Supabase).
#   DATABASE_URL=postgres://USER@HOST:5432/scratch bash db/test.sh
# It: imitates Supabase's anon/authenticated roles, applies migrations+seeds,
# applies them AGAIN (idempotency: row counts must not change), then runs
# tests/billing_assertions.sql. Needs psql and a superuser-ish scratch role.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a scratch database}"
cd "$(dirname "$0")"
q() { psql "$DATABASE_URL" -X -At -v ON_ERROR_STOP=1 -c "$1"; }

# Refuse anything that looks like a hosted Supabase project.
case "$DATABASE_URL" in
  *supabase.co*|*supabase.com*|*pooler.supabase*) echo "Refusing: DATABASE_URL looks like a hosted Supabase project." >&2; exit 2;;
esac

echo "server: $(q 'show server_version')"
psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f tests/00_supabase_shim.sql
bash ./apply.sh >/dev/null
counts() { q "select (select count(*) from billing_plan)||'/'||(select count(*) from billing_product)||'/'||(select count(*) from billing_interval)||'/'||(select count(*) from billing_subscription_status)||'/'||(select count(*) from billing_webhook_status)"; }
first="$(counts)"
bash ./apply.sh >/dev/null   # second run must succeed and change nothing
second="$(counts)"
if [ "$first" != "$second" ]; then echo "NOT IDEMPOTENT: $first vs $second" >&2; exit 1; fi
echo "idempotent: counts plan/product/interval/sub_status/webhook_status = $first (unchanged on re-apply)"
psql "$DATABASE_URL" -X -q -o /dev/null -v ON_ERROR_STOP=1 -f tests/billing_assertions.sql
