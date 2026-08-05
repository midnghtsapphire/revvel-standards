# RadioChaser — Profile

GOAP-support backup orchestrator. Advertised in the Ready-for-Review roster as
the fallback when oAudrey is down.

## Current status: ⚠️ phantom

As of the agent-fleet audit, RadioChaser is **registered in the roster comment
but not actually wired**:
- Not in `scripts/openrouter-personas.js` (`PERSONA_REGISTRY` has no `radiochaser`
  entry).
- Not in `.github/workflows/persona-comment-trigger.yml` (`/radiochaser` and
  `/standby` slash-commands are not handled).
- The "Standby" checklist section in the Ready-for-Review comment is
  consequently never ticked.

So when you type `/radiochaser` or `/standby` in a PR comment, nothing fires.

## When fully implemented, what it should be

- **Lane**: backup orchestrator — picks up triage when oAudrey is rate-limited,
  budget-exhausted, or otherwise unavailable.
- **Routing input**: same task signal as oAudrey (PR/issue body + classifier
  output).
- **Trigger**: `/radiochaser` or `/standby` slash-command, OR auto-fire when
  oAudrey's status check returns `no_credits` / `rate_limited` / `unhealthy`.
- **Model**: should pick something cheaper than oAudrey's profile, since the
  reason it's running is usually "oAudrey was too expensive or quota-locked
  right now." Likely a Haiku-class or Gemma-class local model.
- **GOAP context**: "Goal-Oriented Action Planning" — the agent breaks the
  request down into intermediate states and chooses the next action against a
  declared goal, instead of one-shot prompting.

## To actually wire it (small)

1. Add `radiochaser` entry to `PERSONA_REGISTRY` in
   `scripts/openrouter-personas.js` — handle, aliases (`standby`), role,
   model lane, system prompt.
2. Add `radiochaser` to the trigger map in
   `.github/workflows/persona-comment-trigger.yml`.
3. Optionally: add a `radiochaser_health` check to the future agent-status
   table so the auto-fallback can fire when oAudrey is dead.

## Prompt shapes that work (TBD)

Fill in as we observe RadioChaser actually running, once it's wired.

## Fingerprints to scrub

None unique. Output style follows the OpenRouter persona format —
markdown sections, no emoji walls, no per-agent attribution.

## Session capture

When wired, runs through `routedChat()` in `scripts/openrouter-routing.js`;
captured by the future OpenRouter session logger to
`docs/agents/radiochaser/transcripts/`.
