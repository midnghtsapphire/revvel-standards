#!/usr/bin/env python3
"""WR-4483 M1 Heterogeneous-Ensemble AHP Engine — FastMCP server.

Exposes tools that run pipeline steps 1-7 only:
  STRUCTURE → GENERATE → VOTE → COMPARE → AGGREGATE → SOLVE → CHECK

M2 (critic gate, sensitivity) and M3 (REST wrapper) are intentionally absent.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path as _Path

# Allow `python path/to/server.py` without an editable install.
_ROOT = _Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dataclasses import dataclass
from typing import Any, Callable

try:
    from fastmcp import FastMCP
except ImportError:  # pragma: no cover - compatibility path for local smoke tests
    import dataclasses as _dc

    @_dc.dataclass
    class _ShimTool:
        name: str

    @_dc.dataclass
    class _ShimResource:
        uri: str

    class FastMCP:  # type: ignore[override]
        """Minimal compatibility shim so tests import without FastMCP installed."""

        def __init__(self, name: str, instructions: str = ""):
            self.name = name
            self.instructions = instructions
            self._tools: dict[str, Callable[..., object]] = {}
            self._resources: dict[str, Callable[..., object]] = {}

        def tool(self, fn: Callable[..., object] | None = None):
            def decorator(func: Callable[..., object]) -> Callable[..., object]:
                self._tools[func.__name__] = func
                return func

            return decorator(fn) if fn else decorator

        def resource(self, uri: str):
            def decorator(func: Callable[..., object]) -> Callable[..., object]:
                self._resources[uri] = func
                return func

            return decorator

        @property
        def tools(self) -> dict[str, Callable[..., object]]:
            return self._tools

        @property
        def resources(self) -> dict[str, Callable[..., object]]:
            return self._resources

        async def list_tools(self) -> list[_ShimTool]:
            return [_ShimTool(name=n) for n in self._tools]

        async def list_resources(self) -> list[_ShimResource]:
            return [_ShimResource(uri=u) for u in self._resources]

        def run(self) -> None:
            raise RuntimeError(
                "FastMCP is not installed. Install dependencies in "
                "mcp-servers/ensemble-ahp-engine/ to run this MCP server over stdio."
            )


from ensemble_ahp.config import DEFAULT_JUDGES, DEFAULT_JUDGE_COUNT
from ensemble_ahp.judges import force_mock
from ensemble_ahp.pipeline import PipelineInput, run_pipeline

mcp = FastMCP(
    name="Ensemble AHP Engine",
    instructions=(
        "WR-4483 M1 Heterogeneous-Ensemble AHP Decision Engine. "
        "Run multi-criteria decisions with 3 judges from distinct model families. "
        "Pipeline steps 1-7 only (STRUCTURE..CHECK). No critic gate or sensitivity in M1."
    ),
)


@dataclass(frozen=True)
class EngineConfig:
    openrouter_api_key: str
    ledger_dir: str
    repo: str
    force_mock: bool

    @classmethod
    def from_env(cls) -> "EngineConfig":
        return cls(
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY", "").strip(),
            ledger_dir=os.getenv("AHP_LEDGER_DIR", "logs/ensemble-ahp").strip(),
            repo=os.getenv("AHP_REPO", "midnghtsapphire/revvel-standards").strip(),
            force_mock=force_mock(),
        )


@mcp.tool
def ahp_engine_status() -> dict[str, Any]:
    """Return WR-4483 M1 engine readiness (key presence, mock mode, judge panel)."""
    cfg = EngineConfig.from_env()
    return {
        "server": "ensemble-ahp-engine",
        "wr": "WR-4483",
        "milestone": "M1",
        "steps": [
            "STRUCTURE",
            "GENERATE",
            "VOTE",
            "COMPARE",
            "AGGREGATE",
            "SOLVE",
            "CHECK",
        ],
        "deferred": {"M2": ["critic_gate", "sensitivity"], "M3": ["rest_api_wrapper"]},
        "openrouter_configured": bool(cfg.openrouter_api_key),
        "mock_mode": cfg.force_mock,
        "ledger_dir": cfg.ledger_dir,
        "repo": cfg.repo,
        "default_judges": [
            {
                "id": j.id,
                "family": j.family,
                "primary_model": j.primary_model,
            }
            for j in DEFAULT_JUDGES
        ],
        "min_judges": DEFAULT_JUDGE_COUNT,
        "failover": {
            "402": "immediate keyless tier-2",
            "429": "one backoff <=30s then failover",
            "5xx": "one retry then failover",
        },
    }


@mcp.tool
def run_ahp(
    goal: str,
    criteria: list[str] | None = None,
    alternatives: list[str] | None = None,
    k_judges: int = 3,
    n_criteria: int = 5,
    n_alternatives: int = 4,
    task_ref: str | None = None,
    ledger_path: str | None = None,
    mock: bool | None = None,
) -> dict[str, Any]:
    """Run WR-4483 M1 AHP pipeline steps 1-7 and return the decision report.

    Args:
        goal: Decision goal statement (required).
        criteria: Optional operator-provided criteria (skips free GENERATE for criteria if both provided).
        alternatives: Optional operator-provided alternatives.
        k_judges: Number of judges (M1 minimum/default 3; each a distinct family).
        n_criteria: How many top criteria to keep after VOTE.
        n_alternatives: How many top alternatives to keep after VOTE.
        task_ref: Optional PR/issue/run id for ledger task_ref.
        ledger_path: Optional explicit JSONL ledger path.
        mock: Force offline mock judges when True; auto when no OPENROUTER_API_KEY.
    """
    result = run_pipeline(
        PipelineInput(
            goal=goal,
            criteria=criteria,
            alternatives=alternatives,
            k_judges=k_judges,
            n_criteria=n_criteria,
            n_alternatives=n_alternatives,
            task_ref=task_ref,
            ledger_path=ledger_path,
            mock=mock,
        )
    )
    return result.report


@mcp.tool
def render_ensemble_ahp_mcp_entry(profile: str = "repo") -> dict[str, Any]:
    """Return a ready-to-paste `.mcp.json` entry for this server."""
    if profile not in {"repo", "template"}:
        raise ValueError("profile must be 'repo' or 'template'")
    script = "./mcp-servers/ensemble-ahp-engine/ensemble_ahp/server.py"
    if profile == "template":
        script = (
            "${REVVEL_STANDARDS_PATH}/mcp-servers/ensemble-ahp-engine/"
            "ensemble_ahp/server.py"
        )
    return {
        "ensemble-ahp-engine": {
            "command": "uv",
            "args": ["run", "python", script],
            "env": {
                "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
                "AHP_LEDGER_DIR": "${AHP_LEDGER_DIR:-logs/ensemble-ahp}",
                "AHP_REPO": "${AHP_REPO:-midnghtsapphire/revvel-standards}",
                "AHP_FORCE_MOCK": "${AHP_FORCE_MOCK:-}",
            },
        }
    }


@mcp.resource("data://ensemble-ahp/env-schema")
def env_schema() -> dict[str, Any]:
    """Environment variables for the ensemble AHP engine."""
    return {
        "optional": {
            "OPENROUTER_API_KEY": "OpenRouter key for live heterogeneous judges",
            "AHP_LEDGER_DIR": "Directory for per-run FAILURE-LEDGER JSONL (default logs/ensemble-ahp)",
            "AHP_LEDGER_PATH": "Exact ledger file path override",
            "AHP_REPO": "repo field written into ledger lines",
            "AHP_FORCE_MOCK": "If truthy, force offline mock judges",
            "AHP_MOCK_JUDGES": "Alias of AHP_FORCE_MOCK",
        },
        "notes": [
            "Without OPENROUTER_API_KEY the engine runs in labelled mock mode so steps 1-7 still complete.",
            "Mock mode is explicit in the report and ledger (never silent).",
        ],
    }


@mcp.resource("data://ensemble-ahp/architecture")
def architecture_summary() -> dict[str, Any]:
    """M1 architecture binding for WR-4483."""
    return {
        "wr": "WR-4483",
        "milestone": "M1",
        "pipeline": [
            "STRUCTURE",
            "GENERATE",
            "VOTE",
            "COMPARE",
            "AGGREGATE(geometric mean)",
            "SOLVE",
            "CHECK(CR + per-cell CV)",
        ],
        "judges": "3 distinct model families via OpenRouter lanes (WR-4480)",
        "failover": "WR-4481: 402 immediate keyless; 429 one backoff then failover",
        "audit": "FAILURE-LEDGER-compatible JSONL (agent-pack/failure-ledger.schema.json)",
        "out_of_scope_m1": ["critic_gate", "sensitivity", "rest_api", "pdf_report"],
    }


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
