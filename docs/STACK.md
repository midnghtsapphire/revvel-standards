# Revvel / Freedom Angel Corp Stack

## Trust Principles (every tool gets evaluated against these)
1. Own the substrate — open-source / self-hostable / prepaid > seat-licensed SaaS
2. Model-agnostic — AI integrations swappable without rewriting
3. Incentive-aligned pricing — pay-per-use > per-seat for heavy users
4. Degradation-resistant — flag `trust:declining` early, plan migration
5. Exit-ready always — every tool has documented "how to leave"

## AI Agent Hierarchy (PR #2 will implement)
- Layer 0: Local LLMs (LM Studio) — free, private, 60-70% of work
- Layer 1: OpenRouter (prepaid) — frontier reasoning, model-agnostic
- Layer 2: Direct APIs — Whisper, DALL-E, long-context Claude as needed
- Layer 3: GitHub Copilot — escalation-only, rare, not daily driver

## Source control
- GitHub Enterprise (Freedom-Angel-Corp) — business IP
- midnghtsapphire/ — personal sandbox

## Compute / deploy
- DigitalOcean, Vercel, Cloudflare

## Secrets
- Infisical (current); evaluate GitHub native as consolidation

## Stale-line notes (2026-11-19, Decipherer)

Nothing above was changed. These notes mark lines that no longer match what
was checked.

- Source control: "GitHub Enterprise (Freedom-Angel-Corp)" is **stale**. The
  GitHub API reported the org on the free plan with 1 seat on 2026-11-14.
  Confirm no separate enterprise account exists. See the connector matrix in
  [`TOOL_COST_INDEX.md`](TOOL_COST_INDEX.md).
