# [WR] P2 — Broken internal links in WR_TRACKER.md and README.md

## Title
[WR] Fix 5 broken relative links + add link-check to markdown heal

## Description
**Problem.** Broken targets: WR_TRACKER.md → /docs/WEEKLY_RESEARCH_PROCESS.md, /docs/AGENTS.md, /promptforproject.md, WR_TEMPLATE.md (wrong relative path); README.md → .github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml. Agents following SSOT links hit 404s and improvise — a known drift source.

**Fix.** Correct paths (AGENTS.md and promptforproject.md are at repo root; WR_TEMPLATE.md is root not wr/). Extend scripts/heal-markdown.js to verify relative link targets exist.

**Acceptance.** Link checker green across root + wr/ md files.

## Agent learning note
Docs *are* wiring in an agent fleet — a broken link is a broken function call. Treat SSOT link integrity as a CI-testable invariant.

Assignee: Jules | Labels: P2, docs, wiring
