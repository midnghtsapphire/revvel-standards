-- Assertions for the billing data layer. Every check raises on failure; psql
-- runs with ON_ERROR_STOP so the first failure fails the whole test.
-- Rolled back at the end so the database is left as the migrations made it.
\set ON_ERROR_STOP on
BEGIN;

-- expect_fail(statement, sqlstates): must fail with one of these comma-separated SQLSTATEs.
CREATE FUNCTION pg_temp.expect_fail(stmt text, want text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = ANY (string_to_array(want, ',')) THEN RETURN; END IF;
    RAISE EXCEPTION 'expected SQLSTATE % but got % (%) for: %', want, SQLSTATE, SQLERRM, stmt;
  END;
  RAISE EXCEPTION 'expected failure SQLSTATE % but statement succeeded: %', want, stmt;
END $$;

CREATE FUNCTION pg_temp.assert_true(ok boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(ok, false) THEN RAISE EXCEPTION 'ASSERT FAILED: %', msg; END IF; END $$;

-- ---------------------------------------------------------------- security
SELECT pg_temp.assert_true(
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname LIKE 'billing\_%' AND c.relkind = 'r' AND c.relrowsecurity) = 8,
  'RLS must be enabled on all 8 billing tables');
SELECT pg_temp.assert_true(NOT EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('anon'), ('authenticated')) r(role)
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(priv)
  WHERE n.nspname = 'public' AND c.relname LIKE 'billing\_%' AND c.relkind IN ('r','v')
    AND has_table_privilege(r.role, c.oid, p.priv)),
  'anon/authenticated must hold no table or view privilege');
SELECT pg_temp.assert_true(NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN (VALUES ('anon'), ('authenticated')) r(role)
  WHERE n.nspname = 'public' AND p.proname LIKE 'billing\_%' AND has_function_privilege(r.role, p.oid, 'EXECUTE')),
  'anon/authenticated must not execute billing functions');

-- ---------------------------------------------------------------- seeds
SELECT pg_temp.assert_true((SELECT count(*) FROM billing_plan) = 3, 'three plans seeded');
SELECT pg_temp.assert_true((SELECT amount_cents FROM billing_plan WHERE code = 'pro') = 9900, 'pro is $99.00');
SELECT pg_temp.assert_true((SELECT work_requests_included FROM billing_plan WHERE code = 'free') = 5, 'free includes 5 WRs');
SELECT pg_temp.assert_true((SELECT work_requests_included IS NULL FROM billing_plan WHERE code = 'pro'), 'pro is unlimited');
SELECT pg_temp.assert_true((SELECT amount_cents = 200000 AND contract_max_cents = 500000 FROM billing_plan WHERE code = 'enterprise'), 'enterprise range 2000-5000 USD');
SELECT pg_temp.assert_true((SELECT count(*) FROM billing_product) = 3, 'three products seeded');
SELECT pg_temp.assert_true((SELECT count(*) FROM billing_webhook_status) = 3, 'three webhook statuses');

-- ---------------------------------------------------------------- plan checks
SELECT pg_temp.expect_fail($$INSERT INTO billing_plan(code,name,interval_code,amount_cents) VALUES ('neg','Neg','monthly',-1)$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_plan(code,name,interval_code,amount_cents) VALUES ('Bad Code','X','monthly',1)$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_plan(code,name,interval_code,amount_cents) VALUES ('nointerval','X','weekly',1)$$, '23503');
SELECT pg_temp.expect_fail($$INSERT INTO billing_plan(code,name,interval_code,amount_cents,contract_max_cents) VALUES ('inv','X','monthly',500,100)$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_plan(code,name,interval_code,amount_cents) VALUES ('pro','Dup','monthly',1)$$, '23505');
SELECT pg_temp.expect_fail($$INSERT INTO billing_plan(id,code,name,interval_code,amount_cents) VALUES (999,'ident','X','monthly',1)$$, '428C9');

-- ---------------------------------------------------------------- customers / subscriptions
INSERT INTO billing_customer(external_id, email, name) VALUES ('acct-1', 'buyer@example.com', 'Buyer');
SELECT pg_temp.expect_fail($$INSERT INTO billing_customer(external_id,email) VALUES ('acct-1','x@example.com')$$, '23505');
SELECT pg_temp.expect_fail($$INSERT INTO billing_customer(external_id,email) VALUES ('acct-2','not-an-email')$$, '23514');

INSERT INTO billing_subscription(customer_id, plan_id, product_code, external_id, status_code, started_at)
SELECT c.id, p.id, 'affiliate-hub', 'affiliate-hub:acct-1:pro', 'active', now()
FROM billing_customer c, billing_plan p WHERE c.external_id = 'acct-1' AND p.code = 'pro';

SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id,status_code)
  SELECT c.id,p.id,'bad-status','nonsense' FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='pro'$$, '23503');
SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id,status_code)
  SELECT c.id,p.id,'term-no-date','terminated' FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='pro'$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id,started_at,terminated_at,status_code)
  SELECT c.id,p.id,'time-travel',now(),now() - interval '1 day','terminated' FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='pro'$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id)
  SELECT c.id,p.id,'affiliate-hub:acct-1:pro' FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='free'$$, '23505');
-- Contract pricing: only enterprise, only inside [2000, 5000] USD.
SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id,contract_amount_cents)
  SELECT c.id,p.id,'contract-on-pro',9900 FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='pro'$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id,contract_amount_cents)
  SELECT c.id,p.id,'too-cheap',150000 FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='enterprise'$$, '23514');
SELECT pg_temp.expect_fail($$INSERT INTO billing_subscription(customer_id,plan_id,external_id,contract_amount_cents)
  SELECT c.id,p.id,'too-dear',500001 FROM billing_customer c, billing_plan p WHERE c.external_id='acct-1' AND p.code='enterprise'$$, '23514');
INSERT INTO billing_subscription(customer_id, plan_id, external_id, contract_amount_cents)
SELECT c.id, p.id, 'agent-7:enterprise', 350000 FROM billing_customer c, billing_plan p WHERE c.external_id = 'acct-1' AND p.code = 'enterprise';
SELECT pg_temp.assert_true((SELECT effective_amount_cents FROM billing_subscription_current_v WHERE subscription_external_id = 'agent-7:enterprise') = 350000, 'view shows contract price');
SELECT pg_temp.assert_true((SELECT effective_amount_cents FROM billing_subscription_current_v WHERE subscription_external_id = 'affiliate-hub:acct-1:pro') = 9900, 'view falls back to plan price');
-- Restrict FKs: cannot delete a customer or plan that has subscriptions.
-- (SQLSTATE is 23503 on PG15, 23001 on PG18 for RESTRICT; both mean refused.)
SELECT pg_temp.expect_fail($$DELETE FROM billing_customer WHERE external_id = 'acct-1'$$, '23001,23503');
SELECT pg_temp.expect_fail($$DELETE FROM billing_plan WHERE code = 'pro'$$, '23001,23503');
-- ON UPDATE CASCADE on a lookup code.
UPDATE billing_product SET code = 'affiliate-hub-renamed' WHERE code = 'affiliate-hub';
SELECT pg_temp.assert_true((SELECT product_code FROM billing_subscription WHERE external_id = 'affiliate-hub:acct-1:pro') = 'affiliate-hub-renamed', 'lookup rename cascades');

-- updated_at trigger moves forward.
UPDATE billing_customer SET updated_at = now() - interval '1 day' WHERE external_id = 'acct-1';
UPDATE billing_customer SET name = 'Renamed' WHERE external_id = 'acct-1';
SELECT pg_temp.assert_true((SELECT updated_at > now() - interval '1 hour' FROM billing_customer WHERE external_id = 'acct-1'), 'updated_at trigger fired');

-- ---------------------------------------------------------------- webhook idempotency
-- Hashes: 64 lowercase hex chars (sha256 of the raw body, computed by the receiver).
CREATE TEMP TABLE h AS SELECT encode(sha256('body-A'::bytea), 'hex') AS a, encode(sha256('body-B'::bytea), 'hex') AS b;

CREATE TEMP TABLE r1 AS SELECT * FROM billing_enqueue_webhook('org-1', 'key-1', (SELECT a FROM h), 'invoice.created', 'invoice', '{"invoice":{"lago_id":"i1"}}');
SELECT pg_temp.assert_true((SELECT NOT duplicate FROM r1), 'first delivery is new');

CREATE TEMP TABLE r2 AS SELECT * FROM billing_enqueue_webhook('org-1', 'key-1', (SELECT a FROM h), 'invoice.created', 'invoice', '{"invoice":{"lago_id":"i1"}}');
SELECT pg_temp.assert_true((SELECT duplicate AND id = (SELECT id FROM r1) FROM r2), 'same key + same body is a duplicate of the first row');

CREATE TEMP TABLE r3 AS SELECT * FROM billing_enqueue_webhook('org-1', 'key-REPLAY', (SELECT a FROM h), 'invoice.created', 'invoice', '{"invoice":{"lago_id":"i1"}}');
SELECT pg_temp.assert_true((SELECT duplicate AND id = (SELECT id FROM r1) FROM r3), 'changed unsigned key + same signed body is a duplicate');

SELECT pg_temp.expect_fail($$SELECT * FROM billing_enqueue_webhook('org-1','key-1',(SELECT b FROM h),'invoice.created','invoice','{}')$$, 'P0409');

CREATE TEMP TABLE r4 AS SELECT * FROM billing_enqueue_webhook('org-2', 'key-1', (SELECT a FROM h), 'invoice.created', 'invoice', '{}');
SELECT pg_temp.assert_true((SELECT NOT duplicate AND id <> (SELECT id FROM r1) FROM r4), 'same key and body in another organization is independent');
SELECT pg_temp.assert_true((SELECT count(*) FROM billing_webhook_event) = 2, 'exactly two stored rows after five deliveries');

SELECT pg_temp.expect_fail($$SELECT * FROM billing_enqueue_webhook('org-1','k2','NOT-HEX','invoice.created','invoice','{}')$$, '23514');
SELECT pg_temp.expect_fail($$SELECT * FROM billing_enqueue_webhook('org-1','k3',repeat('c',64),'Invoice.Created','invoice','{}')$$, '23514');
SELECT pg_temp.expect_fail($$SELECT * FROM billing_enqueue_webhook('','k4',repeat('d',64),'invoice.created','invoice','{}')$$, '23514');
SELECT pg_temp.expect_fail($$SELECT * FROM billing_enqueue_webhook('org-1','k5',repeat('e',64),'invoice.created','invoice', jsonb_build_object('pad', repeat('x', 70000)))$$, '23514');

-- Status/processed_at coupling.
SELECT pg_temp.expect_fail($$UPDATE billing_webhook_event SET status_code = 'processed' WHERE organization_id = 'org-1'$$, '23514');
UPDATE billing_webhook_event SET status_code = 'processed', processed_at = now(), attempts = attempts + 1 WHERE organization_id = 'org-1';
SELECT pg_temp.expect_fail($$UPDATE billing_webhook_event SET processed_at = NULL WHERE organization_id = 'org-1'$$, '23514');
SELECT pg_temp.expect_fail($$UPDATE billing_webhook_event SET status_code = 'bogus' WHERE organization_id = 'org-1'$$, '23503');

ROLLBACK;
\echo ALL BILLING ASSERTIONS PASSED
