# Stop Bad Merges Before They Break Production

**Merge Prosecutor** is a deterministic GitHub Action that enforces code merge quality using mathematical block analysis.

## The Problem
Merges often go wrong when developers:
- Keep both "current" and "incoming" blocks during a conflict resolution.
- Leave unresolved `<<<<<<< HEAD` markers in the code.
- Ignore test suite failures introduced by the merge.
- Dismiss bugs in pull request comments ("not my error", "leave it").

## The Solution
Merge Prosecutor acts as a gatekeeper. It mathematically analyzes the merge diff to find duplicate blocks using Levenshtein distance, detects unresolved markers, runs your test suites, and scans review comments to automatically open Work Requests when developers dismiss issues.

## Get Started
Start for free, or upgrade to Pro for $29/month to get advanced duplication detection and auto-WR generation.

[Get Merge Prosecutor on GitHub Marketplace](https://github.com/marketplace/actions/merge-prosecutor)
