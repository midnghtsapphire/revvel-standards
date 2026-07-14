# CLAUDE.md — Operating Notes for Automated Agents

This file is the entry point for AI coding agents (Claude, OpenRouter,
OpenHands, etc.) working in this repository. It is intentionally short and
points at the durable references in `standards/` and `learnings.md`.

## Prime Directive

Grow revenue from **$10k/month → $10M total by year 3**, in phases:

1. **Phase 1 — $10k/month** (Month 1–6)
2. **Phase 2 — $30k/month** (Month 6–18)
3. **Phase 3 — $100k/month** (Month 18–30)
4. **Phase 4 — $10M total** (Month 30–36)

Focus areas: Polar.sh (GitHub funding), OSINT tools, automated product
pipeline. Every PR should either move a metric or protect a metric.

## Green Main Standard

`main` must stay green. See `standards/GREEN_MAIN_STANDARD.md`.
If your change would break `main`, split it or gate it behind a flag.

## How to audit and self-heal

Before filing bug-fix PRs in bulk, read
`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`. It documents:

- the parallel-read-only audit method (with file:line citations),
- the triage step (not every finding is an immediate PR),
- the isolated-worktree fix protocol with regression tests, and
- an eight-entry fix-pattern catalog for the most recurrent bugs.

When a fresh incident matches a catalog entry, apply the catalogued fix
directly — do not re-derive it.

## Recurring gotchas

These are the patterns that bite repeatedly. Each has a fuller writeup in
the audit playbook or in `learnings.md`.

1. **`removeLabel` races** — `github.rest.issues.removeLabel` throws on
   404. Wrap it and swallow only `error.status === 404`. Do not
   blanket-catch.
2. **`allowError` on internal helpers** — internal API wrappers must
   expose `allowError` / `expectedStatuses` so callers can distinguish
   "expected miss" from "real failure." Pass it explicitly at the call
   site with a comment naming the expected condition.
3. **Default `GITHUB_TOKEN` on agent PRs** — the default token cannot
   trigger downstream `on: pull_request` runs. Agent-authored PRs must
   use a bot PAT or GitHub App installation token, or their CI will hang
   pending forever.
4. **Secrets on argv** — passing secrets as CLI arguments leaks them to
   `ps auxww` and to any `set -x` trace. Pass on stdin
   (`printenv SECRET | tool --stdin`) or via a file descriptor.
5. **Bash bare array variables** — `"$ARR"` expands only `${ARR[0]}`.
   Use `"${ARR[@]}"`. Keep shellcheck in CI to catch this.
6. **Exit codes are not resolution state** — `exit 0` from a subcommand
   only means the tool did not crash. After the action, **assert the
   desired post-condition explicitly** (re-query the API, verify the
   label is gone, confirm the file exists) and exit non-zero if the
   post-condition is not met. See catalog entry #6 in the audit playbook
   (PR #15826).
7. **`nosemgrep` suppression adjacency** — the suppression comment must
   be on the **same line** as, or the line **immediately preceding**, the
   offending code. No blank line, no unrelated comment, no formatter
   reordering in between, or Semgrep will still fire the rule. Prefer
   same-line placement. See catalog entry #7 in the audit playbook
   (PR #15825).

## Where the memory lives

- `learnings.md` — chronological per-incident notes. Write here first
  when something new breaks.
- `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — audit methodology
  and the recurrent-pattern fix catalog.
- `standards/GREEN_MAIN_STANDARD.md` — the invariant that `main` stays
  green.
- `CLAUDE.md` (this file) — fast-path index into the above.
