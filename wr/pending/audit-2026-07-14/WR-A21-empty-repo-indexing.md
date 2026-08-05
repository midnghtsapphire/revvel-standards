# [WR] P2 — Empty-repo indexing failure (#16071): root cause FIXED at data layer; hardening remains

## Title
[WR] Empty-repository handling for the indexer — seed applied, detection + retry to implement in the RIGHT codebase

## Description
**Root cause (verified 2026-07-14).** `midnghtsapphire/Governance-ape-cli-errors` had ZERO refs — no branches, no commits (`git ls-remote` empty). The indexer choked on it with a generic "indexing failed".

**FIXED at data layer:** seed README committed to that repo (commit 4d729fbf, creates main branch). Indexing of that repo should now succeed — re-run the indexer to confirm and then close the immediate failure in #16071.

**Hardening still to implement (from #16071's plan) — with one ROUTING CORRECTION:** the issue's implementation plan proposes `src/indexing/*.py` files, but revvel-standards is a Node repo with no src/indexing/ tree — the indexer lives in whichever service actually indexes repos (likely mindmappr or the OpenClaw platform). **Do not create Python indexing files in revvel-standards.** Route the implementation to the indexer's real codebase:
1. Pre-indexing validation: `git ls-remote` ref-count check — zero refs → specific `EMPTY_REPOSITORY` error (repo name + "push an initial commit or remove from index list"), never a generic failure.
2. Retry: re-index on push webhook (event-driven), NOT blind exponential backoff polling — aligns with the WR-A8 compute-budget rule.
3. Tests: empty repo, repo-gains-content, auth-failure, rate-limit — each producing a DISTINCT error code (WR-A17 taxonomy: different diseases get different labels).

**Acceptance.** Indexer run on Governance-ape-cli-errors succeeds post-seed; a synthetic zero-ref repo produces the EMPTY_REPOSITORY message; push-event re-index works; #16071 closed with the routing correction noted.

## Agent learning note
When a system chokes on bad data, fix the DATA first (30-second seed) while the code hardening proceeds — the failure stops today, the vaccine lands this week. And read the target repo before accepting an implementation plan: proposing Python trees in a Node repo means the plan was written against an imagined codebase. Verify the code's real home before dispatching builders.

Assignee: mindmappr + Dragnet | Labels: P2, indexing, data-fix-applied, issue-16071
