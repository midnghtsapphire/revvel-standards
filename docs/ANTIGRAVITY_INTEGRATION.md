# Antigravity Integration — Agentic IDE Surface for Revvel Standards

**Version:** 1.0.0
**Date:** April 23, 2026
**Status:** Requirements / Recommendation — additive to the existing harness and OpenRouter hand-off
**Author:** MIDNGHTSAPPHIRE
**Scope:** `midnghtsapphire/revvel-standards` — the docs/standards/skills/templates repo; pattern is portable to every repo listed in `docs/REPO_CATALOG.md`
**Related:**
[`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) ·
[`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) ·
[`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) ·
[`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) ·
[`docs/GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) ·
[`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md) ·
[`.github/labels.yml`](../.github/labels.yml)

---

## 1. Problem statement

The originating issue (*"Plan Antigravity integration into revvel-standards — where? how? BOM?"*) asks for a concrete answer to three questions:

1. **Where** does Google Antigravity — an **agent-first IDE** that co-drives editor, terminal, and browser through autonomous agents — fit into the revvel-standards ecosystem?
2. **How** does it compose with the existing tooling surface (Copilot Coding Agent, OpenRouter swarms, Graphite stacks, GitKraken Launchpad, the `revvel-standards / test` harness)?
3. **What is the BOM cost** of adopting it, and under what tier?

Today, `revvel-standards` has three complementary automation lanes already wired in:

| Lane | Purpose | Artifact |
|---|---|---|
| **CI harness** | Suite-level validation of every PR (markdownlint, lychee, yamllint, ajv, actionlint, shellcheck, promptfoo) | [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) |
| **OpenRouter hand-off** | Every new PR is routed to the OpenRouter orchestrator via the `@Copilot` assignee + `openrouter` / `role:orchestrator` labels | [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) |
| **Stack + multi-repo UX** | Graphite stacks the PRs; GitKraken aggregates them across the org | [`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md), [`GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) |

What is **missing** is an **agentic workbench** that a human (or a second-brain agent) can drive interactively when a change requires:

- End-to-end verification (edit → build → run → browser check → screenshot) in one place.
- Side-by-side orchestration of *multiple* autonomous agents against the same repo (e.g. one agent writing a skill, another updating its tests, a third validating links) — producing verifiable **Artifacts** (task lists, screenshots, browser recordings) rather than opaque logs.
- A consistent MCP client surface so the same skills already published in `skills/REGISTRY.md` can be invoked from an editor without bespoke glue.

**Antigravity** ([antigravity.google](https://antigravity.google)) addresses all three. It is Google's agent-first IDE (public preview, 2025-11) built on the VS Code core, with:

- A **dual interface** — familiar Editor view + an **Agent Manager** "mission control" for orchestrating long-running, multi-agent workflows.
- **Multi-surface agents** that drive the editor, the integrated terminal, *and* a browser (via a Chrome extension) — the missing pieces for UI-adjacent work.
- **Artifact-first outputs** — every agent task emits structured artifacts (plans, screenshots, browser recordings) that slot naturally into our PR-review workflow.
- **Multi-model routing** — first-class support for Gemini 3 Pro, Gemini 3 Flash, Claude Sonnet 4.6, Claude Opus 4.6, and GPT-OSS 120B. That overlaps with — and **reads the same model catalogue concepts as** — our OpenRouter swarm registry.
- **MCP client support** so `skills/*` can be surfaced directly in the IDE agent context.

---

## 2. Where Antigravity fits (the "where" question)

Antigravity is **not** a replacement for any existing lane. It is a **contributor-side agentic IDE** that sits alongside Copilot Coding Agent, OpenRouter swarms, Graphite, and GitKraken, and *composes with* the OpenRouter hand-off rather than short-circuiting it.

| Concern | Already covered by | What Antigravity adds |
|---|---|---|
| Per-PR CI validation | `revvel-standards / test` suite | Unchanged — Antigravity runs locally, emits work to PRs that the existing suite gates. |
| Remote autonomous PR work | Copilot Coding Agent + OpenRouter orchestrator | **Contributor-local** counterpart: a human-in-the-loop agent IDE used *before* the PR is opened, or to prepare artifacts (screenshots, browser recordings) that the remote agent cannot produce. |
| PR stacking / merge queue | Graphite | Unchanged — Antigravity commits land in Graphite stacks exactly like any other commit. |
| Multi-repo GUI Launchpad | GitKraken | Complementary — GitKraken is a Git client; Antigravity is an IDE. A contributor can run both. |
| End-to-end UI verification on a PR | None — currently manual | **New capability** — Antigravity's browser agent produces screenshots and session recordings, attachable to PRs as artifacts per `skills/screenshot-ci/SKILL.md` conventions. |
| Multi-model routing | OpenRouter (server-side) | Antigravity routes models **client-side** for interactive editing; OpenRouter remains the single source of truth for *server-side / CI-driven* model choice (see §5.2 R-AG-N-02). |
| Skill invocation | MCP servers exposed in `skills/` | Antigravity **MCP client** lets editors call the same skills directly. No skill changes required. |

### The "where" in one line

> **Antigravity is the interactive, contributor-local, browser-aware counterpart to the Copilot Coding Agent / OpenRouter server-side swarm.** It sits on the developer workstation, commits into Graphite stacks, and shows up in the GitKraken Launchpad like any other author.

---

## 3. How it integrates (the "how" question)

### 3.1. Flow diagram

```text
                           ┌──────────────────────────────────────┐
                           │  Contributor workstation             │
                           │                                      │
                           │  ┌────────────────────────────────┐  │
                           │  │ Antigravity IDE                │  │
                           │  │  • Editor (VS Code core)       │  │
                           │  │  • Agent Manager (mission ctl) │  │
                           │  │  • Browser agent (Chrome ext.) │  │
                           │  │  • MCP client → skills/*       │  │
                           │  └───────────────┬────────────────┘  │
                           │                  │ commits            │
                           │                  ▼                    │
                           │           Graphite stack              │
                           └──────────────────┬───────────────────┘
                                              │ push
                                              ▼
                      ┌───────────────────────────────────────────┐
                      │  GitHub — midnghtsapphire/revvel-standards│
                      │                                           │
                      │  • revvel-standards / test  (unchanged)   │
                      │  • openrouter-assignee.yml  (unchanged)   │
                      │  • Graphite merge queue     (unchanged)   │
                      └─────────────────┬─────────────────────────┘
                                        │ label: openrouter
                                        ▼
                             OpenRouter orchestrator (unchanged)
```

No existing workflow file, label, or CI step is modified. Antigravity enters the system purely as a **PR author** — GitHub cannot tell Antigravity-authored commits from any other commit, and the `openrouter-assignee.yml` routing still applies.

### 3.2. What contributors install

| Piece | Provider | License | Purpose |
|---|---|---|---|
| Antigravity IDE | Google | Proprietary, free during public preview | Editor + Agent Manager |
| Antigravity Chrome extension | Google | Proprietary | Browser agent surface |
| MCP server(s) from `skills/` | This repo | MIT | Expose existing skills to the IDE |

Installation is **opt-in per contributor**. There is no repo-level requirement to use Antigravity; see §5.1 R-AG-02.

### 3.3. Relationship to each existing integration

- **Copilot Coding Agent / OpenRouter swarms** — Antigravity is the *local, human-present* counterpart. Large autonomous jobs remain server-side; Antigravity handles interactive, browser-adjacent, artifact-producing work. Both can target the same PR.
- **Graphite** ([`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md)) — commits produced in Antigravity land in Graphite stacks via the `gt` CLI from the Antigravity terminal; no special config required.
- **GitKraken** ([`GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md)) — a PR authored from Antigravity appears in the GitKraken Launchpad indistinguishably from any other PR. The `antigravity` label (see §5.1 R-AG-06) lets a Launchpad filter surface them.
- **OpenRouter assignee** ([`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)) — when an Antigravity-authored PR opens, `openrouter-assignee.yml` still assigns `@Copilot`, sets `openrouter` + `role:orchestrator`, and posts the first-line-of-sight comment. The `antigravity` label is *additive* metadata only.

### 3.4. Artifact convention

Browser-agent artifacts (screenshots, session recordings) attached to a PR **SHOULD** be placed in a PR comment block prefixed `### Antigravity artifacts` so the OpenRouter orchestrator can detect and index them. This matches the existing first-line-of-sight comment convention.

---

## 4. Tool selection rationale

Evaluated against the same criteria as [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) §4.1 and [`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) §4:

| Criterion | Antigravity (Individual, public preview) | Notes |
|---|---|---|
| License | Proprietary | Google product. CLI/skills we ship from `skills/*` remain MIT. |
| Cost | **$0** during public preview (Individual plan); **~$20/mo** Pro tier; Enterprise ~$250/mo+ | Individual is sufficient for this repo; see §5.2 R-AG-N-01. |
| Maintenance | Actively developed by Google (public preview launched 2025-11) | Roadmap tracked by Google for Developers blog. |
| CI-friendly | **No CI role.** Antigravity is a contributor-local IDE, not a CI runner. | This is intentional — see §5.1 R-AG-03. |
| Local-first | Yes — cross-platform desktop app (macOS / Windows / Linux) | Matches existing `install/` posture. |
| Zero-config-possible | Yes for Editor view; MCP client needs the repo's existing MCP endpoints wired once per workstation | Documented in follow-up PR, not this one. |

### Alternatives considered and rejected

| Tool | Why rejected for **this** repo (today) |
|---|---|
| **Cursor** | Excellent AI IDE but no browser-agent surface and no Agent Manager; overlaps with Copilot Coding Agent without adding the missing capability (browser + artifacts). |
| **Cline / Continue** | VS Code extensions only — do not solve the browser-agent or Agent Manager gap. Keep as personal choice. |
| **Zed Agentic Panel** | Promising but no browser agent and no MCP parity yet; revisit in 12 months. |
| **Warp Agent Mode** | Terminal-only; complementary but narrower than Antigravity. |
| **Windsurf** (Codeium) | Similar class to Antigravity; **no blocker** to contributor choice — a contributor MAY use Windsurf instead (§5.1 R-AG-02). We recommend Antigravity because its browser-agent + Artifacts combo is unique today and its Free-preview tier is $0. |

**Decision:** Adopt **Antigravity (Individual / public-preview tier)** as the *recommended, opt-in* agentic IDE for `midnghtsapphire/revvel-standards` contributors. No mandatory installation; no CI role.

---

## 5. Requirements (RFC 2119)

Extends [`TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) §5, [`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) §5, and [`GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) §5.

### 5.1. Functional

| ID | Requirement |
|---|---|
| **R-AG-01** | Antigravity MUST be treated as a contributor-local IDE — it MUST NOT be granted any repo-level write credential, branch-protection exception, or CI runner role. |
| **R-AG-02** | Contributors MAY use Antigravity; they MAY instead use any other editor (VS Code, Cursor, Windsurf, Zed, vim). Antigravity MUST NOT become a required tool. |
| **R-AG-03** | Antigravity MUST NOT be wired into `.github/workflows/*`. No CI job may depend on the Antigravity app being installed. |
| **R-AG-04** | PRs authored from Antigravity MUST pass the same `revvel-standards / test` suite as every other PR. The OpenRouter hand-off (`openrouter-assignee.yml`) MUST function unchanged. |
| **R-AG-05** | Antigravity's MCP client SHOULD be configured to reach the MCP servers already defined in `skills/REGISTRY.md`; no new skills are required, and no skill SHALL be forked for Antigravity specifically. |
| **R-AG-06** | Two new labels — `antigravity` and `antigravity:agent-run` — MUST be added to `.github/labels.yml`. `antigravity` marks PRs *authored* from an Antigravity session; `antigravity:agent-run` marks PRs whose body contains `### Antigravity artifacts`. |
| **R-AG-07** | Browser-agent artifacts (screenshots, recordings) posted to a PR MUST be placed in a fenced comment section titled `### Antigravity artifacts` so the OpenRouter orchestrator can detect and index them. |
| **R-AG-08** | Antigravity adoption is **advisory / opt-in**. Flipping it to "recommended default" requires a follow-up standards-owner review (see §5.3 R-AG-G-03). |

### 5.2. Non-functional

| ID | Requirement |
|---|---|
| **R-AG-N-01** | Antigravity usage MUST stay on the Free / public-preview Individual tier. Any upgrade to Pro or Enterprise triggers a new BOM row and a standards-owner review. |
| **R-AG-N-02** | OpenRouter remains the **single source of truth** for server-side / CI-driven model choice. Antigravity's client-side model router is for interactive editing only and MUST NOT be wired into any CI or production agent path. |
| **R-AG-N-03** | No repository secrets (`OPENROUTER_API_KEY`, deploy keys, Vault tokens) MAY be pasted into the Antigravity Agent Manager or transmitted through its Chrome extension. Contributors who need secrets in an IDE session MUST source them from `skills/vault-agent/SKILL.md` the same way they already do for other tools. |
| **R-AG-N-04** | Antigravity browser-agent recordings that capture anything beyond the public repo surface (e.g. admin panels, paid services) MUST be scrubbed before being attached to a PR. |
| **R-AG-N-05** | The public-preview privacy posture MUST be reviewed annually. If Google's default becomes "train on user prompts" and cannot be disabled on the Individual tier, the recommendation in this doc MUST be revisited. |

### 5.3. Governance

| ID | Requirement |
|---|---|
| **R-AG-G-01** | Enabling Antigravity as a recommended tool MUST be logged in `CHANGELOG.md` (this PR does so). |
| **R-AG-G-02** | A BOM row MUST be added to [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) capturing license, cost, priority, and status. |
| **R-AG-G-03** | Review the recommendation every 12 months; re-evaluate against Cursor / Windsurf / Zed / native VS Code Copilot agent mode at that point. |

---

## 6. Proposed directory / config additions (the "how", concretely)

Additive only — no existing files overwritten.

```text
revvel-standards/
├── .github/
│   └── labels.yml                      # + antigravity, + antigravity:agent-run (R-AG-06)
├── CHANGELOG.md                        # append Antigravity entry (R-AG-G-01)
└── docs/
    ├── ANTIGRAVITY_INTEGRATION.md      # this document
    ├── OPENROUTER_ASSIGNEE_PROCESS.md  # + See-also link (cross-reference only)
    └── revvel-standards/
        └── BOM.md                      # + Antigravity row (R-AG-G-02)
```

Any workflow wiring (e.g. an optional Action that auto-labels PRs whose body contains `### Antigravity artifacts`) is **deferred to a follow-up PR** so this PR remains docs-first, additive, and free of runtime behaviour changes.

---

## 7. Rollout plan

Each bullet is a **single PR**:

1. **PR-1 (this PR):** Land this integration doc, append the BOM row, add the two labels, append the CHANGELOG entry, cross-link from `OPENROUTER_ASSIGNEE_PROCESS.md`. No runtime behaviour changes.
2. **PR-2:** Publish a short contributor guide (`docs/ANTIGRAVITY_CONTRIBUTOR_GUIDE.md`) covering install, MCP client setup against `skills/REGISTRY.md`, and the `### Antigravity artifacts` comment convention.
3. **PR-3 (optional):** Add a lightweight `antigravity-artifact-label.yml` workflow that applies `antigravity:agent-run` to any PR whose body or comment contains `### Antigravity artifacts` (R-AG-06 automation).
4. **PR-4:** 90-day observation window. Collect contributor feedback, count PRs carrying `antigravity` / `antigravity:agent-run`, record blockers. Decide whether to keep Antigravity at *recommended opt-in* or demote to *watch list*.

Total expected engineering time: **≤ 1 day** across PR-2..PR-3, plus the observation window.

---

## 8. BOM impact (the "BOM?" question)

A single new row is appended to [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md) under **Purchase Needed** (for visibility), with **Est. Cost** = **$0** during public preview and status **🟡 Planned — opt-in**. No change to total annual cost. If Google ends the free preview without a free-forever Individual tier, the BOM row flips status and a standards-owner review is triggered (R-AG-N-01, R-AG-G-03).

---

## 9. How this satisfies the originating issue

| Issue ask | How this doc addresses it |
|---|---|
| *"Plan Antigravity integration into revvel-standards"* | §1–§3: positions Antigravity as the contributor-local, browser-aware, artifact-producing counterpart to the existing Copilot / OpenRouter / Graphite / GitKraken lanes, with a concrete flow diagram. |
| *"where?"* | §2: contributor workstation, adjacent to (not replacing) existing tooling; composes with Graphite stacks and the GitKraken Launchpad; emits PRs that go through the same OpenRouter hand-off. |
| *"how?"* | §3: opt-in install, MCP client reads existing `skills/REGISTRY.md`, commits through Graphite, artifacts via a conventional PR comment block, two new labels in `labels.yml`. No CI changes. §6 spells out the directory diff. |
| *"BOM?"* | §8: single row in [`docs/revvel-standards/BOM.md`](./revvel-standards/BOM.md), Est. Cost $0 on the Individual public-preview tier, P2 priority, 🟡 Planned. |
| *"Create documentation then deploy roo coder to do it"* | Documentation = this file + BOM + labels + CHANGELOG. Implementation (PR-2..PR-3) is handed off downstream per the standard Prime-Directive flow: ship the docs that are working standards, then let the orchestrator / Roo Coder execute the numbered PRs. |

---

## 10. See also

- [`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](./revvel-standards/TEST_HARNESS_RESEARCH.md) — base harness; Antigravity does not modify it.
- [`docs/GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) — PR stacking; Antigravity-authored commits land in Graphite stacks natively.
- [`docs/GITKRAKEN_INTEGRATION.md`](./GITKRAKEN_INTEGRATION.md) — Launchpad GUI that surfaces the new `antigravity` label across the org.
- [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — the PR → OpenRouter hand-off that Antigravity-authored PRs traverse unchanged.
- [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md) — OpenRouter routing; remains the server-side source of truth for model selection.
- [`skills/REGISTRY.md`](../skills/REGISTRY.md) — canonical skill list that Antigravity's MCP client reads.
- [Antigravity (Google)](https://antigravity.google) — authoritative upstream reference.
- [Build with Google Antigravity (Google Developers blog, 2025-11)](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/) — launch post.
