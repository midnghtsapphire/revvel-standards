"""Immutable transport values; repositories, credentials and registries live elsewhere."""

from dataclasses import dataclass
from typing import Mapping, Protocol

CONTRACT_VERSION = "1.0.0"


@dataclass(frozen=True)
class Identity:
    tenant_id: str
    workspace_id: str
    principal_id: str


@dataclass(frozen=True)
class Policy:
    tenant_id: str
    mode: str
    governance_version: str
    governance_sha256: str
    revision: int
    max_running: int


@dataclass(frozen=True)
class Admission:
    identity: Identity
    governance_version: str
    governance_sha256: str
    acknowledged: bool
    enabled: int
    expires_at: float
    allowed_actions: frozenset[str]
    allowed_paths: tuple[str, ...]
    revoked: bool = False


@dataclass(frozen=True)
class Provider:
    resource_id: str
    tenant_id: str
    workspace_id: str
    enabled: int
    health: str
    probed_at: float
    health_ttl_seconds: int
    locality: str
    billing_class: str
    capabilities: frozenset[str]
    route_priority: int
    inflight: int
    max_inflight: int
    route_enabled: int = 0


@dataclass(frozen=True)
class DispatchDecision:
    status: str
    provider_id: str | None
    reason: str


@dataclass(frozen=True)
class Claim:
    identity: Identity
    job_id: str
    worker_id: str
    provider_id: str
    lease_token: str
    fence: int
    policy_revision: int
    expires_at: float
    attempt: int


@dataclass(frozen=True)
class Artifact:
    kind: str
    uri: str
    sha256: str
    size_bytes: int
    source_commit: str
    attribution_ref: str


@dataclass(frozen=True)
class Receipt:
    identity: Identity
    job_id: str
    fence: int
    proposed_by: str
    executed_by: str
    provider_id: str
    model_ref: str
    route_ref: str
    status: str
    duration_ms: int
    score: float | None
    evidence: tuple[str, ...]
    artifacts: tuple[Artifact, ...]


class ProviderAdapter(Protocol):
    def execute(self, claim: Claim, payload: Mapping[str, object]) -> Receipt: ...


class WorkerControl(Protocol):
    def claim(self, worker_id: str, capability: str, lease_seconds: int) -> Claim | None: ...

    def heartbeat(self, claim: Claim) -> Claim: ...

    def complete(self, claim: Claim, receipt: Receipt) -> str: ...
