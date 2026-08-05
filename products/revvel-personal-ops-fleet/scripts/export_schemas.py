#!/usr/bin/env python3
"""Regenerate schemas/*.json from the pydantic models. Offline, idempotent."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from revvel_ops.connectors.base import ConnectorManifest  # noqa: E402
from revvel_ops.models import (  # noqa: E402
    ActionProposal,
    AuditEvent,
    Inventory,
    Plan,
    PolicyDecision,
)

TARGETS = {
    "action_proposal.schema.json": ActionProposal,
    "policy_decision.schema.json": PolicyDecision,
    "audit_event.schema.json": AuditEvent,
    "plan.schema.json": Plan,
    "inventory.schema.json": Inventory,
    "connector_manifest.schema.json": ConnectorManifest,
}


def main() -> int:
    out_dir = ROOT / "schemas"
    out_dir.mkdir(exist_ok=True)
    for filename, model in TARGETS.items():
        schema = model.model_json_schema()
        schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
        schema["$id"] = f"https://revvel.local/schemas/{filename}"
        (out_dir / filename).write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
        print(f"wrote schemas/{filename}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
