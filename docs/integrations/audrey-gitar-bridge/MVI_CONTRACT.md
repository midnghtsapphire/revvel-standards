# Saved-reply Gitar bridge integration contract

## 1. Context check

Audrey confirmed on 2026-11-14 UTC that `midnghtsapphire/revvel-standards` is both the governance and execution repository. The original standalone bundle has 26 passing offline tests. No bridge installation, Facebook Page authorization, workflow dispatch, or public post has occurred. Existing production observations in `SYSTEM_STATE.md` are preserved and do not establish the bridge's connected readiness.

The canonical call chain uses `wr-pr-creation.yml`, with dispatch input `issue_number`, for the WR-document PR step. Actual source is manual-triggered and gated by existing repository cloud/coding-agent switches. The existing saved-reply router and `agent_requested`/`agent_status` events own comment intake. Repository secrets/variables metadata was not readable through the current GitHub connection; missing access is not proof that credentials or flags are absent.

## 2. Feature definition

Audrey can use the saved reply `/audrey run` on an issue or PR to request Gitar-associated work through the existing governance router. Issues reuse the existing WR-to-PR workflow; PRs send the trusted Gitar task. GitHub-visible Gitar work is mirrored into linked WR/PR discussions. A current-head completion summary produces an integrity-protected draft for Facebook Page `audreybuildsai`, whose exact public message and numeric Page destination are reviewed before posting.

## 3. Dependency map

The integration requires the existing `.github/agent-router.json`, `.github/scripts/agent-command-router.mjs`, agent-request delivery/status protocol, `wr-pr-creation.yml`, and GitHub APIs. Gitar installation and bot authorization remain separate. Facebook publishing requires a confirmed numeric Page ID, official Page token/permissions, supported Graph version, and configured required reviewers in `facebook-publication`. Slack notifications remain optional and require a chosen authorized webhook. No database, local browser cookies, new public service, or direct LLM API is needed.

The selected WR workflow creates a document/skeleton rather than product code. Existing viability/research/implementation/launch routing remains authoritative; the bridge does not set approval/reset/delivery labels or bypass those switches. A bridge-only draft-PR and no-direct-Jules dispatch option is required before issue launches are enabled.

## 4. Acceptance gates

Local acceptance requires the bridge's offline tests, existing router tests, regression tests for exact commands and request provenance, canonical WR input translation/draft protection, and targeted workflow lint/YAML validation. Repository guards must remain unchanged and be exercised where their required files are available. Remote acceptance requires an owner-reviewed draft PR and later, separately authorized connected configuration; local passing tests do not prove deployment or public posting.

The existing required CI decides whether the PR can be reviewed for merge. Root/production status is never reported green from partial checks. No merge, public Facebook post, or automation activation is performed by this integration task.

## 5. Scope boundary

This is an internal script integration, not a new app or a replacement fleet pipeline. No new monitor/fallback chain, paid model call, production deployment, token extraction, arbitrary comment-code execution, repository-wide refactor, or UI rebuild is part of this change. The original standalone bundle and research artifacts are preserved as dated handoff history rather than overwritten.

## 6. Files to touch

New implementation files belong under `scripts/audrey-gitar-bridge/`; new docs and original artifacts under `docs/integrations/audrey-gitar-bridge/`. New Gitar observer/adapter, review relay, and protected Facebook publisher workflow files belong under `.github/workflows/`. Existing registry, gateway exclusion, command-window CI, and selected WR workflow receive narrowly scoped additive extensions. Documentation, state, and memory updates are appended to existing files; no root scaffold replaces existing work.

## 7. Rollback and review plan

All changes go to an additive task branch and draft PR for Audrey's review; the agent does not merge. No current main-branch settings are changed, so leaving the PR unmerged preserves current execution. If retirement is later requested, comment out the integration in place with a dated owner-approved note and disable its switches; do not delete original work. Any uncertain Facebook POST is inspected before a retry; a persistent pending receipt marker prevents blind automatic re-publication. No database migration is involved.
