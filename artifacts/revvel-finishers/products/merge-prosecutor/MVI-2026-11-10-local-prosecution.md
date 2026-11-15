# MVI — Local Merge Prosecutor, 2026-11-10

## 1. Context check

The previous shipping session supplied local deployment packaging and HULL exact-command execution. SYSTEM_STATE Infrastructure still describes historical Actions and pending infrastructure; it does not establish an installed local prosecution schedule. The current prosecutor has real conflict/duplicate detectors but its legacy entrypoint fetches GitHub metadata, uses random WR names and an unbounded shell test command. Root confirmed all 96 standards semantically read across the team before this increment. This increment implements the approved local execution path; it makes no production or schedule-installation claim.

## 2. Feature definition

An operator can invoke the existing Merge Prosecutor with a local JSON packet and a separately trusted policy, execute bounded fixed-argv checks, and receive an append-only JSON report with repeatable findings and deduplicated repair requests.

## 3. Dependency map

Node.js 22 and the existing product detectors are required. HULL SkillRouter can invoke the same CLI through its exact-command policy. No database, API route, GitHub token, provider account, remote service or environment secret is required. Input content cannot choose commands, paths or execution permissions.

## 4. Acceptance gates

- Product detector regression suite and new real subprocess tests pass.
- Missing input, malformed policy, unresolved conflict, failing test and timeout return nonzero with truthful reports where configured.
- Repeated findings reuse repair-request IDs; each execution creates a fresh receipt.
- Human review snippets remain advisory; event input cannot replace operator argv.
- Exclusive overlap lock prevents concurrent execution; no schedule is installed.
- Root owns integration, final required checks, PR and SYSTEM_STATE update. Production scheduling remains explicitly pending root review.

## 5. Out of scope

Scheduler creation/installation, cloud or model calls, GitHub execution/Apps, automatic deployment/merge/issue closure, AG-UI/A2UI implementation and assessed NIST compliance are outside this increment.

## 6. Files to touch

Extend products/merge-prosecutor/action/run-prosecutor.mjs with a local CLI branch; add sibling local-prosecution.mjs, product local tests, skills/merge-prosecutor/SKILL.md and append product README usage. Preserve legacy entrypoint and APIs. Root test entrypoint will include the new product tests.

## 7. Rollback plan

Stop calling the opt-in --local branch and retain the legacy entrypoint. No database migration or OS schedule change occurs. Root can comment out the new opt-in wiring with dated replacement notes if needed. Existing receipts remain intact. Rollback risk is low because local mode requires explicit arguments and operator policy.
