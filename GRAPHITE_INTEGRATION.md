# Graphite Integration — Revvel Standards Test Harness & PR→OpenRouter Hand-off

**Version:** 1.0.0
**Date:** April 20, 2026
**Status:** Requirements / Recommendation — additive to the existing harness
**Author:** MIDNGHTSAPPHIRE
**Scope:** `midnghtsapphire/revvel-standards` — the docs/standards/skills/templates repo
**Related:**
[`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) ·
[`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) ·
[`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) ·
[`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md) ·
[`.github/labels.yml`](../.github/labels.yml)

---

## 1. Problem statement

The originating issue asks for two things:

1. **Add Graphite to the revvel-standards test harness** to increase *granularity* — i.e. let us verify, lint, and merge *smaller* units of change than a monolithic PR. The current harness (markdownlint + lychee + yamllint + ajv + actionlint + shellcheck + promptfoo; see [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) §4.2) gates a **single PR** at a time. As standards docs grow, single PRs accumulate unrelated changes, slowing review and ballooning blast radius.
2. **Facilitate the movement of a PR from `assigned:` → OpenRouter orchestrator**, i.e. the hand-off path documented in [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md). Today that hand-off is one hop: issue/PR opened → `@Copilot` assignee → Ralph loop. We want an *intermediate* signal that lets the orchestrator ingest and route **PR stacks** (dependent branches) coherently instead of treating each branch as an island.

Graphite ([graphite.dev](https://graphite.dev)) addresses both: it is a PR-stacking and merge-queue tool with a CLI (`gt`), a GitHub App, and first-class support for splitting a large change into a chain of small, individually reviewable PRs.

---

## 2. What Graphite adds to the harness

Graphite is **not** a replacement for any existing tool listed in [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) §4.2. It is an **orchestration layer** that sits above the suite-level tools and below GitHub's merge button.

| Harness concern | Provided by today | What Graphite adds |
|---|---|---|
| Per-file / per-artifact validation | markdownlint, yamllint, lychee, ajv, actionlint, shellcheck, promptfoo | Unchanged — Graphite runs *on top of* these checks, not around them. |
| Per-PR status check | GitHub Actions `revvel-standards / test` required check | Graphite observes that status check per branch in the stack and only lets the bottom-most green PR land. |
| Granularity of change | One PR = one unit of merge | Stacked PRs: a single logical change is split into N branches (`skills-base → skills-docs → skills-tests`), each an atomic, independently-reviewable PR. |
| Merge serialization | Manual `squash & merge` click | Graphite merge-queue: serializes merges against `main`, re-runs the `revvel-standards / test` status check on the rebased tip before merging (prevents semantic conflicts between concurrent green PRs). |
| CI signal on the full stack | None — each PR tested independently | Graphite re-triggers CI on descendants when an ancestor is pushed, so the top of a stack is always tested against its *current* parent. |
| PR → orchestrator hand-off | `openrouter-assignee.yml` → `@Copilot` per PR | Graphite stack metadata (`gt-stack`) is surfaced in the first-line-of-sight comment so the orchestrator understands the whole stack, not just a leaf PR. |

### Why not just "open smaller PRs

We already ask contributors to do that. In practice, standards work (a new skill, a new BOM row, a new template) spans several files and at least two logical layers (e.g. **labels.yml** change + **docs** change + **CHANGELOG** entry). Graphite lets those three layers ship as three PRs that land in order, without forcing the author to wait for a human review of layer N before starting layer N+1.

---

## 3. PR → OpenRouter hand-off: the specific improvement

The existing flow (see [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)):

```text
new PR ─► openrouter-assignee.yml ─► assignee = @Copilot
                                    ├─ label: openrouter
                                    ├─ label: role:orchestrator
                                    └─ comment: first-line-of-sight
```

The orchestrator sees one PR at a time. If that PR is the **middle** of a stack, the orchestrator has no context about the PRs below it (needed to build) or above it (blocked on it).

Graphite-augmented flow (additive, not replacing):

```text
new PR (branch in a stack) ─► openrouter-assignee.yml ─► assignee = @Copilot
                                                        ├─ label: openrouter
                                                        ├─ label: role:orchestrator
                                                        ├─ label: graphite           (NEW — set by Graphite App)
                                                        ├─ label: graphite:stacked    (NEW — set if PR is part of an N-branch stack, N ≥ 2)
                                                        └─ comment: first-line-of-sight
                                                            └─ appended: Graphite stack summary
                                                               (parent / children branches + their PR numbers)
```

The orchestrator now has:

- The **stack topology** in the routing comment (so it fixes the right branch, not a descendant).
- A **merge-queue guarantee** that it can land green PRs atomically in the correct order without racing with human merges.
- A **re-test-on-push-to-ancestor** guarantee so that a fix at the base of the stack invalidates stale green statuses further up, protecting `main`.

This is the "specifically help move PR to assigned to openrouter" deliverable in the issue.

---

## 4. Tool selection rationale

Evaluated against the same criteria as [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) §4.1:

| Criterion | Graphite CLI (`gt`) | Graphite GitHub App | Notes |
|---|---|---|---|
| License | MIT (CLI, open source) | Proprietary (SaaS) | CLI is the local-first piece; the App is the SaaS merge-queue. |
| Cost | $0 (CLI) | **$0** on Graphite's Free tier for public repos + up to 10 users; paid tiers start at ~$25/user/mo if we ever exceed that (we won't — this is a single-repo standards org). | Confirm against the current [Graphite pricing page](https://graphite.dev/pricing) before provisioning. |
| Maintenance | Actively developed, weekly releases | Actively developed | Graphite raised a Series B in 2024; healthy. |
| CI-friendly | Yes — `gt` runs non-interactively in CI; emits machine-readable JSON with `--output json`. | Yes — integrates with existing GitHub status checks. | No new CI runner needed. |
| Local-first | Yes — `brew install withgraphite/tap/graphite` (macOS), `scoop install graphite` (Windows), `npm i -g @withgraphite/graphite-cli` (portable). | N/A | Matches existing Mac + Windows installer expectations in `install/`. |
| Zero-config-possible | Yes — `gt init` writes a minimal `.graphite_repo_config` that can be committed. | Yes — install the App on the repo, pick the base branch. | |

### Alternatives considered and rejected

| Tool | Why rejected for **this** repo |
|---|---|
| **`git-branchless`** | Excellent local stacking UX but no GitHub-side merge queue, no PR hand-off signals → does not address requirement 2. |
| **`ghstack`** (Meta) | Optimized for monorepos with trunk-based development; the `ghstack` PR naming scheme conflicts with our `templates/` / `skills/` conventions. |
| **Mergify** | Full-featured merge queue + policy engine but $0 tier is too limited for stacking; paid tier collides with BOM budget. |
| **GitHub native merge queue** | Free, but *does not understand stacks* — it serializes PRs against `main` only, with no concept of parent PRs. Can be layered **under** Graphite later. |
| **Aviator** | Comparable feature set but proprietary pricing is less favourable at our size. |

**Decision:** Adopt **Graphite CLI** (FOSS) + **Graphite GitHub App on the Free tier** for `midnghtsapphire/revvel-standards`.

---

## 5. Requirements (RFC 2119)

Extends [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) §5.

### 5.1. Functional

| ID | Requirement |
|---|---|
| **R-GT-01** | The Graphite GitHub App MUST be installed on `midnghtsapphire/revvel-standards` with **read** access to contents and **write** access to issues / pull requests / checks. |
| **R-GT-02** | Contributors MAY use the `gt` CLI locally; the App MUST function whether or not a given contributor uses the CLI (no forced adoption). |
| **R-GT-03** | The Graphite merge-queue MUST be configured to require the existing `revvel-standards / test` status check before landing any PR — it extends the check, never bypasses it. |
| **R-GT-04** | Stacked PRs MUST land in dependency order; Graphite MUST rebase descendants automatically when an ancestor merges. |
| **R-GT-05** | The `openrouter-assignee.yml` first-line-of-sight comment SHOULD append a **Graphite stack summary** when the PR is part of a stack (`graphite:stacked` label present), listing parent and child PR numbers. |
| **R-GT-06** | Two new labels — `graphite` and `graphite:stacked` — MUST exist in `.github/labels.yml` so `sync-labels.yml` propagates them repo-wide. |
| **R-GT-07** | Graphite configuration files (`.graphite_repo_config`) MUST be committed when first generated, so new contributors inherit the same base branch and trunk settings. |
| **R-GT-08** | Graphite MUST NOT be made a blocking required status check in PR-9 (see §7); it is **advisory** until at least one full release cycle under observation. |

### 5.2. Non-functional

| ID | Requirement |
|---|---|
| **R-GT-N-01** | Graphite usage MUST stay on the Free tier. Any upgrade triggers a new BOM row and standards-owner review. |
| **R-GT-N-02** | The Graphite CLI version used in CI (if any) MUST be pinned in `package.json`. |
| **R-GT-N-03** | No contributor data (source, branch names, diffs beyond what GitHub already exposes) MAY leave the Graphite App boundary; we adopt the App with its default privacy posture and do **not** enable code-completion or AI-review add-ons that ship diffs to third parties. |

### 5.3. Governance

| ID | Requirement |
|---|---|
| **R-GT-G-01** | Enabling Graphite MUST be logged in `CHANGELOG.md` (this PR). |
| **R-GT-G-02** | A BOM row MUST be added to `docs/revvel-standards/BOM.md` capturing license, cost, priority, and status. |
| **R-GT-G-03** | Review the decision every 12 months; re-evaluate against native GitHub merge queue maturity. |

---

## 6. Proposed directory / config additions

Additive only — no existing files overwritten.

```text
revvel-standards/
├── .graphite_repo_config            # generated by `gt init`, committed (R-GT-07)
├── .github/
│   └── labels.yml                   # + graphite, + graphite:stacked (R-GT-06)
└── docs/
    ├── GRAPHITE_INTEGRATION.md      # this document
    └── revvel-standards/
        └── BOM.md                   # + Graphite row (R-GT-G-02)
```

`openrouter-assignee.yml` changes to append the stack summary (R-GT-05) are deferred to a follow-up PR so this PR remains docs-first and append-only.

---

## 7. Rollout plan (extends §7 of TEST_HARNESS_RESEARCH)

Each bullet is a **single PR**, continuing the numbering from the existing rollout:

1. **PR-9 (this PR):** Land this integration doc, append the BOM row, add `graphite` + `graphite:stacked` labels, append the CHANGELOG entry. No runtime behaviour changes yet.
2. **PR-10:** Install the Graphite GitHub App; run `gt init`; commit `.graphite_repo_config`.
3. **PR-11:** Configure the Graphite merge-queue to require the `revvel-standards / test` status check (R-GT-03).
4. **PR-12:** Append the Graphite stack summary block to `openrouter-assignee.yml` (R-GT-05).
5. **PR-13:** 30-day observation period; record outcomes; decide whether to flip Graphite from advisory to required.

Total expected engineering time: **≤ 1 day** across PR-10..PR-12, plus the observation window.

---

## 8. How this satisfies the originating issue

| Issue ask | How this doc addresses it |
|---|---|
| *"Add graphite to revvel-standards to increase granularity of test harness"* | §2: Graphite splits monolithic PRs into reviewable stacks without replacing any existing suite-level tool. §4.2: rollout PR-10..PR-13 wires it in. |
| *"Facilitate movement from PR to assigned to openrouter"* | §3: the first-line-of-sight comment is extended (in PR-12) with Graphite stack metadata, so the OpenRouter orchestrator receives *stack-aware* context instead of single-PR context. |
| *"All areas of standards"* | §2 table + §6 directory layout: Graphite operates at PR level and therefore applies uniformly to every area (docs, skills, templates, installers, standards). No per-area config needed. |

---

## 9. See also

- [`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) — the base harness this doc extends.
- [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) — Bill of Materials; Graphite row added in this PR.
- [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — the PR → OpenRouter hand-off that Graphite augments.
- [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md) — OpenRouter orchestrator reference.
- [Graphite docs](https://graphite.dev/docs) — authoritative upstream reference.
