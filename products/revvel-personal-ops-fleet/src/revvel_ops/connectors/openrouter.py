"""OpenRouter adapter (skeleton) — model routing for reasoning steps."""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="openrouter",
    provider="openrouter",
    surface="cloud_api",
    identity_binding="single_service_key_scoped_to_fleet",
    default_permissions=[Permission.suggest],
    capabilities=[
        Capability(
            key="openrouter.models.list",
            permission=Permission.read,
            description="List available models and pricing for routing decisions.",
            scopes=["models:read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="planned",
        ),
        Capability(
            key="openrouter.chat.completion_redacted",
            permission=Permission.suggest,
            description="Run a reasoning step on redacted, minimized input.",
            scopes=["chat:write"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="discard output; no external side effects",
            availability="planned",
            notes="Egress budget + per-run token cap enforced. Raw message bodies are never sent.",
        ),
        Capability(
            key="openrouter.chat.completion_raw_content",
            permission=Permission.write,
            description="Send unredacted personal content to a third-party model.",
            scopes=["chat:write"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            externally_visible=True,
            approval_gate="deny",
            rollback="none; data has left the boundary",
            availability="unavailable",
            notes="Denied by default. Enabling requires an ADR and an explicit config override.",
        ),
    ],
    limitations=[
        "Model choice, spend cap, and redaction profile are user-configurable per skill.",
        "No training-data sharing: configure zero-retention endpoints where the provider supports it.",
    ],
    config_keys=["connectors.openrouter.default_model", "connectors.openrouter.monthly_spend_cap_usd"],
)


class OpenRouterConnector(BaseConnector):
    manifest = MANIFEST
