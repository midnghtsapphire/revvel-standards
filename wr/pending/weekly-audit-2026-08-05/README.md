# Weekly audit 2026-07-29 → 2026-08-05 — live refresh 2026-08-08

**WR:** #16947  
**PR:** this branch (closes #16947)  
**Hard rule:** agents draft WR + PR + fixes; **human** undrafts/merges. No agent auto-merge of other PRs.

This file is the durable audit deliverable. The original issue body was a
2026-08-05 snapshot; this refresh re-checked live GitHub state on **2026-08-08**.

## Verdict (2026-08-08)

| Area | Status |
| --- | --- |
| Conversation → WR/PR coverage (Grok pack week) | **Complete** (drafts landed or superseded) |
| Merges since audit opened | **Many** — see tables below |
| Human merge queue | **Much shorter** than 2026-08-05 |
| Agent-automatable blocker found this pass | **`ready-to-merge` missing from label allowlist** (fixed in this PR) |
| Sheaf lane pick | **Done** — JS sheaf #16897 merged; close #16905 / #16895 as duplicate |

## Acceptance criteria (issue #16947)

| Criterion | Status (2026-08-08) |
| --- | --- |
| Human merges Tier A items they accept | **Partial** — #16928 merged; #16929 / #16873 / #16853 still open |
| One sheaf PR chosen | **Done** — #16897 merged |
| #16944 lands after lint green | **Done** — merged 2026-08-05 |
| This WR closed when queue empty or consciously parked | **Ready to park** after human finishes remaining Tier A (or parks them) |

## Done since the 2026-08-05 audit snapshot

These were open or “needs lint/fix” on the original audit and are now **merged**:

| PR | Title | Notes |
| --- | --- | --- |
| #16944 | chore(governance): labels allowlist · privilege · formal auto-WR · disaster pack | Was lint-red / won't-merge; **merged** |
| #16928 | saved reply resolve conflicts | Was Tier A draft; **merged** (closes #16927) |
| #16897 | BNAT sheaf (JS) | Canonical sheaf pick; **merged** |
| #16939 | audit-2026-08-05 security-fleet + dashboard ruleset | Was CI-fail Tier C; **merged** |
| #16943 | OPENROUTER_API_KEY invalid header | Was Tier C draft; **merged** |
| #16855 | NEON workflow | Was waiting-for-review; **merged** |
| #16933 / #16934 / #16935 / #16946 | research / catalog drafts | **merged** in the same window |

Plus the original “done this week” set from the issue body (#16925, #16892, #16864, #16899, #16886, #16896, #16902, #16907, #16887, #16891, #16791, …).

## Remaining human merge queue (2026-08-08)

### Tier A — still needs a human click

| # | Title | State | Action |
| --- | --- | --- | --- |
| **#16929** | fix(mcp): collapse FastMCP shim | open, approved, ready-to-merge labels; governance allowlist was failing on bare `ready-to-merge` | After **this** PR merges (allowlist fix), re-check checks → **Merge** |
| **#16873** | docs: merge conflict operator guide | open, `review:stuck`, mergeable blocked | Human approve → merge (docs-only) |
| **#16853** | openrouter changes for #16170 (editorconfig / gitattributes / conflict policy) | open, mixed ready + failing labels | Inspect required checks → fix or close as superseded by #16873 docs |

### Tier B — sheaf cluster (decision already made)

| # | Title | Action |
| --- | --- | --- |
| **#16897** | BNAT sheaf (JS) | **Canonical — already merged** |
| **#16905** | BNAT sheaf Python+Observatory | **Close as duplicate** of #16897 (dirty) |
| **#16895** | mathematical bnatsheaf consistency | **Close as duplicate** of #16897 (dirty; huge unrelated deletions risk) |

### Tier C — park / lower priority

| # | Note |
| --- | --- |
| #16852 | Dependabot npm group — still has conflicts; comment `@dependabot rebase` or close |
| Copilot WIP swarm (~#17034–#17054) | Many parallel WIP drafts opened 2026-08-08; do **not** bulk-merge — park until each has green checks + human scope |

## Agent fix shipped in this PR (automatable error)

Live CI on #16929 failed **Allowlist check** / **Governance gates** with:

```text
UNKNOWN labels (not on allowlist):
  ready-to-merge
```

Root cause: after #16944 landed, fleet bots still apply bare `ready-to-merge` (and related routing labels), but the canonical allowlist only had nearby labels (`ready-to-implement`, `auto-merge`, `status:*` aliases) — not the bare fleet label.

**Fix (this PR):**

1. Add first-class labels: `ready-to-merge`, `work-request`, `has-conflicts`, `review:stuck` (still ≤80).
2. Add aliases for common fleet noise (`waiting-for-review`, `conflicts:needs-human`, `status:ready-to-merge`, …).
3. Fix malformed `policy:` YAML so the real `yaml` parser loads the file.
4. Teach `status:*` heuristic that `status:ready-to-merge` maps to `ready-to-merge` (not default `in-review`).

## Click-by-click human sequence (plain English)

### 1) Merge this audit/allowlist PR first

1. Open the PR for this branch on GitHub.
2. Wait until required checks are green.
3. Click **Ready for review** if it is still a draft.
4. Click **Merge pull request** → **Confirm merge**.
5. Success looks like: PR shows **Merged**, and `config/labels-allowlist.yml` on `main` contains `ready-to-merge`.

### 2) Merge #16929 (MCP shim) — highest remaining code fix

1. Open <https://github.com/midnghtsapphire/revvel-standards/pull/16929>.
2. Click the **Checks** tab. Confirm **Allowlist check** and **Governance gates** are green (they were red only because of the missing allowlist entry).
3. If still draft, click **Ready for review**.
4. Click **Merge pull request** → **Confirm merge**.
5. Success looks like: PR **Merged**; `mcp-servers/wr-control-plane` public `list_tools()` no longer throws on `main`.

### 3) Merge or park #16873 (docs)

1. Open <https://github.com/midnghtsapphire/revvel-standards/pull/16873>.
2. Skim `docs/merge-conflict-resolution.md`.
3. If you accept it: **Approve** (if required) → **Merge**.
4. If you do not want it: click **Close pull request** and leave a one-line reason.
5. Success looks like: PR **Merged** or **Closed**, and it is no longer in the open queue.

### 4) Inspect #16853

1. Open <https://github.com/midnghtsapphire/revvel-standards/pull/16853>.
2. Compare files to #16873 / anything already on `main` for `.editorconfig` / `.gitattributes` / conflict docs.
3. If duplicate → **Close as not planned**.
4. If unique and checks green → **Merge**.
5. Success looks like: only one conflict-policy story remains on `main`.

### 5) Close superseded sheaf PRs

1. Open <https://github.com/midnghtsapphire/revvel-standards/pull/16905>.
2. Comment: `Superseded by merged #16897 (JS bnatsheaf on npm test). Closing as duplicate.`
3. Click **Close pull request**.
4. Repeat for <https://github.com/midnghtsapphire/revvel-standards/pull/16895>.
5. Success looks like: only the merged JS sheaf remains; no dirty Python duplicate PRs open.

### 6) Close or park this WR (#16947)

1. Open <https://github.com/midnghtsapphire/revvel-standards/issues/16947>.
2. If Tier A is done (or consciously parked with a comment), click **Close issue**.
3. Optional: add Project field updates from `standards/GITHUB_PROJECT_FIELDS.md` via the Projects UI (human/PAT) — still not auto-applied.

## Gaps still open (honest)

1. **Project V2 fields** — catalog on `main` (`standards/GITHUB_PROJECT_FIELDS.md`); live field apply still human/PAT.
2. **Formal verdict GitHub Issues** — markdown exists under `wr/pending/formal/*`; optional issue filing remains opt-in.
3. **Notifications API 403** — optional App grant; not blocking merges.
4. **#16852 Dependabot conflicts** — needs `@dependabot rebase` or close.
5. **2026-08-08 WIP PR storm** — many draft Copilot PRs; treat as noise until scoped.

## Provenance

- Original audit: Grok (xAI) 2026-08-05, human_gate required  
- Live refresh + allowlist fix: Copilot coding agent 2026-08-08  
- Sources: GitHub PR/issue API, Actions job logs for #16929 allowlist failure  
- human_gate: **still required** for merges of other PRs
