"""Google Calendar adapter (skeleton)."""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="google_calendar",
    provider="google",
    surface="cloud_api",
    default_permissions=[Permission.read, Permission.suggest],
    capabilities=[
        Capability(
            key="calendar.events.list",
            permission=Permission.read,
            description="Read events for conflict detection and daily briefs.",
            scopes=["https://www.googleapis.com/auth/calendar.readonly"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="partial",
        ),
        Capability(
            key="calendar.events.propose_hold",
            permission=Permission.suggest,
            description="Produce a focus-block/hold proposal without writing.",
            scopes=[],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="available",
        ),
        Capability(
            key="calendar.events.create_private_hold",
            permission=Permission.write,
            description="Create a private, no-guest hold on the operator's own calendar.",
            scopes=["https://www.googleapis.com/auth/calendar.events"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="delete created event id recorded in rollback_ref",
            availability="planned",
            notes="Guest invitations are externally visible and always require approval.",
        ),
        Capability(
            key="calendar.events.invite_guests",
            permission=Permission.write,
            description="Create or modify an event with external guests.",
            scopes=["https://www.googleapis.com/auth/calendar.events"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="cancellation notice; the original notification cannot be recalled",
            availability="planned",
        ),
    ],
    limitations=["Calendar deletion of pre-existing user events is on the policy deny list."],
    config_keys=["connectors.google_calendar.identity", "connectors.google_calendar.calendar_ids"],
)


class GoogleCalendarConnector(BaseConnector):
    manifest = MANIFEST
