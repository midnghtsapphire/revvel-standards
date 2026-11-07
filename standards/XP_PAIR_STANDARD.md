# XP Pair Standard

Every implementation job is done by exactly two programmers. Both use the same model ID.
They share one lease. Scale by adding pairs. A review twin may use a different model only
after the pair has opened a draft.

**Status:** Active
**Authored:** 2026-11-06 (America/Denver), Cursor Cloud agent, at Audrey Evans's direction via
PromptSteward. Standing pair rule: Audrey Evans, 2026-11-03, as recorded in orchestrator
non-negotiable B.

## Sources

- revvel-hail `docs/orchestrator/ORCHESTRATOR_PROMPT.md` ([revvel-hail#3](https://github.com/midnghtsapphire/revvel-hail/pull/3)) — non-negotiable B (two programmers, identical model ID, one branch lease, scale by more pairs, review twin after draft) and the swarm-topology and model-policy sections. This repo's `docs/orchestration/xp-swarm-orchestrator-prompt.md` is only a pointer to that file.
- `MODEL_CONFIG.md` — coding lane versus review lane, Opus twins, Claude Sonnet denylist. The YAML at `.github/agent-models.yml` wins when this summary and the YAML disagree (`MODEL_CONFIG.md` header).
- `standards/GOAP_SWARM_RULES.md` — hard rule on reservations: a lease carries `agentId` and a TTL before two agents touch the same resource.
- `skills/openrouter-swarms/SKILL.md` — scale by spawning more swarms; do not put more than 10 agents in one named swarm unless Audrey approves.

## Definitions

- **Implementation job.** A job whose output changes application code, backend code, payment code, infrastructure, CI, scripts, or schema. Research and docs jobs are specialist jobs. A specialist job may be one agent or a pair (revvel-hail `docs/orchestrator/ORCHESTRATOR_PROMPT.md`, swarm topology, specialists / scouts).
- **Pair.** Two programmer agents on one branch. One is the driver. One is the navigator. There is no third programmer in the pair.
- **Model ID.** The exact provider model string, for example `anthropic/claude-opus-5`. The pair matches when both strings are character-for-character the same.
- **Lease.** The reservation that lets this pair edit a branch and the files, pull requests, issues, and deploy targets on that branch. Required fields are `agentId` and TTL (`standards/GOAP_SWARM_RULES.md`). Both programmers are named on that lease.
- **Review twin.** A reviewer that runs after the draft exists. The reviewer is not a member of the pair. `MODEL_CONFIG.md` gives the review lane a different primary model from the coding lane on purpose.

## Procedure

1. **Classify the job.** If it is an implementation job, assign one pair. If it is research or docs, assign a specialist (one agent or a pair). Do not leave an implementation job with one programmer.
2. **Name the pair** `Pair-<Role>-A` and `Pair-<Role>-B` (frontend, backend, payments, infra, or the role the job actually is).
3. **Pin one model ID** for that pair from the lane in `MODEL_CONFIG.md` / `.github/agent-models.yml` `routing_tree`. Do not use a Claude Sonnet model ID. Those IDs are denylisted (`MODEL_CONFIG.md`, house rules).
4. **Write the model ID down before the first edit.** Both members use that string. If the pair must move to the lane's fallback, both members switch to that same fallback string, and the switch is recorded before the next edit. One member on the primary and the other on the fallback is a broken pair.
5. **Take one lease for the branch.** Set `agentId` and a TTL. Name both programmers. List each file, pull request, issue, and deploy target the pair will touch. A second agent outside the pair does not edit those resources until this lease expires or is released.
6. **Split the work inside the pair.** The driver proposes and edits. The navigator challenges, tests, and co-owns the diff. Either may commit. Neither hands the job to a third programmer.
7. **Open the draft.** After the draft pull request exists, a review twin may run. The review lane may use a different model ID. On the 2026-08-21 lanes in `MODEL_CONFIG.md`, coding primary is `anthropic/claude-opus-5` and review primary is `anthropic/claude-opus-4.8`. Use the IDs in `.github/agent-models.yml` when they have moved. The reviewer does not become programmer three. If the reviewer commits, that commit is under a new lease, not under the pair's lease.
8. **Scale with more pairs.** A second surface is a second pair (or a second named swarm of pairs). Do not give one agent, or one pair, the whole stack in order to avoid spawning the next pair. A named swarm stays at 10 agents or fewer unless Audrey explicitly approves a larger swarm (`skills/openrouter-swarms/SKILL.md`). The next unit of scale is another named swarm.

## Reject these outcomes

- An implementation job with one programmer.
- Two programmers in one pair on different model ID strings.
- A third programmer added inside the pair.
- A review-lane model used as one of the two programmers before the draft exists.
- One agent assigned frontend, backend, and payments instead of one pair per surface.
- More than 10 agents in one named swarm without Audrey's explicit approval.

## What this file does not change

`MODEL_CONFIG.md` remains the model table. `standards/GOAP_SWARM_RULES.md` remains the lease rule for every agent, including agents that are not in a pair. `skills/openrouter-swarms/SKILL.md` remains the swarm topology skill. This file adds the pair constraint on top of those three.
