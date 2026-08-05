"""Dropbox adapter (skeleton)."""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="dropbox",
    provider="dropbox",
    surface="cloud_api",
    default_permissions=[Permission.read],
    capabilities=[
        Capability(
            key="dropbox.files.list",
            permission=Permission.read,
            description="List metadata under allowlisted paths.",
            scopes=["files.metadata.read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="partial",
        ),
        Capability(
            key="dropbox.files.propose_dedupe",
            permission=Permission.suggest,
            description="Propose duplicate consolidation using content hashes.",
            scopes=["files.metadata.read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="available",
        ),
        Capability(
            key="dropbox.files.move",
            permission=Permission.write,
            description="Move/rename within the allowlist.",
            scopes=["files.content.write"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="move back using prior path in rollback_ref",
            availability="planned",
        ),
        Capability(
            key="dropbox.sharing.create_link",
            permission=Permission.write,
            description="Create a shared link.",
            scopes=["sharing.write"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.conditionally_reversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="revoke link id",
            availability="planned",
        ),
        Capability(
            key="dropbox.files.delete",
            permission=Permission.delete,
            description="Soft-delete a file (recoverable).",
            scopes=["files.content.write"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.conditionally_reversible,
            approval_gate="require_approval",
            rollback="restore via file revision id",
            availability="planned",
        ),
    ],
    limitations=["Team/admin scopes are never requested.", "Permanent delete is denied by policy."],
    config_keys=["connectors.dropbox.identity", "connectors.dropbox.path_allowlist"],
)


class DropboxConnector(BaseConnector):
    manifest = MANIFEST
