# Research Packet: Prompt Generation App (Revvel PromptForge)

**Date:** 2026-05-17
**Status:** Shipped (MVP)
**Owner:** Revvel Standards

## Hypothesis

Founders, agencies, and AI builders waste 4-12 hours per project producing prompt packets that are grounded in market facts, competitor gaps, and legal boundaries. A deterministic generator that outputs source-cited packets can compress that to <60 seconds and is monetizable at $29/packet, $99/mo workspace, or $499 setup.

## Market Signal

- Prompt marketplaces (PromptBase, FlowGPT) sell raw prompts but do not ground them in citations.
- AI consultancies bill $2k-$10k for the same packet artifact.
- G2/Capterra reviews in "AI tools" category show rising demand for **explainable** prompt output.

## Differentiation

We ship **due-diligence packets**, not prompt catalogs:
1. Market facts with source URLs
2. Competitor gap matrix
3. Blue-ocean / red-ocean scores
4. Legal/OSINT boundary checklist
5. Builder prompts (implementation-ready)
6. Reviewer prompts (audit-ready)

## Monetization Path → $10k/mo

- 345 packets/mo @ $29 = $10,005
- OR 101 workspace seats @ $99 = $9,999
- OR 20 setup engagements @ $499 = $9,980
- Blended target: 100 packets + 50 seats + 4 setups = **$9,846/mo**

## Distribution

- ProductHunt launch with free packet generator
- Polar.sh sponsorship tier for OSS maintainers ($9/mo Polar = free unlimited packets)
- GitHub README badge: "Generated with Revvel PromptForge"
- Twitter/X founder threads showcasing packets for trending ideas

## Risks

- Commoditization by OpenAI/Anthropic native features → mitigate via accessibility modes + source-citation rigor + reviewer prompts (unique).
- Source-citation quality at scale → start deterministic, add LLM-augmented retrieval in v2.

## Validation

- `node tests/prompt-generation-app.test.js` ✅
- `npm run lint` in product dir ✅
- `npm run build` in product dir ✅ (static export)
- `npm test` at repo root ✅

## Next Steps

1. Wire Polar.sh checkout to packet generator
2. Add LLM-augmented source retrieval (v2)
3. Ship `/api/packet` JSON endpoint for programmatic access ($99/mo tier)
