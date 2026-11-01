"""Offline executable contracts, with synthetic DB input rows, never runtime inventory."""

import unittest
from dataclasses import replace

from owned_execution_contracts import (
    Admission, Claim, ContractViolation, Identity, PatchFile, Policy, Provider, Receipt,
    require_admission, require_idempotent_body, require_pairing, request_sha256,
    select_provider, validate_bounds, validate_patch, validate_receipt,
)


class Contracts(unittest.TestCase):
    def setUp(self):
        self.identity = Identity("tenant-a", "workspace-a", "visitor")
        self.policy = Policy("tenant-a", "LOCAL_ONLY", "v1", "a" * 64, 1, 2)
        self.admission = Admission(self.identity, "v1", "a" * 64, True, 1, 200,
                                   frozenset({"review"}), ("products/demo",))
        self.provider = Provider("lm-studio", "tenant-a", "workspace-a", 1, "healthy", 95, 30,
                                 "local", "unpaid", frozenset({"chat"}), 1, 0, 2, 1)
        self.claim = Claim(self.identity, "job", "worker", "lm-studio", "x" * 32, 1, 1, 150, 1)
        self.receipt = Receipt(self.identity, "job", 1, "visitor", "worker", "lm-studio", "model",
                               "route", "succeeded", 12, None, ("owned:proof",), ())

    def deny(self, code, fn, *args, **kwargs):
        with self.assertRaises(ContractViolation) as raised:
            fn(*args, **kwargs)
        self.assertEqual(raised.exception.code, code)

    def route(self, providers, **kwargs):
        return select_provider(self.identity, self.admission, kwargs.get("policy", self.policy),
                               "review", "chat", providers, 100, kwargs.get("running", 0))

    def test_ack_required_before_capabilities(self):
        self.deny("governance_unacknowledged", require_admission, self.identity,
                  replace(self.admission, acknowledged=False), self.policy, "review", 100)

    def test_new_governance_invalidates_old_ack_version_and_hash(self):
        for policy in (replace(self.policy, governance_version="v2"),
                       replace(self.policy, governance_sha256="b" * 64)):
            self.deny("governance_stale", require_admission, self.identity,
                      self.admission, policy, "review", 100)

    def test_identity_workspace_and_tenant_isolation(self):
        for identity in (replace(self.identity, tenant_id="other"),
                         replace(self.identity, workspace_id="other"),
                         replace(self.identity, principal_id="other")):
            self.deny("identity_mismatch", require_admission, identity, self.admission,
                      self.policy, "review", 100)
        self.assertEqual(self.route([replace(self.provider, tenant_id="other")]).status, "blocked")
        self.assertEqual(self.route([replace(self.provider, workspace_id="other")]).status, "blocked")

    def test_revoked_expired_and_action_denied(self):
        for admission, code in ((replace(self.admission, enabled=0), "admission_revoked"),
                                (replace(self.admission, revoked=True), "admission_revoked"),
                                (replace(self.admission, expires_at=100), "admission_expired")):
            self.deny(code, require_admission, self.identity, admission, self.policy, "review", 100)
        self.deny("action_denied", require_admission, self.identity, self.admission,
                  self.policy, "shell", 100)

    def test_local_only_denies_paid_owned_paid_external_and_unknown(self):
        for profile in (replace(self.provider, billing_class="paid"),
                        replace(self.provider, locality="external", billing_class="paid"),
                        replace(self.provider, billing_class="unknown"),
                        replace(self.provider, locality="external")):
            self.assertEqual(self.route([profile]).status, "blocked")

    def test_local_lm_studio_or_owned_unpaid_is_eligible(self):
        self.assertEqual(self.route([self.provider]).provider_id, "lm-studio")
        self.assertEqual(self.route([replace(self.provider, locality="owned")]).status, "dispatch")

    def test_paid_is_only_eligible_in_authorized_mode_after_admission(self):
        decision = self.route(
            [replace(self.provider, billing_class="paid")],
            policy=replace(self.policy, mode="AUTHORIZED"),
        )
        self.assertEqual(decision.status, "dispatch")

    def test_switch_health_capability_route_and_quota_rechecked(self):
        for values in ({"enabled": 0}, {"enabled": "1"}, {"enabled": True},
                       {"route_enabled": 0}, {"health": "unknown"}, {"probed_at": 10},
                       {"probed_at": 110}, {"capabilities": frozenset({"embed"})},
                       {"inflight": 2}, {"max_inflight": 0}, {"health_ttl_seconds": 999}):
            self.assertEqual(self.route([replace(self.provider, **values)]).status, "blocked")
        self.assertEqual(self.route([self.provider], running=2).status, "queued")

    def test_no_provider_preserves_job_not_success(self):
        result = self.route([])
        self.assertEqual((result.status, result.provider_id), ("blocked", None))

    def test_unknown_mode_denies(self):
        self.deny("invalid_mode", self.route, [self.provider], policy=replace(self.policy, mode="typo"))

    def test_deterministic_db_priority(self):
        alternative = replace(self.provider, resource_id="ollama", route_priority=0)
        self.assertEqual(self.route([self.provider, alternative]).provider_id, "ollama")

    def test_retry_and_lease_bounds(self):
        validate_bounds(3, 1, 30)
        for args, code in (((0, 1, 30), "invalid_retry_bound"), ((11, 1, 30), "invalid_retry_bound"),
                           ((3, 4, 30), "attempt_exhausted"), ((3, 1, 0), "invalid_lease_bound"),
                           ((3, 1, 301), "invalid_lease_bound"), ((True, 1, 30), "invalid_retry_bound")):
            self.deny(code, validate_bounds, *args)

    def test_receipts_need_matching_live_fence_worker_and_evidence(self):
        validate_receipt(self.receipt, self.claim, 100)
        for receipt, code in ((replace(self.receipt, fence=2), "stale_fence"),
                              (replace(self.receipt, executed_by="other"), "worker_mismatch"),
                              (replace(self.receipt, provider_id="other"), "provider_mismatch"),
                              (replace(self.receipt, evidence=()), "success_without_evidence"),
                              (replace(self.receipt, duration_ms=-1), "invalid_duration")):
            self.deny(code, validate_receipt, receipt, self.claim, 100)
        self.deny("lease_expired", validate_receipt, self.receipt, self.claim, 150)

    def test_device_pairing_defaults_to_no_access(self):
        args = (self.identity, self.identity, "read", frozenset({"read"}))
        self.deny("pairing_unconfirmed", require_pairing, *args, False, True, 200, False, 100)
        self.deny("pairing_unconfirmed", require_pairing, *args, True, False, 200, False, 100)
        self.deny("pairing_revoked_or_expired", require_pairing, *args, True, True, 200, True, 100)
        require_pairing(*args, True, True, 200, False, 100)

    def test_idempotency_canonicalizes_order_but_rejects_changed_body(self):
        digest = request_sha256({"a": 1, "b": 2})
        require_idempotent_body(digest, {"b": 2, "a": 1})
        self.deny("idempotency_conflict", require_idempotent_body, digest, {"a": 3})


class Preservation(unittest.TestCase):
    deny = Contracts.deny

    def check(self, file):
        validate_patch((file,), ("products/demo",))

    def test_additive_patch_preserves_original(self):
        self.check(PatchFile("products/demo/main.py", "print('old')\n", "print('old')\nprint('new')\n"))

    def test_rejects_deletion_and_wholesale_rewrite(self):
        self.deny("file_deletion_denied", self.check, PatchFile("products/demo/a.py", "original", None))
        self.deny("destructive_replacement_denied", self.check,
                  PatchFile("products/demo/a.py", "original\nmodule", "new module"))

    def test_rejects_escape_symlinks_binary_and_scope(self):
        for path, code in (("../secrets", "unsafe_path"), ("/etc/passwd", "unsafe_path"),
                           ("products/demo/../../x", "unsafe_path"), ("other/x", "patch_scope_denied"),
                           ("products/demo/.git/config", "protected_path")):
            self.deny(code, self.check, PatchFile(path, None, "data"))
        self.deny("unsafe_patch_type", self.check, PatchFile("products/demo/x", None, "x", symlink=True))
        self.deny("unsafe_patch_type", self.check, PatchFile("products/demo/x", None, "x", binary=True))

    def test_strict_json_original_not_commented(self):
        self.check(PatchFile("products/demo/a.json", '{"old":1}', '{"old":1}\n'))
        self.deny("strict_json_retirement_denied", self.check,
                  PatchFile("products/demo/a.json", '{"old":1}', '// {"old":1}\n'))

    def test_retirement_requires_complete_in_place_metadata(self):
        old = "print('old')"
        self.deny("retirement_metadata_missing", self.check,
                  PatchFile("products/demo/a.py", old, "# " + old))
        metadata = {"date": "2026-11-01", "agent": "Devin", "reason": "retain historic path",
                    "reference": "session-url", "replacement": "new()", "restoration": "uncomment original"}
        after = "# REVVEL-DISABLED " + " | ".join(metadata.values()) + "\n# " + old + "\nnew()"
        validate_patch((PatchFile("products/demo/a.py", old, after),), ("products/demo",), metadata)


if __name__ == "__main__":
    unittest.main()
