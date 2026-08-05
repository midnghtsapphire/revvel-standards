"""Box adapter (skeleton). Sample state: disabled by operator choice; reconnect required.

Authorization was dismissed by the operator. The fleet must never retrigger a Box
authorization prompt: every Box capability resolves to unavailable until the
operator explicitly reconnects.
"""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="box",
    provider="box",
    surface="cloud_api",
    default_permissions=[Permission.read],
    capabilities=[
        Capability(
            key="box.items.list",
            permission=Permission.read,
            description="List folder items under the allowlist.",
            scopes=["root_readonly"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="unavailable",
            notes="Box is disabled by operator choice. Do not retrigger authorization.",
        ),
        Capability(
            key="box.items.propose_retention",
            permission=Permission.suggest,
            description="Propose retention/archive candidates.",
            scopes=[],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="available",
        ),
        Capability(
            key="box.items.move",
            permission=Permission.write,
            description="Move an item within the allowlist.",
            scopes=["root_readwrite"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="move back to prior folder id",
            availability="planned",
        ),
        Capability(
            key="box.collaborations.create",
            permission=Permission.write,
            description="Add a collaborator.",
            scopes=["manage_managed_users"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.conditionally_reversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="remove collaboration id",
            availability="planned",
        ),
        Capability(
            key="box.items.trash",
            permission=Permission.delete,
            description="Move an item to Box trash.",
            scopes=["root_readwrite"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.conditionally_reversible,
            approval_gate="require_approval",
            rollback="restore from trash within retention policy",
            availability="planned",
        ),
    ],
    limitations=[
        "Enterprise admin and retention-policy APIs are out of scope.",
        "Disabled by operator choice: reconnect is operator-initiated only; the fleet never prompts for Box auth.",
    ],
    config_keys=["connectors.box.identity", "connectors.box.folder_allowlist"],
)


class BoxConnector(BaseConnector):
    manifest = MANIFEST
