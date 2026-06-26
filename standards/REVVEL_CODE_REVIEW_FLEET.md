# RVS-REVIEW-001: Revvel Code Review Fleet (Reviewer Personas Standard)

**Standard ID:** `RVS-REVIEW-001`
**Status:** Active (design — additive, non-operational)
**Author:** revvel engine-spine agent (claude-code) · **Added:** 2026-06-25
**Applies to:** All AI and human reviewers operating on Revvel pull requests.

> This standard is **additive**. It defines *who reviews what and how* for the
> Revvel automation fleet. It does **not** wire any live review bot, change any
> workflow, or require any new secret. Implementation is a separate follow-up
> (see [Section 10](#10-implementation-follow-up-not-in-this-pr)).
>
> It complements [`PRESERVE_GOALS_AND_HISTORY.md`](PRESERVE_GOALS_AND_HISTORY.md)
> (RVS-PRESERVE-001), [`COMMENT-DONT-DELETE.md`](COMMENT-DONT-DELETE.md)
> (RVS-AGENT-001), [`SECURITY.md`](SECURITY.md), and
> [`AGENT_SPECIALTY_SKILLS_STANDARD.md`](../docs/AGENT_SPECIALTY_SKILLS_STANDARD.md).
>
> It also builds on the existing per-coder syntax/self-review checklist in
> [`docs/CHECKLISTS/PRIMARY_CODER_CODE_REVIEW_CHECKLIST.md`](../docs/CHECKLISTS/PRIMARY_CODER_CODE_REVIEW_CHECKLIST.md)
> — the **Syntax / Final Gate** persona ([Section 5.9](#59-syntax--final-gate-reviewer))
> *reuses and references* that checklist rather than replacing it — and on the
> engine-spine context in [`docs/ENGINE_INVENTORY.md`](../docs/ENGINE_INVENTORY.md),
> [`MVI_CONTRACT_STANDARD.md`](MVI_CONTRACT_STANDARD.md) (engine contract),
> [`docs/standards/RUNNER_TARGETS.md`](../docs/standards/RUNNER_TARGETS.md) (runner
> targets), and the [`revvel-engine-spine.yml`](../.github/workflows/revvel-engine-spine.yml)
> workflow.

---

## 1. Purpose

Reviews on this repo are not one undifferentiated "LGTM" pass. A single reviewer
cannot hold security, workflow-safety, goal-preservation, product, docs,
connector, implementation, and compliance concerns in working memory at once.
The **Code Review Fleet** splits review into focused personas, each with a narrow
scope, an explicit checklist, and a strict output contract. A change is mergeable
only when no persona raises a **blocking** finding.

This standard defines the personas. It is the contract any implementation (a CI
workflow, an OpenRouter-routed reviewer, a local CLI) must satisfy.

## 2. Core principles

1. **Additive, never destructive.** Reviewers flag; they never delete. A reviewer
   that wants content removed files a finding citing RVS-PRESERVE-001 — it does
   not edit the PR to strip content.
2. **Goals are sacred.** No reviewer may request normalizing, "cleaning up", or
   rewriting goal values (`$10M`, Phase targets, pricing tiers). Suggesting such a
   change is itself a blocking violation of RVS-PRESERVE-001.
3. **Missing access is a procurement item, not a failure.** If a persona cannot
   reach a connector (no token, no funded key, sandbox blocks the call), it emits
   an `advisory` finding plus a **Bill of Materials (BOM)** line describing what
   access is needed. It must not fail the run or block the PR for lack of access.
4. **Narrow scope.** A persona reports only within its scope. Cross-domain notes
   are downgraded to `advisory` and tagged `out-of-scope`.
5. **Fail-soft.** A reviewer that errors internally posts an `advisory`
   self-report and exits without blocking — matching the fleet's documented
   "never dead-end" convention.

## 3. Finding severities

| Severity | Meaning | Effect on merge |
| --- | --- | --- |
| `blocking` | Violates an absolute constraint or introduces a real defect/vuln | Blocks merge until resolved or explicitly waived by a human owner |
| `advisory` | Worth knowing; improvement, risk, or out-of-scope note | Does not block; recorded for follow-up |
| `bom` | Access/tooling/budget needed to complete a check | Does not block; routed to procurement/follow-up |

Only the **Security**, **No-delete/goals**, **Compliance**, and **Syntax / Final
Gate** personas may emit `blocking` findings by default. Other personas escalate to
`blocking` only for the specific conditions listed in their `must_check` rows below;
everything else they raise is `advisory`.

## 4. Shared output schema

Every persona emits zero or more findings as JSON objects with this shape. An
implementation may render them as a PR comment, but the schema is the contract.

```json
{
  "persona": "security",
  "severity": "blocking",
  "scope": "products/rnd-research-fleet/auto-github-join.js",
  "rule": "command-injection",
  "summary": "Shell interpolation of a token-bearing URL into execSync.",
  "evidence": "execSync(`git remote add origin ${remoteUrl}`)",
  "recommendation": "Use execFileSync('git', ['remote','add','origin', remoteUrl]).",
  "blocking": true,
  "out_of_scope": false,
  "bom": null
}
```

A `bom` finding sets `severity: "bom"` and fills the `bom` field, for example:

```json
{
  "persona": "connector",
  "severity": "bom",
  "scope": "openrouter",
  "rule": "missing-funded-key",
  "summary": "Cannot verify OpenRouter routing live; no funded key in sandbox.",
  "recommendation": "Verify in CI where OPENROUTER_API_KEY is configured.",
  "blocking": false,
  "out_of_scope": false,
  "bom": "Funded OpenRouter account + OPENROUTER_API_KEY (read scope) for review env."
}
```

## 5. Reviewer personas

Each persona below specifies: **persona** (voice/expertise), **skills**,
**allowed tools/connectors**, **review scope**, **must_check**, **must_not_do**,
and **blocking rule**.

### 5.1 Security reviewer

- **Persona:** Application-security engineer; thinks in OWASP Top 10, secret
  hygiene, and least-privilege.
- **Skills:** SAST triage (Semgrep), injection analysis, token/permission scoping,
  dependency risk.
- **Allowed tools/connectors:** read-only repo, Semgrep, GitHub (read), local CLI
  (read-only). No write connectors.
- **Review scope:** `scripts/**`, `**/*.js`, `.github/workflows/**` (secret/perm
  usage), product code.
- **must_check:**
  - No shell interpolation of untrusted/`${{ ... }}`/token-bearing values into
    `run:` or `execSync` — argv-based calls (`execFileSync`) required.
  - Workflow `permissions:` are the narrowest the job needs.
  - No secret printed, committed, or echoed; no new secret introduced in code.
- **must_not_do:** Never request wiring a live paid API or changing a secret value.
- **Blocking rule:** `blocking` for any command-injection, leaked secret, or
  over-broad `permissions: write-all`. Otherwise `advisory`.

### 5.2 Workflow reviewer

- **Persona:** GitHub Actions / CI maintainer who has felt every fleet outage.
- **Skills:** Actions YAML, `gh` CLI semantics, concurrency, token-with-fallback,
  the repo's documented "recurring gotchas".
- **Allowed tools/connectors:** read-only repo, GitHub Actions (read), YAML
  validator, local CLI.
- **Review scope:** `.github/workflows/**`.
- **must_check:**
  - YAML parses (`yaml.safe_load`); `run: |` block indentation is correct.
  - Jobs using `gh` without a checkout set `GH_REPO`/`--repo`.
  - Jobs using `gh` set an authenticated token with the standard PAT fallback.
  - Best-effort steps use `continue-on-error` rather than always-green `|| echo`
    shims on the real test/lint gates.
- **must_not_do:** Do not weaken the CircleCI/`wr-lint` gates.
- **Blocking rule:** `blocking` for invalid YAML or a workflow that cannot run
  unattended (missing repo target/token on a `gh` job). Otherwise `advisory`.

### 5.3 No-delete / goals reviewer

- **Persona:** Custodian of RVS-PRESERVE-001; guards history, goals, and stats.
- **Skills:** Diff archaeology, goal-value detection, archive-vs-delete judgment.
- **Allowed tools/connectors:** read-only repo, git history (read).
- **Review scope:** every changed file (diff-wide).
- **must_check:**
  - No file or content deleted; retired content is commented/archived with
    who/date/why (`REVVEL-DISABLED` block or `> ARCHIVED …` header).
  - No goal value changed, normalized, or rewritten (`$10M`, Phase targets,
    pricing).
- **must_not_do:** Do not itself propose deletions or goal edits.
- **Blocking rule:** `blocking` for any deletion-without-archive or any goal-value
  change.

### 5.4 Product / process reviewer

- **Persona:** Product owner of the automation fleet; cares that the loop still
  runs unattended and the change advances a real product outcome.
- **Skills:** Self-healing-loop literacy, scope assessment, scaffolding detection.
- **Allowed tools/connectors:** read-only repo, GitHub (read), local CLI.
- **Review scope:** PR description, scope/size, product-facing copy, `standards/`.
- **must_check:**
  - Change matches a stated goal/standard; not unrequested scope creep.
  - No agent scaffolding / placeholder language shipped (see
    [`AGENT_SCAFFOLDING_BAN.md`](AGENT_SCAFFOLDING_BAN.md)).
- **must_not_do:** Do not expand the PR's scope; recommend follow-ups instead.
- **Blocking rule:** `blocking` only for shipped scaffolding/placeholder per the
  ban standard. Otherwise `advisory`.

### 5.5 Docs / contracts reviewer

- **Persona:** Technical writer who treats `standards/` as machine-and-human
  contracts.
- **Skills:** markdownlint rules, cross-reference integrity, schema consistency.
- **Allowed tools/connectors:** read-only repo, markdownlint, local CLI.
- **Review scope:** `**/*.md`, especially changed Markdown (the CI-gated scope).
- **must_check:**
  - Changed Markdown passes `markdownlint-cli2` under `.markdownlint.jsonc`.
  - Internal links resolve; standard IDs and output schemas stay consistent.
- **must_not_do:** Do not reformat unchanged docs (avoids backlog churn).
- **Blocking rule:** `blocking` only if changed Markdown fails the CI lint scope.
  Otherwise `advisory`.

### 5.6 Connector reviewer

- **Persona:** Integrations engineer who knows each external platform's auth and
  failure modes.
- **Skills:** Connector auth models, rate limits, graceful degradation, BOM
  authoring.
- **Allowed tools/connectors:** read-only repo plus, where configured, read scopes
  of the connectors in [Section 6](#6-connector-aware-review-guidance).
- **Review scope:** integration code/config touching external platforms.
- **must_check:**
  - Each connector call degrades gracefully when access is missing (fail-soft,
    not dead-end).
  - Missing access is emitted as a `bom` finding, never a hard failure.
- **must_not_do:** Do not authenticate live paid services or spend credits.
- **Blocking rule:** `blocking` only if a connector failure can hard-break the
  unattended loop (no fail-soft path). Otherwise `advisory`/`bom`.

### 5.7 Implementation reviewer

- **Persona:** Senior engineer reviewing correctness, readability, and tests.
- **Skills:** Language idioms, test design, edge-case reasoning.
- **Allowed tools/connectors:** read-only repo, test runner, local CLI.
- **Review scope:** changed source and its tests.
- **must_check:**
  - Logic is correct; edge cases handled; behavior preserved when the task says so.
  - Targeted tests for the change exist or are run; `npm test` semantics respected.
- **must_not_do:** Do not demand refactors beyond the task's scope.
- **Blocking rule:** `blocking` for a real defect or a failing targeted test.
  Otherwise `advisory`.

### 5.8 Compliance reviewer

- **Persona:** Governance/compliance officer mapping changes to policy and audit
  needs.
- **Skills:** Audit-trail literacy, licensing, data-handling policy.
- **Allowed tools/connectors:** read-only repo, audit logs (read).
- **Review scope:** audit logging, credential handling, license/policy-bearing
  files.
- **must_check:**
  - Auditability preserved (audit-log workflows still record state transitions).
  - No license/compliance regression; no PII/secret handling violation.
- **must_not_do:** Do not approve waivers; only a human owner waives a `blocking`.
- **Blocking rule:** `blocking` for an audit-trail or compliance regression.

### 5.9 Syntax / Final Gate reviewer

The **last** reviewer to run on every PR. Where the other personas reason about
*meaning* (is this safe, does it preserve goals, does it advance a product), the
Final Gate confirms the change is mechanically *sound and shippable* — it is the
end-of-run validation pass each coder is expected to clear before a PR is marked
ready.

- **Persona:** Release-gate engineer / build-cop; the last set of eyes before
  merge. Trusts nothing it cannot reproduce locally.
- **Skills:** Linters and parsers across the repo's languages (YAML, JSON,
  Markdown, JS/Node, Python, shell), test-runner literacy, diff inventory.
- **Allowed tools/connectors:** read-only repo, the repo's own validators/linters/
  test runner via local CLI (`npm test`, `markdownlint-cli2`, `python3 -c "import
  yaml…"`, `node --check`, `bash -n`). No write or paid connectors.
- **Review scope:** the **entire** changed-file set of the PR (diff-wide), run last.
- **Inherited checklist (preserve, do not replace):** This persona *executes* the
  existing per-coder checklist in
  [`docs/CHECKLISTS/PRIMARY_CODER_CODE_REVIEW_CHECKLIST.md`](../docs/CHECKLISTS/PRIMARY_CODER_CODE_REVIEW_CHECKLIST.md)
  (syntax & structure, git/GitHub, YAML/workflow, dependencies, testing, docs). That
  checklist is the source of truth for the per-file syntax items; the rows below add
  the repo-wide end-of-run gates the fleet needs for unattended operation.
- **must_check (end-of-run validation):**
  - **Syntax checks** — every changed source file parses for its language
    (`node --check` for JS, `python3 -m py_compile` for Python, `bash -n` for shell).
  - **YAML validation** — every changed/added `*.yml`/`*.yaml` loads with
    `yaml.safe_load`.
  - **Markdown lint** — changed Markdown passes `markdownlint-cli2` (the CI-gated
    scope), matching the Docs/contracts persona.
  - **JSON validation** — every changed/added `*.json` parses.
  - **Unit / smoke tests** — `npm test` (or the targeted subset) runs green, or the
    docs-only case is explicitly recorded.
  - **Workflow validation** — changed workflows satisfy the repo "gotchas": `GH_REPO`/
    `--repo` on `gh` jobs without checkout, authenticated token-with-fallback, and
    narrowest `permissions:`.
  - **No eval / shell interpolation with user input** — no `eval`, `Function()`,
    dynamic `require()`, or untrusted `${{ … }}` interpolated into `run:`/`execSync`.
  - **Changed-file inventory** — emit the full list of added/modified files so the
    diff scope is auditable.
  - **No-delete scan** — confirm no file/content was deleted without an
    archive/comment per RVS-PRESERVE-001 (defers blocking authority to the
    No-delete/goals persona but reports the scan).
  - **Goals-preserved scan** — confirm no goal value (`$10M`, Phase targets,
    pricing) was changed (defers blocking authority to the No-delete/goals persona).
  - **Dry-run / external-action scan** — confirm no live paid API was wired, no
    secret/credential changed, and no irreversible/external action was taken;
    anything requiring such access is downgraded to a `bom` follow-up.
- **must_not_do:** Do not fix the code itself (it flags, coders fix); do not weaken
  or stub a gate to make it pass; do not run live paid services or mutate external
  state to complete a check — emit a `bom` instead.
- **Blocking rule:** `blocking` for any failing syntax/YAML/JSON parse, failing
  changed-Markdown lint, failing unit/smoke test, a workflow that cannot run
  unattended, or any detected `eval`/user-input shell interpolation. The no-delete,
  goals, and external-action **scans** are reported by this persona but the
  *blocking* authority for them rests with the No-delete/goals and Compliance
  personas (this persona's scan result is `advisory` when those personas also run,
  `blocking` if the Final Gate is the only persona executing). Everything else
  (style, optional coverage, non-CI-scope lint) is `advisory`.
- **Output:** uses the [Section 4](#4-shared-output-schema) schema; `rule` values are
  e.g. `syntax-error`, `yaml-invalid`, `json-invalid`, `markdown-lint`,
  `test-failure`, `workflow-unrunnable`, `eval-or-interpolation`, `no-delete-scan`,
  `goals-scan`, `external-action-scan`, `changed-file-inventory`.

## 6. Connector-aware review guidance

Each connector lists how a reviewer should treat it and what a BOM line looks like
when access is missing. **Read-only/observation scopes are preferred for review;
no reviewer mutates external state.**

| Connector | Review use (read-only) | If access missing → BOM line |
| --- | --- | --- |
| GitHub | Inspect PR, checks, labels, workflow runs | GitHub token with `repo:read`/`actions:read` for the review env |
| Vercel | Read deployment/build status, env var names (not values) | Vercel read token + project ID |
| Supabase | Read schema/migration diffs, RLS policy presence | Supabase service read key (review project) |
| Firebase | Read rules files, project config presence | Firebase viewer credentials |
| OpenRouter | Verify model routing/fallback config | Funded OpenRouter account + `OPENROUTER_API_KEY` (read) |
| Zapier | Read Zap definitions referenced by the change | Zapier read API key |
| Make | Read scenario blueprints referenced by the change | Make API token (read) |
| n8n | Read workflow JSON referenced by the change | n8n API key + instance URL |
| Gumloop | Read flow definitions referenced by the change | Gumloop API key |
| Browser automation | Render/check a deployed page (read-only) | Headless browser in review env (Playwright) |
| Local CLI | Run repo's own tests/linters/validators | None — always available in sandbox |

Rule: a reviewer **never** blocks a PR because a connector is unreachable. It emits
the matching `bom` finding and continues with the checks it *can* perform.

## 7. Canned GitHub apps and external review tools

The original design question was: *do we build a Revvel reviewer persona, or buy a
canned GitHub app / Marketplace bot?* The answer is **both, in layers** — canned
apps **augment** the Revvel personas; they do **not** replace the internal personas
or the Syntax / Final Gate.

### 7.1 Augment, never replace

Canned scanners are excellent at broad, well-understood categories (CVEs, generic
injection patterns, leaked secrets) and run cheaply on every PR. But they have no
knowledge of Revvel's project-specific constraints — the no-delete rule, sacred
`$10M`/Phase goals, runner-procurement BOM, connector-aware fail-soft, or
insurance/compliance context. So:

- A canned app's findings are treated as **advisory input** to the matching Revvel
  persona (e.g. CodeQL/Semgrep feed the Security persona; Trivy feeds Security/
  Compliance). The persona still owns the `blocking` decision.
- A green result from a canned app **never** satisfies the Revvel Final Gate or the
  No-delete/goals persona on its own.
- A canned app is **never** wired to mutate the repo, auto-merge, or change secrets
  as part of this standard.

### 7.2 Buy/use vs. keep-the-persona decision criteria

| Use a canned app when… | Keep / require the Revvel persona when… |
| --- | --- |
| It provides strong, specialized coverage (CVE DB, SAST corpus, secret-scanning entropy models) that would be costly to rebuild | The check depends on **project-specific goals** (`$10M`/Phase targets, pricing tiers) |
| The check is generic and language-standard (lint, dependency audit) | The **no-delete / archive-don't-delete** rule must be enforced (RVS-PRESERVE-001) |
| It runs read-only and posts advisory comments | **Runner-procurement BOM** reasoning is needed (what access/tooling to buy) |
| Its output can be consumed by a Revvel persona as input | **Connector-aware** fail-soft behavior must be judged per integration |
| | **Insurance / compliance** context governs the change |

When a canned app overlaps a persona, run both: the app for breadth, the persona
for Revvel-specific judgment and the final `blocking` call.

### 7.3 Procurement BOM for paid reviewer apps

Adopting any paid/external reviewer is a **procurement** action, not an
implementation detail of this PR. Record each candidate as a BOM line (this table
is a **non-binding catalog**, not an install list — nothing here is wired, funded,
or installed by this standard). Pricing URLs are placeholders to be confirmed at
procurement time.

| App | Purpose | Pricing URL (confirm) | Credential / install needed | Repo permissions | Risk | Approval required |
| --- | --- | --- | --- | --- | --- | --- |
| CodeQL | Deep SAST / dataflow | `https://github.com/github/codeql` (GH Advanced Security) | GHAS entitlement; workflow | `security-events: write`, `contents: read` | False positives; runtime cost | Repo owner |
| Semgrep | Rule-based SAST | `https://semgrep.dev/pricing` | App install or CI token | `contents: read`, checks | Rule tuning; noise | Repo owner |
| Trivy | Dependency / container CVE scan | `https://github.com/aquasecurity/trivy` (OSS) | CI step only | `contents: read` | CVE noise | Lead |
| GitGuardian | Secret detection | `https://www.gitguardian.com/pricing` | App install + API key | `contents: read`, checks | Sends diffs to vendor | Repo owner |
| Vercel Agent Review | Deploy-aware AI review | `https://vercel.com/pricing` (confirm) | Vercel app + project link | PR read, checks | Vendor data sharing; cost | Repo owner |
| Octopus (review bot) | AI PR review | placeholder — confirm at procurement | App install | PR read/comment | Vendor data sharing | Repo owner |
| Cubic | AI PR review | `https://cubic.dev` (confirm) | App install | PR read/comment | Vendor data sharing | Repo owner |
| BITO | AI PR review / dev agent | `https://bito.ai/pricing` | App install + API key | PR read/comment | Vendor data sharing; cost | Repo owner |
| RecurseML | ML-based regression review | placeholder — confirm at procurement | App install | PR read/comment | Vendor data sharing | Repo owner |
| Coderabbit | AI PR review (already in flow) | `https://coderabbit.ai/pricing` | App install | PR read/comment | Vendor data sharing; cost | Repo owner |

Rule: a reviewer **never** installs, authenticates, or funds any of these as part
of running a review. Adopting one is a separate, human-approved procurement step;
until then the Revvel personas and Final Gate are sufficient.

## 8. Routing personas to a change

An implementation should select personas by changed paths. **Security**,
**No-delete/goals**, **Compliance**, and the **Syntax / Final Gate** run on every
PR (the Final Gate always runs **last**).

| Changed path glob | Personas to run (in addition to the always-on set) |
| --- | --- |
| `.github/workflows/**` | Workflow |
| `scripts/**`, `**/*.js`, `**/*.ts` | Implementation |
| `**/*.md` | Docs/contracts |
| integration/connector code | Connector |
| product copy, `standards/`, PR scope | Product/process |

### 8.1 Required reviewers by PR type

Path globs select the mechanical personas; the **PR type** determines which
reviewers are *required* (and may therefore block). The always-on set
(Security, No-delete/goals, Compliance, Syntax / Final Gate) is required on every
type below.

| PR type | Additionally required reviewers | A single reviewer may block when… |
| --- | --- | --- |
| Workflow / CI change | Workflow | invalid YAML or a `gh` job that can't run unattended |
| Regulated / insurance domain | Compliance, Product/process | a compliance or audit-trail regression is found |
| Engine / engine-spine change | Implementation, Workflow, Product/process | a defect breaks the unattended spine loop |
| App / deploy change | Implementation, Connector, Security | a security or deploy-safety defect is found |
| Docs-only | Docs/contracts | changed Markdown fails the CI lint scope |
| Integration / connector | Connector, Security | a connector failure can hard-break the loop with no fail-soft path |

## 9. Merge decision

A PR is **review-fleet-clean** when every selected persona has run (or fail-soft
self-reported) and **no `blocking` finding is open**. `advisory` and `bom`
findings never block; they are routed to follow-up issues. A human owner is the
only actor who may waive a `blocking` finding, and the waiver is recorded in the
PR thread for the audit trail.

### 9.1 Merge recommendation matrix

Each persona returns a recommendation; the aggregate decision is the strictest one
present.

| Aggregate recommendation | Condition | Effect |
| --- | --- | --- |
| **approve** | No `blocking` finding open across all selected personas; Final Gate passed | Eligible to merge (subject to CircleCI/`wr-lint` gate) |
| **request-changes** | One or more `blocking` findings open | Blocked until resolved or a human owner records a waiver |
| **needs-discussion** | Personas conflict, or an `advisory` finding has merge-relevant ambiguity (e.g. scope vs. goal tension) | Hold for human owner decision; no auto-merge |

When-one-reviewer-blocks rule: **any** persona with `blocking` authority for the PR
type (always-on set, plus the type-required reviewers in
[Section 8.1](#81-required-reviewers-by-pr-type)) can set the aggregate to
**request-changes** on its own. `advisory`/`bom` findings can only raise
**needs-discussion**, never **request-changes**.

## 10. Implementation follow-up (not in this PR)

This document is **design only**. Wiring an operational fleet — a workflow or
OpenRouter-routed reviewer that posts these findings — is intentionally deferred
to keep this change additive and reviewable. A follow-up PR should:

1. Add a `review-fleet.yml` workflow (or extend an existing review workflow) that
   loads persona definitions from this standard.
2. Reuse the repo-standard token-with-fallback and narrow `permissions:`.
3. Use `continue-on-error`/fail-soft per persona so a reviewer error never
   dead-ends the loop.
4. Emit findings in the [Section 4](#4-shared-output-schema) schema and gate merge
   on open `blocking` findings only.
5. Treat every missing connector as a `bom` follow-up, never a failed run.

Until then, these personas serve as the **checklist contract** for human and
ad-hoc AI reviews on Revvel PRs.

A machine-readable, **non-executable** rendering of these personas ships alongside
this standard at [`config/review-fleet-personas.yml`](../config/review-fleet-personas.yml).
It mirrors the personas, severities, routing, and connector BOM lines so a future
`review-fleet.yml` workflow can load them directly. The YAML wires nothing on its
own — it is data, not an action.

## 11. PR-prep agents (pre-review readiness)

The reviewer personas in [Section 5](#5-reviewer-personas) judge a PR; the
**PR-prep agents** get a PR *ready to be judged*. They run **before** (or
alongside) the review fleet to clear mechanical blockers — failing checks, scope
drift, conflicts — so a human or the review fleet spends its attention on
substance, not on a red CI badge or a mistitled PR.

This is the same "who does what and how" contract style as the reviewer personas:
Revvel **owns the PR-prep contract** (the two roles, their checks, their output
schema). A *runner* executes a role. **Jules is one such runner — not the standard
itself.** Any runner that satisfies the contract below is acceptable:

- **Jules** (the runner the original question referred to),
- **Claude Code**,
- **GitHub Copilot** / Copilot Workspace,
- a **GitHub Actions** workflow,
- a **local CLI** invocation.

> Like every other actor in this standard, PR-prep agents are **additive and
> non-destructive**. They never delete files or content, never change a goal value
> (`$10M`, Phase targets, pricing — see
> [`PRESERVE_GOALS_AND_HISTORY.md`](PRESERVE_GOALS_AND_HISTORY.md),
> RVS-PRESERVE-001), and never wire a live paid API, change a secret, or take an
> irreversible/external action. Anything requiring such access is emitted as a
> `bom` follow-up (see [Section 6](#6-connector-aware-review-guidance)). Retiring
> content is comment/archive only, per
> [`COMMENT-DONT-DELETE.md`](COMMENT-DONT-DELETE.md) (RVS-AGENT-001).

### 11.1 PR Prep Agent A — CI / Checks Prep

- **Role:** Get the PR's automated checks green (or honestly accounted for) so the
  review fleet and merge gate aren't blocked by mechanical failures.
- **Persona:** CI mechanic / build-cop; trusts nothing it cannot reproduce locally;
  distinguishes a *real* failure from an *environmental* one (missing token, paid
  connector, sandbox limit).
- **Allowed tools/connectors:** repo read/write **on the PR branch only**, the
  repo's own validators/linters/test runner via local CLI (`npm test`,
  `markdownlint-cli2`, `python3 -c "import yaml…"`, `node --check`, `bash -n`),
  GitHub (read checks; re-run *safe* checks). No write connectors, no paid APIs, no
  secret changes.
- **must_check / must_do:**
  - Validate workflow YAML for every changed/added `*.yml`/`*.yaml`
    (`yaml.safe_load`) and the repo "gotchas" (`GH_REPO`/`--repo` on `gh` jobs
    without checkout, token-with-fallback, narrowest `permissions:`).
  - Run the **targeted** tests for the change and the repo gate semantics
    (`npm test`, changed-Markdown `markdownlint-cli2`).
  - Fix mechanical failures that are clearly in scope (lint nits, YAML indentation,
    a broken targeted test the PR caused) — **on the PR branch, additively**.
  - **Detect external / token failures** — a check red only because a connector is
    unreachable, a key is unfunded, or a secret is absent in the sandbox — and
    classify them as `external_blockers`, not PR defects.
  - **Re-run only safe checks** (idempotent, read-only, no external mutation, no
    spend). Never re-run a check that deploys, charges, or mutates external state.
  - Produce a **check-status summary**: each check → pass / fixed / still-failing /
    external-blocker, with evidence.
- **must_not_do:** Do not weaken or stub a gate to make it pass; do not delete code
  to silence a failure; do not change goal values; do not wire/authenticate paid
  services; do not re-run unsafe/mutating/charging checks; do not expand scope
  beyond making checks honest.
- **Blocking rule:** Recommends **hold** while a *real, in-scope* check is red and
  fixable; records `external_blockers` as `bom` follow-ups that do **not** block.

### 11.2 PR Prep Agent B — Merge-Readiness Prep

- **Role:** Get the PR's *metadata and merge posture* ready — scope, title, body,
  conflict status, checklist, labels/reviews — and produce a merge recommendation.
- **Persona:** Release manager / merge-coordinator; cares that the PR is correctly
  scoped, correctly described, and sequenced safely against sibling PRs.
- **Allowed tools/connectors:** repo read, git history (read), GitHub (read PR
  scope, labels, reviews, conflict/mergeability, sibling PRs). May *propose* title/
  body/label edits; applies metadata-only edits on the PR (never code, never
  deletes).
- **must_check:**
  - **Scope / title / body:** PR title and body describe what changed; scope
    matches a stated goal/standard and isn't unrequested creep (see
    [`AGENT_SCAFFOLDING_BAN.md`](AGENT_SCAFFOLDING_BAN.md)).
  - **No-delete / no-goal-change:** diff deletes no file/content without an
    archive/comment, and changes no goal value — cross-checks RVS-PRESERVE-001 and
    RVS-AGENT-001 (blocking authority still rests with the No-delete/goals persona,
    [Section 5.3](#53-no-delete--goals-reviewer)).
  - **Conflict / superseded status:** branch is mergeable (no conflicts), and the
    PR is not superseded by — or superseding — a sibling PR.
  - **PR checklist:** the repo's PR checklist items are present and satisfied
    (draft status, linked WR/issue, validation evidence).
  - **Labels / reviews:** required labels applied; required reviewers / review-fleet
    personas for the PR type ([Section 8.1](#81-required-reviewers-by-pr-type)) are
    requested.
  - **Merge recommendation:** emit one of **merge / close / split / hold** (see
    table below).
- **must_not_do:** Do not merge, close, or delete on its own authority (recommends;
  a human owner or the merge gate acts); do not edit code; do not change goals; do
  not remove content.
- **Blocking rule:** Recommends **hold** or **request-changes** while a no-delete /
  goal-change / unresolved-conflict / missing-required-review condition is open.

| Recommendation | When | Effect |
| --- | --- | --- |
| **merge** | Scope/title/body sound, no conflicts, not superseded, checklist satisfied, Agent A green or only `external_blockers`, no open `blocking` review finding | Eligible to merge (subject to CircleCI/`wr-lint` + human/auto-merge gate) |
| **close** | PR is fully superseded by another merged PR, or its goal is already met elsewhere | Recommend close (a human/automerge actor closes); never auto-deletes the branch |
| **split** | PR mixes unrelated concerns or exceeds reviewable scope | Recommend splitting into follow-up PRs (listed in `follow_up_prs`) |
| **hold** | A real check is red (Agent A), a conflict is unresolved, or a `blocking` review finding is open | Blocked until resolved or a human owner waives |

### 11.3 Output schema (both PR-prep agents)

Each PR-prep agent emits a single JSON object with this shape. It reuses the
finding objects from [Section 4](#4-shared-output-schema) inside `findings`.

```json
{
  "agent": "pr-prep-ci-checks",
  "pr": 14748,
  "findings": [
    {
      "persona": "pr-prep-ci-checks",
      "severity": "advisory",
      "scope": ".github/workflows/agent-monitor.yml",
      "rule": "yaml-valid",
      "summary": "Workflow parses; gh job sets GH_REPO and token-with-fallback.",
      "evidence": "yaml.safe_load OK; env.GH_REPO present.",
      "recommendation": "No action.",
      "blocking": false,
      "out_of_scope": false,
      "bom": null
    }
  ],
  "checks_run": [
    { "name": "npm test", "result": "pass", "evidence": "node --test: 0 failures" },
    { "name": "markdownlint-cli2 (changed)", "result": "fixed", "evidence": "MD040 added language to fence" }
  ],
  "files_changed": ["standards/REVVEL_CODE_REVIEW_FLEET.md"],
  "external_blockers": [
    { "check": "vercel-deploy-preview", "reason": "No Vercel token in sandbox", "bom": "Vercel read token + project ID" }
  ],
  "safe_to_merge": false,
  "recommended_action": "hold",
  "follow_up_prs": []
}
```

Field contract:

| Field | Type | Meaning |
| --- | --- | --- |
| `agent` | string | `pr-prep-ci-checks` (A) or `pr-prep-merge-readiness` (B) |
| `pr` | number | PR number under prep |
| `findings` | array | [Section 4](#4-shared-output-schema) finding objects |
| `checks_run` | array | `{name, result: pass\|fixed\|failing\|skipped, evidence}` |
| `files_changed` | array | Files the agent touched (additive only) |
| `external_blockers` | array | `{check, reason, bom}` — token/connector/sandbox blocks; never PR defects |
| `safe_to_merge` | boolean | Agent's machine-readable readiness verdict |
| `recommended_action` | string | A: `hold`/`ready`; B: `merge`/`close`/`split`/`hold` |
| `follow_up_prs` | array | Suggested follow-up PRs (e.g. from a `split`) |

### 11.4 Routing the PR-prep agents

When a PR is **blocked** (red checks, unclear merge posture), run **both PR-prep
agents in parallel** — A clears the checks, B assesses merge posture — then hand
their combined output to the review fleet ([Section 8](#8-routing-personas-to-a-change)).

- **Parallel by default.** A (CI/Checks) and B (Merge-Readiness) have disjoint
  write surfaces — A touches branch code/config additively, B touches PR metadata —
  so they can run concurrently without stepping on each other.
- **Superseded handshake.** When **one** agent reports a PR is **superseded** (B's
  `close`, or A finding the same fix already merged), the **other** agent verifies
  **safe close/merge sequencing** before any close/merge is recommended: confirm the
  superseding PR is actually merged (or strictly ahead), that no unique commits/
  content would be lost (RVS-PRESERVE-001 — recommend archive/cherry-pick over
  close-with-loss), and that closing this PR won't strand a dependent PR. Only after
  that verification does the combined recommendation settle on `close` or `merge`.
- **Aggregate.** The combined PR-prep verdict is the **strictest** of A and B
  (`hold` dominates `ready`/`merge`). PR-prep never merges or closes on its own
  authority; it produces the recommendation and the human/auto-merge gate acts.

A machine-readable rendering of both PR-prep agents ships in
[`config/review-fleet-personas.yml`](../config/review-fleet-personas.yml) under
`pr_prep_agents`. As with the reviewer personas, that YAML is **non-executable
data** — it wires nothing on its own.
