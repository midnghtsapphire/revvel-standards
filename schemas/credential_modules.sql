-- credential_modules — durable on/off flag table for the credential gate,
-- the Doppler recover process, and the backup harness process.
--
-- Mirrors `config/credential-modules.yml`. Workflows read the YAML (no DB
-- needed in CI); apps with a DB can mirror it here for runtime flips
-- without a git push. Sync the two periodically OR pick one as source of
-- truth and treat the other as a cache.
--
-- Postgres-flavoured DDL. Adjust types for SQLite / MySQL as needed.

CREATE TABLE IF NOT EXISTS credential_modules (
  -- ── Identity ─────────────────────────────────────────────────────────
  id              TEXT        PRIMARY KEY,          -- e.g. 'credential-gate'
  description     TEXT        NOT NULL,

  -- ── The flag (the whole point of this table) ────────────────────────
  enabled         BOOLEAN     NOT NULL DEFAULT FALSE,

  -- ── What this module governs (string arrays serialized as JSON) ─────
  -- CHECK constraints enforce array shape so non-array payloads (object,
  -- string, null) can't sneak in. Per cubic review.
  governs_workflows  JSONB    NOT NULL DEFAULT '[]'::jsonb
                              CHECK (jsonb_typeof(governs_workflows) = 'array'),
  governs_scripts    JSONB    NOT NULL DEFAULT '[]'::jsonb
                              CHECK (jsonb_typeof(governs_scripts) = 'array'),

  -- ── Audit ───────────────────────────────────────────────────────────
  last_changed    TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by      TEXT,                              -- GitHub login of who flipped it
  change_reason   TEXT,                              -- free text
  rollback_steps  JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- ── Provenance ──────────────────────────────────────────────────────
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_modules_enabled
  ON credential_modules (enabled);

-- Per cubic review: keep updated_at fresh on every row update so audit
-- metadata doesn't go stale. Postgres pattern — replace the function
-- safely and attach a BEFORE UPDATE trigger.
CREATE OR REPLACE FUNCTION credential_modules_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS credential_modules_set_updated_at ON credential_modules;
CREATE TRIGGER credential_modules_set_updated_at
  BEFORE UPDATE ON credential_modules
  FOR EACH ROW
  EXECUTE FUNCTION credential_modules_touch_updated_at();

-- Append-only audit trail of every flip; the main table holds current state.
CREATE TABLE IF NOT EXISTS credential_modules_audit (
  audit_id        BIGSERIAL   PRIMARY KEY,
  module_id       TEXT        NOT NULL,
  enabled_before  BOOLEAN,
  enabled_after   BOOLEAN     NOT NULL,
  changed_by      TEXT,
  change_reason   TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_modules_audit_module
  ON credential_modules_audit (module_id, changed_at DESC);

-- Seed the three modules to match the YAML SSOT.
INSERT INTO credential_modules (id, description, enabled, change_reason) VALUES
  ('credential-gate',
   'Enforces deletion protection and existence checks on critical repo secrets.',
   TRUE,
   'initial-modularization'),
  ('doppler-recover',
   'Pulls missing repo secrets back from Doppler. OFF until Doppler is reconciled with live GitHub values.',
   FALSE,
   'initial-modularization (stays off until reconciled)'),
  ('credential-backup-harness',
   'Non-Doppler fallback: CREDENTIAL_BACKUP_JSON / SOPS / pass / Bitwarden / 1Password / Infisical / Vault.',
   TRUE,
   'initial-modularization')
ON CONFLICT (id) DO NOTHING;
