"""Configuration loading: policy, identities, storage.

All configuration is user-editable YAML. Defaults are deliberately the most
restrictive value so an unconfigured deployment cannot mutate anything.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from .models import AutonomyMode, Permission

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = REPO_ROOT / "config"


class ScoreWeights(BaseModel):
    evidence_count: int = 12
    evidence_cap: int = 36
    reversible_bonus: int = 20
    conditionally_reversible_bonus: int = 8
    internal_only_bonus: int = 12
    rollback_ref_bonus: int = 10
    heuristic_weight: float = 0.30
    risk_penalty: dict[str, int] = Field(
        default_factory=lambda: {"low": 0, "medium": 10, "high": 25, "critical": 45}
    )
    permission_penalty: dict[str, int] = Field(
        default_factory=lambda: {
            "read": 0,
            "suggest": 0,
            "write": 8,
            "unsubscribe": 18,
            "delete": 30,
        }
    )


class Thresholds(BaseModel):
    allow_min_confidence: int = 90
    propose_min_confidence: int = 55


class PolicyConfig(BaseModel):
    autonomy_mode: AutonomyMode = AutonomyMode.review_everything
    dry_run_default: bool = True
    thresholds: Thresholds = Field(default_factory=Thresholds)
    weights: ScoreWeights = Field(default_factory=ScoreWeights)
    always_require_approval_permissions: list[Permission] = Field(
        default_factory=lambda: [Permission.delete, Permission.unsubscribe]
    )
    always_require_approval_capabilities: list[str] = Field(default_factory=list)
    deny_capabilities: list[str] = Field(default_factory=list)
    externally_visible_requires_approval: bool = True
    irreversible_requires_approval: bool = True
    safe_automation_allowed_capabilities: list[str] = Field(default_factory=list)
    approvers: list[str] = Field(default_factory=lambda: ["primary_operator"])
    approval_ttl_minutes: int = 720


class IdentityEntry(BaseModel):
    identity: str
    provider: str
    allowlisted: bool = False
    permissions: list[Permission] = Field(default_factory=list)
    label: str = ""


class IdentityConfig(BaseModel):
    strict_identity_binding: bool = True
    default_identity: str | None = None
    identities: list[IdentityEntry] = Field(default_factory=list)

    def allowlisted_identities(self) -> list[str]:
        return [i.identity for i in self.identities if i.allowlisted]

    def is_allowed(self, identity: str, permission: Permission | None = None) -> bool:
        for entry in self.identities:
            if entry.identity != identity:
                continue
            if not entry.allowlisted:
                return False
            if permission is None:
                return True
            return permission in entry.permissions
        return False


class StorageConfig(BaseModel):
    audit_dir: str = "var/audit"
    plan_dir: str = "var/plans"
    inventory_dir: str = "var/inventory"
    retention_days: int = 400
    redact_content: bool = True

    def resolved(self, root: Path | None = None) -> dict[str, Path]:
        """Resolve artifact directories.

        ``REVVEL_VAR_DIR`` overrides the root so tests and throwaway runs never
        write into the repository's ``var/`` tree.
        """
        env_root = os.getenv("REVVEL_VAR_DIR")
        base = root or (Path(env_root) if env_root else REPO_ROOT)
        return {
            "audit_dir": base / self.audit_dir,
            "plan_dir": base / self.plan_dir,
            "inventory_dir": base / self.inventory_dir,
        }


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _pick(explicit: Path | None, primary: str, example: str) -> Path:
    if explicit is not None:
        return explicit
    real = CONFIG_DIR / primary
    return real if real.exists() else CONFIG_DIR / example


def load_policy(path: Path | None = None) -> PolicyConfig:
    data = _load_yaml(_pick(path, "policy.yaml", "policy.example.yaml"))
    env_mode = os.getenv("REVVEL_AUTONOMY_MODE")
    if env_mode:
        data["autonomy_mode"] = env_mode
    return PolicyConfig(**data)


def load_identities(path: Path | None = None) -> IdentityConfig:
    data = _load_yaml(_pick(path, "identities.yaml", "identities.example.yaml"))
    return IdentityConfig(**data)


def load_storage(path: Path | None = None) -> StorageConfig:
    data = _load_yaml(_pick(path, "storage.yaml", "storage.example.yaml"))
    return StorageConfig(**data)


class Settings(BaseModel):
    policy: PolicyConfig
    identities: IdentityConfig
    storage: StorageConfig

    @classmethod
    def load(cls) -> "Settings":
        return cls(
            policy=load_policy(),
            identities=load_identities(),
            storage=load_storage(),
        )
