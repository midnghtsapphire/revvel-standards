# [WR] Finisher-0: Bootstrap revvel-finishers

## Problem
The finishing and fixing operations are mingled with governance and agent logic. We need a dedicated script-first finisher fleet and repo to wire code, fix bugs, and finalize assets.

## Outcome
Seed `revvel-finishers` repo with SYSTEM_PROMPT, Grok PR review action, memory logs, and basic script probes.

## REVENUE_GATE
Enables all downstream commerce paths by separating finishers from standards. Unblocks Finisher-1.

## Research Gate
Web MM search first, use scripts > agents, cap budget.

## Acceptance Criteria
- `revvel-finishers` repo exists and is seeded with the initial artifacts.
- Grok PR Review action is configured.
- `SYSTEM_PROMPT.md`, `LEARNINGS.md`, `RESEARCH_LOG.md` are present.

## Dependencies
GitHub App access to new repo.

## Effort
Low

## Next WR
02-WR-Finisher-1-produce-dist-sellables.md
