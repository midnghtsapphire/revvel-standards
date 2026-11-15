-- 0002_billing_core.sql : mirrors of Lago plans, customers, subscriptions and
-- webhook events. Lago stays the billing authority; these rows are a local
-- mirror for the product and never grant paid access by themselves.
-- WR #18333. Idempotent; PostgreSQL 15+.
BEGIN;

CREATE TABLE IF NOT EXISTS billing_plan (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code                     text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  name                     text NOT NULL CHECK (length(btrim(name)) > 0),
  interval_code            text NOT NULL REFERENCES billing_interval(code) ON UPDATE CASCADE,
  amount_cents             integer NOT NULL CHECK (amount_cents >= 0),
  currency                 text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  pay_in_advance           boolean NOT NULL DEFAULT true,
  -- NULL means unlimited. Lago bills but does not enforce the cap: the product must.
  work_requests_included   integer CHECK (work_requests_included IS NULL OR work_requests_included >= 0),
  -- Contract pricing ceiling (per agent per month). NULL = not contract-priced.
  contract_max_cents       integer CHECK (contract_max_cents IS NULL OR contract_max_cents >= amount_cents),
  is_active                boolean NOT NULL DEFAULT true,
  sort_order               integer NOT NULL DEFAULT 100,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_customer (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Our own account id, the same value passed to Lago as external_id.
  external_id      text NOT NULL UNIQUE CHECK (length(external_id) BETWEEN 1 AND 255),
  lago_id          text UNIQUE CHECK (lago_id IS NULL OR length(lago_id) BETWEEN 1 AND 255),
  email            text NOT NULL CHECK (position('@' in email) > 1),   -- personal data: keep out of logs
  name             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_subscription (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id            bigint NOT NULL REFERENCES billing_customer(id) ON DELETE RESTRICT,
  plan_id                bigint NOT NULL REFERENCES billing_plan(id) ON DELETE RESTRICT,
  product_code           text REFERENCES billing_product(code) ON UPDATE CASCADE,
  -- Same value passed to Lago as the subscription external_id (stable, caller-owned).
  external_id            text NOT NULL UNIQUE CHECK (length(external_id) BETWEEN 1 AND 255),
  lago_id                text UNIQUE CHECK (lago_id IS NULL OR length(lago_id) BETWEEN 1 AND 255),
  status_code            text NOT NULL DEFAULT 'pending' REFERENCES billing_subscription_status(code) ON UPDATE CASCADE,
  -- Per-contract price set through Lago plan_overrides; must sit inside the plan's range (trigger below).
  contract_amount_cents  integer CHECK (contract_amount_cents IS NULL OR contract_amount_cents >= 0),
  started_at             timestamptz,
  terminated_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (terminated_at IS NULL OR started_at IS NULL OR terminated_at >= started_at),
  CHECK (status_code <> 'terminated' OR terminated_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS billing_subscription_customer_idx ON billing_subscription(customer_id);
CREATE INDEX IF NOT EXISTS billing_subscription_plan_idx ON billing_subscription(plan_id);

-- Webhook mirror. The uniqueness rules deliberately copy products/revenue-billing/
-- webhook-inbox.mjs: one row per (organization, delivery_key) AND one per
-- (organization, body_sha256). The delivery key (x-lago-unique-key header) is
-- not covered by Lago's signature, so the body hash is the real replay guard.
CREATE TABLE IF NOT EXISTS billing_webhook_event (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id  text NOT NULL CHECK (length(organization_id) BETWEEN 1 AND 255),
  delivery_key     text NOT NULL CHECK (length(delivery_key) BETWEEN 1 AND 255),
  body_sha256      text NOT NULL CHECK (body_sha256 ~ '^[0-9a-f]{64}$'),
  webhook_type     text NOT NULL CHECK (webhook_type ~ '^[a-z_]+\.[a-z_]+$'),
  object_type      text NOT NULL CHECK (object_type ~ '^[a-z_]{1,60}$'),
  payload          jsonb NOT NULL CHECK (octet_length(payload::text) <= 65536),  -- receiver's 64 KiB bound
  status_code      text NOT NULL DEFAULT 'pending' REFERENCES billing_webhook_status(code) ON UPDATE CASCADE,
  attempts         integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error       text,
  received_at      timestamptz NOT NULL DEFAULT now(),
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  UNIQUE (organization_id, delivery_key),
  UNIQUE (organization_id, body_sha256),
  CHECK ((status_code = 'pending') = (processed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS billing_webhook_event_due_idx
  ON billing_webhook_event(next_attempt_at, id) WHERE status_code = 'pending';

-- updated_at triggers.
DROP TRIGGER IF EXISTS billing_plan_updated_at ON billing_plan;
CREATE TRIGGER billing_plan_updated_at BEFORE UPDATE ON billing_plan
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();
DROP TRIGGER IF EXISTS billing_customer_updated_at ON billing_customer;
CREATE TRIGGER billing_customer_updated_at BEFORE UPDATE ON billing_customer
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();
DROP TRIGGER IF EXISTS billing_subscription_updated_at ON billing_subscription;
CREATE TRIGGER billing_subscription_updated_at BEFORE UPDATE ON billing_subscription
  FOR EACH ROW EXECUTE FUNCTION billing_set_updated_at();

-- A contract price is allowed only for contract-priced plans and only inside [plan floor, plan ceiling].
CREATE OR REPLACE FUNCTION billing_check_contract_amount() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE p billing_plan%ROWTYPE;
BEGIN
  IF NEW.contract_amount_cents IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO p FROM billing_plan WHERE id = NEW.plan_id;
  IF p.contract_max_cents IS NULL THEN
    RAISE EXCEPTION 'plan % is not contract-priced', p.code USING ERRCODE = '23514';
  END IF;
  IF NEW.contract_amount_cents < p.amount_cents OR NEW.contract_amount_cents > p.contract_max_cents THEN
    RAISE EXCEPTION 'contract amount % is outside plan % range [%, %]',
      NEW.contract_amount_cents, p.code, p.amount_cents, p.contract_max_cents USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS billing_subscription_contract_amount ON billing_subscription;
CREATE TRIGGER billing_subscription_contract_amount BEFORE INSERT OR UPDATE ON billing_subscription
  FOR EACH ROW EXECUTE FUNCTION billing_check_contract_amount();

-- Idempotent webhook intake, same semantics as LagoInbox.enqueue():
--   same key + same body        -> duplicate (returns the existing row)
--   new key   + same body       -> duplicate (replayed signed body, changed unsigned header)
--   same key  + different body  -> error SQLSTATE P0409 (the receiver answers HTTP 409)
--   otherwise                   -> inserted as 'pending'
-- Race-safe: the two UNIQUE constraints decide, not a read-then-write.
CREATE OR REPLACE FUNCTION billing_enqueue_webhook(
  p_organization_id text, p_delivery_key text, p_body_sha256 text,
  p_webhook_type text, p_object_type text, p_payload jsonb
) RETURNS TABLE (id bigint, duplicate boolean)
LANGUAGE plpgsql AS $$
DECLARE ev billing_webhook_event%ROWTYPE;
BEGIN
  BEGIN
    INSERT INTO billing_webhook_event(organization_id, delivery_key, body_sha256, webhook_type, object_type, payload)
    VALUES (p_organization_id, p_delivery_key, p_body_sha256, p_webhook_type, p_object_type, p_payload)
    RETURNING billing_webhook_event.id INTO id;
    duplicate := false;
    RETURN NEXT;
    RETURN;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO ev FROM billing_webhook_event e
      WHERE e.organization_id = p_organization_id AND e.delivery_key = p_delivery_key;
    IF FOUND THEN
      IF ev.body_sha256 <> p_body_sha256 THEN
        RAISE EXCEPTION 'delivery key payload conflict' USING ERRCODE = 'P0409';
      END IF;
    ELSE
      SELECT * INTO ev FROM billing_webhook_event e
        WHERE e.organization_id = p_organization_id AND e.body_sha256 = p_body_sha256;
    END IF;
    id := ev.id;
    duplicate := true;
    RETURN NEXT;
    RETURN;
  END;
END $$;

COMMIT;
