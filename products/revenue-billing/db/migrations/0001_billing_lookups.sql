-- 0001_billing_lookups.sql : billing lookup tables (text-code primary keys).
-- WR #18333. Plain SQL, idempotent, PostgreSQL 15+ / Supabase compatible.
-- Apply order: migrations/*.sql then seed/*.sql (see apply.sh).
-- Nothing here touches a live database unless Audrey runs apply.sh against it.
BEGIN;

-- Shared updated_at trigger function.
CREATE OR REPLACE FUNCTION billing_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Every lookup has the same shape: code PK, label, description, sort_order, is_active.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'billing_interval',            -- how often a plan bills
    'billing_subscription_status', -- Lago subscription lifecycle
    'billing_webhook_status',      -- receiver inbox state, same words as webhook-inbox.mjs
    'billing_product'              -- products that sell through Lago
  ] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %I (
        code        text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9_-]*$'),
        label       text NOT NULL CHECK (length(btrim(label)) > 0),
        description text,
        sort_order  integer NOT NULL DEFAULT 100,
        is_active   boolean NOT NULL DEFAULT true
      )$f$, t);
  END LOOP;
END $$;

COMMIT;
