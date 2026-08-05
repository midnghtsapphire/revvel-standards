"""Inventory service.

Produces a clearly labeled, non-secret sample of connector state. Every status
value is a *hint* and MUST be revalidated at runtime before use; the model
carries ``revalidation_required=True`` on every row for that reason.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .config import IdentityConfig, Settings
from .connectors import registry
from .models import ConnectorStatus, Inventory, Permission

# Clearly labeled SAMPLE state. Not authoritative. Contains no secrets.
SAMPLE_STATUS: dict[str, tuple[str, list[Permission], str]] = {
    "gmail": ("connected", [Permission.read, Permission.suggest], "Sample: connected; write/delete not granted."),
    "google_calendar": ("connected", [Permission.read, Permission.suggest], "Sample: connected read-only."),
    "github": ("connected", [Permission.read, Permission.suggest], "Sample: connected; repo writes gated."),
    "dropbox": ("connected", [Permission.read], "Sample: connected metadata read."),
    "google_drive": (
        "connected",
        [Permission.read],
        "Sample: authorization succeeded; treat as ready-to-revalidate, not proven. Folder allowlist still empty.",
    ),
    "box": (
        "disabled_by_user",
        [],
        "Sample: authorization dismissed by the operator. Disabled; reconnect is operator-initiated only. Do not retrigger.",
    ),
    "local_companion_windows": ("not_configured", [], "Companion not installed/enrolled."),
    "mobile_companion": ("not_configured", [], "No device enrolled; phone data unreadable by default."),
    "n8n": ("not_configured", [], "Existing self-hosted instance not yet registered."),
    "openrouter": ("not_configured", [], "Service key not configured."),
}

NOTES = [
    "SAMPLE DATA ONLY: statuses are illustrative and contain no secrets, tokens, or account contents.",
    "All status values MUST be revalidated at runtime before any action is planned or applied.",
    "A 'connected' hint never implies write, delete, or unsubscribe permission.",
    "Identity binding is enforced separately: only allowlisted identities can be targeted.",
    "google_drive: authorization succeeded; status is ready-to-revalidate until a scoped metadata probe confirms it.",
    "box: disabled by operator choice. The fleet MUST NOT retrigger Box authorization; reconnect is operator-initiated.",
]


def build_demo_inventory(settings: Settings | None = None) -> Inventory:
    settings = settings or Settings.load()
    rows: list[ConnectorStatus] = []
    for manifest in registry.manifests():
        status, perms, note = SAMPLE_STATUS.get(manifest.name, ("unknown", [], "No sample state recorded."))
        rows.append(
            ConnectorStatus(
                connector=manifest.name,
                status=status,  # type: ignore[arg-type]
                permissions_granted=perms,
                identity_hint=_identity_hint(manifest.name, settings.identities),
                revalidation_required=True,
                notes=note,
            )
        )
    return Inventory(
        sample_data=True,
        autonomy_mode=settings.policy.autonomy_mode,
        connectors=rows,
        notes=list(NOTES),
    )


def _identity_hint(connector: str, identities: IdentityConfig) -> str | None:
    provider = {
        "gmail": "google",
        "google_calendar": "google",
        "google_drive": "google",
        "dropbox": "dropbox",
        "box": "box",
        "github": "github",
    }.get(connector)
    if provider is None:
        return None
    for entry in identities.identities:
        if entry.provider == provider and entry.allowlisted:
            return entry.identity
    return None


def write_inventory(inventory: Inventory, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{inventory.inventory_id}.json"
    path.write_text(inventory.model_dump_json(indent=2), encoding="utf-8")
    return path


def capability_matrix() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for manifest in registry.manifests():
        for cap in manifest.capabilities:
            rows.append(
                {
                    "connector": manifest.name,
                    "capability": cap.key,
                    "permission": cap.permission.value,
                    "risk_tier": cap.risk_tier.value,
                    "reversibility": cap.reversibility.value,
                    "externally_visible": cap.externally_visible,
                    "approval_gate": cap.approval_gate,
                    "availability": cap.availability,
                    "scopes": cap.scopes,
                    "rollback": cap.rollback,
                }
            )
    return rows


def dump_capability_matrix(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(capability_matrix(), indent=2), encoding="utf-8")
    return path
