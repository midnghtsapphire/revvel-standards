# RESEARCH: Merge Prosecutor Analysis

**Status:** Draft
**Scope:** Review the existing codebase to determine if a GitHub action matching the user's "merge prosecute" requirements already exists.
**Requester:** User
**Date:** 2023-10-25
**Linked Idea / WR:**

---

## Context

The user requested a deterministic GitHub action to handle merge quality control. Requirements include checking for bad merges (duplicate lines/unresolved conflicts), verifying system stability via tests, detecting unimplemented review suggestions, and flagging dismissive comments (e.g., "not my error", "leave it") by creating Work Requests (WRs) for them. The user prefers a math/code-based deterministic solution rather than an AI agent.

## Key Questions

1. Does the repository already contain a GitHub action that meets the user's merge prosecution requirements?
2. Is the solution deterministic and formulaic (non-agentic)?
3. Does the action automatically generate WRs for dismissive comments and unimplemented review suggestions?

---

## Findings

### Does the repository already contain a GitHub action that meets the user's merge prosecution requirements?

Yes, the `products/merge-prosecutor` directory contains exactly the tool requested. It is a fully functional GitHub Action that:
- Detects unresolved Git conflict markers.
- Uses Levenshtein distance on consecutive added-line copies to detect keep-both merges.
- Runs test commands to ensure the merge didn't break unintended functionality.
- Scans pull request comments and diffs to ensure code suggestions were implemented.
- Creates WRs for dismissive comments and ignored suggestions.

### Is the solution deterministic and formulaic (non-agentic)?

Yes. `products/merge-prosecutor` explicitly states in its README: "Merge Prosecutor is a deterministic, mathematical GitHub Action that evaluates pull requests for merge quality." It uses regex matching, exact line comparisons, and Levenshtein distance calculations rather than relying on an LLM or agent, ensuring consistent and deterministic execution.

### Does the action automatically generate WRs for dismissive comments and unimplemented review suggestions?

Yes. The code in `products/merge-prosecutor/action/run-prosecutor.mjs` contains a `DISMISSIVE_REGEX` (`/\bnot my (error|bug|problem)\b|\bleave it\b|\bout of scope\b/i`) and checks all human review comments. If dismissive language is found, it automatically creates a Work Request using the `createWR` function. It also verifies if review suggestions (blocks of code in comments) are implemented in the diff, creating WRs if they are not.

---

## Actionable Takeaways

- [ ] Inform the user that the requested highly advanced, deterministic GitHub action (`merge-prosecutor`) is already fully implemented and available in the repository.
- [ ] No further development is necessary to meet the core requirements of this request.

## Sources

- [products/merge-prosecutor/README.md](products/merge-prosecutor/README.md) — Documentation of the Merge Prosecutor action.
- [products/merge-prosecutor/action/run-prosecutor.mjs](products/merge-prosecutor/action/run-prosecutor.mjs) — Source code implementing the deterministic checks and WR generation.

---

## Next Step

No further action — research answered the question; archive this doc.
