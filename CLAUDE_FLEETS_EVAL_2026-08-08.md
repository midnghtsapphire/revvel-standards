# Claude Fleets Evaluation — August 8, 2026

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluation complete (decision: **Pilot with conditions — YELLOW**)
**WR:** [#16945](https://github.com/midnghtsapphire/revvel-standards/issues/16945) · team: `dragnet-team`
**Scope:** Code review, documentation assessment, static security analysis, functionality assessment, and DRAGNET / revvel-standards integration fit for [`junaidtitan/claude-fleets`](https://github.com/junaidtitan/claude-fleets). No production deployment, no live integration, no derivative product rewrite (explicit WR exclusions).
**Evaluator automation:** [`scripts/evaluate-claude-fleets.js`](../scripts/evaluate-claude-fleets.js) (frozen evidence pack @ `89914bc`)
**Related:** [`./REPO_CATALOG.md`](./REPO_CATALOG.md) · [`../standards/DRAGNET_FRAMEWORK.md`](../standards/DRAGNET_FRAMEWORK.md) · [`../scripts/security-fleet.js`](../scripts/security-fleet.js) · [`../skills/dragnet-scaffold/SKILL.md`](../skills/dragnet-scaffold/SKILL.md)

---

## 0. TL;DR — What to actually do

- **What it is:** A tiny (≈10 KB JS) package of **two Claude Code Workflow scripts** — `fleet-review` and `plan-audit` — that fan out one agent per review dimension, then **adversarially re-check every finding** with a skeptic that defaults to rejecting it. Only findings that survive verification are returned.
- **What it is not:** A multi-instance Claude "fleet manager," scaler, monitor, or API server. There are no HTTP endpoints, no process supervisor, no package.json, and no tests. The WR validation expectation of "manage multiple Claude instances / scaling / monitoring" does **not** match this repository's actual shape.
- **JUDGE verdict: YELLOW — Pilot with conditions.** The adversarial find→verify pattern is high-signal and maps cleanly onto DRAGNET's COUNTER + DARWIN roles. Blockers for full adoption: **no LICENSE**, **no automated tests**, and a **hard runtime dependency on Claude Code's Workflow tool** (not available in our GitHub Actions / OpenRouter lanes without a bridge).
- **Do not vendor or rewrite upstream into this monorepo.** Catalog it (already in `docs/REPO_CATALOG.md`), keep the evaluator script as the SSOT for re-scoring, and only open a follow-up WR if we decide to build a *clean-room* OpenRouter-native port of the pattern.
- **Stars / community:** **1 star**, **1 fork** as of 2026-08-08 (citation: GitHub API `stargazers_count` / `forks_count` on `junaidtitan/claude-fleets`). Treat community traction as near-zero; the value is the *pattern*, not the upstream maintenance guarantee.
- **Monetization path (internal-only):** Reduce false-positive noise in agent-authored PR review. Not a Polar.sh sellable artifact under this WR's commercial mode. Optional later productization only after license clarity or clean-room rewrite.

---

## 1. Repository inventory (evidence)

| Field | Value | Citation |
|---|---|---|
| URL | <https://github.com/junaidtitan/claude-fleets> | GitHub |
| Default branch / pin | `main` @ `89914bc54db36eb24c0ba14bd36da5a40d24d3a5` | GitHub commits API |
| Created | 2026-06-17 | GitHub API `created_at` |
| Last push (observed) | 2026-08-05 | GitHub API `updated_at` |
| Stars / forks / open issues | 1 / 1 / 0 | GitHub API |
| License | **None** (`license: null`) | GitHub API + tree listing |
| Languages | JavaScript 9907 B · Shell 367 B | GitHub languages API |
| Top-level tree | `README.md`, `install.sh`, `workflows/` | Contents API |
| Workflows | `workflows/fleet-review.js` (5332 B), `workflows/plan-audit.js` (4575 B) | Contents API |
| Absent | `LICENSE`, `package.json`, `tests/`, `.github/workflows/`, `SECURITY.md`, `CONTRIBUTING.md` | Contents API |
| Catalog status in revvel-standards | Listed as **Fork / Library-Other / PUBLIC** | [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md) |

### File roles

| Path | Role | Notes |
|---|---|---|
| `README.md` | Install + invoke docs | Clear args contract (`base`, `context`, `target`, `dimensions`, `model`). Documents curl-from-`main` install. |
| `install.sh` | Copy helper | `set -euo pipefail`; copies `workflows/*.js` into `~/.claude/workflows` or a project path. |
| `workflows/fleet-review.js` | Code-review fleet | `pipeline` → per-dimension `agent` → per-finding adversarial `verify`; structured `FINDINGS_SCHEMA` / `VERDICT_SCHEMA`. |
| `workflows/plan-audit.js` | Plan/design re-audit | Per-section audit → cross-check high-severity staleness claims (`holds`). |

---

## 2. Functionality assessment

### 2.1 `fleet-review` (primary)

**Pattern (confirmed in source):**

1. Resolve args (`base`, `context`, `target`, `dimensions`, optional `model`).
2. Default dimensions: `correctness`, `robustness`, `security-privacy`, `tests`, `fit`.
3. Fan-out: one reviewer agent per dimension with a JSON schema requiring `findings[]` (`title`, `severity`, `location`, `category`, `description`, `suggested_fix`).
4. For each finding, spawn an independent skeptic agent whose **default is `is_real=false`** unless the code under `base` supports the claim.
5. Filter to confirmed findings; sort by adjusted severity; return `{ total_raised, confirmed_count, confirmed[] }`.

**Why this matters for dragnet:** single-pass LLM review is noisy. The independent verify stage is exactly the "plausible-but-wrong" killer DRAGNET's COUNTER/DARWIN stages describe in [`standards/DRAGNET_FRAMEWORK.md`](../standards/DRAGNET_FRAMEWORK.md).

### 2.2 `plan-audit` (sibling)

Same adversarial shape, aimed at **design docs vs. real system**:

- Default sections: `assumptions`, `architecture`, `scope-gaps`, `risks-sequencing`.
- High-severity `stale_or_wrong` claims are cross-checked; only `holds=true` claims survive.

Useful for WR/plan drift detection (related internal pain: plan docs going stale vs. `src/`).

### 2.3 What the WR expected vs. reality

| WR validation expectation | Actual upstream | Gap |
|---|---|---|
| Functional Claude fleet management system | Claude Code Workflow scripts only | Naming collision: "fleet" = multi-agent fan-out, not process fleet mgmt |
| Working API endpoints or CLI commands | No HTTP API; invoke via Claude Code `Workflow({ name })` or `./install.sh` | No standalone CLI binary |
| Proper error handling | Relies on Claude Code runtime `agent`/`pipeline`/`parallel` primitives | Cannot unit-test without that runtime |
| Evidence of testing | **None** in tree | High severity gap |
| Manage multiple Claude instances / scaling / monitoring / task distribution | **Not implemented** | Out of scope of this package |

**Conclusion:** Evaluate the package for what it *is* (adversarial review workflows), not for a fleet-orchestrator product it does not claim to be. README tagline matches the code.

---

## 3. Code quality

| Aspect | Assessment | Severity if weak |
|---|---|---|
| Size / complexity | Small, readable, well-commented header contracts | — |
| Structure | Clear `meta`, schemas, pipeline stages | — |
| Dependencies | **Zero npm deps** (runtime globals: `args`, `agent`, `pipeline`, `parallel`, `phase`) | Medium — non-portable |
| Types | Plain JS (intentional per README) | Low |
| Consistency | Both workflows share the find→verify idiom | — |
| Dead code | None observed in the two workflow files | — |
| Naming | `fleet-review` / `plan-audit` are accurate | — |
| Module system | ESM (`export const meta`) for Claude Code loader | Info — not CommonJS |

No `eval`, no `child_process`, no network calls inside the workflow scripts themselves. Risk surface is almost entirely **prompt/content** and **install path**, not runtime RCE in-repo.

---

## 4. Documentation completeness

**Strengths**

- README explains the adversarial idea in the first paragraph (the differentiator).
- Install paths: per-project `.claude/workflows/` and global `~/.claude/workflows/`.
- Invoke examples with full `args` objects.
- Explicit note that `context` is "the most important arg."
- Points readers at in-file comments for the args contract.

**Gaps**

- No LICENSE / SPDX.
- No SECURITY.md, threat model, or model-cost guidance (N agents × findings can get expensive).
- No versioning / changelog (single commit history at evaluation time).
- Install example uses **floating `main`** raw.githubusercontent URL (not commit-SHA pinned) — supply-chain footgun if someone automates the curl.

---

## 5. Security analysis (static; not a full audit)

> WR exclusion says "excludes … security auditing" as a formal pen-test. This section is **static review only**, matching the evaluator script's rules.

| ID | Severity | Finding | Mitigation |
|---|---|---|---|
| `missing-license` | **high** | No LICENSE; GitHub `license=null`. Reuse/integration legal status unclear. | Do not copy into revvel products until upstream adds SPDX **or** we clean-room the pattern. Track as adoption blocker. |
| `unpinned-raw-github` | **medium** | README curl install pins branch `main`, not a commit SHA. | If we ever document install, pin full commit SHA (CLAUDE.md gotcha #8 analogue for scripts). |
| `curl-pipe-shell` | **high** *(pattern risk)* | Common upstream install genre; evaluator flags `curl … \| sh` if present. Current README uses curl-to-file (`-o`), which is better than pipe-to-shell, but still unpinned. | Prefer `install.sh` from a tag/SHA; never pipe to shell in our docs. |
| `runtime-dependency-claude-code` | **medium** | Workflows call host-provided `agent`/`pipeline`/`parallel`. No auth boundary review possible without that host. | Keep optional and human-invoked; do not grant these workflows write tokens in CI. |
| `missing-tests` | **high** *(quality→security)* | No regression tests means prompt/schema drift is invisible. | Any internal port must ship seeded tests (see `tests/evaluate-claude-fleets.test.js` pattern). |
| Prompt injection via `context`/`target` | **medium** *(inherent)* | Args are free text interpolated into agent prompts. | Treat `context`/`target` as untrusted if ever fed from issue bodies; run `scripts/security-fleet.js sentinel` on inputs first. |
| Secret leakage in findings | **low** | Findings JSON may quote code near secrets. | Redact with `@exfil` scanner before posting findings to PR comments. |
| Hardcoded secrets in upstream | **none observed** | No `api_key = "…"` literals in workflow sources. | — |

**No critical (RCE/backdoor) findings** in the two workflow files at `89914bc`.

---

## 6. Dependency / supply-chain analysis

| Item | Status |
|---|---|
| npm / package-lock | **Absent** — no Node package surface to audit via GHSA |
| Third-party Actions | **Absent** — no `.github/workflows` |
| Runtime globals | Claude Code host APIs only |
| Install script | Local `cp` only; no network |
| Transitive risk | Low **if** install is from a known SHA; medium if users curl floating `main` |

Because there is no package manifest, `runtime-tools-gh-advisory-database` does not apply to upstream. Our evaluator adds no new npm dependencies either.

---

## 7. Testing coverage (upstream)

**None.** No `tests/`, no CI, no `package.json` scripts.

Implication: every claim about "it works" is a live Claude Code session claim. For revvel-standards, that is unacceptable as a hard dependency — but acceptable as a **documented optional human workflow** behind Claude Code.

Our deliverable closes the loop on *our* side: `tests/evaluate-claude-fleets.test.js` freezes the evidence pack and scoring rubric so the evaluation itself cannot silently drift.

---

## 8. Performance / cost implications

| Factor | Observation |
|---|---|
| Agent fan-out | O(dimensions) review agents + O(findings) verify agents |
| Default dimensions | 5 for fleet-review → minimum 5 review calls per run |
| Verify amplification | A noisy first pass can multiply cost; adversarial filter is the point, but bad `context` still burns tokens |
| Latency | Bound by slowest dimension + verify wave; `pipeline` stages overlap review/verify per upstream comments |
| Local CPU | Negligible (orchestration only) |

**Operational guidance if piloted:** start with 2–3 dimensions, tight `context`, and `model: "sonnet"` for review / higher model only for verify on `high`+ severities (requires a local fork of the workflow — do not patch upstream in-tree here).

---

## 9. Long-term maintainability

| Signal | Assessment |
|---|---|
| Bus factor | Single upstream author (`junaidtitan`); 1 star |
| Release process | None visible |
| API stability | Implicit via Claude Code Workflow runtime — can break under host changes |
| Our coupling risk | **Low** if we only document + evaluate; **High** if we vendor files into `.claude/workflows` without a sync plan |
| Overlap with internal tools | Complements [`scripts/security-fleet.js`](../scripts/security-fleet.js) (deterministic static detectors). Does not replace OpenRouter triage, octopus review, or pr-auto-review |

---

## 10. DRAGNET integration mapping

| DRAGNET role ([standard](../standards/DRAGNET_FRAMEWORK.md)) | claude-fleets analogue | Fit |
|---|---|---|
| PLATO (pre-cognitive / plan) | `plan-audit` assumptions & architecture sections | Strong conceptual |
| MEDUSA (edge lenses) | Per-dimension prompts (`security-privacy`, `robustness`, …) | Strong |
| COUNTER (kill conditions / stress) | Adversarial verify defaulting to reject | **Strongest fit** |
| DARWIN (evidence validation) | Verify agent reads real code under `base` before `is_real=true` | Strong |
| JUDGE (final verdict) | Severity sort + confirmed list (no single GREEN/YELLOW/RED matrix) | Partial — we add JUDGE in `evaluate-claude-fleets.js` |

**Integration recommendation (proposal-first):**

1. **Now (this PR):** Ship evaluator + this report. No workflow install into CI.
2. **Optional human pilot:** Engineers with Claude Code may `./install.sh .claude/workflows` in a scratch branch and run `fleet-review` on a diff — results stay local unless pasted.
3. **Follow-up WR (only if pilot loved):** Clean-room OpenRouter port of find→verify for `pr-auto-review` / octopus lane, with license-safe original code, seeded tests, and cost caps. Label candidate: `output-type:internal-script-automation`.

---

## 11. Automated scorecard (from evaluator)

Re-run anytime:

```bash
node scripts/evaluate-claude-fleets.js --json
node scripts/evaluate-claude-fleets.js /path/to/local/checkout
```

Frozen-pack results at evaluation time (see unit tests for lock-in):

| Dimension | Weight | Expected band |
|---|---:|---|
| documentation | 10% | solid (README quality) |
| structure | 10% | solid (2 workflows + install.sh) |
| adversarial_pattern | 20% | **strong** (core value) |
| security | 20% | mixed (clean JS, but no license) |
| testing | 15% | **weak** (absent) |
| maintainability | 10% | mixed (small & clear; tiny community) |
| integration_fit | 15% | moderate (pattern fit − runtime/license) |

**JUDGE:** YELLOW — pilot with conditions (license, tests, runtime bridge).

---

## 12. Findings register (severity-sorted)

| Severity | ID | Mitigation |
|---|---|---|
| high | `missing-license` | Block vendoring; request upstream SPDX or clean-room |
| high | `missing-tests` | Any internal port must include seeded tests before merge |
| medium | `missing-ci` | N/A upstream; required on any internal port |
| medium | `unpinned-raw-github` | Pin commit SHA in any docs we write |
| medium | `runtime-dependency-claude-code` | Keep optional; no CI token grant |
| low | `missing-package-json` | Acceptable for drop-in workflows; required if we npm-publish a port |
| low | `missing-install-sh` | N/A — present upstream |
| info | ESM-only module shape | Document for contributors |

---

## 13. Marketing / SEO keywords

- claude code fleet workflows
- adversarial multi-agent code review
- independent verification reviewer
- plan audit agent
- claude-fleets
- find-then-verify LLM review
- multi-dimension code review agents

*(Internal-only commercial mode — keywords recorded for research checklist compliance, not for public campaign use.)*

---

## 14. Citations

1. <https://github.com/junaidtitan/claude-fleets> — upstream repository
2. <https://github.com/junaidtitan/claude-fleets/blob/89914bc54db36eb24c0ba14bd36da5a40d24d3a5/README.md>
3. <https://github.com/junaidtitan/claude-fleets/blob/89914bc54db36eb24c0ba14bd36da5a40d24d3a5/workflows/fleet-review.js>
4. <https://github.com/junaidtitan/claude-fleets/blob/89914bc54db36eb24c0ba14bd36da5a40d24d3a5/workflows/plan-audit.js>
5. <https://github.com/junaidtitan/claude-fleets/blob/89914bc54db36eb24c0ba14bd36da5a40d24d3a5/install.sh>
6. GitHub API repo metadata (stars=1, forks=1, license=null) — observed 2026-08-08
7. [`standards/DRAGNET_FRAMEWORK.md`](../standards/DRAGNET_FRAMEWORK.md) — PLATO→JUDGE roles
8. [`scripts/security-fleet.js`](../scripts/security-fleet.js) — internal static complement
9. [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md) — existing catalog row for `claude-fleets`
10. [`skills/dragnet-scaffold/SKILL.md`](../skills/dragnet-scaffold/SKILL.md) — SCAFFOLD/ERROR modes

---

## 15. Definition of Done checklist (WR #16945)

- [x] Repository accessed and tree inventoried (Contents + commits + languages APIs)
- [x] Code review of both workflow scripts + install.sh + README
- [x] Documentation assessment
- [x] Static security analysis with severity levels + mitigations
- [x] Functionality assessment vs. WR validation expectations (gap table §2.3)
- [x] Dependency / supply-chain notes
- [x] Testing coverage assessment
- [x] Performance / cost implications
- [x] Long-term maintainability
- [x] Integration considerations vs. DRAGNET + security-fleet
- [x] Comprehensive report (this document)
- [x] Automation: `scripts/evaluate-claude-fleets.js` + `tests/evaluate-claude-fleets.test.js`
- [x] Marketing/SEO keywords, stars, monetization path, citations (research checklist)

**Explicitly out of scope (not done, by WR exclusion):** production deployment, live system integration, formal security audit/pen-test, performance benchmarking, derivative product implementation.
