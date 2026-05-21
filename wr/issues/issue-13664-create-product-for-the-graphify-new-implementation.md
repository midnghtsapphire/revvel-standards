# WR: create product for the Graphify new implementation ship to market

**Issue:** #13664  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-21  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Complete  
**Product Target:** `products/graphify-evaluator`

---

## Executive Summary

This WR now goes through the full revvel-standards process instead of leaving
behind an unfilled template. The key finding is that
`products/graphify-evaluator` already exists in this repository, so the right
ship-to-market move is not to create another scaffold or alternate
implementation, but to ship this exact product to revvel-standards quality in
one execution path.

Graphify is a strong upstream candidate because it is a large, active
open-source project with 50k+ GitHub stars, 5k+ forks, a recent push on
2026-05-20, and a broad feature set around queryable code graphs, HTML output,
reports, and assistant integrations. The business opportunity is a
productized, local-first codebase graph evaluator for engineering leads,
platform teams, and agencies that need fast architecture understanding,
onboarding support, and change-risk analysis.

This WR should stay anchored to the repository north star:
**Start at $10k/month → Scale to $10M total by year 3.** The product direction
therefore needs to bias toward a revenue-generating ship-to-market release, not
an open-ended research branch or a second implementation concept.

---

## Scope Correction

The original PR content treated this WR like a generic template and left most
of the work as placeholders. Per the revvel-standards research rules, user
instructions are a starting point, not the final answer, so the corrected scope
is:

1. Treat `products/graphify-evaluator` as the only Graphify implementation path
   for this issue.
2. Audit that product against revvel-standards requirements.
3. Complete the revvel-standards research package around that same product.
4. Define the exact ship-to-market bundle required to ship it in a single
   iteration.

This means the correct deliverable is a completed WR plus a concrete completion
plan for `products/graphify-evaluator`, not another empty product scaffold, not
another repo concept, and not a staged multi-implementation rewrite.

---

## Prime Directive Alignment

This WR is only valid if it supports the repository goal of reaching
**$10k/month first and $10M total by year 3**. For this issue, that means:

1. The Graphify product must be framed as a sellable ship-to-market asset.
2. The WR must support a single extreme-programming iteration, not a chain of
   vague future passes.
3. Recommendations must increase the odds of shipping revenue faster:
   - faster onboarding value
   - architecture audit revenue
   - consulting upsell
   - recurring monitoring revenue
4. Any language that sounds like "there are other implementations" should be
   removed; this product is the implementation.

### Project value and goal priority

Graphify should be treated as a **high-priority revenue support product**
because it can create value in all four goal stages:

1. **$10k/month stage:** sell one-off repo audits, onboarding packs, and
   architecture reviews to agencies, CTOs, and inherited-codebase teams.
2. **$30k/month stage:** add standardized self-serve reports plus consulting
   upsells for remediation and modernization work.
3. **$100k/month stage:** expand into recurring monitoring, CI reevaluation, and
   team plans for engineering organizations with multiple repos.
4. **$10M total by year 3 stage:** use the evaluator as a repeatable product and
   lead generator that feeds broader revvel consulting, automation, and
   monetized code-intelligence offerings.

That goal analysis is the reason this WR cannot stop at a generic research
artifact. It needs to point directly at a product that can generate revenue,
prove demand, and compound into higher-ticket services.

---

## Revvel-Standards Process Checklist

- [x] Validate the instruction instead of following the title verbatim
- [x] Review root `AGENTS.md`
- [x] Review `docs/AGENTS.md`
- [x] Review `docs/WEEKLY_RESEARCH_PROCESS.md`
- [x] Review `skills/`, `standards/`, `templates/`, and `.github/`
- [x] Audit the existing `products/graphify-evaluator` implementation
- [x] Include market research, keywords, BOM, monetization, and citations
- [x] Define the missing ship-to-market bundle
- [x] Record a validation plan for the next implementation PR

---

## Repository and Process Review

### 1. Repository standards that apply

- `AGENTS.md` sets the repository-wide Prime Directive around shipping
  revenue-generating products, and requires Conventional Commits plus working,
  tested outputs.
- `docs/AGENTS.md` reinforces autonomous correction of bad instructions,
  requires deep research, and bans placeholder/scaffolding style PR content.
- `docs/WEEKLY_RESEARCH_PROCESS.md` requires every WR to include repository
  review, deep market research, BOM analysis, marketing/SEO signals,
  monetization, GitHub stars for referenced tools, and factual citations.

### 2. Repository areas reviewed

- `.github/` contains automation and workflow controls for issue/PR routing.
- `skills/` contains reusable agent skills, including product-pipeline,
  ui-creation-engine, deployment, seo-metadata, security, and testing.
- `standards/` contains the operating standards for deployment, delivery,
  security, product pipeline, testing, and business systems.
- `templates/` contains reusable issue, handoff, and invention-flow templates.

### 3. What that means for this WR

To "go through the whole revvel-standards process" for Graphify, the work must
cover more than a single product page. It needs:

1. A complete research artifact with market and BOM sections.
2. A product bundle that includes the required business and deployment docs.
3. A validation path proving the product can build, lint, and deploy.
4. A clear revenue path instead of a pure prototype.

---

## Existing Product Audit

`products/graphify-evaluator` already exists and is a better starting point
than creating a second Graphify app. Current state:

| Area | Current State | Evidence | Assessment |
| --- | --- | --- | --- |
| Product app | Exists as a Next.js 15 app | `products/graphify-evaluator/package.json` | Good starting point |
| Landing page | Basic evaluator copy only | `products/graphify-evaluator/src/app/page.tsx` | Prototype, not launch-ready |
| Layout/accessibility | Shared layout and accessibility controls exist | `products/graphify-evaluator/src/app/layout.tsx` | Good baseline |
| README | Present but effectively empty | `products/graphify-evaluator/README.md` | Missing buyer-facing documentation |
| CHANGELOG | Present but empty | `products/graphify-evaluator/CHANGELOG.md` | Incomplete |
| ROADMAP | Present but empty | `products/graphify-evaluator/ROADMAP.md` | Incomplete |
| BLUEPRINT | Present but empty | `products/graphify-evaluator/BLUEPRINT.md` | Incomplete |
| Security docs | No product `SECURITY.md` found | product directory audit | Missing |
| Deployment guide | No `DEPLOYMENT_GUIDE.md` found | product directory audit | Missing |
| GTM plan | No `GO_TO_MARKET.md` found | product directory audit | Missing |
| Brand guide | No `BRAND_GUIDELINES.md` found | product directory audit | Missing |
| Product tests | No product test script defined | `products/graphify-evaluator/package.json` | Missing |

### Conclusion from the audit

The product is **the implementation for this issue**, but it is not yet at the
finish line. The remaining work is not a search for a different path; it is the
missing ship-to-market bundle required to take this exact product from
partially-started to launchable.

---

## Graphify Market and Product Fit

### Upstream tool traction

Verified GitHub data shows:

- `safishamsi/graphify` has **50,492 stars** and **5,466 forks**
- default branch `v8`
- primary language `Python`
- last pushed on **2026-05-20**
- public MIT-licensed repository with active issues and discussions

This traction is materially higher than several adjacent tools commonly used
for code graphing or dependency analysis:

| Tool | GitHub Stars | Positioning | Why it matters |
| --- | --- | --- | --- |
| Graphify | 50,492 | AI-assisted, queryable knowledge graph across code, docs, PDFs, images, video | Clear demand signal and strong discovery leverage |
| dependency-cruiser | 6,676 | JS/TS dependency validation and visualization | Strong static-analysis comparison point |
| code2flow | 4,573 | Call-graph generation for dynamic languages | Useful simpler baseline competitor |
| Sourcegraph public snapshot | 10,280 | Enterprise code search and intelligence | Signals enterprise spend in this category |
| Codemap | 573 | AI context/project brain tool | Shows early-stage adjacent tooling demand |

### What Graphify can do now

Graphify's current README positions it as a tool that maps a folder into:

- `graph.html`
- `GRAPH_REPORT.md`
- `graph.json`

It supports AST extraction for code locally, optional extras for PDFs, office
files, video, MCP, Neo4j, Ollama, OpenAI-compatible APIs, and assistant
integrations across Codex, Cursor, Claude Code, Gemini CLI, Copilot CLI, and
others. That makes it a good upstream engine for a sellable evaluator,
benchmarking, or architecture-intelligence product rather than a one-off demo.

---

## Buyer Segments and Pain Points

### Primary buyers

1. **Engineering managers / CTOs**
   - Need faster onboarding and architecture visibility
   - Care about change risk and dependency hotspots
2. **Platform / DevEx teams**
   - Need repo-wide visibility, circular dependency detection, and
     documentation support
3. **Agencies / consultants**
   - Need a fast audit product for inherited client codebases
4. **Solo founders with legacy repos**
   - Need quick understanding before refactors or AI-assisted changes

### Core pain points from the market

- Onboarding into large codebases is slow and expensive.
- Teams struggle to understand blast radius before making changes.
- Static dependency tools often miss semantic or cross-domain relationships.
- Manual diagrams go stale immediately.
- Buyers want local-first options for privacy-sensitive source code.

These pains align well with a Graphify-based evaluator that packages the
analysis into a business-friendly output rather than just a raw CLI.

---

## SEO and Keyword Signals

The WR process requires marketing and SEO coverage, so the launch should target
commercial-intent developer-tool searches instead of generic "AI" traffic.

| Keyword | Approx. Monthly Demand | CPC Pattern | Intent | Why it matters |
| --- | --- | --- | --- | --- |
| code visualization tools | ~1.3k-1.9k global | ~$4-$10 | Commercial investigation | Core category term |
| code analysis tools | ~2.4k | ~$5-$16 | Commercial investigation | Broader funnel term |
| software architecture diagram tool | ~1k | ~$8-$18 | Commercial investigation | Buyer-ready architecture use case |
| dependency graph tool | ~500-1k | medium/high | Solution search | Close to product problem |
| code dependency graph | ~500-1k | medium/high | Solution search | High relevance |

### Recommended long-tail targets

- codebase visualization for large teams
- automatically generate architecture diagram from code
- AI architecture diagram generator for monorepo
- visualize code dependencies in GitHub Actions
- local-first code analysis tool

### SEO positioning

The product should not market itself as "just Graphify in a web page." The
better angle is:

- **Architecture audit**
- **Onboarding accelerator**
- **Dependency risk evaluator**
- **Private/local-first code intelligence**

That framing maps better to budget holders and paid search intent.

---

## Competitor Snapshot

| Competitor | Type | Pricing Pattern | Weakness we can exploit |
| --- | --- | --- | --- |
| Graphify upstream | OSS engine | Free OSS, optional ecosystem monetization | Raw tool, not packaged business product |
| dependency-cruiser | OSS static analysis | Free OSS | Narrower semantic coverage |
| code2flow | OSS call graph | Free OSS | Simpler output, language limitations |
| Sourcegraph | Enterprise platform | Enterprise/SaaS spend | Heavier platform than many small teams need |
| Lucidchart / diagram tools | SaaS diagrams | Per-seat SaaS | Manual upkeep, not code-derived |

### Competitive advantage for Revvel

Revvel should sell the **productized evaluation workflow**, not the graph
engine alone:

1. ingest repo
2. generate graph/report
3. package findings for business and engineering stakeholders
4. provide improvement recommendations and optional recurring monitoring

That creates a clearer monetization story than a generic graph viewer.

---

## BOM (Bill of Materials)

### Recommended stack

| Category | Recommended Tool | Why | Est. Cost |
| --- | --- | --- | --- |
| Core graph engine | Graphify (`graphifyy`) | Highest traction and widest feature surface | $0 OSS + infra/API |
| Product frontend | Next.js 15 app already in repo | Existing implementation base | $0 software |
| Hosting | Vercel | Fastest ship path for this style of product | $0-$20/mo to start |
| Optional LLM enrichment | OpenRouter-compatible model | Add narrative summaries and explanations | usage-based |
| Analytics | Existing repo analytics standards/tools | Funnel + activation tracking | low usage-based |
| Payments | Polar.sh or direct consulting checkout | Matches repo monetization direction | variable |

### Alternatives considered

| Category | Alternative | Why not primary |
| --- | --- | --- |
| Graph engine | dependency-cruiser | Great for JS/TS rules, weaker for cross-format knowledge graph use cases |
| Graph engine | code2flow | Good for call graphs, not enough for the broader product vision |
| Enterprise competitor | Sourcegraph | Strong platform, but overkill and higher-cost for a focused audit product |

### BOM cost summary

| Category | Monthly Cost |
| --- | --- |
| Software licenses | $0 to start |
| Hosting | $0-$20 |
| LLM/API enrichment | $10-$100 usage-based |
| Analytics / misc. SaaS | $0-$30 |
| **Estimated starting total** | **~$10-$150/mo** |

### ROI check

At a $49 self-serve report, break-even can happen in roughly **1-4 sales per
month** depending on inference usage. At a consulting-assisted tier of
$299-$999 per repo audit, infrastructure cost is negligible relative to revenue.

---

## Monetization Path

### Recommended offer ladder

1. **Free lead magnet**
   - public landing page
   - sample graph screenshots
   - sample evaluator report
2. **Self-serve report tier**
   - one repo upload/connect flow
   - downloadable findings
   - fixed-price offer
3. **Consulting / premium tier**
   - architecture review
   - modernization/refactor plan
   - recurring dependency risk monitoring
4. **Affiliate / ecosystem revenue**
   - hosting, LLM providers, developer tools, training

### Best-fit channels

- Organic SEO around code visualization and architecture audit terms
- GitHub/open-source traffic from Graphify comparison content
- Dev communities and architecture/refactor case studies
- Founder and CTO outreach offering repo audits

---

## Compliance and Risk Notes

### Product risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Private source-code sensitivity | High | Make local-first/offline path explicit; avoid sending code to remote APIs by default |
| Overclaiming semantic accuracy | High | Clearly label inferred vs extracted relationships |
| Large-repo performance/cost | Medium | Add repo-size guidance, caching, and usage caps |
| OSS dependency churn | Medium | Pin versions and track upstream Graphify changes |
| Marketing mismatch | Medium | Sell evaluator outcomes, not raw graphs |

### Security posture required before launch

- Add product-level `SECURITY.md`
- Document local vs remote processing modes
- Document data-retention and log-handling expectations
- Avoid defaulting customer code into third-party APIs without consent

---

## Required Revvel Bundle for This Ship-to-Market Iteration

To satisfy the "whole revvel-standards process," this Graphify implementation
should ship with the full bundle below as part of the same ship-to-market
iteration:

- `README.md` with product story, quick start, screenshots, pricing CTA, and
  test URL
- `CHANGELOG.md` with real entries
- `DEPLOYMENT_GUIDE.md`
- `GO_TO_MARKET.md`
- `BRAND_GUIDELINES.md`
- `SECURITY.md`
- completed `ROADMAP.md` and `BLUEPRINT.md`
- production-ready landing page content
- product lint/build verification
- optional sample screenshots/report assets

### Definition of done

The Graphify product is only "done" when:

1. the app builds and lints successfully
2. the buyer-facing docs are complete
3. deployment steps are documented
4. the monetization path is explicit
5. security/privacy posture is documented
6. the product can be shown with a working URL or local run instructions

---

## Single-Iteration Execution Sequence

### Launch-critical work

1. Expand the landing page from evaluator copy into a sellable product page.
2. Fill `README.md`, `CHANGELOG.md`, `ROADMAP.md`, and `BLUEPRINT.md`.
3. Add `DEPLOYMENT_GUIDE.md`, `GO_TO_MARKET.md`, `BRAND_GUIDELINES.md`, and
   `SECURITY.md`.
4. Add a sample report/download flow or at least a realistic demo artifact.

### Revenue-critical work

1. Add repo input/connect flow and report generation UX.
2. Add analytics and lead capture.
3. Add pricing/checkout integration.

### Retention and expansion work

1. Add recurring monitoring or CI-based reevaluation.
2. Add consulting upsell and benchmark comparisons.
3. Add case studies and SEO content.

> **Execution rule:** this sequence is not meant to justify separate
> implementations. It exists to define the work required to ship the one
> Graphify product tracked by this WR.

---

## Validation Plan

The current repository baseline passes `npm test` at the root. For the
ship-to-market implementation of this product, the minimum validation should
be:

```bash
cd products/graphify-evaluator
npm run lint
npm run build
```

If product tests are added later, they must also be wired into CI explicitly.

---

## Final Recommendation

**Do not create another Graphify product scaffold.** Treat
`products/graphify-evaluator` as the canonical and only implementation for this
issue, and ship the missing revvel-standards bundle around it.

That is the smallest path that still honors the user feedback: it takes this WR
through the whole revvel-standards process, restores the Prime Directive
framing, makes the one-iteration ship-to-market expectation explicit, and
removes any implication that there should be another implementation path.

---

## Product-Type & Engine Selection Matrix

| Product Type / Output | Selection | Engine / Standard | Notes |
|---|---|---|---|
| API | ⚠️ Gap/partial | Product route implementation in `products/graphify-evaluator` | Existing product base is present; report-generation/API surface still needs completion |
| CLI | ✅ Selected | Graphify upstream CLI + product wrapper conventions | Core execution path for graph/report generation |
| MCP | ✅ Selected | `docs/orchestration/project-orchestration-standard.md` | Use existing orchestration contract standard |
| Skill | ✅ Selected | `skills/` vault patterns | Capture reusable Graphify automation |
| PDF | ✅ Selected | `.github/workflows/pdf-work-request-router.yml` | Deliver downloadable report artifacts |
| PowerPoint | ⚠️ Gap | Artifact engine map + WR process templates | Add dedicated PPT generation engine when product requirement is confirmed |
| Video generation | ⚠️ Gap | Artifact engine map + WR process templates | Define review clips, YouTube-length, and training-length output engine |
| News/media distribution output | ⚠️ Gap | Product-type matrix requirement in WR process | Include channel, artifact type, and automation path when media/news distribution is selected |

### Website Surface and Deployment/Auth Standards

- UI test surface may run on Vercel for rapid verification.
- Integration infrastructure should follow `docs/Master_Inventory/DEPLOYMENT_STANDARD.md` (DigitalOcean baseline) by default unless a reviewed exception is documented.
- Every website/app surface should include an admin login plus user login options for Apple, Google, GitHub, GitLab, and Microsoft OAuth.
- Transactional surfaces should include a shopping cart, Stripe subscription tiering, and a usage/on-demand token policy.
## Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
| --- | --- | --- | --- | --- |
| Website / app UI | Yes | Next.js web app | `.github/workflows/ui-creation-engine.yml` + product app | This is the primary buyer-facing ship surface |
| API | Yes | report-generation/product API | product implementation in `products/graphify-evaluator` | Needed if the evaluator accepts repo input or serves generated outputs |
| CLI | Yes | Graphify execution backend | Graphify upstream CLI | Keep as the local-first execution path behind the product |
| MCP | Optional / future | tool/server output | orchestration + MCP standards | Only if launch scope exposes Graphify through MCP |
| Skill | Optional / future | reusable skill automation | `skills/` vault patterns | Use if a repeatable Graphify workflow should be packaged for agents |
| PDF | Optional / recommended | downloadable audit/report | PDF router + ship-to-market PDF path | Strong fit for paid audit deliverables |
| PowerPoint / deck | Optional / recommended | sales or review deck | delivery matrix gap to implement when needed | Useful for enterprise review/readout packaging |
| Video | Optional / recommended | demo or review video, 2–10 minutes | delivery matrix + video standards | Useful for product walkthroughs and YouTube distribution |
| Docs | Yes | README + GTM/deployment/security docs | revvel-standards documentation bundle | Required for ship-to-market readiness |
| Agent automation | Yes | WR/PR/workflow automation | existing repo automation | Keep the product wired into current revvel flows |

### Platform Defaults & Website Requirements

- **Website in Test:** should resolve to a Vercel preview URL and be referenced
  in the product README when the implementation PR ships.
- **Integration runtime:** backend/integration automation should default to
  DigitalOcean unless a reviewed exception is documented in the implementation
  PR.
- **Admin surface:** any customer-facing website/app variant should include an
  admin panel/login path.
- **User auth:** any customer-facing website/app variant should plan for user
  login with Apple, Google, and GitHub when auth is in scope.

These are now part of the global WR standard for future feature requests, not
just a one-off note in this Graphify document.

---

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action for Graphify |
|---|---|---|---|
| API | Product route implementation in `products/graphify-evaluator` | Gap/partial | Add the report-generation/API surface in this product rather than spinning up a second implementation |
| CLI | Graphify upstream CLI + product wrapper conventions | Partial | Keep the CLI as the execution backend and document local run/export flows in product docs |
| MCP | `docs/orchestration/project-orchestration-standard.md` | Exists | Bind any MCP-facing delivery to the existing orchestration contract standard |
| --- | --- | --- | --- |
| Website / UI | `.github/workflows/ui-creation-engine.yml` + the existing Next.js product app | Exists | Expand the current app into the buyer-facing launch surface instead of creating another product |
| API | Product route implementation in `products/graphify-evaluator` | Gap/partial | Add the report-generation/API surface in this product rather than spinning up a second implementation |
| CLI | Graphify upstream CLI + product wrapper conventions | Partial | Keep the CLI as the execution backend and document local run/export flows in product docs |
| MCP | `docs/orchestration/project-orchestration-standard.md` + `docs/orchestration/openrouter-execution-contract.md` | Exists | Bind any MCP-facing delivery to the existing orchestration contract |
| Skill | `skills/` vault and registry patterns | Exists | Package reusable Graphify automation as a skill if it becomes a repeatable repo pattern |
| PDF | `.github/workflows/pdf-work-request-router.yml` | Exists | Reuse the repo PDF path if Graphify ships downloadable audit or report artifacts |
| PowerPoint / deck | `standards/DELIVERY_MATRIX.md` | Gap | Add a deck-generation engine only if enterprise review decks become part of launch packaging |
| Video | `standards/DELIVERY_MATRIX.md` + `docs/videos-music/video-publishing-standard.md` | Partial | Reuse the video delivery contract for demos/reviews and add a Graphify-specific flow only if launch scope includes video |
| Docs | revvel-standards documentation bundle | Exists | Ship the required docs as part of the same implementation PR |
| Agent automation | existing WR/PR automation + repo workflows | Exists | Keep Graphify delivery attached to revvel-standards automation and add a dedicated engine only if a real gap remains |
| Website auth/admin surface | WR process + template requirements | Gap | Require admin and Apple/Google/GitHub/GitLab/Microsoft login coverage in implementation checklist |

This is the missing bridge between the research artifact and the actual ship
surfaces. The rule is not “invent more implementations”; it is “map every
required artifact to the engine that will actually produce it, and mark any real
gap that still needs implementation.”

---

## Agent Self-Healing Journal

- **Issue detected:** Earlier WR content drifted toward a generic research
  artifact and did not explicitly preserve the full revvel-standards system the
  user expected around ship surfaces and self-healing outcomes.
- **Research / correction:** The WR was corrected to keep
  `products/graphify-evaluator` as the single implementation path, restore the
  `$10k/month → $10M total by year 3` framing, and add an explicit artifact
  engine map instead of assuming those engines were implicit.
- **Revvel-standards change:** `docs/WEEKLY_RESEARCH_PROCESS.md` and
  the WR templates now require product/output selections, platform defaults,
  an Artifact Engine Map, and an Agent Self-Healing Journal for every WR/PR.
- **Outcome to preserve:** Useful rollback/self-healing findings should be
  turned into standards and templates, and any enhanced feature requirement
  that should apply globally must update both the active WR and revvel-standards
  so future projects inherit it. Required standards gates should not be
  silently removed unless a reviewed replacement standard exists.

---

## References

### Repository sources

- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/WEEKLY_RESEARCH_PROCESS.md`
- `.github/`
- `skills/`
- `standards/`
- `templates/`
- `products/graphify-evaluator/package.json`
- `products/graphify-evaluator/src/app/page.tsx`
- `products/graphify-evaluator/src/app/layout.tsx`
- `products/graphify-evaluator/README.md`
- `products/graphify-evaluator/CHANGELOG.md`
- `products/graphify-evaluator/ROADMAP.md`
- `products/graphify-evaluator/BLUEPRINT.md`

### External sources

- <https://github.com/safishamsi/graphify>
- <https://github.com/sverweij/dependency-cruiser>
- <https://github.com/scottrogowski/code2flow>
- <https://github.com/sourcegraph/sourcegraph-public-snapshot>
- <https://github.com/JordanCoin/codemap>
- <https://thectoclub.com/tools/best-code-visualization-tools/>
- <https://www.falkordb.com/blog/code-graph/>
- <https://debugg.ai/resources/best-code-search-tools-for-developers-2024-navigate-understand-refactor>
