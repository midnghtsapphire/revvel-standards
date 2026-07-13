# Fork-Audit — `BeksOmega/jules-action` (Score 44 / Band C)

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Audited — **keep as-is, no upstream action (mirror issue only)**
**Date:** June 14, 2026
**Upstream:** [`BeksOmega/jules-action`](https://github.com/BeksOmega/jules-action)
**Source:** Fork-Audit Bot mirror issue (`scripts/fork-audit-bot.js`) — closes
`midnghtsapphire/revvel-standards#14524`.
**Related:** [`FORK_AUDIT_BOT_PROCESS.md`](./FORK_AUDIT_BOT_PROCESS.md) ·
[`PROVENANCE_STANDARD.md`](./PROVENANCE_STANDARD.md) ·
[`THIRD_PARTY_ACTION_AUDIT.md`](./THIRD_PARTY_ACTION_AUDIT.md) ·
[`CONFLICT_RESOLUTION_STANDARD.md`](./CONFLICT_RESOLUTION_STANDARD.md) ·
[`JULES_AUTO_REVIEW_ROUTING.md`](./JULES_AUTO_REVIEW_ROUTING.md) ·
[`../fork-audit/candidates.json`](../fork-audit/candidates.json)

---

## 0. TL;DR — what to actually do

- **Recommended action: mirror issue only — no upstream PR or issue.** The score
  (44) lands in **Band C** (40‑69), which the
  [Fork-Audit Bot rubric](./FORK_AUDIT_BOT_PROCESS.md#scoring-rubric) defines as
  "mirror audit issue only" — bands A/B are the only ones that generate upstream
  contributions. This document is the receipt for that decision.
- **Keep the pin.** `BeksOmega/jules-action@v1.0.0` is already wired in and
  working across the Jules lane; no version bump or replacement is warranted at
  score 44, and the upstream had a recent push (2025‑11‑17), so it is not stale.
- **No new secrets, agents, or cost.** The action is already paid for via the
  existing `JULES_API_KEY`; this audit changes nothing operationally.
- **One standing watch item:** the action is **single-maintainer** and pinned to
  a **mutable tag** (`@v1.0.0`) rather than a commit SHA. That is the only
  finding worth tracking — see §4. It is consistent with the existing
  [`THIRD_PARTY_ACTION_AUDIT.md`](./THIRD_PARTY_ACTION_AUDIT.md) treatment of the
  `BeksOmega/*` (Google Jules) family, so no change is forced here.

---

## 1. Rubric breakdown (as scored)

Deterministic scoring from [`scripts/fork-audit-bot.js`](../scripts/fork-audit-bot.js),
documented in [`FORK_AUDIT_BOT_PROCESS.md`](./FORK_AUDIT_BOT_PROCESS.md#scoring-rubric).

| Signal | Points | Note |
|---|---:|---|
| Stars (÷100, cap 20) | 0.1 | 11 stars — niche action |
| Forks (÷50, cap 10) | 0.0 | 0 forks |
| Issue health (cap 10) | 10.0 | Only 2 open issues — healthy |
| OSS license (cap 10) | 10.0 | MIT |
| Recency of push (cap 15) | 5.0 | Last push 2025‑11‑17 (≤ 365 d) |
| Strategic value (×2, cap 20) | 14.0 | `strategic_value: 7` in `candidates.json` |
| Goal-tag alignment (cap 15) | 5.0 | tags `ai, jules, automation` |
| Archived penalty | 0.0 | Not archived |
| Fork-of-fork penalty | 0.0 | Not a fork |
| Disabled penalty | 0.0 | Not disabled |
| **Total (clamped 0‑100)** | **44** | **Band C** |

**Why it does not reach Band B (≥ 70):** the low star/fork counts (0.1 + 0.0) and
the recency bucket (5.0, because the last push is older than 90 days) cap the
ceiling. Strategic value and license/issue-health carry the score; popularity
metrics do not. That is the intended behaviour — a low-popularity but
operationally-critical dependency is correctly classified as "track, don't
contribute upstream".

## 2. Upstream snapshot

| Field | Value |
|---|---|
| Stars | 11 |
| Forks | 0 |
| Open issues | 2 |
| License | MIT |
| Last push | 2025‑11‑17T05:10:18Z |
| Archived | No |
| Default branch | `main` |
| Maintainer | Single maintainer (BeksOmega) |

## 3. What it is and how Revvel uses it

`BeksOmega/jules-action` is the GitHub Action that invokes Google's **Jules**
coding agent from a workflow: given a prompt (and optional branch / commit
context) plus a `jules_api_key`, it dispatches the task to Jules, which pushes
commits back rather than only commenting.

It is the entry point of the **Jules lane** in this repo and part of the wider
`BeksOmega/*` family already catalogued in
[`PROVENANCE_STANDARD.md`](./PROVENANCE_STANDARD.md):

| Workflow | Action used | Role |
|---|---|---|
| [`jules-invoke.yml`](../.github/workflows/jules-invoke.yml) | `BeksOmega/jules-action@v1.0.0`, `BeksOmega/on-unblocked@v1.0.0` | Invoke Jules on `workflow_dispatch`, on new `[WR]` / `jules` / `deep-research` / `weekly-research` issues, and on newly-unblocked issues |
| [`wr-pr-creation.yml`](../.github/workflows/wr-pr-creation.yml) | `BeksOmega/jules-action@v1.0.0` | Promote a WR issue into a Jules-authored PR |
| [`jules-feedback.yml`](../.github/workflows/jules-feedback.yml) | `BeksOmega/jules-comms@v1.0.0` | Feedback lane |
| [`jules-pr-comment.yml`](../.github/workflows/jules-pr-comment.yml) | `BeksOmega/jules-publish@v1.0.0` | Publish lane |

Every invocation is **guarded** — each job verifies `JULES_API_KEY` is set and
emits a `::warning::` then skips when it is absent (see the "Verify
JULES_API_KEY is configured" steps in `jules-invoke.yml`), so a missing key
degrades gracefully instead of failing the run. This matches the
[`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) "secrets are read-only,
all-guarded inputs" invariant.

### 3.1 Good

- **MIT-licensed** and permissive — no licence friction for the way we consume it.
- **Healthy issue backlog** (2 open) — not an abandoned project.
- **Recent activity** (pushed 2025‑11‑17) — still maintained.
- **Operationally proven** on this repo — the
  [`CONFLICT_RESOLUTION_STANDARD.md`](./CONFLICT_RESOLUTION_STANDARD.md) notes the
  "BeksOmega lane" handles small-scope code edits well, and it is the canonical
  active Jules invoke path (the alternate `sanjay3290/jules-pr-reviewer@v1` lane
  was silenced in #13974 as broken).
- **Zero marginal cost** — reuses the already-paid `JULES_API_KEY`.

### 3.2 Bad / watch-outs

- **Low popularity** (11 stars, 0 forks) — small bus factor and limited
  community vetting. Acceptable because it is a thin dispatch wrapper around
  Google's Jules API, not a large dependency we embed.
- **Single maintainer** — supply-chain concentration risk (the standing finding
  in §4).
- **Mutable tag pin** (`@v1.0.0`) — a moved tag would change the code we run
  without a diff. See §4.

## 4. The only standing finding — pinning

The action is referenced by **mutable tag** (`@v1.0.0`) in every workflow:

```text
.github/workflows/jules-invoke.yml      uses: BeksOmega/jules-action@v1.0.0   (x3)
.github/workflows/wr-pr-creation.yml    uses: BeksOmega/jules-action@v1.0.0
.github/workflows/jules-feedback.yml    uses: BeksOmega/jules-comms@v1.0.0
.github/workflows/jules-pr-comment.yml  uses: BeksOmega/jules-publish@v1.0.0
```

For a single-maintainer third-party action, SHA-pinning is the hardening move.
However, this is **explicitly out of scope for a Band C mirror audit** and is
already governed org-wide by
[`THIRD_PARTY_ACTION_AUDIT.md`](./THIRD_PARTY_ACTION_AUDIT.md), which classifies
`BeksOmega/*` (the Google Jules family) under the "known org publisher with
multiple maintainers" lane ("warn if no release > threshold; don't auto-flag").
This audit records the finding so a future hardening sweep can decide on
SHA-pinning consistently across all four `BeksOmega/*` actions at once, rather
than touching one in isolation.

**No code change is made by this audit.**

## 5. Decision

| Question | Answer |
|---|---|
| Open an upstream PR? | **No** — Band C generates no upstream contribution. |
| Open an upstream issue? | **No** — same reason; the 2 open issues are healthy. |
| Bump / replace the pin? | **No** — `@v1.0.0` works and is recently maintained. |
| Track anything? | **Yes** — single-maintainer + mutable-tag pin, deferred to the org-wide third-party action hardening sweep (§4). |
| Net cost / new secrets | **$0 / none.** |

This is logged so the next Fork-Audit sweep does not re-litigate `jules-action`
from scratch; the candidate stays in
[`../fork-audit/candidates.json`](../fork-audit/candidates.json) with
`strategic_value: 7` and the `ai, jules, automation` goal tags.

---

_Generated as the resolution of the `BeksOmega/jules-action` Fork-Audit mirror
issue. See [`FORK_AUDIT_BOT_PROCESS.md`](./FORK_AUDIT_BOT_PROCESS.md) for the
end-to-end bot and routing contract._
