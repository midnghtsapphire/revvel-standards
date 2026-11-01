-- Append-only patch decisions bind server-derived baselines to authenticated admissions.
CREATE TABLE oe_patch_submissions (
  tenant_id VARCHAR(64) NOT NULL,
  patch_id VARCHAR(64) NOT NULL,
  workspace_id VARCHAR(64) NOT NULL,
  admission_id VARCHAR(64) NOT NULL,
  baseline_sha256 CHAR(64) NOT NULL,
  artifact_sha256 CHAR(64) NOT NULL,
  patch_uri VARCHAR(1024) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  decision VARCHAR(16) NOT NULL CHECK (decision IN ('rejected', 'validated', 'applied')),
  findings JSON NOT NULL,
  checked_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, patch_id),
  UNIQUE (tenant_id, workspace_id, idempotency_key),
  FOREIGN KEY (tenant_id, workspace_id, admission_id)
    REFERENCES oe_admissions(tenant_id, workspace_id, admission_id)
) ENGINE=InnoDB;
