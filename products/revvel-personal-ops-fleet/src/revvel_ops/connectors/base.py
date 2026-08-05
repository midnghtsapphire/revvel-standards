"""Connector contract shared by every adapter.

Adapters in this MVP are *skeletons*: they declare capabilities, least-privilege
scopes, approval gates and rollback semantics, and they raise
``NotImplementedError`` on any live call. Nothing in this package opens a socket.
"""

from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel, Field

from ..models import ActionProposal, Permission, Reversibility, RiskTier


class Capability(BaseModel):
    """One documented, addressable connector operation."""

    key: str = Field(description="Stable capability id, e.g. 'gmail.labels.apply'.")
    permission: Permission
    description: str
    scopes: list[str] = Field(default_factory=list, description="Least-privilege provider scopes.")
    risk_tier: RiskTier = RiskTier.high
    reversibility: Reversibility = Reversibility.irreversible
    externally_visible: bool = False
    approval_gate: str = Field(
        default="require_approval",
        description="allow | propose | require_approval | deny (policy may only tighten this).",
    )
    rollback: str = Field(default="none", description="How the action is undone.")
    availability: str = Field(
        default="planned",
        description="available | partial | planned | unavailable — revalidate at runtime.",
    )
    notes: str = ""


class ConnectorManifest(BaseModel):
    name: str
    provider: str
    surface: str = Field(description="cloud_api | local_companion | mobile_companion | self_hosted")
    identity_binding: str = Field(
        default="explicit_allowlist",
        description="How the operating identity is chosen and pinned.",
    )
    configurable: bool = Field(
        default=True,
        description="Every right-hand-side value (scopes, targets, gates) is user-configurable.",
    )
    default_permissions: list[Permission] = Field(default_factory=lambda: [Permission.read])
    capabilities: list[Capability] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    config_keys: list[str] = Field(default_factory=list)

    def capability(self, key: str) -> Capability | None:
        for cap in self.capabilities:
            if cap.key == key:
                return cap
        return None


class Connector(Protocol):
    manifest: ConnectorManifest

    def describe(self) -> ConnectorManifest: ...

    def dry_run(self, proposal: ActionProposal) -> dict[str, Any]: ...

    def apply(self, proposal: ActionProposal, approval_token: str) -> dict[str, Any]: ...


class BaseConnector:
    """Non-executing base. ``apply`` always refuses without an approval token."""

    manifest: ConnectorManifest

    def describe(self) -> ConnectorManifest:
        return self.manifest

    def capability_keys(self) -> list[str]:
        return [c.key for c in self.manifest.capabilities]

    def dry_run(self, proposal: ActionProposal) -> dict[str, Any]:
        cap = self.manifest.capability(proposal.capability)
        if cap is None:
            return {
                "connector": self.manifest.name,
                "capability": proposal.capability,
                "simulated": False,
                "error": "unknown_capability",
            }
        return {
            "connector": self.manifest.name,
            "capability": cap.key,
            "permission": cap.permission.value,
            "simulated": True,
            "would_call_network": False,
            "target_ref": proposal.target_ref,
            "parameters": proposal.parameters,
            "rollback": cap.rollback,
            "availability": cap.availability,
        }

    def apply(self, proposal: ActionProposal, approval_token: str) -> dict[str, Any]:
        raise NotImplementedError(
            f"{self.manifest.name}: apply() is intentionally unimplemented in the MVP. "
            "Wire a real client only behind an approved, identity-bound credential."
        )
