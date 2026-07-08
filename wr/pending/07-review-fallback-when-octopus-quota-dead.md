# [WR] Review fallback — self-hosted review lane when Octopus is quota-dead

## Output Type

internal-script-automation

## Objective

Octopus Review is out of monthly AI quota and posts "add your own API keys"
on every PR; MENDER/Mabl is paused by design. External review apps cannot be
summoned from the WR area when their quota/keys die. Add a fallback: a
workflow that detects the Octopus quota comment (or its absence after N
minutes) and runs the fleet's own review — `review` profile
(Opus 4.7 / DeepSeek R1 fallback, per `agent-models.yml`) — posting findings
as a PR review. Consider Qodo PR-Agent (open-source, OpenRouter-native) as
the implementation instead of bespoke code. Update
`skills/octopus-review`/OCTO persona docs to note the fallback.

## Definition of Done

- A PR where Octopus reports quota-death still gets an AI review from our lane
- Fallback uses the `review` profile via OpenRouter (no new vendor lock-in)
- No double-review when Octopus is healthy
