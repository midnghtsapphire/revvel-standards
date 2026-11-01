-- Additive control domain, MySQL >= 8.0.16 / InnoDB, UTC, strict SQL mode.
-- Source authority: revvel-standards. No legacy table is altered or seeded.
CREATE TABLE oe_schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  sha256 CHAR(64) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE oe_tenants (
  tenant_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE oe_workspaces (
  tenant_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  manual_mode TINYINT NOT NULL DEFAULT 1 CHECK (manual_mode IN (0, 1)),
  source_ref VARCHAR(1024) NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, workspace_id),
  FOREIGN KEY (tenant_id) REFERENCES oe_tenants(tenant_id)
) ENGINE=InnoDB;

CREATE TABLE oe_principals (
  tenant_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'operator', 'agent', 'worker', 'importer', 'reader')),
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  PRIMARY KEY (tenant_id, principal_id),
  UNIQUE (tenant_id, issuer, subject),
  FOREIGN KEY (tenant_id) REFERENCES oe_tenants(tenant_id)
) ENGINE=InnoDB;

CREATE TABLE oe_memberships (
  tenant_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (tenant_id, workspace_id, principal_id),
  FOREIGN KEY (tenant_id, workspace_id) REFERENCES oe_workspaces(tenant_id, workspace_id),
  FOREIGN KEY (tenant_id, principal_id) REFERENCES oe_principals(tenant_id, principal_id)
) ENGINE=InnoDB;

CREATE TABLE oe_sessions (
  tenant_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  token_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6),
  PRIMARY KEY (tenant_id, session_id),
  UNIQUE (token_sha256),
  FOREIGN KEY (tenant_id, principal_id) REFERENCES oe_principals(tenant_id, principal_id)
) ENGINE=InnoDB;

CREATE TABLE oe_governance_versions (
  tenant_id VARCHAR(64) NOT NULL,
  version VARCHAR(64) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  source_commit CHAR(40) NOT NULL,
  contents LONGTEXT NOT NULL,
  activated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id, version),
  UNIQUE (tenant_id, version, sha256),
  FOREIGN KEY (tenant_id) REFERENCES oe_tenants(tenant_id)
) ENGINE=InnoDB;

CREATE TABLE oe_policies (
  tenant_id VARCHAR(64) PRIMARY KEY,
  governance_version VARCHAR(64) NOT NULL,
  governance_sha256 CHAR(64) NOT NULL,
  mode VARCHAR(16) NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (mode IN ('LOCAL_ONLY', 'AUTHORIZED')),
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  max_running INT NOT NULL DEFAULT 1 CHECK (max_running BETWEEN 1 AND 10000),
  max_queued INT NOT NULL DEFAULT 100 CHECK (max_queued BETWEEN 1 AND 1000000),
  FOREIGN KEY (tenant_id, governance_version, governance_sha256)
    REFERENCES oe_governance_versions(tenant_id, version, sha256)
) ENGINE=InnoDB;

CREATE TABLE oe_resources (
  tenant_id VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('agent', 'skill', 'tool', 'provider', 'engine', 'connector')),
  name VARCHAR(255) NOT NULL,
  adapter_key VARCHAR(128) NOT NULL,
  source_ref VARCHAR(1024) NOT NULL,
  source_sha256 CHAR(64) NOT NULL,
  secret_ref VARCHAR(255),
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  running_action VARCHAR(8) NOT NULL DEFAULT 'revoke' CHECK (running_action IN ('drain', 'revoke')),
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  max_inflight INT NOT NULL DEFAULT 1 CHECK (max_inflight BETWEEN 1 AND 10000),
  PRIMARY KEY (tenant_id, resource_id),
  UNIQUE (tenant_id, workspace_id, resource_id),
  FOREIGN KEY (tenant_id, workspace_id) REFERENCES oe_workspaces(tenant_id, workspace_id)
) ENGINE=InnoDB;

CREATE TABLE oe_capabilities (
  tenant_id VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  capability VARCHAR(128) NOT NULL,
  evidence_ref VARCHAR(1024) NOT NULL,
  verified_at DATETIME(6),
  PRIMARY KEY (tenant_id, resource_id, capability),
  FOREIGN KEY (tenant_id, resource_id) REFERENCES oe_resources(tenant_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_provider_profiles (
  tenant_id VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  locality VARCHAR(16) NOT NULL CHECK (locality IN ('local', 'owned', 'external')),
  billing_class VARCHAR(16) NOT NULL CHECK (billing_class IN ('unpaid', 'paid', 'unknown')),
  endpoint_ref VARCHAR(1024) NOT NULL,
  model_ref VARCHAR(255) NOT NULL,
  health VARCHAR(16) NOT NULL DEFAULT 'unknown' CHECK (health IN ('healthy', 'unhealthy', 'unknown')),
  probed_at DATETIME(6),
  health_ttl_seconds INT NOT NULL DEFAULT 30 CHECK (health_ttl_seconds BETWEEN 1 AND 300),
  PRIMARY KEY (tenant_id, resource_id),
  FOREIGN KEY (tenant_id, resource_id) REFERENCES oe_resources(tenant_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_routes (
  tenant_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  capability VARCHAR(128) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  PRIMARY KEY (tenant_id, workspace_id, capability, provider_id),
  FOREIGN KEY (tenant_id, workspace_id, provider_id)
    REFERENCES oe_resources(tenant_id, workspace_id, resource_id),
  FOREIGN KEY (tenant_id, provider_id, capability)
    REFERENCES oe_capabilities(tenant_id, resource_id, capability)
) ENGINE=InnoDB;

CREATE TABLE oe_grants (
  tenant_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6),
  PRIMARY KEY (tenant_id, workspace_id, principal_id, action, resource_id),
  FOREIGN KEY (tenant_id, workspace_id, principal_id)
    REFERENCES oe_memberships(tenant_id, workspace_id, principal_id),
  FOREIGN KEY (tenant_id, workspace_id, resource_id)
    REFERENCES oe_resources(tenant_id, workspace_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_governance_acks (
  tenant_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  governance_version VARCHAR(64) NOT NULL,
  governance_sha256 CHAR(64) NOT NULL,
  acknowledged_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, principal_id, governance_version, governance_sha256),
  FOREIGN KEY (tenant_id, principal_id) REFERENCES oe_principals(tenant_id, principal_id),
  FOREIGN KEY (tenant_id, governance_version, governance_sha256)
    REFERENCES oe_governance_versions(tenant_id, version, sha256)
) ENGINE=InnoDB;

CREATE TABLE oe_admissions (
  tenant_id VARCHAR(64) NOT NULL,
  admission_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  governance_version VARCHAR(64) NOT NULL,
  governance_sha256 CHAR(64) NOT NULL,
  baseline_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6),
  PRIMARY KEY (tenant_id, admission_id),
  UNIQUE (tenant_id, workspace_id, admission_id),
  FOREIGN KEY (tenant_id, workspace_id, principal_id)
    REFERENCES oe_memberships(tenant_id, workspace_id, principal_id),
  FOREIGN KEY (tenant_id, workspace_id, resource_id)
    REFERENCES oe_resources(tenant_id, workspace_id, resource_id),
  FOREIGN KEY (tenant_id, principal_id, governance_version, governance_sha256)
    REFERENCES oe_governance_acks(tenant_id, principal_id, governance_version, governance_sha256)
) ENGINE=InnoDB;

CREATE TABLE oe_admission_scopes (
  tenant_id VARCHAR(64) NOT NULL,
  admission_id VARCHAR(64) NOT NULL,
  scope_kind VARCHAR(8) NOT NULL CHECK (scope_kind IN ('path', 'action')),
  scope_value VARCHAR(512) NOT NULL,
  PRIMARY KEY (tenant_id, admission_id, scope_kind, scope_value),
  FOREIGN KEY (tenant_id, admission_id) REFERENCES oe_admissions(tenant_id, admission_id)
) ENGINE=InnoDB;

CREATE TABLE oe_labels (
  tenant_id VARCHAR(64) NOT NULL,
  label_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  intent VARCHAR(128) NOT NULL,
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  manual_allowed TINYINT NOT NULL DEFAULT 1 CHECK (manual_allowed IN (0, 1)),
  PRIMARY KEY (tenant_id, label_id),
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES oe_tenants(tenant_id)
) ENGINE=InnoDB;

CREATE TABLE oe_schedules (
  tenant_id VARCHAR(64) NOT NULL,
  schedule_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  skill_id VARCHAR(64) NOT NULL,
  expression VARCHAR(255) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  enabled TINYINT NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  next_run_at DATETIME(6),
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, schedule_id),
  FOREIGN KEY (tenant_id, workspace_id, skill_id)
    REFERENCES oe_resources(tenant_id, workspace_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_jobs (
  tenant_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  proposed_by VARCHAR(64) NOT NULL,
  admission_id VARCHAR(64) NOT NULL,
  capability VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_sha256 CHAR(64) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'blocked', 'running', 'revocation_pending', 'succeeded', 'failed', 'dead_letter', 'cancelled')),
  manual_released_at DATETIME(6),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  max_attempts INT NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  fence BIGINT UNSIGNED NOT NULL DEFAULT 0,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, job_id),
  UNIQUE (tenant_id, workspace_id, job_id),
  UNIQUE (tenant_id, workspace_id, idempotency_key),
  INDEX oe_jobs_claim (tenant_id, status, next_attempt_at),
  CHECK (attempts <= max_attempts),
  FOREIGN KEY (tenant_id, workspace_id, proposed_by)
    REFERENCES oe_memberships(tenant_id, workspace_id, principal_id),
  FOREIGN KEY (tenant_id, workspace_id, admission_id)
    REFERENCES oe_admissions(tenant_id, workspace_id, admission_id)
) ENGINE=InnoDB;

CREATE TABLE oe_leases (
  tenant_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  fence BIGINT UNSIGNED NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  worker_id VARCHAR(64) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  token_sha256 CHAR(64) NOT NULL,
  policy_revision BIGINT UNSIGNED NOT NULL,
  lease_seconds INT NOT NULL CHECK (lease_seconds BETWEEN 1 AND 300),
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6),
  PRIMARY KEY (tenant_id, job_id, fence),
  UNIQUE (tenant_id, token_sha256),
  FOREIGN KEY (tenant_id, workspace_id, job_id) REFERENCES oe_jobs(tenant_id, workspace_id, job_id),
  FOREIGN KEY (tenant_id, workspace_id, worker_id) REFERENCES oe_resources(tenant_id, workspace_id, resource_id),
  FOREIGN KEY (tenant_id, workspace_id, provider_id) REFERENCES oe_resources(tenant_id, workspace_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_receipts (
  tenant_id VARCHAR(64) NOT NULL,
  receipt_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  fence BIGINT UNSIGNED NOT NULL,
  proposed_by VARCHAR(64) NOT NULL,
  executed_by VARCHAR(64) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  model_ref VARCHAR(255) NOT NULL,
  route_ref VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('succeeded', 'failed', 'blocked')),
  duration_ms BIGINT NOT NULL CHECK (duration_ms >= 0),
  score DECIMAL(9,4),
  evidence JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, receipt_id),
  UNIQUE (tenant_id, job_id, fence),
  FOREIGN KEY (tenant_id, job_id, fence) REFERENCES oe_leases(tenant_id, job_id, fence),
  FOREIGN KEY (tenant_id, proposed_by) REFERENCES oe_principals(tenant_id, principal_id),
  FOREIGN KEY (tenant_id, executed_by) REFERENCES oe_resources(tenant_id, resource_id),
  FOREIGN KEY (tenant_id, provider_id) REFERENCES oe_resources(tenant_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_costs (
  tenant_id VARCHAR(64) NOT NULL,
  cost_id VARCHAR(64) NOT NULL,
  receipt_id VARCHAR(64) NOT NULL,
  currency CHAR(3) NOT NULL,
  amount DECIMAL(20,8) NOT NULL CHECK (amount >= 0),
  basis VARCHAR(16) NOT NULL CHECK (basis IN ('measured', 'estimated', 'unverified')),
  source_ref VARCHAR(1024) NOT NULL,
  PRIMARY KEY (tenant_id, cost_id),
  FOREIGN KEY (tenant_id, receipt_id) REFERENCES oe_receipts(tenant_id, receipt_id)
) ENGINE=InnoDB;

CREATE TABLE oe_artifacts (
  tenant_id VARCHAR(64) NOT NULL,
  artifact_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  uri VARCHAR(1024) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 0 AND 1073741824),
  source_commit CHAR(40) NOT NULL,
  attribution_ref VARCHAR(1024) NOT NULL,
  PRIMARY KEY (tenant_id, artifact_id),
  FOREIGN KEY (tenant_id, job_id) REFERENCES oe_jobs(tenant_id, job_id)
) ENGINE=InnoDB;

CREATE TABLE oe_transitions (
  tenant_id VARCHAR(64) NOT NULL,
  transition_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  from_status VARCHAR(24) NOT NULL,
  to_status VARCHAR(24) NOT NULL,
  label_id VARCHAR(64),
  idempotency_key VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, transition_id),
  UNIQUE (tenant_id, job_id, idempotency_key),
  FOREIGN KEY (tenant_id, job_id) REFERENCES oe_jobs(tenant_id, job_id),
  FOREIGN KEY (tenant_id, principal_id) REFERENCES oe_principals(tenant_id, principal_id),
  FOREIGN KEY (tenant_id, label_id) REFERENCES oe_labels(tenant_id, label_id)
) ENGINE=InnoDB;

CREATE TABLE oe_outbox (
  tenant_id VARCHAR(64) NOT NULL,
  outbox_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  effect_key VARCHAR(128) NOT NULL,
  adapter_key VARCHAR(128) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'reconcile', 'failed')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, outbox_id),
  UNIQUE (tenant_id, effect_key),
  FOREIGN KEY (tenant_id, job_id) REFERENCES oe_jobs(tenant_id, job_id)
) ENGINE=InnoDB;

CREATE TABLE oe_audit (
  tenant_id VARCHAR(64) NOT NULL,
  audit_id VARCHAR(64) NOT NULL,
  principal_id VARCHAR(64) NOT NULL,
  event VARCHAR(128) NOT NULL,
  subject_ref VARCHAR(255) NOT NULL,
  before_revision BIGINT UNSIGNED NOT NULL,
  after_revision BIGINT UNSIGNED NOT NULL,
  details JSON NOT NULL,
  occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, audit_id),
  FOREIGN KEY (tenant_id, principal_id) REFERENCES oe_principals(tenant_id, principal_id)
) ENGINE=InnoDB;

CREATE TABLE oe_connector_pairs (
  tenant_id VARCHAR(64) NOT NULL,
  pairing_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  connector_id VARCHAR(64) NOT NULL,
  approved_by VARCHAR(64) NOT NULL,
  device_key_sha256 CHAR(64) NOT NULL,
  challenge_sha256 CHAR(64) NOT NULL,
  device_confirmed_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6),
  PRIMARY KEY (tenant_id, pairing_id),
  FOREIGN KEY (tenant_id, workspace_id, connector_id) REFERENCES oe_resources(tenant_id, workspace_id, resource_id),
  FOREIGN KEY (tenant_id, approved_by) REFERENCES oe_principals(tenant_id, principal_id)
) ENGINE=InnoDB;

CREATE TABLE oe_connector_scopes (
  tenant_id VARCHAR(64) NOT NULL,
  pairing_id VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  root_path VARCHAR(512) NOT NULL,
  PRIMARY KEY (tenant_id, pairing_id, action, root_path),
  FOREIGN KEY (tenant_id, pairing_id) REFERENCES oe_connector_pairs(tenant_id, pairing_id)
) ENGINE=InnoDB;

CREATE TABLE oe_import_links (
  tenant_id VARCHAR(64) NOT NULL,
  source_system VARCHAR(128) NOT NULL,
  source_key VARCHAR(255) NOT NULL,
  source_commit VARCHAR(64) NOT NULL,
  source_sha256 CHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  verified_at DATETIME(6),
  PRIMARY KEY (tenant_id, source_system, source_key),
  FOREIGN KEY (tenant_id, resource_id) REFERENCES oe_resources(tenant_id, resource_id)
) ENGINE=InnoDB;

CREATE TABLE oe_tool_evaluations (
  tenant_id VARCHAR(64) NOT NULL,
  evaluation_id VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  capability VARCHAR(128) NOT NULL,
  alternative_resource_id VARCHAR(64),
  gap TEXT,
  assertion_kind VARCHAR(16) NOT NULL CHECK (assertion_kind IN ('measured', 'observed', 'marketing')),
  evidence_ref VARCHAR(1024) NOT NULL,
  verified_price DECIMAL(20,8),
  currency CHAR(3),
  price_verified_at DATETIME(6),
  renewal_at DATETIME(6),
  recommendation TEXT NOT NULL,
  PRIMARY KEY (tenant_id, evaluation_id),
  CHECK (alternative_resource_id IS NOT NULL OR gap IS NOT NULL),
  CHECK (verified_price IS NULL OR (verified_price >= 0 AND currency IS NOT NULL AND price_verified_at IS NOT NULL)),
  FOREIGN KEY (tenant_id, resource_id) REFERENCES oe_resources(tenant_id, resource_id),
  FOREIGN KEY (tenant_id, alternative_resource_id) REFERENCES oe_resources(tenant_id, resource_id)
) ENGINE=InnoDB;
