-- 0002_billing_plan_seed.sql : GENERATED from plans/plans.json by
-- scripts/gen-plan-seed.mjs. Do not edit by hand; edit plans.json and regenerate.
-- Idempotent (upsert by code). WR #18333.
BEGIN;

INSERT INTO billing_plan(code, name, interval_code, amount_cents, currency, pay_in_advance, work_requests_included, contract_max_cents, sort_order) VALUES
  ('free', 'Free', 'monthly', 0, 'USD', true, 5, NULL, 10),
  ('pro', 'Pro', 'monthly', 9900, 'USD', true, NULL, NULL, 20),
  ('enterprise', 'Enterprise (per agent, FTE model)', 'monthly', 200000, 'USD', true, NULL, 500000, 30)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, interval_code = EXCLUDED.interval_code, amount_cents = EXCLUDED.amount_cents,
  currency = EXCLUDED.currency, pay_in_advance = EXCLUDED.pay_in_advance,
  work_requests_included = EXCLUDED.work_requests_included, contract_max_cents = EXCLUDED.contract_max_cents,
  sort_order = EXCLUDED.sort_order;

COMMIT;
