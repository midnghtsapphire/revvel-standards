# REVVEL NIST readiness mapping

Who: Rules-Steward · When: 2026-11-11 · Why: WR #18343, rescope approved by TriageChief · What: an evidence-bound readiness mapping.

This is a readiness mapping, not a compliance attestation. It does not claim that REVVEL complies with NIST, that a NIST assessor has reviewed this repository, or that any control below would pass an assessment.

As of November 2026, NIST has published no AI-agent standard and no agent SP 800-53 overlay. [COSIS](https://csrc.nist.gov/Projects/cosis) (formerly COSAiS; the project page records the rename on 20 October 2026) plans NISTIR 8605D, *Control Overlays for Securing AI Systems: Using Agentic AI: Single Agent and Multi-Agent*. That volume is not yet drafted. The [January 2026 COSAiS annotated outline](https://csrc.nist.gov/csrc/media/Projects/cosais/documents/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf) is a discussion draft for NISTIR 8605 and NISTIR 8605A (overview, and using and fine-tuning predictive AI). It names 8605D as proposed volume 5 and says 8605 and 8605A were the volumes intended as public-comment drafts by Q3 FY2026. It does not select agent-overlay controls. The [AI Agent Standards Initiative announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure) (17 February 2026) describes industry-led standards, open protocols, and security and identity research. It is not a control catalog and it does not offer an assessment.

NIST offers no readiness assessment for AI agents. Nothing in the sources above is a test this repository can pass. This mapping will be re-done when NISTIR 8605D is published. Until then, family names below are from the existing [SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) catalog, used as an organizing list. A row does not mean the control is tailored, parameterized, inherited, or effective in a deployment.

`docs/compliance/NIST_COMPLIANCE.md` and `docs/compliance/SP-800-53-OVERLAYS.md` (both 2026-11-10) stay in place. The overlay file is deferred until NISTIR 8605D is published. This file is the rescoped record.

## How to read a status

| Status | Meaning in this file |
| --- | --- |
| implemented | The named REVVEL rule is in the repo and a cited gate or script does that thing. |
| partial | A related rule or script exists, and it does not cover the control. |
| gap | No implementing file was found. The evidence cell says where the search stopped. |

File presence is not an assessment result. Paths were checked against the tree on 2026-11-11. If a later edit removes a cited file, the row is stale and must be marked gap rather than kept.

## Control mapping

| Control | REVVEL control or rule | Status | Evidence |
| --- | --- | --- | --- |
| AC-2 Account Management | No distinct account per bot, and no joiner-mover-leaver record | gap | No file assigns, reviews, or revokes a GitHub account per bot. See the identity section. |
| AC-3 Access Enforcement | Visiting agents may write only in named trees, and must not drop root junk or secrets | partial | [VISITING_AGENTS.md](../../VISITING_AGENTS.md) lines 25-34 state the write boundary and the no-secrets rule. [no-root-junk.yml](../../.github/workflows/no-root-junk.yml) lines 50-87 fail a PR that adds a denied root name or an unlisted root script. The write boundary itself is not a runtime check on every path. |
| AC-6 Least Privilege | A paid LLM call is refused unless `REVVEL_LLM_ALLOW_CLOUD` is exactly `1` | implemented | [llm-spend-gate.js](../../scripts/llm-spend-gate.js) lines 69-82 fail closed. [local_llm.py](../../scripts/local_llm.py) lines 111-113 use the same variable. [llm-spend-gate-coverage.test.js](../../tests/llm-spend-gate-coverage.test.js) lines 17-24 discover call sites under `scripts/` and `.github/scripts/`. [agent-fallback.yml](../../.github/workflows/agent-fallback.yml) lines 217-219 skip the billed OpenRouter step unless the repository variable is `1`. Token scopes for each bot were not found. |
| AU-2 Event Logging | Selected GitHub issue, review, and comment events are appended to an audit log | partial | [agent-audit-logger.yml](../../.github/workflows/agent-audit-logger.yml) lines 8-17 trigger on issue opened/closed, review submitted, and comment created. Lines 117-139 append a JSONL row with a sha256 `entry_hash`. Denied tool calls, prompt-injection attempts, and delegation hops are not in that trigger list. |
| AU-3 Content of Audit Records | Each logged row names time, actor, action, and resource | partial | Same workflow, lines 117-132: `timestamp`, `actor`, `action`, `resource_type`, `resource_number`, `resource_title`, `prev_hash`. No parent-task id across agents. |
| AU-9 Protection of Audit Information | Do not delete or rewrite existing work; hash-chain the audit row | partial | [AGENTS.md](../../AGENTS.md) lines 8-9 forbid delete and wholesale rewrite. [LEDGER_STANDARD.md](../../standards/LEDGER_STANDARD.md) line 16 forbids rewriting past ledger entries. The audit workflow hash-chains rows (lines 101-136) and the comment at lines 142-144 says the entry is persisted without a commit to `main`. No separate store, retention clock, or access policy for that log was found. |
| AU-10 Non-repudiation | Bot posts are not bound to a signer other than the shared login | gap | The signature rule is text, not a cryptographic signature. See the identity section and [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) line 13. |
| IA-2 Identification and Authentication | GitHub posts start with `**BotName:**` and end with `— BotName` | partial | [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) line 13. On WR #18343, comments [6797061763](https://github.com/midnghtsapphire/revvel-standards/issues/18343#issuecomment-6797061763) and [6797844277](https://github.com/midnghtsapphire/revvel-standards/issues/18343#issuecomment-6797844277) are signed TriageChief and Rules-Steward and are authored by the login `midnghtsapphire`. That is a label, not a second authenticator. |
| IA-4 Identifier Management | Call names use a `bot-` prefix; teams end in `-team` | partial | [CALL-NAMES.md](../CALL-NAMES.md) lines 5-7 and [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) line 17. Naming only. No issuance or retirement record per identifier. |
| IA-5 Authenticator Management | Secrets stay out of git; tokens are not passed on the command line | partial | [.gitignore](../../.gitignore) lines 33-34 ignore `.env` and `.env.local`. [VISITING_AGENTS.md](../../VISITING_AGENTS.md) line 33. [CLAUDE.md](../../CLAUDE.md) lines 39-40 say secrets belong on stdin, not in argv. No rotation procedure was found, and no workflow under `.github/workflows/` has a secrets-scanner name. |
| IA-9 Service Identification and Authentication | Agent-to-agent peers are authenticated | gap | [cross-repo-review-2026-11-10.md](../../wr/summaries/cross-repo-review-2026-11-10.md) line 110: issue #18340 is open, internal handoff is not a network A2A claim, and signed messages are still required. [server.py](../../mcp-servers/wr-control-plane/wr_control_plane/server.py) lines 309-312 record whether `OBOT_IDP_CONFIG` is set. That is a presence flag, not a peer-authentication test. |
| CM-3 Configuration Change Control | CircleCI lint and test fail the pipeline when they fail | implemented | [.circleci/config.yml](../../.circleci/config.yml) lines 27-65 (`lint-and-test`) and lines 62-65 (a test failure fails the job). The workflow `pr-workflow` runs that job on non-main branches (lines 209-214). |
| CM-3 Configuration Change Control | Silent merge only after assignee, finished work, green checks, and Triage CLEAR | partial | [bot-mergemender/README.md](../bots/bot-mergemender/README.md) line 26 writes the five gates, says CircleCI is the real gate, says merges are silent, and says the bot does not edit rulesets. [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) lines 9-10: nobody pushes to `main`, and bots do not merge their own PRs. The GitHub ruleset itself is not a file in this repo. |
| CM-5 Access Restrictions for Change | Agents do not push to `main` and do not merge their own PRs | partial | [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) lines 9-10 and [AGENTS.md](../../AGENTS.md) line 12. Same limit as the row above: the written rule is here; the live ruleset is not. |
| SI-2 Flaw Remediation | Dependabot opens update PRs, one directory at a time | partial | [.github/dependabot.yml](../../.github/dependabot.yml) lines 14-33 and the `github-actions` ecosystem at lines 31-33. [check-dependabot-split-deps.js](../../scripts/check-dependabot-split-deps.js) lines 1-15 fail the build when the config breaks those rules. No remediation time limit or patched-build record was found. |
| SI-7 Software, Firmware, and Information Integrity | Silent deletion of a tracked file fails CircleCI | implemented | [.circleci/scripts/check-archival-policy.sh](../../.circleci/scripts/check-archival-policy.sh) lines 2-8 and the `policy-check` job in [.circleci/config.yml](../../.circleci/config.yml) lines 181-192. [COMMENT-DONT-DELETE.md](../../standards/COMMENT-DONT-DELETE.md) lines 17-18 state the rule the script enforces. This does not hash deployed binaries. |
| SI-10 Information Input Validation | Untrusted agent or tool input is validated before use | gap | No repository control was found that validates agent messages, tool output, or embedded instructions before execution. |
| SA-11 Developer Testing and Evaluation | The repository test suite fails the CircleCI job on failure | implemented | [.circleci/config.yml](../../.circleci/config.yml) lines 62-65 and `bash .circleci/scripts/run-tests.sh`. This is the repo test gate. It is not an adversarial agent evaluation. |
| SR-3 Supply Chain Controls and Processes | Dependency updates are split per directory and rejected when grouped across directories | implemented | [.github/dependabot.yml](../../.github/dependabot.yml) lines 9-23 and [check-dependabot-split-deps.js](../../scripts/check-dependabot-split-deps.js) lines 8-15. This is the update-PR shape, not a supplier assessment. |
| SR-11 Component Authenticity | Third-party Actions are pinned to a full commit SHA | partial | [CLAUDE.md](../../CLAUDE.md) lines 54-56 state the pin rule. A sampled workflow still uses a floating tag: [no-root-junk.yml](../../.github/workflows/no-root-junk.yml) line 27 is `actions/checkout@v7`. The pin is not applied uniformly, so the control is not met. |
| IR-4 Incident Handling | A self-heal packet is built when research triage fails | partial | [agent-self-heal.js](../../scripts/agent-self-heal.js) lines 47-64 read `--agent`, `--failure`, `--context`, and `--issue`. [weekly-research.yml](../../.github/workflows/weekly-research.yml) lines 234-238 call that script with `--component` and `--error`, which the parser ignores, so the packet is the default agent and an empty failure string. [MASTER.md](../../MASTER.md) line 137 states the self-healing invariant. [auto-error-handler.yml](../../.github/workflows/auto-error-handler.yml) lines 1-17 run only on `workflow_dispatch`. No incident exercise record was found. |
| IR-6 Incident Reporting | A dispatched error opens a GitHub issue | partial | [auto-error-handler.yml](../../.github/workflows/auto-error-handler.yml) lines 52 and 214 create an issue when someone dispatches the workflow. Nothing in the `on:` block (lines 2-17) subscribes to failures automatically. |

## Single-agent controls

One agent working in this repository is bounded by the rows that do not depend on a second agent. The write boundary and the root-junk gate (AC-3) limit where a visiting agent may add files. The spend gate (AC-6) stops that agent from billing an LLM provider unless the exact opt-in is set. The audit logger (AU-2, AU-3) records some of the GitHub events that agent causes, and the hash chain plus the never-delete rule (AU-9, SI-7) are what protect that record. Change control for a single agent is the CircleCI lint, test, and archival jobs (CM-3, SA-11, SI-7) plus the written ban on pushing to `main` (CM-5). Dependency update shape (SR-3) and the incomplete Action pin (SR-11) apply to the code that agent ships.

[goap-engine.js](../../products/goap-swarm-console/lib/goap-engine.js) lines 1-16 are an in-process planner (world state, actions, a swarm allocator in one Node module). That is single-process planning. It is not a networked agent identity and it is not evidence for IA-9.

What a single agent still does not have: its own account (AC-2), a validated intake for untrusted tool text (SI-10), and an incident path whose caller and parser agree (IR-4).

## Multi-agent controls

A2A is not implemented. Issue #18340 remains open. The 10 November 2026 review states that an internal skill handoff is not a network-standard claim, and that an A2A SDK, cards, a hub, negotiation, signed messages, and capability-scoped execution are still required ([cross-repo-review-2026-11-10.md](../../wr/summaries/cross-repo-review-2026-11-10.md) line 110). The January 2026 outline's agent volume (NISTIR 8605D) would be the document that tailors SP 800-53 for single-agent and multi-agent use cases. It is not drafted, so this section does not invent those tailoring decisions.

Most multi-agent controls are partial or gap.

| Topic | Status | What the repo actually has |
| --- | --- | --- |
| Authenticated agent-to-agent peers (IA-9) | gap | No signed A2A message path. See the IA-9 row. |
| Delegation that cannot widen privilege (AC-6 across agents) | gap | No capability negotiation and no denied-delegation test. The spend gate applies to a call site, not to a delegated peer. |
| Correlated audit across a handoff (AU-2, AU-3) | gap | The audit row has no parent-task id. See AU-3. |
| Failover from one provider to another | partial | [agent-fallback.yml](../../.github/workflows/agent-fallback.yml) lines 100-102 describe OpenRouter, then OpenHands, then manual. That is sequential failover of one task, not a conversation between agents. |
| In-process swarm planning | partial | [goap-engine.js](../../products/goap-swarm-console/lib/goap-engine.js) plans inside one process. It does not authenticate a remote agent. |
| Incident handoff when a delegate fails (IR-4) | partial | The weekly-research caller and `agent-self-heal.js` disagree on flag names, so the packet does not carry the failure text. |

## Identity and authorization

Every bot posts as `midnghtsapphire`. The two rescope comments on WR #18343 are the evidence used here: both GitHub events are authored by the login `midnghtsapphire`, and the bodies carry the bot name. Attribution relies on the bot-name prefix and the signature convention in [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) line 13: a post starts with `**BotName:**` and ends with `— BotName`. The call-name prefix in [CALL-NAMES.md](../CALL-NAMES.md) (`/bot-<name>`) is a separate naming rule for how a person invokes a bot. It is not a GitHub user.

Consequences for the catalog:

- IA-2 is partial. A reader can tell which bot name was typed. A reader cannot tell that GitHub authenticated that bot as a distinct user.
- IA-9 and AU-10 are gap. There is no service credential per bot and no signature that would still identify the bot if the prefix were omitted.
- AC-2 is gap. Account management for a fleet that shares one login is not specified in this repo.

Authorization that does exist is the spend opt-in (AC-6), the visiting-agent write list (AC-3), and the merge instruction that the author does not merge their own PR (CM-5). None of those bind a bot name to a credential.

## Gaps and suggested follow-up WRs

These are not opened by this change. #18340 is already the A2A work request; a second one would duplicate it.

1. **Distinct bot principals.** Give each bot a GitHub identity, or a signed attribution that is checked, so IA-2, IA-9, and AU-10 are not a shared login plus a text prefix.
2. **Finish #18340 before any multi-agent overlay claim.** Signed messages, capability-scoped execution, and a denied-delegation test. Do not write NISTIR 8605D tailoring ahead of the draft.
3. **Re-map when 8605D is published.** Replace this file's family crosswalk with the published agent overlay. Keep `SP-800-53-OVERLAYS.md` deferred until that publication.
4. **Align the self-heal caller.** `weekly-research.yml` should pass the flags `agent-self-heal.js` reads, and an incident exercise should record the packet that was produced (IR-4, IR-6).
5. **Pin Actions to commit SHAs.** Apply the CLAUDE.md pin rule to the workflows that still use floating tags, then keep Dependabot refreshing those SHAs (SR-11).
6. **Log denied actions.** Extend the audit trigger, or add a different log, for refused tool calls and refused cloud-spend attempts, with a parent-task id (AU-2, AU-3).
7. **Secrets rotation and scanning.** A written stdin rule and a gitignore are not a scanner or a rotation record (IA-5).

## Sources

- [COSIS project page](https://csrc.nist.gov/Projects/cosis), read 2026-11-11. Rename from COSAiS recorded there as 20 October 2026. Use cases include single-agent and multi-agent. No published 8605D.
- [AI Agent Standards Initiative](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure), 17 February 2026.
- [COSAiS annotated outline, January 2026](https://csrc.nist.gov/csrc/media/Projects/cosais/documents/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf). Proposed series, including NISTIR 8605D. The outline itself is for 8605 and 8605A.
- [SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final), the catalog whose family identifiers are used above.
