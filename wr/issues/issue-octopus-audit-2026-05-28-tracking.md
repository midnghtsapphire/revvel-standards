# [WR] Octopus Audit 2026-05-28 — remaining items

**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-05-28
**Audit source:** Octopus Review (octopus-review-bot) via the GitHub App
**Output Type:** `internal-script-automation` + targeted patches → `deliver:docs` + code PRs
**Revenue target (monthly USD):** _n/a — repo hygiene + security hardening; protects every product downstream_
**WR Status:** 🟡 Tracking — items to be promoted into focused PRs

---

## Why this WR exists

Octopus Review delivered an honest audit of the repo on 2026-05-28 with 13
findings across 4 severity tiers. The 5 low-hanging items shipped in
**#13977** (figma typo, CSP on osint-hub + fieldwork, paginated issue export,
bcrypt 72-byte note). **BUG-008 (python-jose)** is already correctly pinned
to `3.4.0` in `coldtrace/backend/requirements.txt` — verified in #13977.

This file tracks the **remaining 8 substantive items**. Each becomes its
own focused PR when promoted (`spec-approved` per the two-phase pipeline in
`docs/DEFINITION_OF_DONE.md`).

---

## Items (prioritised — top first)

### 🔴 1. `pull_request_target` workflow security audit
**Severity:** Critical (potential RCE / secret exfiltration)
**Risk:** Workflows triggered by `pull_request_target` run in the **base
branch's context with write permissions** but the PR head code is untrusted.
If any of those workflows checks out the PR head via `actions/checkout` (or
indirectly runs PR-head scripts) without `persist-credentials: false` +
careful sandboxing, a malicious PR can exfiltrate every secret the workflow
touches.

**Acceptance criteria:**
- Inventory every `.github/workflows/*.yml` using `on: pull_request_target:`.
- For each: confirm it does **not** run any code from the PR head, OR if it
  does, that the checkout uses `ref: github.event.pull_request.base.sha` (or
  similar), has `persist-credentials: false`, and never executes PR-author-
  controlled scripts.
- Document each verdict in `docs/PULL_REQUEST_TARGET_AUDIT.md`.
- Workflows that are unsafe get patched in the same PR.

### 🟠 2. Auto-merge gate — require human-author or explicit approval label
**Severity:** High (supply-chain risk)
**File:** `.github/workflows/pr-state-orchestrator.yml` (and any other
workflow that calls `enablePullRequestAutoMerge`).
**Risk:** Combined with AI-generated PRs from OpenHands / SWE-Agent / our
coder lane, this lets agent-generated code land on `main` without a human
review if checks pass. A compromised agent (or a hallucinated change that
passes automated checks) can ship.

**Acceptance criteria:**
- Gate `enablePullRequestAutoMerge` calls to one of:
  - PR author is a real human (not a bot login), **or**
  - PR carries the `human-approved` label that only collaborators can add.
- Update the No-Destroy Guard pattern so the same rule applies to any
  `wr:auto-merge` label flow.
- Add a row to `docs/PROVENANCE_STANDARD.md` reference if a new label is
  introduced.

### 🟠 3. `ui/freedom-angel-repo-manager` — stop storing PAT in localStorage
**Severity:** High
**Risk:** `localStorage` persists across sessions and is readable by any JS on
the same origin → an XSS makes the PAT exfiltratable.

**Acceptance criteria:**
- **Phase A (stopgap):** move to `sessionStorage` and add a top-of-page
  warning that the token is in-browser only.
- **Phase B (proper):** server-side token exchange — a small endpoint that
  holds the PAT server-side and exposes scoped operations to the browser.
  Phase B becomes a separate WR if Phase A is shipped first.

### 🟠 4. `CREDENTIAL_BACKUP_JSON` — document rotation policy + risk
**Severity:** High (per Octopus)
**Risk:** An inline JSON env var that aggregates secrets from up to 9 backup
sources (Doppler, JSON, SOPS, pass, Bitwarden, 1Password, Infisical, Vault)
means a compromise of the worker process exposes every backed-up credential
in one go. Also: env-var blob secrets are easier to leak in process listings
than discrete `gh secret`s.

**Acceptance criteria:**
- Add a **rotation policy** section to `docs/SECRETS_MANAGEMENT.md`:
  - `CREDENTIAL_BACKUP_JSON` is rotated whenever any credential inside it
    rotates (so the blob never lags a single-secret rotation).
  - Lifetime cap: 90 days, regardless of inner-secret changes.
  - Owner-only access to the blob.
- Update `docs/CREDENTIAL_AUTOMATION_ROADMAP.md` Phase 3 watchdog to alert
  when the blob hits the 90-day cap.
- Long-term migration to discrete per-secret backups is a separate WR.

### 🟡 5. OpenRouter API key in example code — non-CI execution risk
**Severity:** Medium
**File:** `docs/AGENT_AUTONOMY_PROTOCOLS.md` (example uses
`process.env.OPENROUTER_API_KEY`).
**Acceptance criteria:**
- Add a banner above the example: *"For illustration only; do not paste into
  CI workflows where stdout/stderr is logged. Use the routing engine via
  scripts/openrouter-routing.js so the key never appears in user-controlled
  contexts."*
- Same banner pattern for any other docs that show inline key usage.

### 🟡 6. n8n webhook — HMAC + rate limit + replace stub research step
**Severity:** Medium
**File:** `workflows/n8n/pdf-product-creation.json`
**Three sub-items in one WR:**
- Add **HMAC signature validation** on the `pdf-product-start` webhook so
  unauthenticated callers can't trigger the pipeline (which pays for
  Anthropic API calls).
- Add a **rate limit** (n8n's built-in `Limit` node or an upstream Cloudflare
  rule).
- **Replace the Step 1 stub** (`step1-research` currently just echoes input
  and sets `ready_for_ai: true`) with the actual research engine — invoke
  `scripts/research-engine.js` or the openrouter-coder lane.

### 🟡 7. Sparse test coverage — group push
**Severity:** Quality
**Today:** `trust-community/audits/revvel-standards/truthslayer-report.md`
records only 3 test files (`tests/scripts/fork-audit-bot.test.js`,
`tests/scripts/check-compliance.test.js`, `tests/orchestrate.test.js`).
Products like `music-video-creator`, `graphify-evaluator`, and Python tools
have no visible tests.
**Acceptance criteria:**
- For every product app, ensure at least the **Completeness Gate** floor:
  build + a smoke test (e.g., Cypress smoke per the lead-engine pattern in
  #13972, or `pytest -k smoke` for Python tools).
- Enforce coverage thresholds in the apps that already have a test runner.
- Use Keploy to auto-generate the first round of unit tests where it fits
  (per `docs/TESTING_STACK.md`).

### Process / quality cluster (one PR, several small fixes)

| Item | File | Fix |
| --- | --- | --- |
| Markdown→HTML regex chain is fragile | `scripts/content-automation.js` | Replace `.replace(...)` chain with a proper Markdown parser (e.g., `marked` or `remark`) |
| Planned-but-not-implemented features hidden in prose | `revvel-rosette-automation/README.md` (and others) | Add `[TODO][not-implemented]` markers + a failing test stub so the gap is discoverable |
| Unfilled WR template placeholders shipped to main | `wr/issues/issue-13873-*.md`, `wr/issues/issue-13745-*.md` and others | New CI guard `scripts/wr-placeholder-check.js` — fails any PR that modifies `wr/issues/**` with an unfilled `{DESCRIPTION}` / `[Yes/No]` / `[Date and summary]` |
| No root linter config | repo root | Add minimal root `eslint.config.mjs` + `.prettierrc.json` + Python `ruff.toml`, even if products override |
| BUG-006 (open): YAML failures in `api-rate-limit-handler.yml` + `jules-coding-agent.yml` | both files | Run `yamllint` / `actionlint` locally; fix the offending blocks; commit |

---

## Tracking + provenance

Per `docs/PROVENANCE_STANDARD.md`, each promoted PR's body must name the
audit source: **Octopus Review (octopus-review-bot) via the GitHub App,
2026-05-28**.

Each promoted PR gets a row in `docs/UPGRADE_LOG.md` only if it touches
tooling cost; security fixes get a row in `docs/SECURITY_LOG.md` (new file
when first promoted).

---

## Definition of Done for this tracking WR

Closed when:
- Every item above is either (a) shipped in its own PR or (b) explicitly
  marked "won't fix — accepted risk" with owner sign-off.
- Octopus Review's next audit run on `main` shows ✅ on the closed items.
