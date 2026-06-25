# RVS-REVIEW-001: Revvel Code Review Fleet (Reviewer Personas Standard)

**Standard ID:** `RVS-REVIEW-001`
**Status:** Active (design — additive, non-operational)
**Author:** revvel engine-spine agent (claude-code) · **Added:** 2026-06-25
**Applies to:** All AI and human reviewers operating on Revvel pull requests.

> This standard is **additive**. It defines *who reviews what and how* for the
> Revvel automation fleet. It does **not** wire any live review bot, change any
> workflow, or require any new secret. Implementation is a separate follow-up
> (see [Section 9](#9-implementation-follow-up-not-in-this-pr)).
>
> It complements [`PRESERVE_GOALS_AND_HISTORY.md`](PRESERVE_GOALS_AND_HISTORY.md)
> (RVS-PRESERVE-001), [`COMMENT-DONT-DELETE.md`](COMMENT-DONT-DELETE.md)
> (RVS-AGENT-001), [`SECURITY.md`](SECURITY.md), and
> [`AGENT_SPECIALTY_SKILLS_STANDARD.md`](../docs/AGENT_SPECIALTY_SKILLS_STANDARD.md).

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

Only the **Security**, **No-delete/goals**, and **Compliance** personas may emit
`blocking` findings by default. Other personas escalate to `blocking` only for the
specific conditions listed in their `must_check` rows below; everything else they
raise is `advisory`.

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

## 7. Routing personas to a change

An implementation should select personas by changed paths, but **Security**,
**No-delete/goals**, and **Compliance** run on every PR.

| Changed path glob | Personas to run (in addition to the always-on three) |
| --- | --- |
| `.github/workflows/**` | Workflow |
| `scripts/**`, `**/*.js`, `**/*.ts` | Implementation |
| `**/*.md` | Docs/contracts |
| integration/connector code | Connector |
| product copy, `standards/`, PR scope | Product/process |

## 8. Merge decision

A PR is **review-fleet-clean** when every selected persona has run (or fail-soft
self-reported) and **no `blocking` finding is open**. `advisory` and `bom`
findings never block; they are routed to follow-up issues. A human owner is the
only actor who may waive a `blocking` finding, and the waiver is recorded in the
PR thread for the audit trail.

## 9. Implementation follow-up (not in this PR)

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
