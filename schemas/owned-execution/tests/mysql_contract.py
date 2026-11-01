"""Real MySQL negatives, opt-in isolated local container only; every write rolls back."""

import os
import subprocess
import unittest

BOOTSTRAP = """
START TRANSACTION;
INSERT INTO oe_tenants (tenant_id,name) VALUES ('contract-a','test'),('contract-b','test');
INSERT INTO oe_workspaces (tenant_id,workspace_id,name,source_ref)
 VALUES ('contract-a','w','test','test:source'),('contract-b','w','test','test:source');
INSERT INTO oe_principals (tenant_id,principal_id,issuer,subject,role)
 VALUES ('contract-a','p','test','p','agent');
INSERT INTO oe_memberships VALUES ('contract-a','w','p');
INSERT INTO oe_governance_versions (tenant_id,version,sha256,source_commit,contents,activated_at)
 VALUES ('contract-a','v1',REPEAT('a',64),REPEAT('b',40),'governance',UTC_TIMESTAMP(6));
INSERT INTO oe_policies (tenant_id,governance_version,governance_sha256)
 VALUES ('contract-a','v1',REPEAT('a',64));
INSERT INTO oe_resources (tenant_id,resource_id,workspace_id,kind,name,adapter_key,source_ref,source_sha256)
 VALUES ('contract-a','r','w','agent','test','test','test:source',REPEAT('c',64));
"""
ADMISSION = """
INSERT INTO oe_admissions (tenant_id,admission_id,workspace_id,principal_id,resource_id,
 governance_version,governance_sha256,baseline_sha256,expires_at)
 VALUES ('contract-a','admit','w','p','r','v1',REPEAT('a',64),REPEAT('d',64),UTC_TIMESTAMP(6)+INTERVAL 1 HOUR);
"""
ACK = """
INSERT INTO oe_governance_acks (tenant_id,principal_id,governance_version,governance_sha256)
 VALUES ('contract-a','p','v1',REPEAT('a',64));
"""
JOB = """
INSERT INTO oe_jobs (tenant_id,job_id,workspace_id,proposed_by,admission_id,capability,action,
 idempotency_key,request_sha256,payload)
 VALUES ('contract-a','j','w','p','admit','chat','review','request-1',REPEAT('d',64),'{}');
"""


@unittest.skipUnless(os.environ.get("OWNED_CONTRACT_MYSQL_TEST") == "1", "isolated MySQL test opt-in required")
class MySQLContracts(unittest.TestCase):
    def sql(self, statement):
        return subprocess.run(
            ["docker", "exec", "-i", "bitchslapper-contract-mysql", "mysql", "-uroot", "oe_contract"],
            input=BOOTSTRAP + statement + "\nROLLBACK;\n", text=True, capture_output=True, check=False,
        )

    def reject(self, sql, error):
        result = self.sql(sql)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn(error, result.stderr)

    def test_admission_fk_rejects_unacknowledged_governance(self):
        self.reject(ADMISSION, "foreign key constraint fails")

    def test_ack_hash_cannot_reference_an_unknown_version(self):
        self.reject(ACK.replace("REPEAT('a',64)", "REPEAT('e',64)"), "foreign key constraint fails")

    def test_admission_after_ack_succeeds(self):
        result = self.sql(ACK + ADMISSION)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_cross_tenant_resource_fk_rejected(self):
        self.reject("INSERT INTO oe_capabilities VALUES ('contract-b','r','chat','test:proof',NULL);",
                    "foreign key constraint fails")

    def test_enabled_is_database_constrained(self):
        self.reject("UPDATE oe_resources SET enabled=2 WHERE tenant_id='contract-a';", "Check constraint")

    def test_admission_scope_cannot_escape_tenant(self):
        self.reject(ACK + ADMISSION + "INSERT INTO oe_admission_scopes VALUES ('contract-b','admit','action','run');",
                    "foreign key constraint fails")

    def test_price_requires_evidence_date_and_currency(self):
        self.reject("""INSERT INTO oe_tool_evaluations
 (tenant_id,evaluation_id,resource_id,capability,gap,assertion_kind,evidence_ref,verified_price,recommendation)
 VALUES ('contract-a','e','r','chat','unknown parity','observed','test:proof',1,'investigate');""",
                    "Check constraint")

    def test_paid_comparison_requires_alternative_or_honest_gap(self):
        self.reject("""INSERT INTO oe_tool_evaluations
 (tenant_id,evaluation_id,resource_id,capability,assertion_kind,evidence_ref,recommendation)
 VALUES ('contract-a','e','r','chat','marketing','test:claim','investigate');""", "Check constraint")

    def test_new_agent_is_disabled_db_registration(self):
        result = self.sql("SELECT enabled FROM oe_resources WHERE tenant_id='contract-a' AND resource_id='r';")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip().splitlines()[-1], "0")

    def test_job_idempotency_is_unique_per_tenant_workspace(self):
        self.reject(ACK + ADMISSION + JOB + JOB.replace("'j'", "'j2'"), "Duplicate entry")

    def test_job_retry_bound_is_enforced_by_mysql(self):
        statement = "UPDATE oe_jobs SET max_attempts=11 WHERE tenant_id='contract-a';"
        self.reject(ACK + ADMISSION + JOB + statement, "Check constraint")

    def test_lease_bound_is_enforced_by_mysql(self):
        self.reject(ACK + ADMISSION + JOB + """
INSERT INTO oe_leases (tenant_id,job_id,fence,workspace_id,worker_id,provider_id,token_sha256,
 policy_revision,lease_seconds,expires_at)
 VALUES ('contract-a','j',1,'w','r','r',REPEAT('f',64),1,301,UTC_TIMESTAMP(6)+INTERVAL 1 HOUR);
""", "Check constraint")

    def test_patch_record_cannot_reference_another_tenant_admission(self):
        self.reject(ACK + ADMISSION + """
INSERT INTO oe_patch_submissions (tenant_id,patch_id,workspace_id,admission_id,baseline_sha256,
 artifact_sha256,patch_uri,idempotency_key,decision,findings)
 VALUES ('contract-b','patch','w','admit',REPEAT('d',64),REPEAT('f',64),'test:patch','patch-1','validated','[]');
""", "foreign key constraint fails")


if __name__ == "__main__":
    unittest.main()
