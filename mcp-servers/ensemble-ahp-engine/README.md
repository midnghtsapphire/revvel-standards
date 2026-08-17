# Ensemble AHP Engine (WR-4483 M1)

Heterogeneous-ensemble Analytic Hierarchy Process decision engine exposed as a
Python **FastMCP** server.

**Milestone:** M1 only — pipeline steps 1–7. Critic gate, sensitivity, and REST
wrapper are deferred (M2/M3). Human merge required for the implementing PR.

## Pipeline (M1)

```text
STRUCTURE → GENERATE → VOTE → COMPARE → AGGREGATE (geometric mean)
  → SOLVE → CHECK (CR + per-cell CV across judges) → report
```

## Judges

Default panel = **3 judges**, each a **distinct model family** (WR-4483 R1):

| Judge id | Family | Primary (OpenRouter) |
| --- | --- | --- |
| `judge-anthropic` | anthropic | `anthropic/claude-opus-4.7` |
| `judge-openai` | openai | `openai/gpt-4o-mini` |
| `judge-google` | google | `google/gemini-2.5-flash` |

Failover follows WR-4481:

- HTTP **402** → immediate keyless/tier-2 lane (no primary retry)
- HTTP **429** → one backoff (≤30s) then failover
- Every judge call and failover is appended to a FAILURE-LEDGER-compatible JSONL
  file (`agent-pack/failure-ledger.schema.json`)
- Ledger asserts **≥2 distinct families** were actually invoked

## Install

```bash
cd mcp-servers/ensemble-ahp-engine
pip install -e .
# or: uv pip install -e .
```

FastMCP is required only to serve over stdio. The module ships a compatibility
shim so unit tests and the CLI import cleanly without FastMCP installed.

## Run a sample decision (CLI)

```bash
# Offline / CI-safe (mock judges — labelled in report + ledger)
AHP_FORCE_MOCK=1 python -m ensemble_ahp.cli --sample --pretty

# Live judges (needs funded OPENROUTER_API_KEY)
export OPENROUTER_API_KEY=...
python -m ensemble_ahp.cli --sample --pretty \
  --ledger /tmp/ahp-run.jsonl
```

## MCP server

```bash
python mcp-servers/ensemble-ahp-engine/ensemble_ahp/server.py
# or after install: ensemble-ahp-engine
```

### Tools

| Tool | Description |
| --- | --- |
| `ahp_engine_status` | Readiness, judge panel, mock mode |
| `run_ahp` | Full M1 pipeline → ranked alts, weights, CR, dispersion, cost |
| `render_ensemble_ahp_mcp_entry` | Ready-to-paste `.mcp.json` snippet |

### Resources

| Resource | Description |
| --- | --- |
| `data://ensemble-ahp/env-schema` | Env vars |
| `data://ensemble-ahp/architecture` | M1 architecture binding |

## Report fields (M1)

- `ranked_alternatives` — score + rank
- `criteria_weights`
- `consistency_ratio` — CR / CI / λ_max / Saaty RI (consistency ≠ correctness)
- `dispersion` — per-cell coefficient of variation across judges (separate from CR)
- `cost` — full cost line; mock mode reports `total_usd=0` explicitly (not estimated fiction)
- `families_invoked` + `families_asserted_ge_2`
- `ledger_path`

## Environment

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Live judges via OpenRouter |
| `AHP_FORCE_MOCK` / `AHP_MOCK_JUDGES` | Force offline mock judges |
| `AHP_LEDGER_DIR` | Default `logs/ensemble-ahp` |
| `AHP_LEDGER_PATH` | Exact JSONL path override |
| `AHP_REPO` | `repo` field in ledger lines |

Without an API key the engine **automatically** uses labelled mock judges so
local acceptance (`steps 1-7 on a sample goal`) always completes.

## Tests

From repo root:

```bash
node --test tests/ensemble-ahp-engine.test.js
```

## Out of scope (do not expand in M1)

- Critic gate (M2)
- Sensitivity ±20% (M2)
- REST API wrapper / pricing (M3)
- PDF report (M4)
- Human-panel benchmark (M5)

## References

- `standards/WR-4483-ensemble-ahp-engine.md`
- `standards/WR-4482-evidence-first-directive.md`
- `standards/WR-4481-lane-failover.md`
- `agent-pack/failure-ledger.schema.json`
- `agent-pack/routing-failover.example.yml`
