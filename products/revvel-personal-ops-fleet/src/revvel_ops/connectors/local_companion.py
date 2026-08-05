"""Windows local filesystem companion adapter (skeleton).

The companion is a user-installed Windows service/tray app. It is outbound-only:
it dials the control plane over TLS, receives *no* inbound connections, and
operates strictly inside an explicit folder allowlist. There is no "whole disk"
mode and no wildcard root; an empty allowlist means the companion does nothing.
"""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="local_companion_windows",
    provider="revvel_local_companion",
    surface="local_companion",
    identity_binding="machine_enrollment_token + local_os_user",
    default_permissions=[Permission.read],
    capabilities=[
        Capability(
            key="local.fs.index_allowlisted",
            permission=Permission.read,
            description="Index metadata (path, size, mtime, hash) inside allowlisted folders only.",
            scopes=["folder_allowlist:read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="planned",
            notes="Content is never uploaded; only metadata and hashes leave the machine.",
        ),
        Capability(
            key="local.fs.propose_cleanup",
            permission=Permission.suggest,
            description="Propose duplicate/stale-file cleanup for a human queue.",
            scopes=[],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="planned",
        ),
        Capability(
            key="local.fs.move_to_staging",
            permission=Permission.write,
            description="Move a file into a local quarantine/staging folder (reversible).",
            scopes=["folder_allowlist:write"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="move back from staging using recorded original path",
            availability="planned",
            notes="Deletion is never performed; staging + retention is the deletion substitute.",
        ),
        Capability(
            key="local.fs.delete",
            permission=Permission.delete,
            description="Delete a local file outright.",
            scopes=[],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            approval_gate="deny",
            rollback="none",
            availability="unavailable",
            notes="Not implemented and hard-denied. Use move_to_staging instead.",
        ),
        Capability(
            key="local.process.run_allowlisted_command",
            permission=Permission.write,
            description="Run a command from a signed, user-defined command allowlist.",
            scopes=["command_allowlist:execute"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            approval_gate="require_approval",
            rollback="none; command-specific compensating action must be documented first",
            availability="planned",
            notes="Empty by default. Arbitrary shell execution is never enabled.",
        ),
    ],
    limitations=[
        "Outbound-only: the companion never listens on a port and is not remotely addressable.",
        "Folder allowlist is explicit and absolute; no globs above an allowlisted root, no system dirs.",
        "Local approval prompt (Windows toast + tray confirm) is required for every write capability.",
        "Enrollment requires a one-time operator-generated pairing code; tokens are stored in Windows DPAPI/Credential Manager.",
        "The companion refuses to start if the allowlist includes C:\\Windows, Program Files, or a user profile root.",
    ],
    config_keys=[
        "companion.local.folder_allowlist",
        "companion.local.command_allowlist",
        "companion.local.staging_dir",
        "companion.local.enrollment_id",
    ],
)


class LocalCompanionConnector(BaseConnector):
    manifest = MANIFEST
