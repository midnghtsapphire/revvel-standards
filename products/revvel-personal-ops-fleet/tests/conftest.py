from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest

from revvel_ops.config import (
    IdentityConfig,
    IdentityEntry,
    PolicyConfig,
    Settings,
    StorageConfig,
    load_identities,
    load_policy,
)
from revvel_ops.models import AutonomyMode, Permission

REPO = Path(__file__).resolve().parents[1]
FIXTURE = REPO / "fixtures" / "gmail_threads.sample.json"
NOW = datetime(2026, 8, 3, 12, 0, 0, tzinfo=timezone.utc)
IDENTITY = "angelreporters@gmail.com"


@pytest.fixture
def policy() -> PolicyConfig:
    return load_policy(REPO / "config" / "policy.example.yaml")


@pytest.fixture
def identities() -> IdentityConfig:
    return load_identities(REPO / "config" / "identities.example.yaml")


@pytest.fixture
def permissive_identities() -> IdentityConfig:
    return IdentityConfig(
        strict_identity_binding=True,
        default_identity=IDENTITY,
        identities=[
            IdentityEntry(
                identity=IDENTITY,
                provider="google",
                allowlisted=True,
                permissions=[
                    Permission.read,
                    Permission.suggest,
                    Permission.write,
                    Permission.delete,
                    Permission.unsubscribe,
                ],
            )
        ],
    )


@pytest.fixture
def settings(policy, permissive_identities, tmp_path) -> Settings:
    storage = StorageConfig(
        audit_dir=str(tmp_path / "audit"),
        plan_dir=str(tmp_path / "plans"),
        inventory_dir=str(tmp_path / "inventory"),
    )
    return Settings(policy=policy, identities=permissive_identities, storage=storage)


@pytest.fixture
def audit(settings, tmp_path):
    from revvel_ops.audit import AuditLog

    return AuditLog(Path(settings.storage.audit_dir), "run_test", redact_content=True)


@pytest.fixture
def fixture_path() -> Path:
    return FIXTURE


@pytest.fixture(autouse=True)
def isolate_var_dir(tmp_path, monkeypatch):
    """Keep CLI/API tests from writing into the repository's var/ tree."""
    monkeypatch.setenv("REVVEL_VAR_DIR", str(tmp_path / "var_root"))
    yield
