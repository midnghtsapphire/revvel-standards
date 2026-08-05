"""GitHub adapter (skeleton).

This task never creates or modifies cloud repositories. The MVP treats GitHub
as read + propose only; branch/PR writes are documented but gated.
"""

from __future__ import annotations

from .base import BaseConnector, Capability, ConnectorManifest
from ..models import Permission, Reversibility, RiskTier

MANIFEST = ConnectorManifest(
    name="github",
    provider="github",
    surface="cloud_api",
    default_permissions=[Permission.read, Permission.suggest],
    capabilities=[
        Capability(
            key="github.repos.read",
            permission=Permission.read,
            description="Read repo metadata, issues, PRs for allowlisted repos.",
            scopes=["repo:read", "issues:read"],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="n/a (read-only)",
            availability="partial",
        ),
        Capability(
            key="github.issues.propose",
            permission=Permission.suggest,
            description="Draft issue text locally without posting.",
            scopes=[],
            risk_tier=RiskTier.low,
            reversibility=Reversibility.reversible,
            approval_gate="allow",
            rollback="discard proposal",
            availability="available",
        ),
        Capability(
            key="github.branches.create",
            permission=Permission.write,
            description="Create a branch in an allowlisted repo.",
            scopes=["contents:write"],
            risk_tier=RiskTier.medium,
            reversibility=Reversibility.reversible,
            approval_gate="propose",
            rollback="delete branch ref recorded in rollback_ref",
            availability="planned",
        ),
        Capability(
            key="github.pulls.create",
            permission=Permission.write,
            description="Open a pull request (notifies reviewers).",
            scopes=["pull_requests:write"],
            risk_tier=RiskTier.high,
            reversibility=Reversibility.conditionally_reversible,
            externally_visible=True,
            approval_gate="require_approval",
            rollback="close PR; notifications already delivered",
            availability="planned",
        ),
        Capability(
            key="github.repos.delete",
            permission=Permission.delete,
            description="Delete a repository.",
            scopes=["delete_repo"],
            risk_tier=RiskTier.critical,
            reversibility=Reversibility.irreversible,
            externally_visible=True,
            approval_gate="deny",
            rollback="none",
            availability="unavailable",
            notes="Hard-denied in config/policy.example.yaml.",
        ),
    ],
    limitations=[
        "Force-push, history rewrite, org/member administration, and repo deletion are denied.",
        "Fine-grained PATs or a GitHub App with repo allowlists only; classic broad PATs are rejected.",
    ],
    config_keys=["connectors.github.identity", "connectors.github.repo_allowlist"],
)


class GitHubConnector(BaseConnector):
    manifest = MANIFEST
