# Fleet inventory and `/fleet` launcher: midnghtsapphire/revvel-standards
Read-only audit, 2026-10-21 (MDT). Nothing was committed or changed on GitHub. Only secret **names** are recorded here.

## 1. Inventory

The repo has 13 fleets, plus one external fleet that was evaluated but not adopted.

Column key:
- **Gate:** whether the entry workflow checks `vars.REVVEL_LLM_ALLOW_CLOUD`.
- **How started today:** after the 2026-08-21 cost freeze, every cron is commented out.

| # | Fleet | Purpose | Members (roles) | Entry point | How started today | Models | Secrets (names) | Gate | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Agentic Workflow Fleet** | Nine single-pattern experts | chain/Chainwright, planner/Wayfinder, fanout/Manifold, conductor/Maestro, switchboard/Switchyard, critic/Whetstone, mirror/Looking Glass, rewoo/Deepcut, loop/Perpetua | `skills/agentic-workflow-fleet/FLEET.yml` → `scripts/build-agent-creator-data.js` → agent-creator.html | Nothing runs it. `update-agent-creator-data.yml` only rebuilds the catalog. | none of its own (persona: oaudrey) | — | n/a | **Defined, not wired** |
| 2 | **Security Fleet** | Red-teams the repo's own automation | sentinel/Tripwire, exprwatch/Hardline, exfil/Blackout, permit/Keysmith, redteam/Foxglove | `scripts/security-fleet.js`, `.github/workflows/security-fleet.yml` | issues, issue_comment and pull_request events, plus workflow_dispatch. The weekly lanes' cron is frozen. | none (deterministic) | GITHUB_TOKEN | no (not needed) | Wired. Very high run volume (about 20k runs). |
| 3 | **BIOME crew** | Credit-free self-healing | sentinel (2h), medic, homeostat, inspector (6h), sheaf (1h) | `docs/biome/crew.yml`, `scripts/biome/*.js`, `biome-*.yml` | workflow_dispatch only (crons frozen) | none | GITHUB_TOKEN | no (not needed) | Wired, dispatch-only |
| 4 | **Persona fleet** | Summon a persona with `/handle` | openrouter (dispatcher), oaudrey (triage), mindmappr (spotter), professor (research), dragnet (errorfix/builder), coder (patcher), orbit (CircleCI expert), octo (Octopus review), mender (Mabl healer), plus security members derived from the catalog | `scripts/openrouter-personas.js` + `openrouter-routing.js`, `persona-comment-trigger.yml` | issue_comment `/handle` or emoji (`/🐙 /🧠 /🛠️`…). Non-bot commenters only. No workflow_dispatch. | repo_surgery profile (Opus-5 lane), cheap_batch_edits, perplexity sonar-pro / sonar-deep-research | OPENROUTER_API_KEY | **yes** | Wired. This is already a slash-command launcher. |
| 5 | **DRAGNET** | Five-system pipeline | PLATO → MEDUSA → COUNTER → DARWIN → JUDGE | `standards/DRAGNET_FRAMEWORK.md`; `dragnet-team-assignment.yml`, `dragnet-ci-autofix.yml` | Issue opened with the `dragnet-team` label (work-request template), plus CI failure. The doc's `dragnet:plato:start` cron jobs exist on paper only. | SSOT lanes | OPENROUTER_API_KEY | **yes** | Partly wired: the five systems are not separate jobs, and there is no dispatch input. |
| 6 | **Code Review Fleet** (RVS-REVIEW-001) | Multi-reviewer PR gate | security, workflow, no-delete/goals, product/process, docs/contracts, connector, implementation, compliance, syntax/final gate | `standards/REVVEL_CODE_REVIEW_FLEET.md` | none ("design, non-operational") | — | — | n/a | **Defined, not wired.** Duplicates the existing review bots (ai-pr-review, octopus, cubic, Copilot, etc.). |
| 7 | **R&D Research Fleet** | Product sold for $400 | bnat-hunter, doe-screener, freestyle-perplexity, lead-search, master-fleet, merchandise-search, triz-specialist | `products/rnd-research-fleet/` (orchestrator.js, dispatch-arms.js, workflows/*.yml *inside the product*) | Local `node`. In-repo equivalents are `research-engine.yml` and `deep-search-research.yml` (dispatch). | Sonnet 3.5 + OpenRouter Fusion (product); sonar-pro research lane | OPENROUTER_API_KEY, PERPLEXITY_API_KEY | research-engine: **no**; deep-search: yes | Product fleet; its workflows are not under `.github/`. |
| 8 | **Fraud-Signal Verification Fleet** | Scores how strong the evidence is for public allegations | primary_source, financial, media_trace, counter, legal, judge | `fraud-signal-verification-fleet/src/orchestrator.py`, `scripts/run_all.sh` | Local Python only | none (offline scorer) | — | n/a | **Not wired to CI** |
| 9 | **Unfound Docket fleet** | Paste-in prompts for the Colorado CLE course | Clerk of the Rule, Statute Reader, Exhibit Mathematician, … | `docs/unfound-docket/FLEET.md`, `src/lib/fleet.ts` | Manual paste into a chat | none (prompt-only) | — | n/a | Prompt-only by design |
| 10 | **Bernstein orchestrator** | Multi-agent orchestration via claude-octopus | multiple CLI agents | `bernstein-orchestrator.yml` (inputs task, plan, cli, budget) | workflow_dispatch | multi-provider | OPENROUTER_API_KEY plus direct provider keys (see FIX-PLAN) | **yes** | Wired (dispatch) |
| 11 | **Octopus review** | PR review fan-out | octo persona plus fallback | `octopus-route.yml`, `octopus-review-fallback.yml` (input pr_number) | PR events and dispatch | review lane (opus-4.8 → deepseek-r1) | OPENROUTER_API_KEY | route: **no**; fallback: yes | Wired. Overlaps #4 (`/octo`). |
| 12 | **Coding-agent fleet** | Hand an issue to a coding agent | openhands, swe-agent, openrouter-agent/coder, Jules, Copilot, Devin, Cursor (agent-fallback, agent-dispatcher, goap-assignment-router) | `openhands-resolver.yml`, `swe-agent.yml` (input issue_number), `agent-fallback.yml` | Labels, comments and dispatch | Sonnet-4.5 default (FIX-PLAN: qwen3-coder) | OPENROUTER_API_KEY, plus vendor apps | most **yes**; jules, agent-dispatcher and goap router: **no** | Wired but sprawling: 3 routers overlap (agent-dispatcher, goap router, agent-fallback) |
| 13 | **Fleet controller / maintenance** | Supervises runs and per-repo upkeep | controller, maintenance WRs | `fleet-controller.yml` (input preempt), `scripts/fleet-maintenance.js`, `wr/fleet-maintenance/*` | dispatch (cron frozen) | none | GITHUB_TOKEN | no (not needed) | Wired |
| ext | **claude-fleets** (junaidtitan) | Claude Code fleet-review and plan-audit commands | — | `docs/CLAUDE_FLEETS_EVAL_2026-08-08.md`, `scripts/evaluate-claude-fleets.js` | not installed | Claude Code | — | — | Evaluated YELLOW, not adopted. Fits Claude Pro if wanted. |

Skills-only, not counted as fleets:
- `openrouter_swarms` (persona scout)
- `.github/agent-models.yml` lanes: orchestrator, code_patch, reasoning, vision, image_gen, research, review, triage, cheap_summary. These are routing profiles, not a team.
- GOAP Swarm Console (`products/goap-swarm-console`): a UI product.
- `revvel-twin-run`'s fable-opus-grok pair: lives in another repo.

### Gaps and duplicates
- **Defined but not wired:**
  - Agentic Workflow Fleet (#1): nothing executes the nine experts.
  - Code Review Fleet (#6)
  - Fraud-Signal fleet (#8)
  - DRAGNET's five-system cron jobs (#5)
  - The R&D fleet's own `workflows/` folder (#7), which sits inside a product directory where GitHub will never run it.
- **Duplicates:**
  - Review: #6 vs #11 vs `/octo` vs the vendor review bots.
  - Coding-agent routers: agent-dispatcher, goap-assignment-router and agent-fallback.
  - Research: rnd-research-fleet vs research-engine vs deep-search-research vs the professor persona.
  - Persona handle `dragnet` vs the DRAGNET team label. The launcher keeps them apart: `/dragnet` is the persona, `/dragnet-team` is the fleet.
- **Ungated cloud entry points:**
  - `research-engine.yml`
  - `octopus-route.yml`
  - `jules-coding-agent.yml`
  - `agent-dispatcher.yml` and `goap-assignment-router.yml`: these only route, but check that they can't start paid agents ungated.
  - Recommendation: add the `REVVEL_LLM_ALLOW_CLOUD` check to these (see FIX-PLAN).
- **Not dispatchable:**
  - `persona-comment-trigger.yml` and `dragnet-team-assignment.yml` have no `workflow_dispatch`.
  - The launcher acknowledges personas without starting anything; the persona trigger already handles the comment.
  - For the dragnet team, the launcher routes to `deep-search-research.yml` for now. Adding `workflow_dispatch: {inputs: {issue_number}}` to dragnet-team-assignment.yml would let it route directly.
- **workflow_call:** none of the fleet workflows declare it. That is why the launcher uses `gh workflow run` (workflow_dispatch), which `GITHUB_TOKEN` is allowed to trigger. A `repo_dispatch` route is also included for fleets that later add `repository_dispatch: types: [fleet-<name>]`.

## 2. CircleCI
- `.circleci/config.yml` exists and has no AI in it. It runs three jobs:
  - `lint-and-test`: markdownlint, `node --test`, flake8.
  - `validate-registries`: checks that the persona registry resolves `orbit` and that SKILLS_INDEX.yml is valid.
  - `policy-check`: RVS-AGENT-001 archival.
- It runs on PRs and on main.
- The OpenRouter `pr-review` job was removed, and the Cursor agent tier was retired 2026-06-13.
- "Push everything through with circle" most likely means:
  - (a) CircleCI as the CI gate, which already exists and costs no credits, or
  - (b) the **ORBIT persona** (`/orbit`, `/circleci`, `/circle-ci`), the CircleCI-expert persona.
- The Circle (USDC) MCP is unrelated.
- CircleCI could start fleets through a pipeline parameter that calls `gh workflow run fleet-dispatch.yml`. That would add a second CI bill for no gain, so it is not recommended. Keep CircleCI as the free lint/test gate.

## 3. Launcher design
- **Triggers:**
  - A comment whose first line is `/<fleet> [args]`, or a bare `<fleet>` on its own line.
  - `workflow_dispatch` with inputs fleet, args and issue_number. This is used by Claude Code, the gh alias, and the Actions UI.
- **Guard:** only a comment from `midnghtsapphire` with user type not `Bot` is accepted, so bot loops can't trigger it.
- **Safety:**
  - Comment text is passed through `env:` and is never interpolated with `${{ }}` inside `run:`.
  - Arguments are capped at 500 characters.
- **Registry:** `.github/fleets.yml` maps each name and alias to a route (dispatch, repo_dispatch, persona or local), the workflow(s), an input template (`{{issue}}`, `{{args}}`), the model, and a `cloud` flag.
- **Spend gate:** a fleet with `cloud: true` is refused unless `vars.REVVEL_LLM_ALLOW_CLOUD == '1'`. The refusal is posted as a comment.
- **Concurrency:** one dispatch per issue at a time (`fleet-dispatch-<issue>`), and in-flight launches are never cancelled.
- **Acknowledgement:**
  - 👀 reaction when the command is seen, and 🚀 once it is handled.
  - A comment saying whether the fleet started (with model and run link), was blocked by the gate, is handled by a persona, or must be run locally (with the command).
- **Fleets covered:** 12 names in the registry:
  - security-fleet, biome (starts all 5 workers), dragnet-team, research, bernstein, octopus, coding-agents, fleet-controller (preempt=false), agent-creator-refresh, personas (ack only), fraud-signal (local), unfound-docket (local).
- **Other ways to trigger:**
  - Claude Code: `/fleet <name> [args]` plus the per-fleet shortcuts `/biome`, `/security-fleet`, `/dragnet-team`, `/research`, `/bernstein`. These work with Audrey's Claude Pro login and spend no API credits.
  - `gh fleet <name> [args]` and `gh fleets`.

## 4. Install (when Audrey approves; none of this has been done)

| Local file | Goes to (in revvel-standards) |
|---|---|
| `/workspace/fleet-launcher/.github/workflows/fleet-dispatch.yml` | `.github/workflows/fleet-dispatch.yml` |
| `/workspace/fleet-launcher/fleets.yml` | `.github/fleets.yml` |
| `/workspace/fleet-launcher/.claude/commands/*.md` | `.claude/commands/` (new folder next to the existing `.claude/hooks/`) |
| `docs/fleet-launcher/gh-alias.sh` | Committed for reference; run once on her machine. |

Steps:
1. Open a PR with the three paths above.
2. Check the repo variable `REVVEL_LLM_ALLOW_CLOUD`. Set it to `1` only when paid fleets should run.
3. Optional: add `workflow_dispatch` to `dragnet-team-assignment.yml` and `persona-comment-trigger.yml`, then switch their routes in fleets.yml to `dispatch`.
4. Test with `/fleet-controller` or `/biome` on a scratch issue. Both are free, needing no LLM credits.
