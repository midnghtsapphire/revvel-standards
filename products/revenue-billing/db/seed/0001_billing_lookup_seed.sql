-- 0001_billing_lookup_seed.sql : lookup rows. Idempotent (upsert by code). WR #18333.
BEGIN;

INSERT INTO billing_interval(code, label, description, sort_order) VALUES
  ('monthly', 'Monthly', 'Billed every month.', 10),
  ('yearly',  'Yearly',  'Billed every year.',  20)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO billing_subscription_status(code, label, description, sort_order) VALUES
  ('pending',    'Pending',    'Created in Lago, not started yet.',                 10),
  ('active',     'Active',     'Running and billable.',                             20),
  ('terminated', 'Terminated', 'Ended; terminated_at is set.',                      30),
  ('canceled',   'Canceled',   'Canceled before it started.',                       40)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Same words as the receiver inbox in products/revenue-billing/webhook-inbox.mjs.
INSERT INTO billing_webhook_status(code, label, description, sort_order) VALUES
  ('pending',   'Pending',   'Durably received; reconciliation against Lago not finished.',        10),
  ('processed', 'Processed', 'Reconciled against current Lago state.',                             20),
  ('ignored',   'Ignored',   'Authentic but an event type this system does not act on.',           30)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- The three products named by WR #18333 (issues #18330, #18331, #18332).
INSERT INTO billing_product(code, label, description, sort_order) VALUES
  ('affiliate-hub',          'High-Ticket Affiliate Hub',     'products/affiliate-hub (issue #18330)',          10),
  ('ai-video-toolkit',       'AI Video Toolkit',              'products/ai-video-toolkit (issue #18331)',       20),
  ('screen-recorder-finder', 'Mac Screen Recorder Finder',    'products/screen-recorder-finder (issue #18332)', 30)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

COMMIT;
