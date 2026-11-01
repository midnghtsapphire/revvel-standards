"""Bitchslapper shared contracts. No persistence, provider catalog or side effects."""

from .policy import (
    ContractViolation,
    require_admission,
    require_idempotent_body,
    require_live_claim,
    require_pairing,
    request_sha256,
    select_provider,
    validate_bounds,
    validate_receipt,
)
from .preservation import PatchFile, validate_patch
from .types import (
    CONTRACT_VERSION,
    Admission,
    Artifact,
    Claim,
    DispatchDecision,
    Identity,
    Policy,
    Provider,
    ProviderAdapter,
    Receipt,
    WorkerControl,
)

__all__ = [
    "CONTRACT_VERSION", "Admission", "Artifact", "Claim", "ContractViolation",
    "DispatchDecision", "Identity", "PatchFile", "Policy", "Provider", "ProviderAdapter",
    "Receipt", "WorkerControl", "require_admission", "require_idempotent_body",
    "require_live_claim", "require_pairing", "request_sha256", "select_provider",
    "validate_bounds", "validate_patch", "validate_receipt",
]
