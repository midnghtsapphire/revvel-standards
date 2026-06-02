# WR: [WR] Pin actions/github-script to full commit SHA in third-party audit workflow

**Issue:** #14003  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context
The newly introduced third-party action audit workflow references `actions/github-script@v7`, a mutable floating tag that can be silently redirected to arbitrary code. This is inconsistent with the repository's established supply-chain security standard, which mandates full commit SHA pinning for all action references, and also lags two major versions behind the `v9` release used throughout the rest of the codebase.

Mutable version tags such as `@v7` do not guarantee reproducibility or integrity — a compromised or updated tag can point to different code without any visible change in the workflow file. The repository already enforces SHA-pinned action references via `workflow-action-ref-audit.yml`, making this reference both a policy violation and a supply-chain risk. Furthermore, `v7` is two major versions behind the currently adopted `v9`, meaning the workflow misses security patches, bug fixes, and API improvements available in the newer release. All other workflows in the repository follow the pattern of pinning to an immutable commit SHA with an inline version comment for readability.

## Summary
The `.github/workflows/third-party-action-audit.yml` workflow uses an outdated and unpinned mutable tag `actions/github-script@v7` (specifically `v7.0.1`). This violates the supply-chain security policy of full commit SHA pinning. The reference needs to be updated to the approved `v9.0.0` SHA (`3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0`).

## Objective
Pin `actions/github-script` to the full v9 SHA in `third-party-action-audit.yml`.

## Required Bundle
- `.github/workflows/third-party-action-audit.yml`

## Definition of Done
1. Identify the full commit SHA for the latest `actions/github-script` v9 release.
2. Replace `actions/github-script@v7` (or `v7.0.1` SHA) with the full SHA pin followed by an inline version comment: `actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3 # v9.0.0` in `.github/workflows/third-party-action-audit.yml`.
3. Verify the updated workflow passes the existing `workflow-action-ref-audit.yml` check.

## Validation
- Ensure that `workflow-action-ref-audit.yml` runs successfully.
- Verify that `actions/github-script` is correctly pinned using `grep -n "actions/github-script@" .github/workflows/third-party-action-audit.yml` and returning the correct SHA.

## Blockers
None.

