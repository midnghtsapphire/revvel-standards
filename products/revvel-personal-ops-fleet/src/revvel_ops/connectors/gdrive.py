"""Google Drive adapter (skeleton). Sample state: authorized, pending runtime revalidation."""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="google_drive",
    provider="google",
    surface="cloud_api",
    default_permissions=[Permission.read],
    capabilities=[
        Capability(
            key="drive.files.search",
            permission=Permission.read,
            description="Search file metadata inside configured folder allowlist.",
            scopes=["https://www.googleapis.com/auth/drive.metadata.readonly"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="partial",
            notes="Sample inventory records authorization as succeeded; revalidate scopes at runtime before first read.",
        ),
        Capability(
            key="drive.files.propose_organize",
            permission=Permission.suggest,
            description="Propose renames/moves for duplicate or stale files.",
            scopes=[],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="available",
        ),
        Capability(
            key="drive.files.move",
            permission=Permission.write,
            description="Move a file between allowlisted folders.",
            scopes=["https://www.googleapis.com/auth/drive.file"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="move back to prior parent id in rollback_ref",
            availability="planned",
        ),
        Capability(
            key="drive.permissions.share",
            permission=Permission.write,
            description="Grant access to another principal.",
            scopes=["https://www.googleapis.com/auth/drive.file"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.conditionally_reversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="revoke permission id; recipient may have already copied content",
            availability="planned",
        ),
        Capability(
            key="drive.files.trash",
            permission=Permission.delete,
            description="Move a file to Drive trash.",
            scopes=["https://www.googleapis.com/auth/drive.file"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.conditionally_reversible,
            approval_gate="require_approval",
            rollback="restore from trash within retention window",
            availability="planned",
        ),
    ],
    limitations=[
        "drive.file scope only sees files the fleet created or the user explicitly opened to it.",
        "Full-drive scopes are deliberately not requested.",
    ],
    config_keys=["connectors.google_drive.identity", "connectors.google_drive.folder_allowlist"],
)


class GoogleDriveConnector(BaseConnector):
    manifest = MANIFEST
