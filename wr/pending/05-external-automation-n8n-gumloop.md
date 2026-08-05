# [WR] External automation wiring — provision n8n / Gumloop flows from a WR

## Output Type

internal-script-automation

## Objective

WRs whose delivery includes recurring automation should ship the automation
itself: (1) the build lane emits a committed n8n flow export
(`automations/<wr>/flow.json`) or Gumloop equivalent, generated to the
standards in the fleet charter (retries, idempotency, dead-letter handling,
per-step cost telemetry, human-in-the-loop step); (2) if `N8N_API_URL` +
`N8N_API_KEY` secrets exist, a deploy step imports the flow via the n8n API
and reports the webhook URL back to the issue; otherwise the export + import
instructions are the deliverable; (3) a smoke-trigger validates the deployed
flow end-to-end in test mode.

## Definition of Done

- One reference WR ships a working n8n flow export that imports cleanly
- Deploy step is secret-gated and skips gracefully when unconfigured
- Charter rules (structured output, spend guards) visible in the flow
