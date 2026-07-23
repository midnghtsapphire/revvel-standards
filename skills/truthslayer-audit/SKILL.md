# TruthSlayer Audit Skill

> **Brand home:** [truthslayer.com](https://truthslayer.com) — Audrey Evans' fact-checking & investigation property under MIDNGHTSAPPHIRE.
>
> **Purpose:** Give any AI agent (Gemini, Claude, GPT, OpenClaw) a consistent rubric for auditing and evaluating code — whether it lives in a GitHub repo or is sold on a marketplace — and producing a single **TruthSlayer Score (0–100)** with a letter grade, backed by transparent sub-scores and cited evidence.
>
> Loading this skill is equivalent to handing the auditor the TruthSlayer playbook: rules, weights, workflow, and output format. The score is designed to be used as a public **trust / authenticity signal** on creator pages, portfolios, and marketplace listings.

---

## When to Load

Load this skill when the task involves any of:

- Auditing a **GitHub repository** (public, private, or one listed for sale).
- Evaluating a **marketplace code listing** (Gumroad, CodeCanyon, Shopify apps, VS Code extensions, Chrome Web Store, WordPress plugins, n8n / Zapier templates, GitHub Marketplace Actions, etc.).
- Producing a **TruthSlayer badge, rating, or review** for publication on truthslayer.com or any creator/influencer channel.
- Judging **authenticity, trust, and help-intent** of third-party code before recommending it.
- Scoring your own work before shipping to demonstrate trust to followers.

---

## Prime Directive

**Ship a defensible score, not an opinion.**

Every TruthSlayer Score must be:

1. **Reproducible** — any auditor following this rubric on the same artifact at the same point in time arrives at the same grade band.
2. **Cited** — every sub-score points to concrete evidence (file path, commit SHA, URL, scanner output).
3. **Non-destructive** — the audit is read-only. Never modify, fork, or publish the audited code. Never exfiltrate secrets even if exposed.
4. **Fair** — apply the same weights to Audrey's own code as to competitors'. Self-audits are labeled `self: true` in the output.

---

## The Eight Factors (Composite Score)

The TruthSlayer Score is a **weighted sum of eight sub-scores**, each on a 0–10 scale. The final score is scaled to 0–100.

| # | Factor | Weight | What it measures |
|---|---|---:|---|
| 1 | **Security** | 20% | Hardcoded secrets, vulnerable dependencies, dangerous primitives (`eval`, `exec`, raw SQL), auth/authorization on endpoints, input validation, CORS posture. |
| 2 | **Authenticity & Provenance** | 15% | Real author identity, commit-signature coverage, plausible commit history (not a dump), matches claimed origin, no plagiarism / LLM-slop markers, declared license matches contents. |
| 3 | **Help-Intent & Honesty** | 10% | Does it actually do what the README/listing promises? No dark patterns, no hidden telemetry, no upsell traps, no malware disguised as a helper. |
| 4 | **Maintainability** | 10% | Readable structure, reasonable file sizes, named modules, consistent style, linters configured, docstrings/comments where non-obvious. |
| 5 | **Test Coverage & CI Health** | 15% | Presence and quality of tests, coverage thresholds met (≥80% stmts/functions/lines, ≥75% branches per Revvel standard), CI green on default branch, tests actually exercise behavior (not just `expect(true).toBe(true)`). |
| 6 | **Documentation** | 10% | README with install + usage + example, API surface documented, CHANGELOG present, licensing clear, contact/support path visible. |
| 7 | **Community & Activity** | 10% | Recent commit cadence, issue response time, contributor count, star/fork signal *adjusted* for age and niche (not gamed). |
| 8 | **Accessibility & Compliance** | 10% | For anything with a UI: WCAG 2.2 AA baseline, keyboard navigation, color contrast, ARIA correctness. For libraries: n/a — redistribute the 10% equally across factors 1, 4, 5, 6. |

**Weighted Score Formula**

```text
raw      = 0.20·security + 0.15·authenticity + 0.10·help_intent
         + 0.10·maintainability + 0.15·tests + 0.10·docs
         + 0.10·community + 0.10·accessibility
TruthSlayerScore = round(raw * 10)   // 0–100
```

### Confidence Level (required)

Every audit must declare an overall **confidence level** alongside the score,
matching the Revvel-standard research convention (`AI_RESEARCH_MODULE_STANDARD.md §8`):

| Confidence | When to use |
|---|---|
| **high**   | All eight factors scored with direct, first-hand evidence (files read, scanners run, commits inspected). No material gaps. |
| **medium** | ≥ 6 of 8 factors scored from direct evidence; the remainder scored from secondary signals (README claims, CI badges, activity graphs) that were not independently verified. |
| **low**    | ≤ 5 of 8 factors have direct evidence, or the auditor could not access the artifact at the declared ref, or key scanners failed to run. A `low` audit is publishable but must be re-run before being used as a trust signal. |

Individual sub-scores may also carry their own per-factor confidence in the JSON
sidecar (`evidence_confidence: { security: "high", ... }`) when the auditor wants
to be precise about which factors are well-evidenced and which are not.

**Grade Bands**

| Score | Grade | Badge Label |
|---:|:---:|---|
| 90–100 | **A+** | TruthSlayer Verified — Gold |
| 80–89  | **A**  | TruthSlayer Verified — Silver |
| 70–79  | **B**  | TruthSlayer Verified — Bronze |
| 60–69  | **C**  | Conditional — Fix Required |
| 40–59  | **D**  | Not Recommended |
|  0–39  | **F**  | Avoid — Material Issues |

A repo with **any** P0 finding (active secret leak, malware, license fraud, exfiltration) is **capped at F** regardless of other sub-scores.

---

## Audit Workflow

1. **Intake.** Record: target URL/path, commit SHA or version tag, auditor identity, UTC timestamp, whether this is a `self:` audit.
2. **Load companion skills** as relevant: `security`, `code-review`, `testing`, `accessibility`, `recurse-ml`.
3. **Collect evidence** — read-only. For GitHub: clone at the stated SHA. For marketplace: download the listed artifact. Never authenticate with credentials beyond what's needed to read public content.
4. **Run scanners** that already exist in the project (do not add new tooling):
   - Secrets: `gitleaks`, `truffleHog`, or `rg` patterns.
   - Dependencies: `pnpm audit --audit-level=high`, `npm audit`, `pip-audit`, `bundler-audit` — whichever matches.
   - Static analysis: whatever ships in the repo (`eslint`, `ruff`, `semgrep`, etc.).
   - Tests & coverage: run the project's own test command if it exists and is safe.
5. **Score each factor** 0–10 using the [Rubric](#rubric) below. Attach evidence for every score.
6. **Apply caps** (P0 findings → F).
7. **Emit the report** in the [Output Format](#output-format) below.
8. **Publish** (if requested) the badge + summary to truthslayer.com or the target surface. Never publish the full dossier without the repo owner's consent if the repo is private.

---

## Rubric

Each factor uses the same 0–10 scale:

- **10** — Exemplary; could be used as a teaching example.
- **8–9** — Strong; minor nits only.
- **6–7** — Acceptable; recognized gaps but not blocking.
- **4–5** — Weak; multiple gaps that a reasonable consumer would want fixed before use.
- **2–3** — Poor; material issues.
- **0–1** — Broken / absent / actively harmful.

### Per-factor anchor points

- **Security (0–10):**
  - 0–1: Live secrets in repo, malware, or arbitrary-code-exec on install.
  - 4–5: No secrets, but high-severity CVE-laden deps or missing auth on sensitive routes.
  - 8–9: Clean audit, parameterized queries, authz on every route, CORS narrowed.
  - 10: All of the above + secret-scanning + dependency-review CI + branch protection.

- **Authenticity & Provenance (0–10):**
  - 0–1: Obvious plagiarism, AI-generated slop dressed as human work, license mismatch, authorship fraud.
  - 4–5: Plausible but thin history (initial commit dump, no signed commits, no author email consistency).
  - 8–9: Signed commits, consistent author(s), plausible incremental history, license matches contents.
  - 10: DCO/GPG-signed commits across history, verifiable author identity, SBOM present.

- **Help-Intent & Honesty (0–10):**
  - 0–1: Does not do what it claims, or does it plus something hidden (telemetry, coin miner, data harvest).
  - 4–5: Does the main thing but oversells; hidden minor behaviors.
  - 8–9: Does what it says on the tin; disclosures clear.
  - 10: Above + privacy policy + data-flow diagram + opt-in telemetry only.

- **Maintainability (0–10):**
  - 0–1: One 10k-line file, no structure, no style.
  - 4–5: Mixed styles, no linter, readable with effort.
  - 8–9: Linter + formatter configured and passing; clear module boundaries.
  - 10: Above + ADR / DARE log + typed interfaces + small files.

- **Tests & CI (0–10):**
  - 0–1: No tests.
  - 4–5: Tests exist but coverage < 50% or CI broken.
  - 8–9: ≥ 80% coverage, CI green on default branch, tests exercise real behavior.
  - 10: Above + mutation testing or property tests + E2E for critical paths.

- **Documentation (0–10):**
  - 0–1: No README or stub only.
  - 4–5: README with install; missing usage or API docs.
  - 8–9: Full README + API reference + CHANGELOG + license clarity.
  - 10: Above + versioned docs site + examples directory + contribution guide.

- **Community & Activity (0–10):**
  - 0–1: Abandoned, unanswered issues piling for >1 year.
  - 4–5: Sporadic activity; issue response > 30 days median.
  - 8–9: Active maintenance within last 90 days; reasonable issue triage.
  - 10: Multiple active contributors + governance docs + predictable release cadence.

- **Accessibility (0–10, UI only):**
  - 0–1: Keyboard trap; unreadable contrast; no labels.
  - 4–5: Partial WCAG compliance; some interactive elements unreachable by keyboard.
  - 8–9: WCAG 2.2 AA clean on audited flows.
  - 10: Above + axe CI + reduced-motion + screen-reader tested.

---

## Output Format

Emit **both** a human-readable markdown report and a machine-readable JSON sidecar.

### Markdown report (`truthslayer-report.md`)

```markdown
# TruthSlayer Audit Report

- **Target:** <repo URL or listing URL>
- **Commit / Version:** <sha or version tag>
- **Auditor:** <agent name>
- **Date (UTC):** <ISO-8601 timestamp>
- **Self-audit:** <true|false>
- **Confidence:** <high | medium | low>

## TruthSlayer Score: <0–100>  ·  Grade: <A+|A|B|C|D|F>
Badge: **<TruthSlayer Verified — Gold | Silver | Bronze | Conditional | Not Recommended | Avoid>**

### Sub-scores

| Factor | Score (0–10) | Weight | Weighted |
|---|---:|---:|---:|
| Security               | x | 20% | x.xx |
| Authenticity           | x | 15% | x.xx |
| Help-Intent            | x | 10% | x.xx |
| Maintainability        | x | 10% | x.xx |
| Tests & CI             | x | 15% | x.xx |
| Documentation          | x | 10% | x.xx |
| Community & Activity   | x | 10% | x.xx |
| Accessibility          | x | 10% | x.xx |
| **Total**              |   | 100% | **xx.xx** |

### P0 Findings (auto-cap to F if any)
- <finding or "none">

### Top 3 Strengths
1. ...
2. ...
3. ...

### Top 3 Improvements
1. ...
2. ...
3. ...

### Evidence
- Security: <file:line>, <scanner output path>, <CVE IDs>
- Authenticity: <commit SHAs checked>, <signature coverage %>
- ... (one bullet per factor)
```

### JSON sidecar (`truthslayer-report.json`)

```json
{
  "schema": "truthslayer-audit/v1.1",
  "target": "https://github.com/owner/repo",
  "ref": "a1b2c3d",
  "auditor": "openclaw",
  "timestamp_utc": "2026-04-20T15:51:17Z",
  "self": false,
  "score": 82,
  "grade": "A",
  "badge": "TruthSlayer Verified — Silver",
  "confidence": "high",
  "sub_scores": {
    "security": 9,
    "authenticity": 8,
    "help_intent": 9,
    "maintainability": 7,
    "tests_ci": 8,
    "documentation": 8,
    "community": 7,
    "accessibility": 9
  },
  "evidence_confidence": {
    "security": "high",
    "authenticity": "high",
    "help_intent": "medium",
    "maintainability": "high",
    "tests_ci": "high",
    "documentation": "high",
    "community": "medium",
    "accessibility": "high"
  },
  "weights": {
    "security": 0.20, "authenticity": 0.15, "help_intent": 0.10,
    "maintainability": 0.10, "tests_ci": 0.15, "documentation": 0.10,
    "community": 0.10, "accessibility": 0.10
  },
  "p0_findings": [],
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "evidence": {
    "security": ["..."],
    "authenticity": ["..."]
  },
  "publication": {
    "trust_community_path": "trust-community/audits/<slug>/",
    "badge_url": "https://truthslayer.com/badge/owner/repo.svg"
  }
}
```

---

## Gemini-Ready System Prompt (drop-in)

Paste this verbatim as the **beginning of the prompt** when driving this skill from Gemini, ChatGPT, Claude, or any other model. It is self-contained and references only this skill's rubric.

```text
You are TruthSlayer Auditor, operating under the TruthSlayer brand
(truthslayer.com, owned by Audrey Evans / MIDNGHTSAPPHIRE). Your job is
to audit a piece of code — either a GitHub repository or a marketplace
code listing — and produce a TruthSlayer Score (0–100) with a letter
grade, using the eight-factor rubric defined in
skills/truthslayer-audit/SKILL.md.

Rules:
1. Read-only. Never modify, fork, re-publish, or exfiltrate the target.
2. Never print, log, or transmit any secret you discover; report its
   location and type only.
3. Every sub-score must cite concrete evidence (file path + line, commit
   SHA, CVE ID, URL, or scanner output excerpt).
4. Apply weights exactly: security 0.20, authenticity 0.15,
   help_intent 0.10, maintainability 0.10, tests_ci 0.15,
   documentation 0.10, community 0.10, accessibility 0.10. If the target
   has no UI, redistribute accessibility's 0.10 equally across security,
   maintainability, tests_ci, and documentation (+0.025 each).
5. Any P0 finding (live secret leak, malware, license fraud, data
   exfiltration, RCE on install) caps the grade at F regardless of
   sub-scores.
6. Output BOTH the markdown report and the JSON sidecar exactly as
   specified in the SKILL.md "Output Format" section. The JSON must be
   valid and parseable.
7. If information is missing to score a factor, assign the lowest
   defensible score and state what evidence would raise it.
8. Be fair: self-audits (targets owned by Audrey / MIDNGHTSAPPHIRE) use
   the same rubric as third-party audits and are flagged self: true.
9. Declare an overall confidence level (`high | medium | low`) per the
   definitions in the "Confidence Level" section of SKILL.md. Optionally
   include per-factor `evidence_confidence` in the JSON sidecar.

Do not produce plans, proposals, or summaries of what you would do.
Produce the report.
```

---

## Integration Points

- **Trust Community area.** Every published audit ships as a pair of files
  (`truthslayer-report.md` + `truthslayer-report.json`) under
  [`trust-community/audits/<slug>/`](../../trust-community/) in this repo.
  The `trust-community/index.json` manifest is the machine-readable directory
  the truthslayer.com badge widget and any creator/influencer surface should
  read from. New audits are appended — never overwritten — so the history of
  a target's trust signal is preserved.
- **Creator / influencer surfaces.** Embed the grade badge + score on truthslayer.com, Audrey's creator profile, and any marketplace listing. The JSON sidecar powers the badge widget.
- **GitHub.** A scored repo can ship `truthslayer-report.md` in its `/docs` folder and add the badge to the README:

  ```markdown
  [![TruthSlayer Verified — Silver](https://truthslayer.com/badge/owner/repo.svg)](https://truthslayer.com/audit/owner/repo)
  ```

- **CI.** Optional future hook: a workflow that runs the audit on every push and fails the build if the score drops more than 5 points from the last passing audit.
- **Companion skills.** This skill deliberately reuses, not replaces, `security`, `code-review`, `testing`, `accessibility`, and `recurse-ml`. Load those alongside when auditing.

---

## Changelog

- **1.1.0 (2026-04-20):** Added required overall `confidence` level (`high | medium | low`) matching the Revvel research convention in `AI_RESEARCH_MODULE_STANDARD.md §8`; added optional per-factor `evidence_confidence` map; added `publication` block referencing the new `trust-community/` area; bumped output schema to `truthslayer-audit/v1.1` (backward-compatible: `v1` consumers can ignore the new fields).
- **1.0.0 (2026-04-20):** Initial release. Eight-factor weighted rubric, grade bands, output schema v1, Gemini-ready system prompt.
