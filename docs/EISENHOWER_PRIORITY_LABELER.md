# Eisenhower Priority Labeler

**Version:** 1.0.0
**Date:** April 20, 2026
**Status:** Adopted
**Action:** [`GeekZoneHQ/eisenhower`](https://github.com/GeekZoneHQ/eisenhower) (pinned to commit [`25222276`](https://github.com/GeekZoneHQ/eisenhower/commit/25222276fd5661d7a30042f6db2c3159ffabfb6d))
**Methodology:** Eisenhower Matrix — attributed to U.S. President **Dwight D. Eisenhower** ("What is important is seldom urgent and what is urgent is seldom important"); popularised by Stephen Covey in *The 7 Habits of Highly Effective People* as the **Time-Management Matrix**.

---

## 1. What Is It

The **Eisenhower Priority Labeler** is a GitHub Action published by [Geek.Zone (GeekZoneHQ)](https://github.com/GeekZoneHQ) — with credit to [Jacob Tomlinson](https://jacobtomlinson.dev/posts/2019/creating-github-actions-in-python/) — that reads the `Impact` and `Urgency` fields on a GitHub Issue body and automatically assigns a `P1`–`P4` priority label based on the classic Eisenhower Matrix.

It is a **deterministic, template-driven** classifier: the priority is derived from two dropdowns the issue reporter must fill in, not from AI inference. This makes it ideal for Revvel's **S.H.I.F.T. test harness** attribution requirements because every label decision can be traced to an author-declared field on the issue itself.

---

## 2. Why Use It in Revvel

| Need | How Eisenhower Labeler Solves It |
|---|---|
| **Attributable methodology** — the test harness and triage flow should rest on a named, long-standing framework | The Eisenhower Matrix is a 70+ year-old, publicly-attributable decision framework; the action implements it faithfully |
| **Deterministic priority** — labels must not drift when re-run | Priority is a pure function of the issue body; re-running always produces the same label |
| **Low-cost triage** — non-technical stakeholders should be able to classify work without reading code | Reporters answer two dropdowns (`High/Low`, `Now/Later`) in a GitHub issue form |
| **Self-healing labels** — manual label edits should be reconciled | If a human hand-edits the `Px` label, the action restores the correct one on the next `edited` event |

### Relationship to `priority-router.yml`

Revvel already ships [`templates/cicd/priority-router.yml`](../templates/cicd/priority-router.yml), which uses **OpenRouter / Claude** plus keyword heuristics to assign `priority-p0`…`priority-p3` labels to free-form issues and PRs. The two are complementary:

| | `priority-router.yml` | `eisenhower.yml` (this doc) |
|---|---|---|
| Source of truth | Title + body text (AI + heuristics) | `Impact` + `Urgency` dropdowns |
| Labels | `priority-p0` … `priority-p3` | `P1` … `P4` (and `P?` for missing data) |
| Attribution | Revvel internal | Eisenhower Matrix (public, citeable) |
| Works on PRs? | Yes | Issues only |
| Best for | Backlog sweeps, free-form reports, bots | Structured intake forms, stakeholder-facing triage |

You may run **either or both**. When both are enabled, the `P1`–`P4` labels reflect the stakeholder-declared priority, while `priority-p0`–`priority-p3` reflect the automated assessment. Teams can resolve conflicts during standup.

---

## 3. Eisenhower Matrix Mapping

```text
                         URGENCY
                  ┌───────────┬───────────┐
                  │    Now    │   Later   │
         ┌────────┼───────────┼───────────┤
         │  High  │  P1 (Do)  │ P2 (Plan) │
 IMPACT  ├────────┼───────────┼───────────┤
         │  Low   │ P3 (Deleg)│ P4 (Drop) │
         └────────┴───────────┴───────────┘
```

| Impact | Urgency | Label | Meaning |
|---|---|---|---|
| High | Now   | `P1` | Drop everything — do it first |
| High | Later | `P2` | Important but not urgent — schedule it |
| Low  | Now   | `P3` | Urgent but not important — delegate it |
| Low  | Later | `P4` | Neither — eliminate / backlog it |
| *missing* | *missing* | `P?` | Template incomplete — needs human triage |

The action will **auto-create** any missing `P1`–`P4` / `P?` labels on first run.

---

## 4. Implementation

### Step 1 — Copy the workflow template

```bash
cp templates/cicd/eisenhower.yml .github/workflows/eisenhower.yml
```

### Step 2 — Copy the issue form template

The action reads `### Impact` and `### Urgency` sections from the issue body. The fastest way to guarantee they are present is to require them in your issue forms:

```bash
mkdir -p .github/ISSUE_TEMPLATE
cp templates/cicd/eisenhower-issue-template.yml .github/ISSUE_TEMPLATE/prioritized-issue.yml
```

Any existing issue form can also be updated — just add the two dropdowns shown in the template.

### Step 3 — Configure the token (optional)

By default the workflow uses the built-in `GITHUB_TOKEN`. If you want label activity to appear under a dedicated bot account, create a fine-grained PAT with `issues: write` scope and add it as the repo secret `GH_ACCESS_TOKEN`:

```bash
gh secret set GH_ACCESS_TOKEN --repo midnghtsapphire/YOUR_REPO --body "<your-pat>"
```

The workflow will prefer `GH_ACCESS_TOKEN` when present and fall back to `GITHUB_TOKEN` otherwise.

### Step 4 — Verify

Open a new issue using the `Prioritized Issue` form, pick `High` / `Now`, and submit. Within ~30 seconds the action should apply the `P1` label. If you instead see `P?`, re-check that the issue body contains literal `### Impact` and `### Urgency` headers (GitHub issue forms render dropdowns as these headers automatically).

---

## 5. Action Inputs & Environment

The action takes **no `with:` inputs**. It reads three environment variables:

| Variable | Source | Required |
|---|---|---|
| `GH_ACCESS_TOKEN` | Repo secret or `GITHUB_TOKEN` | ✅ |
| `GH_REPOSITORY` | `${{ github.repository }}` | ✅ |
| `GH_ISSUE_NUMBER` | `${{ github.event.issue.number }}` | ✅ |

---

## 6. Known Limitations

| Limitation | Details |
|---|---|
| **Issues only** | The action triggers on the `issues` event; it does not label PRs. Use [`priority-router.yml`](../templates/cicd/priority-router.yml) for PR priority. |
| **Literal header match** | The action searches for the exact strings `### Impact` / `### Urgency` followed by `High`/`Low` and `Now`/`Later`. Free-form issues without the template get `P?`. |
| **Two-axis only** | The pure Eisenhower Matrix has exactly four cells; it cannot express a `P0` ("security, page everyone") priority. Pair with `priority-router.yml` if you need `p0`. |
| **`main` branch pin** | Upstream ships no semver tags. The workflow template pins to a specific commit SHA (`25222276…`, the tip of `main` as of 2023-07-26) per the Revvel security standard. Review upstream commits before bumping. |

---

## 7. References

- Action source: <https://github.com/GeekZoneHQ/eisenhower>
- Marketplace listing: <https://github.com/marketplace/actions/eisenhower-priority-labeler>
- Issue form template: [`templates/cicd/eisenhower-issue-template.yml`](../templates/cicd/eisenhower-issue-template.yml)
- Workflow template: [`templates/cicd/eisenhower.yml`](../templates/cicd/eisenhower.yml)
- Complementary priority router: [`templates/cicd/priority-router.yml`](../templates/cicd/priority-router.yml)
- Tools catalog: [`docs/Master Revvel-Standards Flow Charts/TOOLS_CATALOG.md`](Master%20Revvel-Standards%20Flow%20Charts/TOOLS_CATALOG.md)
- Methodology background: Eisenhower, D. D. (1954), *Address at the Second Assembly of the World Council of Churches*; Covey, S. R. (1989), *The 7 Habits of Highly Effective People*, Habit 3.
