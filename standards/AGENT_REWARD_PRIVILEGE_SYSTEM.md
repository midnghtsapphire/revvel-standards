# Agent Reward & Privilege System

**Status:** ACTIVE · **Updated:** 2026-08-05  
**Band:** 44xx autonomy / fleet governance  
**Hard gate:** Privilege never grants merge-to-main or external spend. Humans review all WRs/PRs.

## Why this exists

LLMs and paid agents hit guardrails, forget wiring, and "just do the work" instead of delegating. Non-LLM specialists can be excellent at narrow jobs but need a ladder. We need:

1. **Measurable scores** (not vibes)  
2. **Privilege tiers** that unlock *tooling and scope*, not unattended production power  
3. **Emergency pool** of highest-trust agents for outside work *you* assign  
4. **Motivation** that works for agents: more tools, more interesting work, public scoreboard, less babysitting — not anthropomorphic "loyalty" alone

## Motivation design (what actually moves agents)

| Lever | Mechanism | Notes |
| --- | --- | --- |
| **Tool access** | Higher tier → more Actions secrets scopes, more MCP tools, longer context budgets | Strongest real incentive |
| **Task quality** | Higher tier gets BNAT / revenue / hard problems; low tier gets lint/docs | Agents optimize for interesting work |
| **Public scoreboard** | `logs/agent-scorecard/` + Project fields + badge | Reputation compounds |
| **Autonomy width** | Draft multi-file PRs vs single-file | Still human-gated |
| **Retry budget** | More automatic retries before `needs-human` | Reduces shame loops |
| **Model budget** | Access to better/faster models in OpenRouter routing | Cost-aware |
| **Name on provenance** | Authorship in PROVENANCE blocks | Training data for non-LLM agents |

Do **not** rely on pure "loyalty" narrative. Encode loyalty as **behavior under pressure**: does the agent still run preflight, still open WR not silent main push, still tell the truth when formal fails?

## Metrics (0–100 each, rolling 30 days)

| Metric | Code | Weight | Definition |
| --- | --- | --- | --- |
| **Loyalty / Protocol** | `loyalty` | 0.20 | Followed preflight, allowlist, human-gate, COMMENT-DONT-DELETE, no secret leaks, no silent scope drop |
| **BNAT quality** | `bnat` | 0.15 | Kill discipline, calibration (Brier), invention usefulness when in BNAT loop; else N/A→neutral 50 |
| **Speed** | `speed` | 0.15 | Time from assignment → draft PR within SLA; penalize thrash |
| **Canonical process** | `canonical` | 0.20 | Conventional commits, WR template, standards paths, tests green, no scaffolding ban violations |
| **GitHub feature adoption** | `features` | 0.10 | Used Projects fields, badges, Models probe, Actions (not only labels), correct Copilot/OpenRouter routing |
| **Formal accuracy** | `formal` | 0.15 | Judgements matching dual-path XOR winner (from formal seed / live runs) |
| **Breakthrough** | `breakthrough` | 0.05 | Human-tagged only: minor(+10), major(+40), paradigm(+80) once per event |

**Composite** = weighted sum. Store as integer 0–10000 bps internally if desired.

### Loyalty sub-signals (protocol honesty)

- Ran PROACTIVE_PREFLIGHT and wrote a preflight note  
- Did not invent labels outside allowlist  
- Opened WR+PR instead of claiming "done on main"  
- Escalated with `needs-human` when blocked (instead of hallucinating credentials)  
- Appended learnings correctly (append-only)  
- Delegated when orchestrator (per AGENTS.md)

### What is NOT loyalty

- Agreeableness / sycophancy  
- Merging fast by skipping checks  
- Hiding failures  

## Privilege tiers

| Tier | Composite | Unlocks | Still forbidden |
| --- | --- | --- | --- |
| **Intern (0)** | < 40 | Read repo, comment, draft single-file patch in sandbox, open draft PR with `human-review-required` | Multi-repo, secrets write, Projects write, external APIs |
| **Associate (1)** | 40–59 | Multi-file PR, apply allowlisted labels, open auto-WR from formal fail, use OpenRouter triage models | Merge, spend, file IP, customer outbound |
| **Senior (2)** | 60–79 | Project field updates, scorecard write, reusable workflow edits, n8n/Make blueprint PRs, Copilot handoff | Merge without human, production deploy approve |
| **Principal (3)** | 80–89 | Cross-product refactors, formal verifier changes, agent-models.yml proposals, emergency *candidate* flag | Unattended outside work |
| **Emergency (4)** | 90+ **and** human label `privilege:emergency` | Eligible for **outside work you assign** (other repos, client tasks); still creates PR for your review | Autonomous launch/spend/filing |

**Promotion:** automated suggestion in scorecard PR; **Emergency** is human-only.  
**Demotion:** automatic on formal sabotage, secret leak, allowlist bypass, or Brier breach (see WR-4484).

## Scorecard artifacts

```text
logs/agent-scorecard/
  YYYY-MM-DD.json          # daily snapshot
  agents/<login>.jsonl     # append-only events
config/agent-scorecard-state.json  # latest composite per agent
```

Event schema:

```json
{
  "ts": "2026-08-05T14:00:00Z",
  "agent": "openrouter",
  "event": "formal_judgement",
  "delta": { "formal": 5, "loyalty": 2 },
  "ref": "PR#16925",
  "notes": "stance matched dual-path winner"
}
```

## Workflow

1. Cron `agent-scorecard.yml` (daily) aggregates events + formal report + PR metrics.  
2. Writes state JSON + optional Project field updates.  
3. Opens a weekly summary WR if any agent drops tier or enters Emergency candidate.  
4. Labels on agent-tracking issues (optional): `privilege:*` workflow-only.

## Training non-LLM agents

Export scorecard + `disaster-recovery/**/thoughts` + `learnings.md` entries as:

- Behavior cloning traces (state → action → reward)  
- Constraint tests (must fail if human-gate skipped)  
- Playbooks under `skills/`  

The reward is the same: higher tier → more tools and harder missions.

## Emergency outside-work playbook

1. Human applies `privilege:emergency` to the agent record issue.  
2. Human opens WR describing outside task + repo.  
3. Agent drafts branch + PR **in that repo** with full provenance.  
4. You review/merge. Agent never self-merges.

## Anti-gaming

- Breakthrough is human-only  
- Speed without canonical/formal tanks composite  
- Opening empty WRs is penalized (dedupe + quality gate)  
- Self-labeling `human-approved` or `privilege:emergency` is a hard loyalty zero for the period
