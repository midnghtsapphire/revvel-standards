# Trust Community

> **Audrey's public trust / authenticity showcase.** This directory is the
> canonical home for published **TruthSlayer audits** of code owned by Audrey
> Evans / MIDNGHTSAPPHIRE and any third-party code she has rated. Every audit
> here was produced by the [`truthslayer-audit`](../skills/truthslayer-audit/)
> skill and carries a 0–100 score, a letter grade, a badge label, and an
> explicit **confidence level** (`high | medium | low`).

Brand home: **[truthslayer.com](https://truthslayer.com)** — Audrey's fact-checking
& investigation property under MIDNGHTSAPPHIRE.

## What lives here

| Path | Purpose |
|---|---|
| `index.json`                       | Machine-readable manifest of every published audit. Read this from the truthslayer.com badge widget and any creator/influencer surface. |
| `audits/<slug>/truthslayer-report.md`   | Human-readable markdown report for one audit. |
| `audits/<slug>/truthslayer-report.json` | Structured JSON sidecar (schema: `truthslayer-audit/v1.1`). |

Each `<slug>` is the kebab-case target name (e.g., `revvel-standards`).
Audits are **append-only** — re-audits create a new dated sub-entry under the
same slug rather than overwriting history, so the trust signal over time is
preserved.

## Published audits

<!-- trust-community:index:start -->
| Target | Score | Grade | Badge | Confidence | Date (UTC) | Self-audit | Report |
|---|---:|:---:|---|:---:|---|:---:|---|
| [`midnghtsapphire/revvel-standards`](https://github.com/midnghtsapphire/revvel-standards) | **78** | **B** | TruthSlayer Verified — Bronze | high | 2026-04-20 | ✓ | [`audits/revvel-standards/`](audits/revvel-standards/) |
<!-- trust-community:index:end -->

## How an audit gets here

1. An auditor (human or agent) loads `skills/truthslayer-audit/SKILL.md` and
   runs the audit against a target at a pinned commit SHA or version tag.
2. The auditor emits both files (`truthslayer-report.md` and
   `truthslayer-report.json`) into `trust-community/audits/<slug>/`.
3. The auditor appends a new row to `index.json` and to the table above.
4. A PR is opened against `revvel-standards`. The audit is accepted once the
   rubric is followed and confidence level is declared.

## Reusability note

Any repo in the MIDNGHTSAPPHIRE org (or a friendly third-party) can mirror this
`trust-community/` directory layout to publish their own TruthSlayer audits.
The schema (`truthslayer-audit/v1.1`) and the manifest format (`index.json`)
are stable and documented in
[`skills/truthslayer-audit/SKILL.md`](../skills/truthslayer-audit/SKILL.md).
