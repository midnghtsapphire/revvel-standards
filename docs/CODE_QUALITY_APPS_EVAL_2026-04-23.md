# Code-Quality GitHub Marketplace Apps — Evaluation (April 23, 2026)

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluation (awaiting adoption decision)
**Scope:** 20 GitHub Marketplace apps under the "Code quality" category,
triaged against the Revvel stack (RecurseML, CodeQL, Gitleaks, Dependabot,
OpenRouter-routed AI reviewers).
**Related:** [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) · [`_MASTER_BOM.md`](./_MASTER_BOM.md) · [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md) · [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) · [`STARRED_REPOS_EVAL_2026-04-20.md`](./STARRED_REPOS_EVAL_2026-04-20.md)

---

## 0. TL;DR — What to actually adopt

- **Adopt now (free, fills a real gap):** Codecov, Semgrep, pre-commit ci.
- **Adopt conditionally:** SonarQube Cloud (only while repos are public — it's free for OSS); Infracost (only when a repo actually ships Terraform); Argos Visual Testing (only on the UI-heavy repos — `oaudrey`, `penny-sovereign-yield-scout`, `the-alt-text`).
- **Skip — overlaps with what we already pay for:** Codacy, Sourcery, DeepSource, Qlty Cloud, CodeFactor, CodeAnt AI, CR.GPT, Code Review Doctor. These duplicate RecurseML + the OpenRouter AI PR reviewer without adding a unique signal.
- **Skip — not in our stack / wrong shape:** Aikido Security (duplicates CodeQL + Dependabot + GitGuardian), CodeScene (enterprise pricing dominates the value), DeepScan (JS/TS only; ESLint + CodeQL already covers us), Datree (Kubernetes-only; we don't run K8s), Imgbot (cosmetic; we have no image-heavy repos).
- **Coveralls:** pick **Codecov *or* Coveralls**, not both. Codecov wins for our stack (GitHub Actions can emit `lcov.info` with a one-line step; Codecov's Action is the path of least resistance after the April 2026 CircleCI removal in [#285](https://github.com/midnghtsapphire/revvel-standards/pull/285)).

**Net new tooling cost if we adopt the "Adopt now" set:** **$0** (all free for our current repo mix).

---

## 1. Summary table

Legend: Fit = ⭐ (poor) … ⭐⭐⭐⭐ (excellent); Status reflects the recommendation after this eval.

| # | App | Category | Cost (our usage) | Overlap with current stack | Fit | Recommendation |
|---|---|---|---|---|---|---|
| 1 | [SonarQube Cloud](https://github.com/marketplace/sonarcloud) | SAST + smell | Free (public repos); $75+/mo private | Partial with CodeQL | ⭐⭐⭐ | **Pilot** on 1 public repo while repos stay public |
| 2 | [Codecov](https://github.com/marketplace/codecov) | Coverage | Free (public repos) | None — we have *no* coverage reporting yet | ⭐⭐⭐⭐ | **Adopt** (one repo first, then roll out) |
| 3 | [Codacy](https://github.com/marketplace/codacy) | Quality + coverage | Free OSS / $15+/mo | High with RecurseML | ⭐⭐ | **Defer** — revisit if RecurseML trial doesn't convert |
| 4 | [Sourcery](https://github.com/marketplace/sourcery-ai) | AI review + security | Free (OSS) / $12/dev/mo | High with RecurseML + OpenRouter AI reviewer | ⭐⭐ | **Skip** |
| 5 | [Imgbot](https://github.com/marketplace/imgbot) | Image optimization | Free (OSS) / $7/mo | None, but no target repos | ⭐ | **Skip** — no image-heavy repos today |
| 6 | [DeepSource](https://github.com/marketplace/deepsource-io) | AI code review | Free (OSS) / $12/dev/mo | High with RecurseML | ⭐⭐ | **Skip** |
| 7 | [Aikido Security](https://github.com/marketplace/aikido-security) | SAST/DAST/SCA | Free (limited) / $314+/mo | High with CodeQL + Dependabot + GitGuardian | ⭐⭐ | **Skip** — priced above value at our scale |
| 8 | [Qlty Cloud](https://github.com/marketplace/code-climate) (ex–Code Climate) | Quality + coverage | Free (OSS) / $20+/dev/mo | High with RecurseML + Codecov | ⭐⭐ | **Skip** — Codecov already wins coverage |
| 9 | [Semgrep](https://github.com/marketplace/semgrep-dev) | SAST + supply-chain | Free (Community) | Complements CodeQL (Semgrep is faster, custom rules in YAML) | ⭐⭐⭐⭐ | **Adopt** (free tier; runs in CI as a separate job) |
| 10 | [CodeScene](https://github.com/marketplace/codescene) | Tech-debt + behavioral analysis | Free (OSS) / $99+/dev/mo | None in category, but high cost | ⭐⭐ | **Defer** — revisit when an org pays for it |
| 11 | [Coveralls](https://github.com/marketplace/coveralls) | Coverage | Free (OSS) / $15+/mo | Direct competitor to Codecov | ⭐⭐⭐ | **Skip** — pick Codecov (better Circle CI + `lcov` integration) |
| 12 | [CodeFactor](https://github.com/marketplace/codefactor) | Linting aggregator | Free (OSS) / $34+/mo | High with local linters + RecurseML | ⭐⭐ | **Skip** |
| 13 | [pre-commit ci](https://github.com/marketplace/pre-commit-ci) | Hosted pre-commit runner | Free (OSS); $5/mo private | None — we already use `pre-commit` locally; this auto-fixes in PRs | ⭐⭐⭐⭐ | **Adopt** (cheapest high-leverage addition) |
| 14 | [CodeAnt AI](https://github.com/marketplace/codeant-ai) | AI review + security | Free (limited) / $10+/dev/mo | High with RecurseML + OpenRouter AI reviewer | ⭐⭐ | **Skip** |
| 15 | [Infracost](https://github.com/marketplace/infracost) | Terraform cost estimates | Free (Cloud tier) | None, but needs Terraform | ⭐⭐⭐ | **Adopt-on-condition** — install only on repos that commit `.tf` files |
| 16 | [DeepScan](https://github.com/marketplace/deepscan) | JS/TS runtime-error SAST | Free (OSS) / $25+/mo | High with ESLint strict + CodeQL (JS) | ⭐⭐ | **Skip** |
| 17 | [Code Review Doctor](https://github.com/marketplace/django-doctor) | Python/Django review | Free (OSS) / $9+/mo | Partial — only helps if we build Django | ⭐⭐ | **Defer** — adopt only if a Django repo appears |
| 18 | [CR.GPT](https://github.com/marketplace/cr-gpt) | ChatGPT PR reviewer | Per-token (BYO OpenAI key) | Direct duplicate of our OpenRouter AI PR reviewer | ⭐ | **Skip** — we already run a functionally equivalent reviewer via OpenRouter |
| 19 | [Argos Visual Testing](https://github.com/marketplace/argos-ci) | Visual regression | Free (5k screenshots/mo OSS) | None — gap on UI repos | ⭐⭐⭐⭐ | **Adopt-on-condition** — install on `oaudrey`, `penny-sovereign-yield-scout`, `the-alt-text` when they ship a visible UI |
| 20 | [Datree](https://github.com/marketplace/datree) | K8s / YAML policy | Free (limited) | None, but we don't run Kubernetes | ⭐ | **Skip** |

---

## 2. Assessment rubric

Each app is scored against four dimensions. The table above is the
one-line rollup; the per-app notes in §3–§5 expand on each "Overlap"
and "Fit" cell.

| Dimension | What we check |
|---|---|
| **Replaces** | Does this remove a tool we already pay for, or fill a genuine gap? |
| **Overlaps** | Does it duplicate RecurseML, CodeQL, Gitleaks, Dependabot, or the OpenRouter AI PR reviewer (templated in [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md))? |
| **Cost at our scale** | Pricing on our actual repo/seat count — not list price |
| **Agent compatibility** | Does it respect the [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) invariant that secrets are read-only inputs to workflows? |

---

## 3. Adopt now (⭐⭐⭐⭐)

### 3.1 Codecov — Coverage reporting

**Why adopt.** We currently have **zero coverage reporting** across the
Revvel repos. CI runs under [`.github/workflows/`](../.github/workflows)
(the legacy `.circleci/config.yml` was removed in
[#285](https://github.com/midnghtsapphire/revvel-standards/pull/285)), and
individual projects emit `coverage/lcov.info` from their test runners,
but the file is dropped on the floor. Codecov's public-repo tier is
free, integrates with GitHub Actions in two lines of YAML, and posts a
coverage delta on every PR.

**Next step.** Add Codecov to `revvel-standards` first, verify the PR
comment renders, then roll out to `oaudrey` and `penny-sovereign-yield-scout`.
Template the workflow under [`templates/cicd/codecov.yml`](../templates/cicd/codecov.yml) (to be created).

### 3.2 Semgrep — Custom SAST rules

**Why adopt.** CodeQL is excellent but slow to author new rules.
Semgrep's YAML-based rule format lets us encode Revvel-specific
patterns directly — the same patterns already in
[`recurse-rules.md`](../recurse-rules.md) (no hardcoded secrets, no
`any` types, no `console.log` in prod code) can be mirrored as Semgrep
rules for an instant second opinion.

**Complement, not replace.** Run Semgrep's free Community tier in a
parallel CI job; keep CodeQL as the deep-SAST baseline.

**Next step.** Author `templates/cicd/semgrep.yml` mirroring the
Recurse rules; register under §9 of `_MASTER_INVENTORY.md`.

### 3.3 pre-commit ci — Hosted pre-commit auto-fix

**Why adopt.** We already depend on `pre-commit` (the
[`install/`](../install) scripts reference it and Gitleaks is a
pre-commit hook per [`_MASTER_BOM.md`](./_MASTER_BOM.md) row 23).
Locally this only helps committers who remember to run hooks.
`pre-commit ci` runs the same `.pre-commit-config.yaml` on every PR
and *auto-pushes fix commits*. Free for public repos, $5/mo for
private, zero config beyond enabling the app.

**Next step.** Enable on `revvel-standards` itself first; the fix
commits are a leading indicator of whether the hooks are authored
safely.

---

## 4. Adopt on condition (⭐⭐⭐)

### 4.1 SonarQube Cloud — SAST + smells (public repos)

Free tier covers public repositories. Our repos are currently public.
Overlap with CodeQL is partial — SonarQube reports code-smell metrics
(cognitive complexity, duplication %) that CodeQL does not. **Trigger
to remove:** any repo flipping to private (pricing jumps to $75+/mo).

### 4.2 Infracost — Terraform cost estimates in PRs

Only useful on repos that commit Terraform. Today none of the listed
repos (`oaudrey`, `penny-sovereign-yield-scout`, `revvel-standards`,
`the-alt-text`, etc.) ship `.tf` files. **Trigger to install:** first
commit of a `*.tf` file into any repo.

### 4.3 Argos Visual Testing — Visual regression

UI-only value. Install when `oaudrey`, `penny-sovereign-yield-scout`,
or `the-alt-text` have a Playwright/Cypress run that can emit
screenshots. Free tier (5k screenshots/mo) is more than enough.

---

## 5. Skip / defer (⭐⭐ and below)

Grouped by reason for skipping.

### 5.1 Duplicate RecurseML + OpenRouter AI reviewer

RecurseML already posts autonomous PR reviews and enforces the rules
in [`recurse-rules.md`](../recurse-rules.md) (trial runs through
**April 28, 2026** per [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md#111-code-quality--autonomous-review)).
In parallel, the OpenRouter-routed AI PR reviewer templated in
[`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md)
row 2 (`maxlim0/AI-PR-Reviewer`) and row 5 (`VIVAAN-DHAWAN/ai-code-reviewer`)
post the same signal. Adding another AI reviewer only increases noise:

- **Codacy** (#3), **Sourcery** (#4), **DeepSource** (#6), **Qlty Cloud** (#8), **CodeFactor** (#12), **CodeAnt AI** (#14), **CR.GPT** (#18).

**When to revisit:** if the RecurseML trial does **not** convert on
April 28, 2026, re-run this table and pick the single best
free-tier replacement (Sourcery is the current front-runner based on
free-for-OSS pricing and native GitHub App shape).

### 5.2 Duplicate CodeQL / Dependabot / Gitleaks

- **Aikido Security** (#7) bundles SAST + DAST + SCA + secrets into one
  dashboard. We already have free, best-in-class point tools for each
  axis (CodeQL, Dependabot, GitGuardian, Gitleaks). Aikido's paid
  plan starts at $314/mo — the dashboard convenience is not worth
  that at our scale.

### 5.3 Wrong stack

- **Imgbot** (#5): we do not ship image-heavy repos.
- **DeepScan** (#16): JS/TS-only; ESLint + CodeQL already cover JS.
- **Code Review Doctor** (#17): Python/Django-only; no Django repos.
- **Datree** (#20): Kubernetes-only; we run no K8s today. See [`_MASTER_BOM.md`](./_MASTER_BOM.md) — infra is DigitalOcean droplets + managed services.

### 5.4 Priced above value

- **CodeScene** (#10): the behavioral-analysis view is genuinely novel,
  but the entry price ($99+/dev/mo) dominates the benefit until we
  have a team of 3+ active committers. Revisit when we do.

### 5.5 Picked the other one

- **Coveralls** (#11): functionally equivalent to Codecov. Codecov
  wins on the Circle CI `lcov` path and has a cleaner free-tier PR
  comment. Adopting one rules out the other.

---

## 6. Rollout plan

1. **Week of April 27, 2026** — Install Codecov, Semgrep, pre-commit ci on
   `revvel-standards` itself. Register all three in
   [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §9.
2. **Week of May 4, 2026** — If the three pilots are green, mirror the
   same three into `oaudrey` and `penny-sovereign-yield-scout`.
3. **April 28, 2026** — RecurseML trial decision point. Re-evaluate
   §5.1 *only if* the trial does not convert.
4. **On first Terraform commit** — Install Infracost on that repo only.
5. **On first UI ship** — Install Argos Visual Testing on that repo only.

## 7. Out of scope (deliberately)

- We do **not** install more than one AI PR reviewer in parallel. The
  current stack is RecurseML + one OpenRouter reviewer; adding a third
  increases comment noise and slows PRs without adding signal.
- We do **not** install any paid tier beyond the current RecurseML
  trial without a sign-off in [`_MASTER_BOM.md`](./_MASTER_BOM.md).

---

*Authored: April 23, 2026. Next review: April 28, 2026 (RecurseML decision date).*
