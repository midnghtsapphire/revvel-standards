"""Gmail adapter (skeleton).

IMPORTANT: Do not assume every Gmail operation is reachable. The available
operation set depends on (a) the granted OAuth scopes and (b) what the host
platform's Gmail connector actually exposes at runtime. Several capabilities
below are marked ``planned`` or ``partial`` precisely because they are not
guaranteed to exist through the current connector and may require a
user-authorized OAuth client of your own.
"""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="gmail",
    provider="google",
    surface="cloud_api",
    default_permissions=[Permission.read, Permission.suggest],
    capabilities=[
        Capability(
            key="gmail.messages.search",
            permission=Permission.read,
            description="Search/list message metadata for triage.",
            scopes=["https://www.googleapis.com/auth/gmail.readonly"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="partial",
            notes="Metadata-first. Prefer gmail.metadata scope where the workflow allows it.",
        ),
        Capability(
            key="gmail.messages.categorize",
            permission=Permission.suggest,
            description="Classify threads into local categories; produces proposals only.",
            scopes=[],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="available",
            notes="Runs entirely in the control plane on already-fetched metadata.",
        ),
        Capability(
            key="gmail.labels.apply",
            permission=Permission.write,
            description="Apply a fleet-managed label to a thread.",
            scopes=["https://www.googleapis.com/auth/gmail.modify"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="remove label (label snapshot recorded in rollback_ref)",
            availability="planned",
            notes="Fleet labels are namespaced 'Revvel/*' so rollback never touches user labels.",
        ),
        Capability(
            key="gmail.threads.archive",
            permission=Permission.write,
            description="Remove INBOX label (archive) from a thread.",
            scopes=["https://www.googleapis.com/auth/gmail.modify"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="re-add INBOX label",
            availability="planned",
        ),
        Capability(
            key="gmail.threads.trash",
            permission=Permission.delete,
            description="Move a thread to Trash. Never permanent delete.",
            scopes=["https://www.googleapis.com/auth/gmail.modify"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.conditionally_reversible,
            approval_gate="require_approval",
            rollback="untrash within provider retention window (~30 days)",
            availability="planned",
            notes="Permanent delete is not implemented and is on the policy deny list.",
        ),
        Capability(
            key="gmail.subscriptions.unsubscribe",
            permission=Permission.unsubscribe,
            description="Propose an unsubscribe via List-Unsubscribe header.",
            scopes=["https://www.googleapis.com/auth/gmail.readonly"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.irreversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="none; resubscribe must be done manually by the operator",
            availability="planned",
            notes="Externally visible: it contacts a third party. Always human-approved.",
        ),
        Capability(
            key="gmail.messages.send",
            permission=Permission.write,
            description="Send a drafted message.",
            scopes=["https://www.googleapis.com/auth/gmail.send"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="none",
            availability="planned",
            notes="Out of scope for the MVP. Drafts only until explicitly enabled.",
        ),
    ],
    limitations=[
        "Not all Gmail API operations are exposed by the host platform connector; verify per capability at runtime.",
        "Permanent deletion, filter mutation, and forwarding rules are out of scope in the MVP.",
        "Scope escalation requires a new consent screen and a policy change entry in CHANGELOG.md.",
    ],
    config_keys=["connectors.gmail.identity", "connectors.gmail.permissions", "connectors.gmail.label_namespace"],
)


class GmailConnector(BaseConnector):
    manifest = MANIFEST
