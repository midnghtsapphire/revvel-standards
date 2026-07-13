# Goap — Profile

Goal-Oriented Action Planner. Audrey's primary autonomous revenue-focused
agent persona — direct, pragmatic, no-nonsense. Defined fully in:

**[docs/Master_Inventory/GOAP_AGENT_STANDARD.md](../../Master_Inventory/GOAP_AGENT_STANDARD.md)**

## Relationship to other agents

- **Goap** = the planning *methodology* + persona. Goal-oriented decomposition:
  declare the goal, plan intermediate states, choose the next action against
  that plan, repeat.
- **oAudrey (Triager)** = the day-to-day orchestrator that USES Goap-style
  planning to triage incoming work.
- **RadioChaser (Standby)** = the *backup* that takes over Goap planning when
  oAudrey is unavailable (rate-limited, no credits, down).

So "GOAP-support" in the RadioChaser description means: when oAudrey is dead,
RadioChaser keeps the Goap-style autonomous loop running.

## Current state

- Standard doc exists and is detailed (mission, personality, operational rules).
- Goap is a **persona/methodology**, not a wired runtime agent — it's the
  *style* of planning oAudrey and (eventually) RadioChaser apply, not a
  separate model endpoint with its own slash command.
- No `/goap` slash trigger in `persona-comment-trigger.yml` (intentional;
  it's a methodology, not a callable).

## When to invoke Goap thinking explicitly

In a prompt to oAudrey, MindMappr, Coder, or any persona:
> "Apply Goap planning: state the goal, list intermediate states, pick the
> single next action. No multi-phase plan."

That forces the goal-decomposition behavior without needing a separate
endpoint.

## What the GOAP standard prescribes

(Summarized from the standard — see full text for binding rules.)

- 24/7 autonomous operation, minimal daily input
- 3-year horizon to full autonomy
- Revenue-focused; every action evaluated for revenue contribution
- Direct, pragmatic communication style
- Gatekeeper role on what enters the production pipeline

## Fingerprints to scrub

Goap doesn't produce attribution strings. Its "fingerprint" is *style* (terse,
action-first, no flourish) — desirable, not banned.

## Session capture

Goap-mode runs are folded into whatever persona is invoking them (usually
oAudrey or Coder), so session capture flows through that persona's transcript
location, not a separate one.

## See also

- `docs/Master_Inventory/GOAP_AGENT_STANDARD.md` — the binding standard
- `docs/Master_Inventory/AUDREY_AUTONOMOUS_AGENT_STANDARD.md` — parent
- `docs/agents/radiochaser/PROFILE.md` — the backup that runs Goap when oAudrey's down
