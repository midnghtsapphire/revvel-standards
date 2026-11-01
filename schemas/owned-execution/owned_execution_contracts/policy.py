"""Fail-closed pure checks over fresh authenticated DB inputs, not an execution engine."""

import hashlib
import json
import math
from collections.abc import Iterable, Mapping

from .types import Admission, Claim, DispatchDecision, Identity, Policy, Provider, Receipt


class ContractViolation(ValueError):
    """A contract denial with a stable machine-readable code."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def require(condition: bool, code: str) -> None:
    if not condition:
        raise ContractViolation(code)


def enabled(value: object) -> bool:
    return type(value) is int and value == 1


def require_admission(
    identity: Identity, admission: Admission, policy: Policy, action: str, now: float
) -> None:
    require(identity == admission.identity, "identity_mismatch")
    require(identity.tenant_id == policy.tenant_id, "tenant_mismatch")
    require(admission.acknowledged is True, "governance_unacknowledged")
    require(
        admission.governance_version == policy.governance_version
        and admission.governance_sha256 == policy.governance_sha256,
        "governance_stale",
    )
    require(enabled(admission.enabled) and not admission.revoked, "admission_revoked")
    require(math.isfinite(now) and admission.expires_at > now, "admission_expired")
    require(action in admission.allowed_actions, "action_denied")


def select_provider(
    identity: Identity,
    admission: Admission,
    policy: Policy,
    action: str,
    capability: str,
    providers: Iterable[Provider],
    now: float,
    running: int,
) -> DispatchDecision:
    require_admission(identity, admission, policy, action, now)
    require(policy.mode in ("LOCAL_ONLY", "AUTHORIZED"), "invalid_mode")
    require(type(running) is int and running >= 0, "invalid_capacity")
    require(type(policy.max_running) is int and policy.max_running > 0, "invalid_capacity")
    if running >= policy.max_running:
        return DispatchDecision("queued", None, "tenant_capacity")
    candidates = []
    for provider in providers:
        if (provider.tenant_id, provider.workspace_id) != (identity.tenant_id, identity.workspace_id):
            continue
        if not enabled(provider.enabled) or not enabled(provider.route_enabled):
            continue
        if provider.health != "healthy" or capability not in provider.capabilities:
            continue
        if not 1 <= provider.health_ttl_seconds <= 300:
            continue
        if not 0 <= now - provider.probed_at < provider.health_ttl_seconds:
            continue
        if not 0 <= provider.inflight < provider.max_inflight:
            continue
        if provider.billing_class not in ("unpaid", "paid"):
            continue
        if policy.mode == "LOCAL_ONLY" and (
            provider.billing_class != "unpaid" or provider.locality not in ("local", "owned")
        ):
            continue
        candidates.append(provider)
    if not candidates:
        return DispatchDecision("blocked", None, "no_authorized_healthy_capability")
    selected = min(candidates, key=lambda p: (p.route_priority, p.resource_id))
    return DispatchDecision("dispatch", selected.resource_id, "db_route")


def validate_bounds(max_attempts: int, attempt: int, lease_seconds: int) -> None:
    require(type(max_attempts) is int and 1 <= max_attempts <= 10, "invalid_retry_bound")
    require(type(attempt) is int and 1 <= attempt <= max_attempts, "attempt_exhausted")
    require(type(lease_seconds) is int and 1 <= lease_seconds <= 300, "invalid_lease_bound")


def require_live_claim(claim: Claim, identity: Identity, fence: int, now: float) -> None:
    require(claim.identity == identity, "identity_mismatch")
    require(type(fence) is int and fence > 0 and fence == claim.fence, "stale_fence")
    require(claim.expires_at > now, "lease_expired")
    require(bool(claim.lease_token), "lease_missing")


def validate_receipt(receipt: Receipt, claim: Claim, now: float) -> None:
    require_live_claim(claim, receipt.identity, receipt.fence, now)
    require(receipt.job_id == claim.job_id, "job_mismatch")
    require(receipt.executed_by == claim.worker_id, "worker_mismatch")
    require(receipt.provider_id == claim.provider_id, "provider_mismatch")
    require(receipt.status in ("succeeded", "failed", "blocked"), "invalid_status")
    require(type(receipt.duration_ms) is int and receipt.duration_ms >= 0, "invalid_duration")
    require(bool(receipt.proposed_by and receipt.model_ref and receipt.route_ref), "provenance_missing")
    require(receipt.score is None or math.isfinite(receipt.score), "invalid_score")
    if receipt.status == "succeeded":
        require(bool(receipt.evidence), "success_without_evidence")


def require_pairing(
    identity: Identity, pairing_identity: Identity, action: str, allowed_actions: frozenset[str],
    device_confirmed: bool, owner_approved: bool, expires_at: float, revoked: bool, now: float
) -> None:
    require(identity == pairing_identity, "pairing_identity_mismatch")
    require(device_confirmed is True and owner_approved is True, "pairing_unconfirmed")
    require(not revoked and expires_at > now, "pairing_revoked_or_expired")
    require(action in allowed_actions, "connector_action_denied")


def request_sha256(payload: Mapping[str, object]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def require_idempotent_body(stored_sha256: str, payload: Mapping[str, object]) -> None:
    require(stored_sha256 == request_sha256(payload), "idempotency_conflict")
