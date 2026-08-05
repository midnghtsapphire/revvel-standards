"""n8n adapter (skeleton) for existing self-hosted agent workflows."""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="n8n",
    provider="n8n_self_hosted",
    surface="self_hosted",
    identity_binding="per_workflow_service_credential",
    default_permissions=[Permission.read],
    capabilities=[
        Capability(
            key="n8n.workflows.list",
            permission=Permission.read,
            description="Inventory existing workflows for the consolidation map.",
            scopes=["n8n:api:read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="planned",
        ),
        Capability(
            key="n8n.executions.read",
            permission=Permission.read,
            description="Read execution history for reliability metrics.",
            scopes=["n8n:api:read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="planned",
        ),
        Capability(
            key="n8n.workflows.trigger_dry_run",
            permission=Permission.suggest,
            description="Trigger a workflow flagged as side-effect free (test webhook).",
            scopes=["n8n:webhook:test"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="none needed; workflow must be declared side-effect free in config",
            availability="planned",
        ),
        Capability(
            key="n8n.workflows.trigger_production",
            permission=Permission.write,
            description="Trigger a production workflow that may email or post externally.",
            scopes=["n8n:webhook:prod"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.irreversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="workflow-specific compensating flow, must exist before enabling",
            availability="planned",
        ),
        Capability(
            key="n8n.workflows.modify",
            permission=Permission.write,
            description="Create or edit workflow definitions.",
            scopes=["n8n:api:write"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.conditionally_reversible,
            approval_gate="require_approval",
            rollback="restore exported workflow JSON snapshot recorded in rollback_ref",
            availability="planned",
        ),
    ],
    limitations=[
        "The fleet is a client of n8n, not its owner; n8n credentials stay inside n8n.",
        "Only workflows explicitly registered in config are addressable.",
    ],
    config_keys=["connectors.n8n.base_url", "connectors.n8n.workflow_allowlist"],
)


class N8nConnector(BaseConnector):
    manifest = MANIFEST
