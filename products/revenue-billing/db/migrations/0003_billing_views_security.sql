-- 0003_billing_views_security.sql : a read view, then Row Level Security on and
-- every anon/authenticated privilege revoked. WR #18333. Idempotent.
-- Billing data is server-side only: the product backend connects with the
-- service/owner role. Nothing here is readable through the public API.
BEGIN;

CREATE OR REPLACE VIEW billing_subscription_current_v AS
SELECT s.id AS subscription_id, s.external_id AS subscription_external_id, s.status_code,
       c.external_id AS customer_external_id, p.code AS plan_code,
       COALESCE(s.contract_amount_cents, p.amount_cents) AS effective_amount_cents,
       p.currency, p.work_requests_included, s.product_code, s.started_at, s.terminated_at
FROM billing_subscription s
JOIN billing_customer c ON c.id = s.customer_id
JOIN billing_plan p ON p.id = s.plan_id;

-- Supabase auto-grants new public objects to anon/authenticated and exposes
-- them through the REST API. Turn RLS on (no policies = deny) and revoke.
-- Role checks keep this runnable on plain Postgres where those roles do not exist.
DO $$
DECLARE
  t text;
  r text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'billing_interval','billing_subscription_status','billing_webhook_status','billing_product',
    'billing_plan','billing_customer','billing_subscription','billing_webhook_event'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  FOREACH r IN ARRAY ARRAY['anon','authenticated','public'] LOOP
    IF r = 'public' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      FOREACH t IN ARRAY ARRAY[
        'billing_interval','billing_subscription_status','billing_webhook_status','billing_product',
        'billing_plan','billing_customer','billing_subscription','billing_webhook_event',
        'billing_subscription_current_v'
      ] LOOP
        EXECUTE format('REVOKE ALL ON %I FROM %s', t, CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END);
      END LOOP;
      EXECUTE format('REVOKE ALL ON FUNCTION billing_enqueue_webhook(text,text,text,text,text,jsonb) FROM %s', CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END);
      EXECUTE format('REVOKE ALL ON FUNCTION billing_check_contract_amount() FROM %s', CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END);
      EXECUTE format('REVOKE ALL ON FUNCTION billing_set_updated_at() FROM %s', CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END);
    END IF;
  END LOOP;
END $$;

COMMIT;
