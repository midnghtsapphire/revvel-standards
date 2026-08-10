# Conflict Resolution Standard

> **Prime Directive:** $10k/month → $10M in 3 years. Every automation must reduce owner toil, not add to it.

## 1. Purpose

This standard defines how merge conflicts on pull requests are detected, triaged, and resolved in this repository. The goal is **zero manual conflict resolution** for mechanical patterns, and **maximum visibility** for the maintainer when human judgment is required.

## 2. Trigger Surface

The conflict-helper workflow runs on:

- `pull_request` events (`opened`, `synchronize`, `reopened`, `labeled`)
- `issue_comment` events matching `/resolve-conflicts` or `/resolve` on a PR (see §8)
- Manual `workflow_dispatch` with a `pr_number` input

## 3. Phases

### Phase 1 — Annotation
Detect merge state via `gh pr view`. If `MERGEABLE=CONFLICTING`, post/update a sticky comment on the PR listing conflicted paths and the base/head SHAs.

### Phase 2 — Mechanical Resolver
Attempt to auto-resolve conflicts matching known patterns:

- **Version bumps** in `package.json`, `pyproject.toml`, `Cargo.toml` → take the higher semver.
- **Additive-only blocks** in `CHANGELOG.md`, `CONTRIBUTORS.md` → union both sides.
- **Import-order-only** conflicts in Python/TS → sort and deduplicate.

If every conflict matches a pattern, commit the resolution with message `chore(conflict): auto-resolve mechanical conflicts` and push to the PR branch.

### Phase 3 — Jules Handoff
If Phase 2 cannot resolve all conflicts, dispatch `jules-coding-agent.yml` with `issue_number=<PR number>` (PRs and issues share GitHub's number space).

### Phase 4 — Surrender
If Phase 3 is unavailable or errors, apply `conflicts:needs-human` and stop. The maintainer takes over.

## 4. Outcome Labels

Exactly one of these is applied per run:

| Label | Meaning | Owner action |
|---|---|---|
| `conflicts:auto-resolved` | Phase 2 fixed everything, follow-up commit pushed | Wait for CI, merge |
| `conflicts:needs-jules` | Phase 3 dispatched, waiting on Jules PR | Wait for Jules |
| `conflicts:needs-human` | Workflow surrendered | Resolve manually |

Filter PRs needing your attention:

```
is:pr is:open label:conflicts:needs-human
```

## 5. Sticky Comment Anatomy

The sticky comment is identified by the HTML marker `<!-- conflict-helper:sticky -->` and always contains, in order:

1. **Outcome block** — emoji + one-line status + "your job" line.
2. **Phase details** (collapsed `<details>`) — exit codes, dispatch status, decision.
3. **Conflicted-paths table** (from Phase 1).
4. **Base/head SHA provenance.**

## 6. Idempotency

Re-running the workflow on the same PR must not create duplicate comments or duplicate commits. The sticky comment is edited in place; Phase 2 checks `git diff --cached` before committing.

## 7. Scaffolding Ban

Per `AGENTS.md`, no phase may ship as a stub. Every phase must perform a real action or explicitly hand off. Placeholder `echo "would do X"` steps are forbidden.

> **Known violation:** `jules-coding-agent.yml` currently echoes and opens an empty PR. Tracked in #17248. Until fixed, Phase 3's dispatch is best-effort.

## 8. Manual Slash-Command

Maintainers (and users with `OWNER`, `MEMBER`, or `COLLABORATOR` association) may post either of these as a PR comment to re-run the workflow on demand:

- `/resolve-conflicts`
- `/resolve`

Use this after force-pushing a branch, after a base-branch merge, or if a previous run surrendered and you want to retry after the mechanical resolver's patterns are widened.

Comments from non-privileged authors are ignored (no error, no reaction).

## 9. Interpreting the Outcome Block

| Emoji | Status | What it means | Your next step |
|---|---|---|---|
| ✅ | Auto-resolved | Every conflict matched a mechanical pattern; commit pushed | Wait for CI, then merge |
| 🟡 | Handed to Jules | Non-trivial conflicts dispatched to `jules-coding-agent.yml` | Wait for Jules PR/commit |
| 🔴 | Needs human | Workflow surrendered; no automation can safely proceed | Resolve manually in your editor |

## 10. When the Workflow Surrenders

A 🔴 outcome means one of:

- Phase 2 saw a conflict pattern outside its allowlist (e.g. logic in a function body).
- Phase 3 dispatch failed (network, permissions, or `jules-coding-agent.yml` errored).
- The PR branch is protected or the workflow lacks push permission.

Expand the **Phase details** block in the sticky comment to see which phase failed and its exit code. File a WR against the standard if you find a mechanical pattern that recurs — the resolver's allowlist should grow to cover it.

## 11. Extending the Mechanical Resolver

New patterns are added via PR to `.github/workflows/conflict-helper.yml`. Each new pattern must:

1. Be **provably deterministic** — same inputs → same output, no LLM calls.
2. Have a **test fixture** under `tests/conflict-fixtures/` demonstrating a before/after.
3. Be **additive-only or version-monotonic** — never delete lines from either side without an explicit union rule.
4. Ship with a one-line entry in §3 Phase 2 above.

Patterns that require semantic understanding (function bodies, config semantics, schema migrations) belong in Phase 3, not Phase 2.
