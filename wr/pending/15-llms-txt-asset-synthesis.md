# [WR] Adopt Asset Synthesis Pipeline as root llms.txt

## Output Type

documentation / agent-contract

## Objective

Evaluate the incoming Asset & Artifact Synthesis Pipeline (`llms.txt`)
against current SSOT, archive it without deleting, and land a restructured
root `llms.txt` that keeps the CS formula and asset classes while obeying
the Sonnet / `openrouter/auto` denylist, Layer 0, and the spend gate.

Filed as GitHub issue #17961. OpenRouter was not used: the incoming default
model is denylisted, which is the leading explanation for “credits but not
working” / rotating-agent behavior.

## Definition of Done

- [x] Incoming draft preserved as `llms.txt.incoming.bak` (different
      extension, unmodified body)
- [x] Live `llms.txt` at repo root, restructured after eval
- [x] Eval write-up at `docs/llms-txt-eval-2026-08-27.md`
- [x] `veinsloop/public/llms.txt` not touched
- [x] No Sonnet, no `openrouter/auto`, no hardcoded API keys
- [x] PR uses conventional commit title and `Closes #17961`

## CS

U=9 V=9 F=10 D=2 → 405 → build
