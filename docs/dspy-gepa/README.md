# DSPy GEPA for agent prompts (WR #18338)

GEPA optimizes the instructions of a DSPy program when the metric returns text
feedback. The feedback here is the agent scorecard: the same five dimensions
and weights as `scripts/agent-scorecard/score-engine.js` and
`docs/AGENT_SCORECARD_STANDARD.md`. A shortfall names the dimension and the
miss, which is what GEPA's reflection step reads.

`GOAP_AGENT_PROMPT.md` and `AGENT_BUILD_PROMPT.md` are read and never written.
New text is appended under `gepa_prompt_versions` in `.github/agent-prompts.yml`.
The two `status: seed` entries are copies of those source files so the version
list has a starting point. They are not optimized prompts.

## What is pinned

`scripts/dspy_gepa/requirements.lock` pins the environment resolved on
2026-11-11: `dspy==3.5.0`, `gepa==0.1.4`, `openai==3.49.0`, and the packages
those three installed. DSPy 3.5.0 needs Python `>=3.10,<3.16`. Settings for a
real run are in `config/dspy-gepa.yml` (`auto: light`, one thread).

## Trainset

`wr/memory/dspy-gepa-trainset.json` is built from every markdown file in
`wr/issues`. On 2026-11-11 that was **390 files, 390 examples** (359 numbered
`issue-<id>-*.md` files and 31 other WR notes). Files that share an issue
number stay separate examples. Splits:

| Split | Examples | Role |
| --- | ---: | --- |
| train | 315 | reflective updates |
| validation | 24 | Pareto selection. Capped because the light budget grows with this size. |
| test | 51 | held-out before/after scorecard. Not used to edit the prompt. |

Rebuild it with the command below. The unit test fails if the committed file
drifts from a fresh build.

## Commands

From the repo root:

```bash
python3 -m venv .venv-dspy-gepa
.venv-dspy-gepa/bin/pip install -r scripts/dspy_gepa/requirements.lock
export PYTHONPATH=scripts
.venv-dspy-gepa/bin/python -m dspy_gepa build-trainset
.venv-dspy-gepa/bin/python -m dspy_gepa estimate
.venv-dspy-gepa/bin/python -m unittest tests.dspy_gepa_test
.venv-dspy-gepa/bin/python -m dspy_gepa offline-demo
```

`offline-demo` and the unit tests call `dspy.GEPA` with `dspy.utils.DummyLM`.
They do not read an API key.

CircleCI job `dspy-gepa-offline` in `.circleci/config.yml` installs the lock
on `cimg/python:3.12.16` (the node image's Python 3.10 cannot install this
lock), runs those tests, prints the estimate, and requires `optimize` to
refuse a non-local endpoint. It does not start the optimizer.

## Real run (owner, after spend is approved)

A non-local endpoint is refused unless both of these are exactly `1`:

- `REVVEL_LLM_ALLOW_CLOUD`
- `REVVEL_GEPA_SPEND_APPROVED`

`true` and `yes` are refused. A loopback `http://127.0.0.1` endpoint is the
unpaid path and does not need those flags. This change did not run either
path. A non-local run reads `OPENROUTER_API_KEY` from the environment and
does not print it.

```bash
export PYTHONPATH=scripts
REVVEL_LLM_ALLOW_CLOUD=1 REVVEL_GEPA_SPEND_APPROVED=1 \
  .venv-dspy-gepa/bin/python -m dspy_gepa optimize \
  --prompt goap-agent \
  --model openai/<model-id> \
  --endpoint "$GEPA_ENDPOINT"
```

Repeat with `--prompt agent-build` for the second source file. Each run
appends one `status: optimized` item and writes
`wr/memory/dspy-gepa-runs/<prompt>/<timestamp>/evaluation.json`. The
evaluation scores the test split before and after. A lower score is recorded
as `regression: true`.

## How many LM calls a light run asks for

`dspy.GEPA.auto_budget` in DSPy 3.5.0, for `auto: light` (6 candidates), one
predictor, and this trainset's validation size of 24, reports **476 metric
calls per prompt**. Each metric call is one student completion. Reflection
adds up to **10** instruction-proposal calls per prompt (one per trial). The
held-out benchmark adds **102** student calls per prompt (the 51 test
examples, once before and once after). Two prompts:

**1176 LM calls, upper bound.**

Reflection calls are fewer when a trial does not propose a new instruction.
No price is stated here because this run was not executed and no rate was measured.

## Acceptance still open

The +10 point scorecard gain and the no-regression check are not measured.
`config/dspy-gepa.yml` records both as pending owner-approved spend. Seed
versions are in the prompt file; optimized instructions are not, because the
optimizer has not run.

## References

- DSPy GEPA: <https://dspy.ai/current/getting-started/gepa-optimization/>
- Budget translation: <https://dspy.ai/current/diving-deeper/gepa-in-depth/>
- Installed API: `dspy.GEPA` and `dspy.teleprompt.gepa.gepa.AUTO_RUN_SETTINGS` in DSPy 3.5.0
