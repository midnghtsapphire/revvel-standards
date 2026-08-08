# [WR] Finisher-0: Bootstrap revvel-finishers

## Problem
Finishing and fixing operations are mingled with governance and agent logic. Commerce last-mile needs a dedicated script-first finisher seed.

## Outcome
`artifacts/revvel-finishers/` (or standalone repo) seeded with SYSTEM_PROMPT, memory logs, audit/organize scripts, and Grok PR review workflow.

## REVENUE_GATE
- Buyer: internal operator (Audrey / finishers)
- Channel: unblocks Gumroad path
- Price: enables all downstream SKUs
- First-$ signal: Enables all

## Research Gate
Web/MM search first; scripts > agents; append RESEARCH_LOG.

## Acceptance Criteria
- [x] Seed package present under `artifacts/revvel-finishers/`
- [x] `scripts/audit-404s.sh` and `scripts/organize-chat.sh` executable
- [x] SYSTEM_PROMPT + ORDERED_WRS + memory files present
- [ ] Optional: standalone GitHub repo created when App access allows

## Dependencies
GitHub App access if pushing a standalone repo.

## Effort
Low

## Next WR
02-WR-Finisher-1-produce-dist-sellables.md
