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
## Research Packet: Prompt Generation App

**Product:** Revvel PromptForge  
**Branch:** `cursor/prompt-generation-app-e66e`  
**Research date:** 2026-05-17  
**Research boundary:** Legal public OSINT only: public web, public GitHub, public docs, and public community chatter. No credentialed dark-web access, account bypassing, private scraping, or secret procurement was used.

## Executive Decision

Build the prompt generation app as a research-backed packet generator, not a generic prompt library. The crowded market already has large prompt catalogs and prompt optimizers. The open wedge is a Revvel-specific system that turns rough issue notes into a due-diligence packet with source logs, competitor gaps, blue/red-ocean scoring, implementation prompts, and review prompts.

## What Problem Are We Solving

Raw work requests often combine Audrey's notes, copied snippets, and LLM output. That material is useful signal, but it can be incomplete, unsourced, or shaped by another model's assumptions. PromptForge solves this by turning the raw idea into a structured packet that forces the agent to answer:

- What is the real user pain?
- Who is the first buyer?
- What facts can be cited?
- What competitors already exist?
- What public chatter supports demand?
- What should the build agent implement and test?
- What should the reviewer challenge before merge?

## Market Facts and Stats

| Fact | Source | How It Affects This Product |
|---|---|---|
| Prompt engineering market grows from $1.13B in 2025 to $1.49B in 2026, then to $4.51B by 2030 at 31.9% CAGR. | Research and Markets, Prompt Engineering Market Report 2026 | Confirms market demand, but the high CAGR also attracts many me-too prompt products. |
| Major trends include automated prompt optimization, domain-specific prompt libraries, multi-modal prompt design, enterprise prompt management, and prompt testing/validation frameworks. | Research and Markets | PromptForge should emphasize domain-specific Revvel workflows and validation/checklist output. |
| PromptBase advertises 270k prompts, 39k+ reviews, and 450k+ users. | PromptBase homepage | Prompt marketplaces are validated but crowded. Do not compete as a simple catalog. |
| PromptBase visible examples show individual prompt prices around $2.99-$6.99. | PromptBase homepage | A $29 packet needs to sell a fuller outcome than a single prompt. |
| AIPRM promotes prompt management, private prompts, lists, forking, live crawling, custom profiles, and team use. | AIPRM pricing and plan docs | Differentiation must be source-backed packet generation, not just saved prompt organization. |

## Internal Due Diligence

Searched this repository for prompt-related assets and checked public midnghtsapphire repositories containing prompt-related terms.

### Internal assets found

- `promptforproject.md` - routing, viability scoring, ship-to-market requirements, deployment/test URL rules.
- `docs/RESEARCH_ENGINE_STANDARD.md` - required research lanes: market, SEO, competitors, chatter, facts, technical, revenue, review.
- `scripts/research-engine.js` - implementation of lane prompts and synthesis prompt.
- `.github/agent-prompts.yml` - workflow prompt templates.
- `docs/AGENT_PROMPT_CONVENTION.md` and `docs/AGENT_PROMPT_EXECUTION_EVALUATION.md` - prompt governance docs.
- `midnghtsapphire/oz-prompt-library` - public prompt library with template and Blue Ocean App Discovery prompt.
- `midnghtsapphire/WEBSITE-FACTORY-GENERATOR` - public repo described as an OpenRouter call to five LLMs from one input prompt.
- `midnghtsapphire/zeuroo` - public AI gateway/cost optimizer with prompt optimization and token billing references.

### Internal conclusion

Revvel already has research-engine logic and prompt assets, but no shipped prompt generation UI. PromptForge packages those assets into a working product surface.

## Competitor Matrix

| Competitor | Current Strength | Gap PromptForge Uses |
|---|---|---|
| PromptBase | Large marketplace with paid prompts, reviews, and creator economics. | Buyers still need project-specific due diligence, source logs, and implementation gates. |
| AIPRM | ChatGPT-native prompt management, private prompts, live crawling, team features. | Strong prompt reuse, weaker WR-to-PR research packet workflow. |
| FlowGPT | Huge community experimentation and broad prompt/character variety. | Quality variance and weak evidence packaging. |
| PromptPerfect | Optimizes prompt wording and compares model output. | Optimizes phrasing more than product-market proof. |
| Generic LLM chat | Flexible and immediate. | No persistent checklist, source log, competitor matrix, or review queue. |

## Public Chatter Summary

Public chatter around prompt use repeatedly points to these pain patterns:

- Generic AI text sounds promotional or context-free.
- Marketers and founders lose time rewriting prompts for each platform.
- Community channels punish content that sounds automated or low-context.
- Prompt libraries are large, but users still must decide which prompt is credible for their project.
- Teams need repeatable prompt workflows that preserve brand, source, and review context.

The payable problem is not "give me another prompt." The payable problem is "turn my idea into a prompt packet I can trust enough to build from."

## Blue-Ocean Opportunities

1. **WR-to-PR prompt packets:** A direct fit for Revvel workflows; less crowded than prompt marketplaces.
2. **Source-backed prompt generation:** Each packet includes citations and unsupported-claim warnings.
3. **Code-review handoff prompts:** Built-in reviewer prompt asks for blocking factual, technical, accessibility, and marketing issues.
4. **Prompt packet products:** Sellable PDF/download, monthly workspace, or productized setup service.
5. **Internal prompt asset monetization:** Convert OZ prompt library and research-engine patterns into an app with UI, tests, and deploy target.

## Red-Ocean Risks

1. Generic prompt libraries are crowded.
2. Prompt marketplaces already have scale and trust markers.
3. Prompt optimizers compete on speed and model output quality.
4. Browser extensions can own the ChatGPT-native workflow.
5. Low-priced prompts make single-prompt sales a weak wedge.

## Marketing Recommendation

Market PromptForge to:

- Founders and operators turning messy notes into product briefs.
- Agencies making source-backed campaign and client prompt packs.
- AI builders who need implementation prompts plus code-review acceptance gates.
- Revvel agents that need a repeatable checklist before building.

Primary copy angle:

> "Stop shipping from random prompt snippets. Generate a source-backed build packet with market facts, competitor gaps, legal OSINT boundaries, and code-review prompts."

## Offer and Pricing Tests

| Offer | Price | Why |
|---|---:|---|
| Single exported prompt research packet | $29 | Higher value than a $3-$7 marketplace prompt because it includes research and review gates. |
| Prompt workspace subscription | $99/month | For founders/agencies producing repeat packets. |
| Done-with-you packet setup | $499 | Fast service offer for one product idea converted into a WR/PR-ready packet. |

## Build Requirements Delivered

- Working static Next.js app in `products/prompt-generation-app`.
- Deterministic packet generator in `products/prompt-generation-app/lib/prompt-generator.js`.
- UI for input, source cards, competitor matrix, checklist, blue/red-ocean score, legal boundary, and markdown export.
- Seven accessibility display modes with local persistence.
- Product README with research sources, test section, and Vercel root directory.
- Root test coverage in `tests/prompt-generation-app.test.js`.

## Code Review Packet

Reviewers should check:

- Numerical claims in app copy match cited sources.
- No source claims are presented as live verification unless they were fetched or searched.
- Accessibility controls remain keyboard reachable and labels are associated.
- Static build succeeds without API keys.
- The product stays differentiated from generic prompt library positioning.
