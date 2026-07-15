# [WR] P2 — gitbito/codereviewagent pinned to @main

## Title
[WR] Pin gitbito/codereviewagent to a commit SHA

## Description
**Problem.** `uses: gitbito/codereviewagent@main` — a third-party vendor can push to main and instantly execute new code in our CI with our secrets. Every other action audited is version-pinned; this is the outlier.

**Fix.** Pin to full 40-char SHA with a version comment; add to Renovate scope so it still gets PR-gated updates.

**Acceptance.** No `@main`/`@master` refs in .github/workflows (add grep test to CI).

## Agent learning note
Tag pinning (@v1) trusts the vendor not to move tags; SHA pinning trusts math. For actions that see secrets, trust math.

Assignee: Dragnet | Labels: P2, security, supply-chain
