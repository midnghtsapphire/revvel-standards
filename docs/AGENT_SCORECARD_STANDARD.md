# Agent Scorecard & Self-Heal Standard

Tracks **how good each agent actually is** — including visiting agents — and tries
to *fix* their mistakes instead of just blocking them. Every PR an agent ships is
scored; the score feeds a durable per-agent trust rating; shortfalls trigger a
graduated self-heal loop whose **recovery** is itself rated, so we learn whether
the weak link was the *agent* or *our prompts/scripts*.

## Why

Agents (and visiting agents like OpenHands, Cursor Cloud, Lovable) hallucinate,
ship rash code, and ignore directions. CI catches most of it eventually, but
nothing **attributed** failures to a specific agent or **remembered** them. This
system does, and turns the data into a leaderboard you can also use for external
write-ups.

## What it measures

Five dimensions, weighted (hallucination + bad code dominate):

| Dimension | Weight | Signals |
| --- | ---: | --- |
| Hallucination | 0.30 | unresolved imports/paths/env vars, PR-body claims not backed by the diff, cross-model review flags |
| Bad code | 0.25 | CodeQL / trivy / test / build failures |
| Directions | 0.20 | anti-scaffolding trips, root-junk, non-conventional commits, out-of-scope files |
| Rash | 0.15 | revert-after-merge, force-amends, large diff with no tests |
| CI / latency | 0.10 | red runs before green, time to green |

Each PR gets a 0–100 **quality** score; the agent's **trust** (0–100, starts at
70) is an EWMA of its PR qualities. Trust maps to a grade: A `trusted` ≥90,
B `reliable` ≥80, C `watch` ≥70, D `shaky` ≥55, F `quarantine` below.

## Hallucination detection (cheap → expensive)

1. **Reference resolver** (`reference-resolver.js`) — scans only *added* diff
   lines and flags imports, relative paths, and `process.env.*` vars that don't
   resolve against the repo / `.env.example`. Catches the most common code
   hallucination with zero LLM cost.
2. **Claim-vs-diff** (`claim-checker.js`) — flags PR-body claims ("added tests",
   "updated docs", "added a workflow") that the changed-file list doesn't support.
3. **Cross-model adversarial review** (`cross-model-review.js`) — a second model
   (via `scripts/llm.js`, no-key-first → OpenRouter) reviews the diff purely for
   hallucinations. Opt-in (`CROSS_MODEL=1`); degrades to a clean no-op without keys.

## Self-heal loop — and why recovery is the real metric

When a PR falls short (quality < 60, any hallucination, or red CI), the scorecard
emits a graduated remediation plan (`remediate.js`):

| Tier | Action | If it fixes it, the weak link was… |
| --- | --- | --- |
| 0 `prompt-correction` | re-run the **same** agent with a corrective prompt naming exactly what it got wrong | **our prompt/script** |
| 1 `agent-handoff` | hand off to the next agent in the chain | **the agent** |
| 2 `escalate-claude` | direct call to the Claude API (top model) | **task difficulty** |

The loop records whether the re-run recovered **and which tier fixed it**. A low
**recovery rate** on `prompt-correction` is the signal that our instructions —
not the agents — need work. That's the diagnosis you can't get from a pass/fail gate.

## Trends & capability credit

A single trust number can't tell you if an agent is *getting better* or just
*coasting*. Because the ledger keeps per-dimension scores on every event,
`trends.js` computes, per agent:

- **Quality trend** (`↑`/`↓`/`→`) — recent PRs vs the prior window, so you see
  improvement or regression over time.
- **Per-dimension movement** — *where* it's improving or slipping (e.g.
  "hallucination improving, rashness regressing"), not just the aggregate.
- **Builds & net-new capability** — `feat` PRs that shipped, plus `+N` net-new
  files under `skills/ products/ engines/ scripts/ .github/workflows/` — i.e.
  functionality you didn't have before. This credits agents that *extend* the
  system, not only the ones that play it safe with fixes.

These render into the leaderboard so the question "are my agents improving, and
which ones actually add capability?" is answered directly.

## Where the data lives

- **Ledger:** `wr/memory/agent-scorecard.jsonl` — append-only, one event per line
  (`score` and `remediation`), same convention as `decisions.jsonl`. Replayable.
- **Leaderboard:** `docs/AGENT_SCORECARD.md` — regenerated from the ledger; never
  hand-edited. Doubles as external/LinkedIn material (first-pass-green %,
  hallucination rate, recovery rate per agent).
- **Runtime plan:** `wr/memory/last-remediation-plan.json` — gitignored, rewritten
  each remediation.

## How it runs

`.github/workflows/agent-scorecard.yml`:

- on **PR closed** (scores it; commits ledger/leaderboard if merged),
- on **workflow_dispatch** (`pr_number`, optional `cross_model`) to score any PR.

When a PR falls short it opens/updates a `scorecard`-labelled self-heal issue
carrying the corrective prompt and handoff/escalation target, wired into the
existing `auto-fix` / `ralph-loop` labels so the fleet's remediation path picks
it up. **Observe-and-rate by default — it never blocks a merge.**

## Run it locally

```bash
node --test tests/agent-scorecard.test.js          # unit tests
AGENT=openrouter PR_NUMBER=1 DIFF_FILE=my.diff \
  BODY_FILE=body.txt CHANGED_FILES="src/x.js" \
  node scripts/agent-scorecard/index.js            # score one PR
```
