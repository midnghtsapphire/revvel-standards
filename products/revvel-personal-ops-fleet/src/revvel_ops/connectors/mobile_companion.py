"""Mobile companion *contract* (skeleton, not an implementation).

There is no default ability to read a phone. Nothing in this repository can
observe a mobile device. Mobile participation requires ALL of the following:

  1. An installed companion app on the device (user-initiated install).
  2. User-approved OS permissions, granted per data class in the OS settings
     (notifications, photos, files, location, ...). Android and iOS both deny
     by default and can revoke at any time.
  3. A separate local authorization step: device enrollment with a pairing code
     plus device-biometric confirmation, distinct from cloud OAuth.

Absent any of these, every capability below resolves to ``unavailable``.
"""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="mobile_companion",
    provider="revvel_mobile_companion",
    surface="mobile_companion",
    identity_binding="device_enrollment + biometric_local_auth",
    default_permissions=[],
    capabilities=[
        Capability(
            key="mobile.capture.push_note",
            permission=Permission.suggest,
            description="Operator pushes a note/voice memo to the control plane from the device.",
            scopes=["companion:notes"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="delete captured note record",
            availability="planned",
            notes="Device-initiated only. The control plane cannot pull from the device.",
        ),
        Capability(
            key="mobile.notifications.summarize_optin",
            permission=Permission.read,
            description="Summarize notifications the user explicitly opted into forwarding.",
            scopes=["os:notification_listener"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.reversible,
            approval_gate="require_approval",
            rollback="revoke OS permission; stop forwarding",
            availability="unavailable",
            notes="Android notification-listener style permission; iOS has no equivalent. Off by default.",
        ),
        Capability(
            key="mobile.files.upload_selected",
            permission=Permission.read,
            description="Upload files the user selected via the OS document picker.",
            scopes=["os:document_picker"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="require_approval",
            rollback="delete uploaded object",
            availability="unavailable",
            notes="Picker-scoped only. No filesystem enumeration.",
        ),
        Capability(
            key="mobile.approvals.respond",
            permission=Permission.write,
            description="Approve or reject a queued proposal from the device.",
            scopes=["companion:approvals"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="require_approval",
            rollback="approval is recorded in the audit chain and can be superseded, not erased",
            availability="planned",
            notes="Requires biometric confirmation per approval.",
        ),
        Capability(
            key="mobile.device.read_arbitrary",
            permission=Permission.read,
            description="Arbitrary device/screen/message reading.",
            scopes=[],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            approval_gate="deny",
            rollback="none",
            availability="unavailable",
            notes="Explicitly not offered. Documented so nobody assumes it exists.",
        ),
    ],
    limitations=[
        "No phone data is readable by default; the OS blocks it and the fleet does not attempt it.",
        "Device-initiated push model only; there is no server-to-device pull channel for user data.",
        "iOS restricts background notification and file access far more than Android; assume less capability, not more.",
        "Revoking OS permissions or unenrolling the device disables the capability immediately.",
    ],
    config_keys=["companion.mobile.enrollment_id", "companion.mobile.enabled_capabilities"],
)


class MobileCompanionConnector(BaseConnector):
    manifest = MANIFEST
