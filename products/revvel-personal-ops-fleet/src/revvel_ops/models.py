"""Core domain models for the Revvel Personal Ops Fleet.

All models are pydantic v2 models so they can be serialized to the JSON
schemas published in ``schemas/``. Nothing here talks to a network.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

SCHEMA_VERSION = "1.0.0"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def canonical_timestamp(value: Any) -> str:
    """Normalize a datetime or ISO string to one canonical UTC form.

    Hashing must be stable whether the timestamp is a live ``datetime`` or a
    string re-read from a JSONL line, so both paths go through this function.
    """
    if isinstance(value, datetime):
        stamp = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    else:
        stamp = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(payload: Any) -> str:
    """Deterministic JSON encoding used for hashing."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------
# Enumerations
# --------------------------------------------------------------------------


class AutonomyMode(str, Enum):
    """Fleet-wide autonomy posture. Defaults to the most conservative value."""

    review_everything = "review_everything"
    safe_automation = "safe_automation"
    policy_automation = "policy_automation"


class Disposition(str, Enum):
    allow = "allow"
    propose = "propose"
    require_approval = "require_approval"
    deny = "deny"


class RiskTier(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Reversibility(str, Enum):
    reversible = "reversible"
    conditionally_reversible = "conditionally_reversible"
    irreversible = "irreversible"


class Permission(str, Enum):
    """Separated permission verbs. Never collapse these into one grant."""

    read = "read"
    suggest = "suggest"
    write = "write"
    delete = "delete"
    unsubscribe = "unsubscribe"


class Phase(str, Enum):
    plan = "plan"
    dry_run = "dry_run"
    apply = "apply"


# --------------------------------------------------------------------------
# Evidence
# --------------------------------------------------------------------------


class Evidence(BaseModel):
    """Pointer to the observation that justifies a proposal.

    Evidence never stores message bodies or personal content. It stores an
    opaque source reference plus a digest so the reasoning can be audited
    without duplicating user data into the audit log.
    """

    evidence_id: str = Field(default_factory=lambda: new_id("ev"))
    connector: str
    source_ref: str = Field(description="Opaque provider-side identifier, never content.")
    observed_at: datetime = Field(default_factory=utc_now)
    signal: str = Field(description="Short machine-readable signal name, e.g. 'bulk_sender'.")
    digest: str = Field(default="", description="SHA-256 of the redacted observation summary.")
    notes: str = Field(default="", max_length=280)

    @field_validator("digest")
    @classmethod
    def _default_digest(cls, v: str) -> str:
        return v

    def finalize(self) -> "Evidence":
        if not self.digest:
            self.digest = sha256_hex(
                canonical_json(
                    {
                        "connector": self.connector,
                        "source_ref": self.source_ref,
                        "signal": self.signal,
                        "notes": self.notes,
                    }
                )
            )
        return self


# --------------------------------------------------------------------------
# Action proposal
# --------------------------------------------------------------------------


class ActionProposal(BaseModel):
    """A single candidate action produced by a skill. Never self-executing."""

    schema_version: str = SCHEMA_VERSION
    proposal_id: str = Field(default_factory=lambda: new_id("prop"))
    created_at: datetime = Field(default_factory=utc_now)

    skill: str = Field(description="Skill that produced the proposal, e.g. 'email_cleanup'.")
    connector: str
    capability: str = Field(description="Connector capability key, e.g. 'gmail.labels.apply'.")
    permission: Permission
    identity: str = Field(description="Allowlisted account this action would run as.")

    summary: str = Field(max_length=200)
    target_ref: str = Field(description="Opaque target id (thread id, file id, ...).")
    parameters: dict[str, Any] = Field(default_factory=dict)

    risk_tier: RiskTier = RiskTier.high
    reversibility: Reversibility = Reversibility.irreversible
    externally_visible: bool = True
    rollback_ref: str | None = Field(
        default=None,
        description="How to undo: label snapshot id, trash restore ref, git revert sha, ...",
    )
    rollback_procedure: str | None = None

    evidence: list[Evidence] = Field(default_factory=list)
    heuristic_score: int = Field(default=0, ge=0, le=100)
    tags: list[str] = Field(default_factory=list)

    def content_hash(self) -> str:
        return sha256_hex(canonical_json(self.model_dump(mode="json", exclude={"proposal_id", "created_at"})))


# --------------------------------------------------------------------------
# Policy decision
# --------------------------------------------------------------------------


class PolicyDecision(BaseModel):
    schema_version: str = SCHEMA_VERSION
    decision_id: str = Field(default_factory=lambda: new_id("dec"))
    decided_at: datetime = Field(default_factory=utc_now)

    proposal_id: str
    autonomy_mode: AutonomyMode
    confidence: int = Field(ge=0, le=100)
    disposition: Disposition
    policy_rule_ids: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    required_approvers: list[str] = Field(default_factory=list)
    expires_at: datetime | None = None

    def content_hash(self) -> str:
        return sha256_hex(canonical_json(self.model_dump(mode="json", exclude={"decision_id", "decided_at"})))


# --------------------------------------------------------------------------
# Audit event
# --------------------------------------------------------------------------


class AuditEvent(BaseModel):
    """Append-only, hash-chained audit record.

    ``prev_hash`` + ``payload_hash`` -> ``event_hash`` forms a tamper-evident
    chain. ``signature`` is optional and reserved for an external signer; the
    MVP ships hash chaining only and never fabricates a signature.
    """

    schema_version: str = SCHEMA_VERSION
    event_id: str = Field(default_factory=lambda: new_id("aud"))
    sequence: int = Field(ge=0)
    recorded_at: datetime = Field(default_factory=utc_now)

    run_id: str
    phase: Phase
    event_type: str
    actor: str = Field(default="revvel-ops-fleet")
    identity: str | None = None
    subject_ref: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)

    prev_hash: str
    payload_hash: str = ""
    event_hash: str = ""
    signature: str | None = None
    signer_key_id: str | None = None

    def seal(self) -> "AuditEvent":
        self.payload_hash = sha256_hex(canonical_json(self.payload))
        self.event_hash = sha256_hex(
            canonical_json(
                {
                    "event_id": self.event_id,
                    "sequence": self.sequence,
                    "recorded_at": canonical_timestamp(self.recorded_at),
                    "run_id": self.run_id,
                    "phase": self.phase.value if isinstance(self.phase, Phase) else self.phase,
                    "event_type": self.event_type,
                    "actor": self.actor,
                    "identity": self.identity,
                    "subject_ref": self.subject_ref,
                    "payload_hash": self.payload_hash,
                    "prev_hash": self.prev_hash,
                }
            )
        )
        return self


# --------------------------------------------------------------------------
# Plans and inventory
# --------------------------------------------------------------------------


class PlanItem(BaseModel):
    proposal: ActionProposal
    decision: PolicyDecision


class Plan(BaseModel):
    schema_version: str = SCHEMA_VERSION
    plan_id: str = Field(default_factory=lambda: new_id("plan"))
    run_id: str
    created_at: datetime = Field(default_factory=utc_now)
    skill: str
    autonomy_mode: AutonomyMode
    phase: Phase = Phase.plan
    items: list[PlanItem] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

    def counts(self) -> dict[str, int]:
        out: dict[str, int] = {d.value: 0 for d in Disposition}
        for item in self.items:
            out[item.decision.disposition.value] += 1
        return out


class ConnectorStatus(BaseModel):
    """Non-secret, sample connector state. MUST be revalidated at runtime."""

    connector: str
    status: Literal[
        "connected",
        "requires_reauthorization",
        "requires_connection",
        "disabled_by_user",
        "not_configured",
        "unknown",
    ] = "unknown"
    permissions_granted: list[Permission] = Field(default_factory=list)
    identity_hint: str | None = None
    last_checked: datetime | None = None
    revalidation_required: bool = True
    notes: str = ""


class Inventory(BaseModel):
    schema_version: str = SCHEMA_VERSION
    inventory_id: str = Field(default_factory=lambda: new_id("inv"))
    generated_at: datetime = Field(default_factory=utc_now)
    sample_data: bool = True
    autonomy_mode: AutonomyMode = AutonomyMode.review_everything
    connectors: list[ConnectorStatus] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
