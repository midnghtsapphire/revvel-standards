# Agent security boundaries

**Owner:** RulesSteward (Grok Bot, for Audrey Evans) · **Tracking:** [brain-dump #14](https://github.com/Freedom-Angel-Corp/brain-dump/issues/14) · related [#7](https://github.com/Freedom-Angel-Corp/brain-dump/issues/7), [#15](https://github.com/Freedom-Angel-Corp/brain-dump/issues/15), [#18](https://github.com/Freedom-Angel-Corp/brain-dump/issues/18)

Builds on — does not replace — [`GITHUB_AUTH_TOKEN_MATRIX.md`](./GITHUB_AUTH_TOKEN_MATRIX.md) and [`SECURITY.md`](./SECURITY.md) (plus [`INDIRECT_PROMPT_INJECTION_STANDARD.md`](./INDIRECT_PROMPT_INJECTION_STANDARD.md)). Hard rule unchanged: agents draft; humans review and merge.

<!-- 2026-11-06 Cursor Cloud (Grok), PR #18260: previous heading "1. The token role is the boundary" and the paragraph under it overclaimed that the token role alone is the boundary. Original kept here; live wording follows. -->
<!-- Prompts, AGENTS.md rules, and tool catalogs are guidance, not enforcement. What an agent can actually do is what its token/installation role allows. Design every lane assuming the agent *will* attempt anything its token permits. -->

## 1. Token and app installation set the maximum capability

Prompts, AGENTS.md rules, and tool catalogs are guidance, not enforcement. The token or GitHub App installation sets the **maximum** capability. Rulesets, branch protection, required reviews, and environment approvals also enforce limits inside that maximum. Design every lane assuming the agent will attempt anything those controls still permit.

## 2. Untrusted agents: Triage only

- Untrusted or visiting agents get **Triage** (or Read) — never **Write**, Maintain, or Admin.
- Triage permits labels/issues/comments; it cannot push, merge, or edit workflow files.
- For fine-grained tokens / App installs: keep **Workflows** permission **off**. A token with Workflows can rewrite CI and escalate itself.
- Elevated paths (`ADMIN_GITHUB_TOKEN`, auto-approve/auto-merge workflows) stay human-gated per the matrix.

## 3. One writer to git; loop cap 3

- Exactly **one** agent lane holds Contents write for a given branch at a time; others propose via issues/comments/drafts.
- Any automated fix/retry loop stops after **3** iterations and escalates to a human (WR or issue comment). No unbounded self-healing.

<!-- 2026-11-06 Cursor Cloud (Grok), PR #18260: previous heading "4. Leaked secrets: rotate first, then purge" and step 2 ("Then purge from history (human-run, with backup; respects NEVER DELETE by being owner-approved).") treated a history purge as the normal next step. That conflicts with AGENTS.md NEVER DELETE. Original kept here; live rule follows. -->

## 4. Leaked secrets: rotate and revoke first

Governing rule: [`AGENTS.md`](../AGENTS.md) **OWNER RULE — NEVER DELETE, NEVER REWRITE** (Audrey Evans, 2026-10-30). A history rewrite is not the default, and an agent must not do one.

1. **Rotate/revoke** the credential at its issuer. This step is first and mandatory. Rewriting history does not un-leak a credential that is already exposed.
2. A history rewrite is an **owner-approved incident exception only**. Audrey Evans must explicitly approve it. Before any rewrite, back up the original refs (for example a backup tag or branch) in a private location. That backup must never contain the plaintext secret in a public place.
3. Record the incident (no secret values) in the ledger or issue.

Scanning: run **Gitleaks** on **CircleCI or a self-hosted runner**. Do **not** add a new GitHub-hosted Actions workflow for this.

## 5. Verification status (2026-11-05, read-only checks)

| Repo | Check | Result |
|---|---|---|
| midnghtsapphire/revvel-standards | `collaborators` (affiliation=all) | `midnghtsapphire` admin; `lopezcaresse-wq` **write** (User account) |
| Freedom-Angel-Corp/brain-dump | `collaborators` | `midnghtsapphire` admin only |

**Verified:** no bot/agent-type *user* collaborators hold roles on either repo.
**Unverified:** GitHub App installation permissions (e.g. Grok connector, Copilot SWE Agent, `github-actions[bot]`) are not listed by the collaborators API; whether `lopezcaresse-wq` is used by an agent; org-level team grants; ruleset bypass actors (see Discussion #18252 for the Copilot bypass finding). `lopezcaresse-wq` Write should be reviewed by the owner against §2 — no permissions were changed.

**Pending for Audrey (open owner action):** `lopezcaresse-wq` still has **Write** on `midnghtsapphire/revvel-standards`. That access is unchanged. Audrey decides whether it stays. This document does not change permissions.
