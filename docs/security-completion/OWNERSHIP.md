# Durable ownership and completion

Owner authorization: Audrey, 2026-11-15. Scope: existing PR Lifecycle and agent monitor/fallback call chain; draft PR only, owner merges. This document is the durable plan and handoff; chat memory is not an input.

## Implementation plan

1. Add a versioned ownership record and append-only `wr/agents/ownership.jsonl` journal. Bind owner identity/platform/GitHub login to task ID, WR/ref/PR, outcome type and product ID where applicable, tests, delivery and outcome receipts, heartbeat, lease, attempts, blocker owner and exact next action.
2. Publish an executable Node session-start/transition CLI using existing authenticated `gh`, fully paginated open PRs and PR comments, plus default-branch registry and the local journal. Return prioritized continuations of owned work, never create new tasks or execute commands from PR bodies.
3. Claim/resume consumes a bounded attempt and lease; heartbeat requires the same live lease. Completion requires nonempty passing test receipts, artifact URLs/paths, release/deployment shape and outcome receipt. Validation is not a network/live verification request.
4. Extend existing lifecycle entry points with metadata-only proof gates and deduplicated stale/empty/missing-record alerts. Trusted default-branch code only; pin checkout to a verified full SHA. Preserve retired code/commented blocks. No PR candidate execution with write credentials and no new scheduler, automatic merge or close.
5. Add pure tests with mocked GitHub/gh. Append a binding session-start requirement to AGENTS.md. Document wrapper integrations and inactive Manus review continuation proposal.

## Activation and blockers

Initial plan persisted before implementation. Implementation/test/PR receipts will be appended below. No external billing changes, purchases, new scheduled jobs or paid API calls are authorized. Manus API dispatcher remains documentation-only: the parent runtime has no usable key. Existing `agent-monitor.yml` cost-frozen schedule is not enabled by this change.

BNAT: the stale committed BIOME feed has no `Manus` stalk (imprint reports known=false), global energy 0 and no obstructions. The registered `sentinel` monitoring-role imprint succeeds, energy 0. No feed/generated files are modified or included.
