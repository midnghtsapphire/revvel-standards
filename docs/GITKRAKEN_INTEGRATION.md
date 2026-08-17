# GitKraken Integration — Multi-Repo Visibility, Workspaces & PR Focus View

**Version:** 1.0.0
**Date:** April 20, 2026
**Status:** Requirements / Recommendation — additive to the existing harness
**Author:** MIDNGHTSAPPHIRE
**Scope:** `midnghtsapphire/revvel-standards` — the docs/standards/skills/templates repo; pattern applies to every repo listed in `docs/REPO_CATALOG.md`
**Related:**
[`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) ·
[`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) ·
[`docs/REPO_CATALOG.md`](./REPO_CATALOG.md) ·
[`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) ·
[`.github/labels.yml`](../.github/labels.yml)

---

## 1. Problem statement

MIDNGHTSAPPHIRE operates a fleet of repositories (see [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md)) all governed by the standards in this repo. Contributors and AI agents routinely work across several of those repos in a single session — a change to `revvel-standards` may ripple into `mind-mappr`, `growlingeyes`, `fieldwork`, `penny-sovereign-yield-scout`, etc. Today there is **no single pane of glass** that:

1. Aggregates branches / PRs / issues across every repo in the org.
2. Lets a human (or AI teammate) visually resolve merge conflicts across stacks before they reach the `revvel-standards / test` status check.
3. Groups repos into named **workspaces** so onboarding a new contributor is "install the GitKraken Workspace, click Clone All".
4. Surfaces the Graphite stack ([`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md)) and the OpenRouter assignee signal ([`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)) in a GUI that non-CLI contributors can actually use.

GitKraken ([gitkraken.com](https://www.gitkraken.com)) addresses all four: it is a Git GUI + CLI (`gk`) + GitHub App + VS Code extension (**GitLens**) suite with first-class multi-repo **Workspaces**, a **Launchpad** PR/issue inbox, and a visual merge-conflict editor.

---

## 2. What GitKraken adds to the workflow

GitKraken is **not** a replacement for any existing tool listed in [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) or the Graphite integration. It is a **contributor-side** surface that sits above `git` + GitHub + Graphite.

| Contributor concern | Provided by today | What GitKraken adds |
|---|---|---|
| Multi-repo checkout / onboarding | Manual `git clone` per repo per `REPO_CATALOG.md` row | **GitKraken Workspaces** — one named workspace per org area (standards, mind-mappr-family, fieldwork-family, growlingeyes-family); one click to clone + open all repos in the workspace. |
| Branch / PR situational awareness | GitHub web UI, one repo tab at a time | **Launchpad** — unified inbox for PRs, issues, and review requests across every workspace repo, with labels (`openrouter`, `graphite`, `graphite:stacked`) surfaced inline. |
| Merge-conflict resolution | Hand-edit `<<<<<<<` markers in an editor | Visual three-way conflict editor (works with Graphite-rebased stacks). |
| Blame / history discovery | `git blame`, `git log --graph` | **GitLens** (GitKraken-owned VS Code extension) — inline blame, file-history heatmap, commit graph in-editor. |
| Commit / push hygiene | Local pre-commit + CI-side gates | GitKraken's interactive-rebase UI + commit-message templates sourced from [`templates/`](../templates/). |
| Non-CLI contributor onboarding | `install/mac/` + `install/windows/` installers for GBrain; raw `git` for everything else | Point-and-click GUI; the Workspace + clone flow matches the "non-coder" onboarding goal in [`docs/NON_CODER_GUIDE.md`](./NON_CODER_GUIDE.md). |
| PR → OpenRouter visibility | `openrouter-assignee.yml` first-line-of-sight comment + labels | Launchpad shows the same labels (`openrouter`, `role:orchestrator`, `graphite:stacked`) alongside CI status, so a contributor can *see* that the orchestrator is live on a PR without leaving the GUI. |

### Why this repo specifically

Because `revvel-standards` owns the canonical label set (`.github/labels.yml`) and the canonical repo catalog (`docs/REPO_CATALOG.md`), it is the natural home for:

- The **Workspace definition** (a short, versioned list of repos that belong in the "MIDNGHTSAPPHIRE standards" Workspace).
- The **labels** GitKraken Launchpad surfaces (`gitkraken`, `gitkraken:workspace`).
- The **governance row** in the BOM.

Every other repo inherits the integration automatically through the existing `sync-labels.yml` propagation.

---

## 3. PR → OpenRouter hand-off: how GitKraken augments it

The existing hand-off (see [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)) assigns `@Copilot`, applies `openrouter` + `role:orchestrator` labels, and posts a first-line-of-sight comment. Graphite adds `graphite` / `graphite:stacked` stack context (see [`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md)).

GitKraken adds a **read-side** surface on top of that:

```text
PR opened ─► openrouter-assignee.yml ─► assignee = @Copilot
                                        ├─ label: openrouter
                                        ├─ label: role:orchestrator
                                        ├─ label: graphite            (if stacked)
                                        └─ label: graphite:stacked    (if stacked)

                                  ┌──────────────────────────────────┐
                                  │  GitKraken Launchpad (contrib)   │
                                  │  shows the PR with all labels,   │
                                  │  CI status, Graphite parents /   │
                                  │  children, reviewer ask.         │
                                  │  NEW label: gitkraken            │
                                  │  (optional, marks PRs a human    │
                                  │   is actively tracking in the    │
                                  │   GUI).                          │
                                  └──────────────────────────────────┘
```

GitKraken is a **passive consumer** of the existing labels. It adds no new automation or webhooks into `revvel-standards`. The `gitkraken` label is optional and contributor-applied on PRs; `gitkraken:workspace` should be used on a dedicated tracking issue or PR that records which repositories are included in the canonical Workspace definition, rather than being applied directly to a repository.

---

## 4. Tool selection rationale

Evaluated against the same criteria as other integrations in this repo:

| Criterion | GitKraken Client | GitKraken CLI (`gk`) | GitLens (VS Code) |
|---|---|---|---|
| License | Proprietary; **Free for public repos** and individual non-commercial use; paid Pro for private-repo commercial use. | Open source (MIT, [`gitkraken/gk-cli`](https://github.com/gitkraken/gk-cli)). | Free core; **GitLens Pro** paid tier (optional). |
| Cost | $0 for this repo (public, standards-org). Pro starts at ~$4.95/user/mo **only** if a contributor needs private-repo features — out of scope for `revvel-standards`. | $0. | $0 for core features. |
| Maintenance | Actively developed, quarterly major releases. | Actively developed on GitHub. | Actively developed; acquired/owned by GitKraken since 2022. |
| CI-friendly | N/A — contributor-side GUI, not a CI runner. | Yes — `gk` is scriptable and emits JSON for workspace / PR automation. | N/A. |
| Local-first | Yes — desktop app (macOS / Windows / Linux). | Yes — `brew install gitkraken-cli` (macOS), `scoop install gk` (Windows), standalone binaries for Linux. | Yes — VS Code extension. |
| Zero-config-possible | Yes — sign in with GitHub OAuth; Workspace definition committed to this repo (see §6). | Yes — `gk auth login`; picks up GitHub creds from the gh CLI / OAuth. | Yes — installs from VS Code marketplace. |

### Alternatives considered and rejected

| Tool | Why rejected as the primary GUI for **this** repo |
|---|---|
| **GitHub Desktop** | Single-repo only, no Workspace concept, no Launchpad, no stack visualisation → does not address requirements 1, 2, or 3. |
| **Sourcetree** | Closed-source, Atlassian-tied, no multi-repo Workspace, maintenance has slowed. |
| **Fork** | Excellent single-repo GUI but no multi-repo Launchpad or GitHub-App integration. |
| **Tower** | Strong single-repo GUI, paid-only even for public repos, no CLI parity with our other FOSS tooling. |
| **lazygit** (TUI) | Kept as a supported alternative for CLI users; not a GUI, so does not satisfy the "non-coder onboarding" requirement. Contributors MAY use lazygit instead of GitKraken. |
| **GitHub.dev / web-only** | No offline mode, no conflict editor, no unified multi-repo view. |

**Decision:** Adopt **GitKraken Client** (Free tier, public repos) + **GitKraken CLI `gk`** (FOSS) + **GitLens** (free core) as the supported, but **not mandatory**, contributor GUI stack for `midnghtsapphire/revvel-standards` and every repo listed in [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md).

---

## 5. Requirements (RFC 2119)

### 5.1. Functional

| ID | Requirement |
|---|---|
| **R-GK-01** | A canonical **GitKraken Workspace definition** MUST live in this repo at `docs/revvel-standards/GITKRAKEN_WORKSPACE.md` (created in rollout PR-2 below) and MUST enumerate every repo that belongs in the "MIDNGHTSAPPHIRE Standards" Workspace, pulling the list from [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md). |
| **R-GK-02** | Contributors MAY use any Git GUI (or none); GitKraken MUST NOT be a required tool and MUST NOT gate any status check. Use is opt-in. |
| **R-GK-03** | Two new labels — `gitkraken` and `gitkraken:workspace` — MUST exist in `.github/labels.yml` so `sync-labels.yml` propagates them to every repo. These labels are issue/PR-scoped markers only; they do not define repository membership. |
| **R-GK-04** | The `gitkraken` label is **contributor-applied** and advisory: it marks a PR a human is actively tracking in the GitKraken Launchpad. No workflow MAY set or require it. |
| **R-GK-05** | The repository topic `gitkraken-workspace` MAY be applied to repos to indicate they are in the canonical Workspace. If used, this topic is the sole repo-scoped marker for Workspace membership; the `gitkraken:workspace` label MAY be used only on tracking issues or PRs and MUST NOT be treated as a repo-scoped mechanism. |
| **R-GK-06** | GitKraken MUST NOT be granted write access to `main` or to the merge queue. It is a **read-side** contributor surface; all write paths continue to flow through GitHub + Graphite + the existing CI. |
| **R-GK-07** | If a contributor authenticates GitKraken to GitHub, they MUST use GitHub OAuth (no long-lived PATs committed anywhere). This mirrors [`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) guidance. |
| **R-GK-08** | GitLens AI features (if any require sending diffs to third-party LLMs) MUST be disabled by default. Any contributor who enables them does so under their own account and does NOT route diffs on behalf of the org. |

### 5.2. Non-functional

| ID | Requirement |
|---|---|
| **R-GK-N-01** | GitKraken usage MUST stay on the free/public-repo tier for `revvel-standards`. Any paid upgrade triggers a new BOM row and standards-owner review. |
| **R-GK-N-02** | No contributor data (source, branch names, diffs beyond what GitHub already exposes) MAY leave the GitKraken App boundary through optional AI / telemetry features; the adoption baseline is "GitKraken with default telemetry, GitLens with AI off". |
| **R-GK-N-03** | The GitKraken CLI version used in any automation scripts (if adopted later) MUST be pinned. |

### 5.3. Governance

| ID | Requirement |
|---|---|
| **R-GK-G-01** | Enabling GitKraken MUST be logged in `CHANGELOG.md` (this PR). |
| **R-GK-G-02** | A BOM row MUST be added to `docs/revvel-standards/BOM.md` capturing license, cost, priority, and status. |
| **R-GK-G-03** | Review the decision every 12 months; re-evaluate against GitHub Desktop / native GitHub web features. |

---

## 6. Proposed directory / config additions

Additive only — no existing files overwritten.

```text
revvel-standards/
├── .github/
│   └── labels.yml                          # + gitkraken, + gitkraken:workspace (R-GK-03)
└── docs/
    ├── GITKRAKEN_INTEGRATION.md            # this document
    └── revvel-standards/
        ├── BOM.md                          # + GitKraken row (R-GK-G-02)
        └── GITKRAKEN_WORKSPACE.md          # created in rollout PR-2 (R-GK-01)
```

Updates to `docs/OPENROUTER_ASSIGNEE_PROCESS.md` are append-only (a single bullet added to the "See also" section).

---

## 7. Rollout plan

Each bullet is a **single PR**:

1. **PR-1 (this PR):** Land this integration doc, add `gitkraken` + `gitkraken:workspace` labels, append the BOM row, append the CHANGELOG entry, cross-link from `OPENROUTER_ASSIGNEE_PROCESS.md`. No runtime behaviour changes.
2. **PR-2:** Create `docs/revvel-standards/GITKRAKEN_WORKSPACE.md` with the canonical repo list (sourced from `REPO_CATALOG.md`) and a shareable GitKraken Workspace URL.
3. **PR-3:** Add a short "GitKraken (optional)" section to `docs/NON_CODER_GUIDE.md` covering install + one-click clone of the Workspace.
4. **PR-4:** 30-day observation period; record outcomes (adoption count, Launchpad usefulness, conflict-editor saves). No behaviour change unless promoted.

Total expected engineering time: **≤ 1 day** across PR-2..PR-3, plus the observation window.

---

## 8. How this satisfies the originating issue

| Issue ask | How this doc addresses it |
|---|---|
| *"Wire in GitKraken"* | §2: GitKraken is wired in as a docs-first, opt-in contributor surface — labels, BOM, CHANGELOG, Workspace spec. §6: zero-overwrite file layout. §7: four-step rollout with clear PR boundaries. |
| *"All areas of standards"* (implicit — the label set and BOM are org-wide) | §5 R-GK-03: labels sync to every repo via `sync-labels.yml`. §6: Workspace definition enumerates the full repo catalog. |

---

## 9. See also

- [`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) — the PR-stacking tool whose labels GitKraken Launchpad surfaces.
- [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — the PR → OpenRouter hand-off whose signals GitKraken consumes read-only.
- [`docs/REPO_CATALOG.md`](./REPO_CATALOG.md) — canonical list of MIDNGHTSAPPHIRE repos; source of the Workspace definition.
- [`docs/NON_CODER_GUIDE.md`](./NON_CODER_GUIDE.md) — non-coder onboarding path GitKraken slots into.
- [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) — Bill of Materials; GitKraken row added in this PR.
- [GitKraken docs](https://help.gitkraken.com) — authoritative upstream reference.
- [GitKraken CLI (`gk`)](https://github.com/gitkraken/gk-cli) — FOSS CLI companion.
- [GitLens](https://www.gitkraken.com/gitlens) — VS Code extension owned by GitKraken.
