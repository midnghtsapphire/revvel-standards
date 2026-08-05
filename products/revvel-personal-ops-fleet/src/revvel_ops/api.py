"""Optional FastAPI read/plan surface.

The API exposes planning and inspection only. There is no apply endpoint, and
every route is safe to call repeatedly: it touches fixtures and local audit
files, never an external service. Bind to localhost; there is no auth layer yet
(tracked in docs/IMPLEMENTATION_BACKLOG.md).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import inventory as inventory_service
from . import planner
from .audit import AuditLog, verify_dir
from .config import REPO_ROOT, Settings
from .connectors import registry
from .models import AutonomyMode

app = FastAPI(
    title="Revvel Personal Ops Fleet (control plane, read/plan only)",
    version="0.1.0",
    description="Plan and dry-run endpoints. No apply endpoint exists by design.",
)

DEFAULT_FIXTURE = REPO_ROOT / "fixtures" / "gmail_threads.sample.json"


class PlanRequest(BaseModel):
    skill: str = "email_cleanup"
    identity: str | None = None
    autonomy_mode: AutonomyMode | None = None
    fixture: str | None = None
    dry_run: bool = True


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "apply_enabled": False, "network_calls": 0}


@app.get("/v1/config")
def get_config() -> dict[str, Any]:
    s = Settings.load()
    return {
        "autonomy_mode": s.policy.autonomy_mode.value,
        "thresholds": s.policy.thresholds.model_dump(),
        "allowlisted_identities": s.identities.allowlisted_identities(),
        "strict_identity_binding": s.identities.strict_identity_binding,
    }


@app.get("/v1/connectors")
def get_connectors() -> list[dict[str, Any]]:
    return [m.model_dump(mode="json") for m in registry.manifests()]


@app.get("/v1/inventory")
def get_inventory() -> dict[str, Any]:
    return inventory_service.build_demo_inventory().model_dump(mode="json")


@app.post("/v1/plans")
def create_plan(req: PlanRequest) -> dict[str, Any]:
    settings = Settings.load()
    if req.skill != "email_cleanup":
        raise HTTPException(status_code=400, detail="unknown skill")
    identity = req.identity or settings.identities.default_identity
    if not identity:
        raise HTTPException(status_code=400, detail="no identity configured")
    fixture = Path(req.fixture) if req.fixture else DEFAULT_FIXTURE
    if not fixture.exists():
        raise HTTPException(status_code=400, detail="fixture not found")

    run_id = planner.new_run_id()
    audit = AuditLog(settings.storage.resolved()["audit_dir"], run_id, settings.storage.redact_content)
    plan = planner.load_and_plan(fixture, settings, audit, identity=identity, autonomy_mode=req.autonomy_mode)
    body: dict[str, Any] = {
        "plan": plan.model_dump(mode="json"),
        "counts": plan.counts(),
        "audit_file": str(audit.path),
        "audit_head": audit.head_hash,
    }
    if req.dry_run:
        body["dry_run"] = planner.dry_run(plan, audit)
    return body


@app.post("/v1/apply")
def apply_not_available() -> dict[str, Any]:
    raise HTTPException(
        status_code=501,
        detail="apply is not implemented: MVP is plan/dry-run only and requires human approval out-of-band",
    )


@app.get("/v1/audit/verify")
def audit_verify() -> list[dict[str, Any]]:
    return verify_dir(Settings.load().storage.resolved()["audit_dir"])
