# Revvel Standards — Trigger Phrase and Call Catalog

- **Repository:** `midnghtsapphire/revvel-standards`
- **Default-branch snapshot:** `fc8be2c59c8b9144e25d4f0692e899371e104e90`
- **Snapshot subject:** `docs(wr): sync OZ-OS-001 tracker to shipped reality (#18293)`
- **Audit date:** 2026-11-07
- **Method:** read-only static inspection; no repository files, issues, PRs, labels, settings, or workflows were changed.

## What this audit covers

- 764 operational text and owner-documentation files retrieved from the snapshot, with zero retrieval failures recorded in `revvel-operational/manifest.json`.
- All **238 root workflow files** parsed for declared events, manual inputs, repository-dispatch types, runners, reusable calls, spend gates, and statically disabled jobs.
- Exactly **13 workflows with active ordinary-comment or inline-review-comment listeners** identified.
- Comment commands, persona aliases, fleet aliases, labels, issue/PR events, manual dispatches, workflow-to-workflow calls, external App commands, and advertised-but-dead commands cross-checked against their implementations.

Companion artifacts:

- [REVVEL_WORKFLOW_EVENT_INDEX.md](REVVEL_WORKFLOW_EVENT_INDEX.md) — every root workflow, its declared events and inputs, plus all statically detected YAML calls and fleet-target checks.
- [revvel-trigger-audit.json](revvel-trigger-audit.json) — machine-readable audit data.

### Important limits

**Statically wired does not mean operationally healthy.** This audit did not authenticate to GitHub or vendor dashboards, so it cannot verify current Actions enablement, repository variables, secrets, GitHub App installations, self-hosted runner availability, gateway reachability, billing state, or successful runs. A workflow file can exist and still never execute.

This is a default-branch operational inventory, not a search of every historical branch or every deleted file. Dynamic JavaScript and shell dispatches cannot all be resolved statically; important dynamic paths were manually cross-checked. The 20 literal calls found in workflow YAML are listed in the companion index.

### Post-audit merge verification

All **28 PRs merged after the snapshot** were checked on 2026-11-07: 16 into `main`, three into `daily/2026-11-06`, and nine into `daily/2026-11-05`. Current-`main` behavior was verified through `371be6bf9b5d003cd0f6d017b47a29e1eefb0c2e` (#18177). Daily-only changes are not misrepresented as current `main`.

Two main merges add information to this snapshot catalog: #18304 makes the coder script try LM Studio → Ollama → OpenRouter, and #18292 adds a conditional CircleCI → Railway deploy call. #18296 removes Copilot identities from trusted auto-approvers but does not change the workflow's manual-only trigger status; #18287 changes Python interpreter resolution, not routing.

### Status words used below

- **Direct listener:** the repository has an active event listener and a matching predicate for the phrase or label.
- **Gateway only:** the generic command router accepts the phrase, but execution depends on an external agent gateway; it is not a direct provider integration.
- **Conditional:** the route is declared, but authorization, spend switches, credentials, event shape, or another predicate can skip it.
- **Dormant:** code or job predicates remain, but the event needed to reach them is absent or commented out.
- **Broken handoff:** a live path calls a missing, disabled, or input-incompatible target.
- **External:** a GitHub App or vendor bot handles the command outside this repository.
- **Documentation/process only:** no repository-owned executor was found.

---

## 1. The shortest useful cheat sheet

### The intended WR path

1. Open an **issue**, not merely a PR comment, titled **`[WR] <what you want>`**.
2. Research/intake may run, but implementation commonly waits until someone applies **`wr:code`** or **`spec-approved`** to the issue.
3. Require real green CI and review. Do not treat a Ship Quality pass as sufficient when CircleCI, `npm test`, or WR lint is red.
4. After merge, shipping still needs a **`deliver:*`** label on the merged PR.

Evidence: `START_HERE_CALL_CHAIN.md:25-30,34-87,91-105,138-148`. The documented spec-to-action gap is issue **#15507** (`START_HERE_CALL_CHAIN.md:145-146`).

**Reality check:** the call-chain document still describes automatic WR PR creation and fallback behavior that is no longer matched by the workflow `on:` blocks. See the traps section before relying on that diagram literally.

### High-value commands and labels

| Want | Use | What it really reaches |
| --- | --- | --- |
| Start work | Issue title `[WR] …` | Several intake/research workflows, subject to their predicates and gates |
| Start coder implementation | Apply `wr:code` or `spec-approved` to the issue | `openrouter-coder.yml`; after #18304 its script tries LM Studio → Ollama → OpenRouter, while the workflow's cloud/coding-agent job gates remain |
| Start OpenHands | Apply `fix-me` to the issue | `openhands-resolver.yml` |
| Start SWE-Agent | Apply `swe-fix` to the issue | `swe-agent.yml` |
| Ask OpenRouter in a comment | `@openrouter-agent <question>` | `openrouter-agent.yml`; also works in inline PR review comments |
| Ask a direct persona | `/professor <task>`, `/oaudrey <task>`, etc. | `persona-comment-trigger.yml`, but only aliases admitted by its narrower job gate |
| Reach any registry persona alias safely | `/persona <alias> <task>` | Persona parser; preferable for aliases omitted from the workflow gate |
| Invoke the generic agent roster | `/jules <task>`, `@jules <task>`, `/coder <task>`, etc. | Generic `agent_requested` gateway, **not necessarily the named provider** |
| Launch a fleet | `/research <args>`, `/security`, `/coding-agents <args>`, etc. | `fleet-dispatch.yml`; comments are owner-only |
| Retry OpenHands/SWE | Re-apply `fix-me` / `swe-fix` | **Do not rely on `/retry-openhands` or `/retry-swe-agent`; neither has a listener** |
| Request Devin review | `/devin <request>` on an issue/PR, or `devin-review` on a non-draft PR | `devin-code-review.yml` |
| Ask for conflict help | `has-conflicts` label or a dirty mergeable state | `conflict-helper.yml`; its leftover-to-Jules handoff is broken |
| Ship a merged PR | `deliver:api`, `deliver:cli`, `deliver:pdf`, etc. | `ship-to-market.yml` |

### Spend gate that can make a valid command appear ignored

Paid lanes generally require:

```text
REVVEL_LLM_ALLOW_CLOUD=1
```

Lane switches default on unless explicitly set to `0`:

```text
REVVEL_SWITCH_RESEARCH
REVVEL_SWITCH_REVIEW
REVVEL_SWITCH_CODING_AGENTS
REVVEL_SWITCH_ROUTERS
REVVEL_SWITCH_PERSONAS
REVVEL_SWITCH_INFRA
```

See `docs/SPEND-SWITCHES.md:1-42`. These GitHub variables do **not** stop dashboard-only vendor services such as Copilot, Cursor, Devin, Jules, or other installed Apps; those require vendor/App settings (`docs/SPEND-SWITCHES.md:33-42`).

---

## 2. Generic command window: `/name` and `@name`

### Where and how

Comment on an ordinary issue or PR conversation. The listener is `issue_comment: created` in `.github/workflows/agent-command-window.yml`; the parser is `.github/scripts/agent-command-router.mjs`, configured by `.github/agent-router.json`.

Supported forms:

```text
/agents
/jules <task>
@jules <task>
/coder <task>
@coder <task>
```

Multiple agents can appear in one comment. Fenced code and quoted lines are ignored. Bot authors are rejected. Humans must be `OWNER`, `MEMBER`, `COLLABORATOR`, or the explicitly allowed user `midnghtsapphire` (`agent-command-router.mjs:21-140`; `.github/agent-router.json:1-11`).

### Exact accepted aliases

| Canonical agent | Accepted names after `/` or `@` | Lane recorded in registry |
| --- | --- | --- |
| `dragnet` | `dragnet` | Dependency and fleet discovery |
| `claudecode` | `claudecode`, `claude-code`, `claude` | Implementation and code review |
| `claudeai` | `claudeai`, `claude-ai` | Analysis and second opinion |
| `xai` | `xai`, `grok` | Adversarial/alternative review |
| `jules` | `jules`, `googlejules`, `google-labs-jules` | Implementation, tests, PR review |
| `oaudrey` | `oaudrey`, `triager` | Triage and orchestration |
| `professor` | `professor`, `citer` | Research and citations |
| `mindmappr` | `mindmappr`, `spotter` | Requirements and gap spotting |
| `coder` | `coder`, `fixer` | Implementation and fixes |
| `orbit` | `orbit`, `circleci` | CI/CircleCI diagnostics |
| `octo` | `octo`, `octopus` | Deep review and routing |
| `mender` | `mender`, `mabl` | Repair and test validation |
| `radiochaser` | `radiochaser` | Fallback investigation |
| `copilot` | `copilot`, `github-copilot` | Implementation and code review |
| `codex` | `codex`, `openai-codex` | Implementation fallback |

Source: `.github/agent-router.json:12-89`.

### Critical behavior: these are mostly gateway requests, not direct summons

The router emits:

```text
repository_dispatch: agent_requested
```

Then `agent-request-delivery.yml` forwards the payload to `REVVEL_AGENT_GATEWAY_URL`. If that secret is unset, it deliberately posts:

```text
needs-adapter: Trigger received; the central agent gateway has not been connected yet.
```

Evidence: `.github/workflows/agent-request-delivery.yml:3-5,16-26,31-66`. Non-2xx gateway responses become `failed`; 2xx responses become `delivered` (`agent-request-delivery.yml:68-90`). Delivery still does not prove the remote agent completed the task.

Consequences:

- `/jules` through this router is **not** the same path as `jules-invoke.yml`.
- `/copilot` or `@copilot` through this router is roster/gateway behavior, **not proof that native GitHub Copilot started**. Repository documentation explicitly calls it roster-only (`docs/bom/CODEX_AND_OPENROUTER_DAILY_BOM.md:13-29`).
- `codex` alone has `github_assignee: "codex"`; assignment still depends on the relevant GitHub/ChatGPT configuration (`.github/agent-router.json:83-88`; `docs/bom/CODEX_AND_OPENROUTER_DAILY_BOM.md:13-29`).
- Some names also have direct persona listeners. A comment can therefore enter more than one lane; do not assume every accepted alias has identical semantics.

---

## 3. Direct repository-owned comment triggers

These are separate from the generic gateway router.

| Phrase or event | Where to type it | Destination and behavior | Authorization/gates and evidence |
| --- | --- | --- | --- |
| `@openrouter-agent <question>` | Ordinary issue/PR comment or inline PR review comment | `openrouter-agent.yml` calls OpenRouter and posts a reply | Human/non-bot sender; cloud + coding-agent gates. Every newly opened issue also invokes it without the mention. `openrouter-agent.yml:3-9,22-24,35-43` |
| `@copilot ui-engine <request>` | Issue/PR comment | `ui-creation-engine.yml` | Exact phrase predicate; cloud + coding-agent gates. `ui-creation` label is another route. `ui-creation-engine.yml:45-47` |
| `/devin <request>` | Issue or PR comment | `devin-code-review.yml` | Human `OWNER`/`MEMBER`/`COLLABORATOR`; cloud + coding-agent gates. Non-draft PR label `devin-review` is another route. `devin-code-review.yml:77-86` |
| `/brain-dump <text>` | **Issue**, not PR; comment must start with the command | `brain-dump-intake.yml` parses unstructured ideas into WRs | Authorized humans; cloud + router gates. `brain-dump-intake.yml:51-54,70-82` |
| `/wr-title` or `/title` | Issue comment | `wr-autotitle.yml` | Non-bot comments; later logic restricts to issues. Optional `force` is supported. `wr-autotitle.yml:49-56,92-117` |
| `/approve <head-sha>` | PR conversation comment | Pinned external `anthropics/claude-code-action/agent-approval-check` | Every created/edited PR comment re-evaluates approvals. Approval is bound to the head SHA; bot approvals do not count. `agent-approval-check.yml:3-17,19-58` |
| `/persona <name> <task>` and direct persona slashes | Issue/PR comment | `persona-comment-trigger.yml` | See the dedicated persona section; its workflow gate is narrower than its parser. `persona-comment-trigger.yml:22-47` |
| `/<fleet> [args]` or bare fleet name | Issue/PR comment, first line | `fleet-dispatch.yml` | Only human `midnghtsapphire`; see fleet section. `fleet-dispatch.yml:34-41,75-103` |
| Any created issue/PR comment | No special phrase | `agent-audit-logger.yml` records telemetry | This is an audit listener, not a summon. `agent-audit-logger.yml:1-53` |
| Any created issue comment | No repository-owned phrase required | `create-issue-branch.yml` invokes pinned third-party `robvanderleek/create-issue-branch` | `.github/issue-branch.yml` uses `mode: immediate`; no local `/cib` implementation was found. Do not invent a repository-owned `/cib` command. |
| Every created/edited issue/PR comment | No special phrase | `security-fleet.yml` scans for prompt injection | `@sentinel`, `@exfil`, `@exprwatch`, `@permit`, `@redteam` are detector names, **not comment summons**. `security-fleet.yml:29-42,55-96` |
| PR review or inline review comment | No special phrase | `pr-review-status.yml` updates review state | Event-driven status handling, not a slash command. `pr-review-status.yml:1-30,126-132` |

### Active comment-listener inventory

The 13 workflow files with active `issue_comment` and/or `pull_request_review_comment` declarations are:

```text
agent-approval-check.yml
agent-audit-logger.yml
agent-command-window.yml
brain-dump-intake.yml
create-issue-branch.yml
devin-code-review.yml
fleet-dispatch.yml
openrouter-agent.yml
persona-comment-trigger.yml
pr-review-status.yml
security-fleet.yml
ui-creation-engine.yml
wr-autotitle.yml
```

`openrouter-agent.yml` and `pr-review-status.yml` are the two that also declare inline review-comment events. The complete event details are in the companion index.

---

## 4. Persona commands — parser aliases versus the actual gate

### Reliable forms

```text
/persona <name-or-alias> <task>
/professor <task>
/oaudrey <task>
/dragnet <task>
/orbit <task>
```

Direct persona triggers use a **leading slash, not `@name`**. The file explicitly explains that `@professor` was notifying an unrelated GitHub user (`persona-comment-trigger.yml:3-20`).

The parser accepts `/persona <name> <task>` and aliases registered in `scripts/openrouter-personas.js` (`scripts/persona-comment-runner.js:111-165`). The workflow requires non-bot authorship, `REVVEL_LLM_ALLOW_CLOUD == '1'`, and `REVVEL_SWITCH_PERSONAS != '0'` (`persona-comment-trigger.yml:44-47`).

### Registry aliases and direct-gate reality

| Persona | Parser aliases | Direct slash aliases admitted by `persona-comment-trigger.yml` |
| --- | --- | --- |
| `openrouter` | `dispatcher`, `router`, `🔀` | `/openrouter`, `/🔀`; **`/dispatcher` and `/router` are omitted** |
| `oaudrey` | `triager`, `triage`, `🧠` | `/oaudrey`, `/🧠`; **`/triager` and `/triage` are omitted** |
| `mindmappr` | `spotter`, `🗺️`, `🗺` | `/mindmappr`, emoji forms; **`/spotter` is omitted** |
| `professor` | `citer`, `sourcer`, `🎓` | `/professor`, `/🎓`; **`/citer` and `/sourcer` are omitted** |
| `dragnet` | `errorfix`, `permfix`, `dragnet-fix`, `scaffold`, `builder`, `product-build`, `🕵️`, `🕵`, `🔎` | `/dragnet`, `/scaffold`, `/builder`, `/product-build`, listed emoji; **`/errorfix`, `/permfix`, `/dragnet-fix` are omitted** |
| `coder` | `fixer`, `patcher`, `🛠️`, `🛠` | Only the emoji forms appear in the persona gate; **`/coder`, `/fixer`, `/patcher` are omitted** |
| `orbit` | `circleci`, `circle-ci`, `orbs`, `pipeline-commander`, `🪐`, `⭕` | `/orbit`, `/circleci`, `/circle-ci`, emoji; **`/orbs` and `/pipeline-commander` are omitted** |
| `octo` | `octopus`, `octopus-review`, `reviewmaster`, `🐙` | `/octo`, `/octopus`, `/🐙`; **`/octopus-review` and `/reviewmaster` are omitted** |
| `mender` | `mabl`, `mabl-expert`, `test-healer`, `🧪` | `/mabl`, `/🧪`; **`/mender`, `/mabl-expert`, `/test-healer` are omitted**, even though `/mender` is advertised in the header |

Evidence: registry aliases in `scripts/openrouter-personas.js`; actual admission predicate in `.github/workflows/persona-comment-trigger.yml:44-47`.

**Safe workaround for registry-only aliases:**

```text
/persona dispatcher <task>
/persona triager <task>
/persona spotter <task>
/persona citer <task>
/persona coder <task>
/persona mender <task>
```

The gate only needs to see `/persona`; the parser can then resolve the alias.

Some omitted aliases, including `/coder`, `/fixer`, `/triager`, `/citer`, `/spotter`, and `/mender`, still match the **separate generic gateway router**. That can produce `agent_requested`/`needs-adapter`; it is not direct persona execution.

`docs/process/SYSTEM_MAP.md:125-140` currently presents several omitted aliases as straightforward direct summons. Treat that section as drifted from the workflow gate.

### What personas do after parsing

- Action verbs `build`, `implement`, `create`, `fix`, `ship`, `make`, `add`, or `do` file a WR with `wr:code`.
- DRAGNET deduplicates before creating work.
- DRAGNET research requests explicitly dispatch `research-engine.yml`.

Evidence: `scripts/persona-comment-runner.js:52-83,428-553,556-684`.

---

## 5. Fleet commands

### Syntax and authorization

On an issue or PR, human `midnghtsapphire` can use:

```text
/<fleet> [args]
/<alias> [args]
<fleet>
```

The bare form must be one word. Comment parsing reads the first line and requires the command at its start. Manual `workflow_dispatch` accepts `fleet`, `args`, and optional `issue_number` (`fleet-dispatch.yml:6-22,34-41,59-103`).

Cloud-marked fleets are refused unless `REVVEL_LLM_ALLOW_CLOUD == '1'`; their target workflows can impose additional lane gates (`fleet-dispatch.yml:109-130`; `docs/SPEND-SWITCHES.md:42`).

The headers still say “proposed; not installed,” but the registry and active YAML listener are present. Treat those headers as stale prose, not proof of operational availability (`fleet-dispatch.yml:1-4`; `.github/fleets.yml:1-9`).

### Exact fleet registry

| Fleet | Aliases | Route / destination | Cloud |
| --- | --- | --- | --- |
| `security-fleet` | `security`, `redteam-fleet` | Dispatch `security-fleet.yml` | No |
| `biome` | `biome-crew`, `crew` | Dispatch `biome-sentinel.yml`, `biome-medic.yml`, `biome-homeostat.yml`, `biome-sheaf.yml`, `biome-inspector.yml` | No |
| `dragnet-team` | `dragnet-fleet` | Dispatch `deep-search-research.yml` with issue/query/profile inputs | Yes |
| `research` | `rnd`, `rnd-research`, `research-fleet` | Dispatch `research-engine.yml` | Yes |
| `bernstein` | `octopus-orchestra`, `claude-octopus` | Dispatch `bernstein-orchestrator.yml` | Yes |
| `octopus` | `octo-review` | Dispatch `octopus-review-fallback.yml` | Yes |
| `coding-agents` | `openhands`, `swe`, `coder-fleet` | Dispatch `openhands-resolver.yml` | Yes |
| `fleet-controller` | `fleet-ops`, `controller` | Dispatch `fleet-controller.yml`, dry-run oriented | No |
| `agent-creator-refresh` | `agentic-workflow-fleet`, `workflow-fleet` | Dispatch `update-agent-creator-data.yml` | Yes |
| `personas` | `oaudrey`, `openrouter`, `mindmappr`, `professor`, `dragnet`, `coder`, `orbit`, `octo`, `mender` | Persona acknowledgement/route; not a second workflow dispatch | Yes |
| `fraud-signal` | `fraud`, `fsv` | Local command only | No |
| `unfound-docket` | `docket` | Local/prompt-only instructions | No |

Source: `.github/fleets.yml:11-104`.

Local commands returned by the registry:

```bash
cd fraud-signal-verification-fleet && python3 src/orchestrator.py && python3 src/judge.py
```

```text
open docs/unfound-docket/FLEET.md and paste a role prompt into Claude
```

**Static fleet result:** every dispatch-based target exists, declares `workflow_dispatch`, receives only declared inputs, and has its required inputs covered. This establishes static compatibility, not runtime success. Full per-target inputs are in `REVVEL_WORKFLOW_EVENT_INDEX.md`.

---

## 6. Labels, titles, and automatic issue/PR routes

### Active implementation and research routes

| Signal | Event required | Actual route | Evidence / caveat |
| --- | --- | --- | --- |
| `wr:code` or `spec-approved` | Issue labeled | `openrouter-coder.yml` | Main implementation handoff. `openrouter-coder.yml:28-31` |
| `wr:research-complete` | Issue labeled | `spec-approval-gate.yml` adds `needs-spec-approval` and asks owner to add `spec-approved` | `spec-approval-gate.yml:13-61` |
| `fix-me` | Issue labeled | `openhands-resolver.yml` | Cloud + coding-agent gates and credentials. `openhands-resolver.yml:2-25` |
| `swe-fix` | Issue labeled | `swe-agent.yml` | Cloud + coding-agent gates and credentials. `swe-agent.yml:2-25` |
| `wr:research` or `lifecycle:stuck` | Issue labeled | `perplexity-research-agent.yml` | Completion adds `wr:jules`, which currently feeds a broken dispatcher target. `perplexity-research-agent.yml:35-37,67-77` |
| `wr:jules`, `wr:research`, `wr:code`, `octopus-review`, `lifecycle:stuck` | Issue events handled by dispatcher | `agent-dispatcher.yml` chooses a downstream agent | The Jules branch calls disabled `jules-coding-agent.yml`; see traps. |
| `deep-search` | Issue labeled | `deep-search-research.yml` | Direct research route |
| `devin-review` | Non-draft PR labeled/opened/etc. | `devin-code-review.yml` | `devin-code-review.yml:77-86` |
| `ui-creation` | Relevant issue/PR event | `ui-creation-engine.yml` | Alternative to `@copilot ui-engine`. `ui-creation-engine.yml:45-47` |
| `output-type:sellable-pdf` | Issue label | `pdf-work-request-router.yml` | Its emitted `pdf_work_request` repository event has no static listener in this snapshot. `pdf-work-request-router.yml:17-19,314-328` |
| `changes-requested` or submitted `CHANGES_REQUESTED` review | PR label/review | `pr-review-request-handler.yml` | `no-triage` skips the handler. `pr-review-request-handler.yml:20-22,40-65` |
| `work-request`, `checkpoint-gated`, `high-stakes`, `owner-review-per-block` | Issue/WR event | Deterministic Host decomposition in `host.yml` | Its “Next: agent-fallback” prose is misleading because fallback is manual-only. `host.yml:31-47` |
| `proposal` | Issue/PR route | `proposal-prosecution.yml` | `proposal-prosecution.yml:17-22` |
| `deliver:*` | Merged PR | `ship-to-market.yml` | See channel list below. `ship-to-market.yml:1-17,58-100` |
| `has-conflicts` or `mergeable_state == dirty` | PR event/state | `conflict-helper.yml` | Leftover-to-Jules handoff is broken. `conflict-helper.yml:27-49,229-244` |
| `dragnet-team` in a newly opened human WR body plus `work-request` or `[WR]` | Issue opened | `dragnet-team-assignment.yml` | `dragnet-team-assignment.yml:13-36` |
| Any issue label | Issue labeled | `budget-aware-agent.yml` | Mostly echo/stub behavior such as “Would call Devin API”; not a working provider invocation. `budget-aware-agent.yml:19-20,127-164` |
| `[WR]`, selected labels, and title tags | Issue **opened** only | `wr-auto-classify.yml` Project v2 classification | Requires `PROJECTS_PAT`; no general `labeled` listener. `wr-auto-classify.yml:1-47` |
| `[WR]`, `deep-research`, `jules`, or `weekly-research` | New/reopened issue; also unblocked-issue handling | `jules-invoke.yml` | This is the real Jules route; manual dispatch requires a `prompt`. `jules-invoke.yml:1-28,123-148` |

### Output Type auto-routing

`openrouter-auto-route.yml:117-136` maps classified work as follows:

| Output type | Labels/routes applied |
| --- | --- |
| CLI, API, MCP, production app | `swe-fix` |
| Desktop tool / invention flow | `swe-fix` + Bito dispatch attempt |
| Sellable PDF, technical docs, project-management docs | `noimosai` + `fix-me` |
| Client code / internal automation | `fix-me` |
| All types | Attempts `bito-ai` |

Two important caveats:

1. `bito-ai.yml` is manual-only, so a dispatch can be meaningful while Bito's own PR/comment listeners remain disabled.
2. `noimosai.yml` has no `labeled` listener. It checks those labels only when an issue is **opened/reopened**. Applying `noimosai` later does not itself launch NoimosAI (`noimosai.yml:27-31,98-102`).

### `deliver:*` channels

The shipping workflow recognizes:

```text
deliver:api
deliver:app
deliver:mobile
deliver:android
deliver:ios
deliver:pdf
deliver:cli
deliver:package
deliver:docker
deliver:mcp
deliver:docs
deliver:video
deliver:extension
deliver:vscode
deliver:action
deliver:openapi
deliver:migration
deliver:marketplace
deliver:all
```

Evidence: `ship-to-market.yml:1-17,58-100`.

---

## 7. Manual dispatch routes

Manual dispatch is a real entry point only when `workflow_dispatch` is declared **and** the job predicates can succeed for that event. A lingering label predicate does not create a label listener.

General CLI shape:

```bash
gh workflow run <workflow.yml> -R midnghtsapphire/revvel-standards --ref main \
  -f <input>=<value>
```

Useful declared routes include:

| Workflow | Manual purpose / inputs | Important caveat |
| --- | --- | --- |
| `openhands-resolver.yml` | `issue_number` (required number) | Direct alternative to re-applying `fix-me`; cloud/coding gates still apply |
| `swe-agent.yml` | `issue_number` (required number) | Direct alternative to re-applying `swe-fix`; cloud/coding gates still apply |
| `research-engine.yml` | Optional `issue_number`, `pr_number`, `research_query`; `research_depth` = `deep_search`, `standard`, `triangulated`, or `swarm` | Current intentional route after comment/label triggers were removed. `research-engine.yml:1-35` |
| `wr-pr-creation.yml` | Required `issue_number` | Manual route works; old issue/comment/label routes are absent. `wr-pr-creation.yml:1-10` |
| `agent-fallback.yml` | Optional `issue_number`, `task_description`, `prefer_agent` = `auto`, `openrouter`, `cursor`, `OpenHands` | Manual route was explicitly restored; automatic triggers remain disabled. `agent-fallback.yml:1-29` |
| `fleet-dispatch.yml` | Required `fleet`; optional `args`, `issue_number` | Statically compatible fleet registry |
| `jules-invoke.yml` | Required `prompt` plus its declared context inputs | Real Jules entry point, unlike disabled `jules-coding-agent.yml` |
| `bito-ai.yml` | Manual review route | PR and comment triggers are commented out. `bito-ai.yml:47-65,87-90` |
| `content-automation.yml` | Required `topic`, `format`, `urgency`; optional `target_audience` | Manual event is admitted by its job predicate; labels/schedule are not active. `content-automation.yml:1-40` |
| `jules-pr-reviewer.yml` | Manual listener exists | Header says the third-party reviewer action is broken; do not equate manual availability with a working reviewer |
| `auto-approve-clean-prs.yml` | Manual listener under quiet mode | Automatic approval is not active. `auto-approve-clean-prs.yml:19-24` |

### Manual-only files with incompatible leftover predicates

These require special caution:

- `auto-merge.yml` declares only `workflow_dispatch`, but its enable/disable jobs still require a PR `labeled` event and PR payload. The labels `auto-merge` and `won't-merge` do not launch it, and a bare manual run does not satisfy those old predicates (`auto-merge.yml:1-20,138-143`).
- `pr-auto-review.yml` declares only `workflow_dispatch`, but its job requires PR events/payload and `awaiting-approval` or another PR action. A bare manual run is not a general usable review request (`pr-auto-review.yml:1-17`).

For every workflow's exact manual inputs, use the companion event index rather than guessing from old job code.

---

## 8. Internal calls and handoffs

### Generic agent and gateway chain

```text
issue comment
  → agent-command-window.yml
  → agent-command-router.mjs
  → repository_dispatch: agent_requested
  → agent-request-delivery.yml
  → REVVEL_AGENT_GATEWAY_URL
       ↳ if unset: repository_dispatch agent_status = needs-adapter
  → agent-command-window.yml receives agent_status
```

Evidence: `.github/agent-router.json:1-3`; `.github/workflows/agent-request-delivery.yml:3-5,31-66`; `.github/workflows/agent-command-window.yml` event declarations.

### Curated workflow-to-workflow call map

| Source | Target / next call | Status and evidence |
| --- | --- | --- |
| `agent-dispatcher.yml` | `perplexity-research-agent.yml` | Static target call. `agent-dispatcher.yml:156-160` |
| `agent-dispatcher.yml` | `jules-coding-agent.yml` | **Broken:** disabled target and incompatible inputs. `agent-dispatcher.yml:161-164` |
| `agent-dispatcher.yml` | `openrouter-coder.yml` | Static target call. `agent-dispatcher.yml:165-168` |
| `agent-dispatcher.yml` | `openrouter-triage.yml` | Static target call. `agent-dispatcher.yml:169-172` |
| `research-engine.yml` | `wr-pr-creation.yml` | Deliberate manual dispatch from research; target is manual-only. `research-engine.yml:139-229` |
| `scripts/research-engine.js` | `bito-ai.yml` for PR review | Target accepts manual dispatch even though its own PR/comment triggers are off. `scripts/research-engine.js:829-842` |
| `scripts/persona-comment-runner.js` | `research-engine.yml` | DRAGNET research lane. `scripts/persona-comment-runner.js:507-525` |
| `reset-self-heal-issue.yml` | `openrouter-assignee.yml`, `openrouter-triage.yml` | Recovery dispatches. `reset-self-heal-issue.yml:120-159` |
| `auto-reset-stuck-issues.yml` | `openrouter-assignee.yml`, `openrouter-triage.yml` | Recovery dispatches. `auto-reset-stuck-issues.yml:111-141` |
| `stuck-label-automation.yml` | `openrouter-triage.yml` | Recovery dispatch. `stuck-label-automation.yml:331-346` |
| `stuck-wr-detector.yml` | `wr-pr-creation.yml` | Capped retry path. `stuck-wr-detector.yml:289-307` |
| `veins-monitor.yml` | `wr-pr-creation.yml`; cycles `triage:new` | Monitoring/recovery route. `veins-monitor.yml:250-280,300-323` |
| `ship-to-market.yml` | `auto-deploy-to-stores.yml` | Post-merge deployment handoff. `ship-to-market.yml:555-590` |
| `auto-deploy-to-stores.yml` | `research-engine.yml` | Invoked when its research gate is unmet. `auto-deploy-to-stores.yml:231-250` |
| CircleCI main `lint-and-test` | `deploy-railway` → `railway up --detach` | Added by #18292: runs on main after the test gate; skips successfully when `RAILWAY_TOKEN` is absent and fails on deploy errors when configured. `.circleci/config.yml` |
| `scripts/openrouter-triage.js` | `auto-error-handler.yml` | Uses declared error inputs. `scripts/openrouter-triage.js:657-695` |
| `scripts/dragnet-ci-autofix.js` | `self-heal-pr.yml` | CI repair handoff. `scripts/dragnet-ci-autofix.js:296-318` |
| `scripts/biome/homeostat.js` | `BIOME_RECOVERY_WORKFLOW` with `force_recovery=true` | Configurable dynamic target. `scripts/biome/homeostat.js:142-151` |
| `scripts/controller/controller.js` | Dynamically redispatches selected workflow with `model` | Retries without `model` only for input-compatible 422 responses. `scripts/controller/controller.js:199-223` |
| `api-rate-limit-handler.yml` | `openrouter-coder.yml` | **Broken/useless fallback inputs:** `issue_number=0` and undeclared `fallback_reason`. `api-rate-limit-handler.yml:79-87` |
| `conflict-helper.yml` | `jules-coding-agent.yml` with `pr_number` | **Broken:** disabled target and unsupported input. `conflict-helper.yml:229-244` |
| `pdf-work-request-router.yml` | `repository_dispatch: pdf_work_request` | **No static listener found.** `pdf-work-request-router.yml:314-328` |

### Repository-dispatch listeners

In addition to `agent_requested` and `agent_status`, the snapshot includes:

| Event type | Listener |
| --- | --- |
| `openrouter-key-updated` | `openrouter-key-reset.yml` |
| `sentry` | `runtime-gateway-triage.yml` |
| `runtime-5xx` | `runtime-gateway-triage.yml` |
| `self-heal-fix` | `self-heal-pr.yml` |

The companion index lists all declared repository-dispatch types and all literal static calls, including listener-match status.

---

## 9. External GitHub App and vendor commands

These do not require a repository-owned comment listener. Installation and account entitlements still must be verified in the relevant GitHub/vendor dashboard.

| Command or bot | Classification | Notes |
| --- | --- | --- |
| `Gitar fix CI` | External App command | Appears in the Gitar PR comment you supplied; no repository-owned implementation was found |
| `gitar auto-apply:on` | External App command | Same source; trial/entitlement is controlled by Gitar, not repo workflow YAML |
| RulesSteward review comments | External bot/App | Not evidence of a local Grok/OpenRouter integration or available credits |
| `@coderabbitai review` | External CodeRabbit App | Documented in `.coderabbit.yaml:15-22`; requires the App to be installed and enabled |
| Native Copilot review/conflict comments | External GitHub capability | `config/saved-replies.yml:16-23` contains a saved reply for Copilot conflict resolution; it is not a repo-owned parser |
| `/approve <head-sha>` | Pinned external action invoked by local workflow | Repository listener exists, but approval logic belongs to the pinned Claude Code action |

Do not infer that typing `/copilot` into the generic router installs, assigns, or pays for native Copilot. Likewise, a vendor bot's presence does not prove the corresponding local gateway is wired.

---

## 10. Advertised, dormant, broken, and documentation-only triggers

### Highest-priority traps

| Phrase/label/path | What the snapshot actually does | Evidence |
| --- | --- | --- |
| `/retry-openhands` | **No listener.** The missing-credentials comment advertises it, but OpenHands only listens for `fix-me` and manual dispatch. Re-apply the label or dispatch manually. | `openhands-resolver.yml:1-25,79-95` |
| `/retry-swe-agent` | **No listener.** Re-apply `swe-fix` or dispatch manually. | `swe-agent.yml:1-25,77-92` |
| `wr:jules` → Jules | Live dispatcher path calls disabled `jules-coding-agent.yml` with undeclared inputs. Perplexity completion adds `wr:jules`, so this is a live route into a dead target. Use/repair toward `jules-invoke.yml`, not the disabled file. | `agent-dispatcher.yml:161-164`; `perplexity-research-agent.yml:67-77`; `jules-coding-agent.yml:29-48` |
| `has-conflicts` leftovers → Jules | Calls the same disabled target with unsupported `pr_number`. | `conflict-helper.yml:229-244` |
| `wr:code`, `wr:auto`, `agent-fallback` → `agent-fallback.yml` | **Dormant for fallback.** The job retains those predicates, but the workflow declares only `workflow_dispatch`. `wr:code` still separately starts `openrouter-coder.yml`. | `agent-fallback.yml:1-47` |
| Research comments and labels | Parser still recognizes mentions and research-intent phrases, but `issue_comment` and `labeled` triggers were deliberately removed. Only issue opened/reopened and manual dispatch remain. | `research-engine.yml:1-12,67-105` |
| `research:complete`, `wr:complete`, `wr:research`, `wr:reset` → WR PR creation | Completion-label code remains, but `wr-pr-creation.yml` is manual-only. Internal systems that explicitly dispatch it still have a meaningful route. | `wr-pr-creation.yml:1-10,105-122` |
| `auto-merge`, `won't-merge` | Do not launch `auto-merge.yml`; it is manual-only and retains incompatible label-event predicates. | `auto-merge.yml:1-20,138-143` |
| `content-automation`, `content`, `writing`, `blog`, `seo-content` | Do not launch content automation; only manual dispatch is declared. Schedule predicates are also dormant. | `content-automation.yml:1-40` |
| `awaiting-approval` | `pr-review-status.yml` can apply it, but `pr-auto-review.yml` is manual-only and its old PR predicates are dormant. | `pr-auto-review.yml:1-17`; `pr-review-status.yml` |
| Bito `/review`, `/explain`, PR events | Logic remains, but comment and PR triggers are commented out. Manual dispatch remains. | `bito-ai.yml:47-65,87-90` |
| `recovery:translate-me` and Octopus quota-comment fallback | Triggers are commented out under D016; `octopus-route.yml` is manual-only. External Apps may still report independently. | `octopus-route.yml:24-39,65-81`; `DECISIONS.md:35` |
| `noimosai`, `marketing`, `seo`, `content`, `affiliate` applied later | No `labeled` listener; only considered on issue opened/reopened. | `noimosai.yml:27-31,98-102` |
| API rate-limit fallback | Dispatches OpenRouter Coder with `issue_number=0` and undeclared `fallback_reason`. | `api-rate-limit-handler.yml:79-87` |
| `pdf_work_request` | Emitted by the PDF router, but no static repository-dispatch listener was found. | `pdf-work-request-router.yml:314-328` |

### Documentation-only or non-GitHub commands

| Phrase/convention | Actual classification |
| --- | --- |
| `/force-merge`, `/lgtm force-merge approved`, `/force-merge denied` | Human process templates in `CODE_REVIEW_STANDARD.md:93-141`; no repository-owned executor found |
| `/bootstrap-agent`, `/swap-agent`, `/diagnose`, `/patch`, `/pipeline-fix`, `/doc-sync`, `/schema-guard`, `/ui-audit` | Agent-factory instructions, not GitHub comment listeners |
| `/api-scaffold`, `/accessibility-pass`, `/model-audit`, `/perf-plan`, `/image-hardening`, `/handoff-pack` | Related documented agent instructions, not active comment listeners found in this audit |
| `/probabilistic`, `/orchestration`, `/ai-validation` | Skill-routing triggers in generated catalog data, not GitHub comment commands |
| `/goap` | Intentionally not callable; GOAP is a planning methodology. `docs/agents/goap/PROFILE.md:21-37` |
| `/standby` | No listener found |
| `next`, `checkpoint-approved` | Coordination conventions in `DECISIONS.md` D011; the decision says automation does not yet enforce the checkpoint |
| `@copilot`, `@cursoragent`, `@openhands-agent`, `@imgbotapp` in Research Engine | Dormant parser branches because Research Engine no longer listens to issue comments |
| `/recon`, `/steam`, `/discord`, `/reddit`, `/tiktok`, `/sweep`, `/server`, `/deleted`, `/monitor`, `/satellite`, `/map` | Discord/Telegram product-design commands in `standards/GENZ_INT_OSINT.md`, not GitHub workflow listeners |

### RadioChaser drift

`docs/agents/radiochaser/PROFILE.md` predates the generic router and says nothing fires. Current reality is more nuanced:

- `/radiochaser` is accepted by the **generic gateway router** and can emit `agent_requested`.
- No direct RadioChaser persona/provider lane was found.
- If the gateway is unset, the result is `needs-adapter`.
- `/standby` still has no listener.
- `ready-for-review.yml:323-354` continues to advertise these commands.

### Quiet mode and fallback documentation conflicts

1. `README.md:787-793` says “QUIET MODE — No automation runs,” but many active listeners remain. `exit-quiet-mode` is only a gate for selected manual workflows, not a global switch (`eeat-trust-cron.yml:19-48`; `triage-cron.yml:17-34`; `migration-cron.yml:18-35`). The latter two are placeholders.
2. `docs/AGENT_FALLBACK_PROCESS.md:99-164` describes automatic fallback issue/PR/reusable routes that are absent from the current `on:` block.
3. Fallback order disagrees across docs: `docs/AGENT_FALLBACK_QUICKSTART.md` says Devin → Cursor → OpenRouter → OpenHands → manual; current fallback comments and `VISITING_AGENTS.md:86-97` say OpenRouter → OpenHands → manual; `config/connections.yml:97-106` says Cursor is being retired.
4. `START_HERE_CALL_CHAIN.md:56-62` still shows automatic WR PR creation/fallback paths even though both target workflows are manual-only.
5. `docs/process/SYSTEM_MAP.md:125-140` lists direct persona aliases that the actual persona job gate omits.

---

## 11. Operational interpretation and repair order

This section is an audit recommendation, not a change already made.

1. **Fix the dead retry instructions first.** Either add listeners for `/retry-openhands` and `/retry-swe-agent`, or change the comments to tell users to re-apply `fix-me`/`swe-fix`. The latter is smaller and preserves existing behavior.
2. **Redirect live Jules handoffs to `jules-invoke.yml`.** Repair `agent-dispatcher.yml` and `conflict-helper.yml` with the real target's declared inputs; do not re-enable the file marked “Do not re-enable.”
3. **Decide which manual-only quiet-mode changes are intentional.** Then align `START_HERE_CALL_CHAIN.md`, fallback docs, labels, and job predicates with that decision. Do not simply restore every old trigger; several were removed to stop runaway loops.
4. **Repair or remove dead fallback calls.** The rate-limit handler's issue `0`, the PDF event without a listener, and the Bito/NoimosAI assumptions create false expectations.
5. **Unify persona admission with the alias registry.** A single registry-driven gate would prevent `/mender` and other documented aliases from drifting out of the workflow predicate.
6. **Make gateway status visible in the cheat sheet.** `/name` succeeding at parsing is not provider execution. Surface `needs-adapter`, `delivered`, `failed`, and actual completion as distinct states.
7. **Verify runtime only after static repairs.** Check Actions settings, variables, secrets, App installations, self-hosted runners, and one deliberately chosen low-cost workflow at a time.

For LM Studio specifically, repository governance already warns that GitHub-hosted runners cannot reach a laptop's localhost; `wr-rewrite.yml` intentionally uses `runs-on: self-hosted` (`AGENTS.md:376-380`). A reachable tunnel or self-hosted runner is required; merely setting a localhost URL on `ubuntu-latest` cannot work.

---

## 12. Practical “what can I type?” list

### Direct, repository-owned comment lanes

```text
@openrouter-agent <question>
@copilot ui-engine <request>
/devin <request>
/brain-dump <text>
/wr-title
/wr-title force
/title
/title force
/approve <head-sha>
/persona <registry-name-or-alias> <task>
```

### Direct persona slash forms admitted by the current gate

```text
/professor <task>
/oaudrey <task>
/mindmappr <task>
/openrouter <task>
/dragnet <task>
/scaffold <task>
/builder <task>
/product-build <task>
/orbit <task>
/circleci <task>
/circle-ci <task>
/octo <task>
/octopus <task>
/mabl <task>
```

Listed emoji forms are also admitted: `/🎓`, `/🧠`, `/🗺️`, `/🗺`, `/🔀`, `/🕵️`, `/🕵`, `/🔎`, `/🛠️`, `/🛠`, `/🪐`, `/⭕`, `/🐙`, `/🧪`.

### Generic gateway aliases

Every name in section 2 works after either `/` or `@`, subject to router authorization. Always check for `needs-adapter` rather than assuming the named agent ran.

### Fleet aliases

Every fleet and alias in section 5 works syntactically for owner `midnghtsapphire`. Cloud routes still require the spend gate. Local routes return instructions rather than running CI.

### Labels worth remembering

```text
wr:code
spec-approved
fix-me
swe-fix
wr:research-complete
deep-search
devin-review
ui-creation
changes-requested
no-triage
has-conflicts
output-type:sellable-pdf
work-request
checkpoint-gated
high-stakes
owner-review-per-block
proposal
deliver:*
```

Labels listed in section 10 as dormant should **not** be added to this operational checklist until their workflows are intentionally repaired.

---

### Bottom line

Your instinct was correct: the repository has accumulated several generations of commands, and prose/comments now disagree with actual event listeners. The most consequential findings are:

- `wr:code` / `spec-approved` remains the key implementation handoff.
- Most generic `/name` and `@name` commands terminate at an external gateway and may only return `needs-adapter`.
- `/retry-openhands` and `/retry-swe-agent` are advertised but have no listeners.
- `wr:jules` and conflict leftovers feed a disabled Jules workflow instead of the real `jules-invoke.yml` route.
- Fallback, WR PR creation, auto-merge, content automation, PR auto-review, Bito, and several other apparently automatic routes are manual-only or dormant.
- Persona documentation advertises aliases that its own job gate rejects.
- Fleet dispatch is unusually clean by comparison: every declared dispatch target passed the static existence and input-compatibility check.

Use this catalog together with the full event index before adding another agent or another prompt. The immediate need is not more trigger names; it is making the existing event → predicate → dispatch → provider → completion chain observable and consistent.
