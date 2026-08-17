# WR: s2m covid debunked or fact checking site

**Issue:** #13732  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-22  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Complete  

---

## Executive Summary

This WR is not a request for a single article or one-off fact-check page.
For S2M, the required outcome is a full revvel-standards product bundle:
public website, authenticated app surface, API, CLI, MCP server, skill, PDF
export path, and launch automation. The correct product idea is an
evidence-first COVID misinformation response platform that turns trusted source
material into searchable debunks, shareable one-page briefs, and programmable
verification surfaces for users, researchers, and agents.

The repo already contains most of the standards needed to route this build:
the automated product pipeline, app/API/MCP shape standards, UI creation
engine, skill-runner surface, and PDF playbook. What was missing in the
previous WR was the explicit instruction to run through the whole
revvel-standards stack and ship the entire surface area instead of
under-scoping to a single fact-check entry.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
| --- | --- |
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created | 2026-02-20 |
| Last Updated | 2026-05-22 |
| Primary Language | JavaScript |
| Stars | 1 |
| Open Issues | 6405 |
| Description | Single source of truth for Revvel standards, processes, and specifications |
| Private | No |
| Archived | No |

### Current Repo Capabilities Relevant to This WR

- **Pipeline router:** `standards/AUTOMATED_PRODUCT_PIPELINE.md`
- **Product scaffold entrypoint:** `scripts/init-product.sh`
- **Ship-to-market launcher:** `scripts/autonomous-product-launcher.sh`
- **Public UI engine:** `scripts/ui-creation-engine.js`
- **Full app standard:** `standards/shapes/APP.md`
- **API standard:** `standards/shapes/API.md`
- **CLI / MCP standard:** `standards/CLI_MCP_AUTOMATION.md`
- **MCP standard:** `standards/shapes/MCP.md`
- **Skill execution surface:** `products/revvel-skill-runner/README.md`
- **PDF playbook:** `docs/playbooks/pdf-wr-playbook.md`

### Repository Structure Used by This Build

```text
/
├── standards/                  # Canonical build rules and shape standards
├── scripts/                    # Scaffolding, UI generation, launch automation
├── products/revvel-skill-runner/ # Existing skill UI/runtime
├── docs/playbooks/             # PDF and operational playbooks
└── wr/issues/                  # Research and build definition source of truth
```

### What the Product Must Actually Be

The canonical implementation is a **COVID myth verification platform** with
two simultaneous surfaces:

1. **Public trust surface** — search-friendly pages that debunk high-volume
   claims with timestamps, source chains, and plain-language takeaways.
2. **Operational verification surface** — API, CLI, MCP, and skill interfaces
   that let journalists, moderators, researchers, educators, and agents verify
   a claim and export a PDF brief without redoing the research manually.

This satisfies the comment requirement to run through the whole
revvel-standards system, generate the product idea inside revvel-standards, and
define the build process for the actual shipped website, CLI, API, MCP, skill,
and PDF bundle.

---

## Step 1A: Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
| --- | --- | --- | --- | --- |
| Website / app UI | Yes | Next.js trust site + authenticated dashboard | `scripts/ui-creation-engine.js`, `standards/shapes/APP.md` | Public myth pages plus admin/editor workflow |
| API | Yes | REST JSON | `standards/shapes/API.md` | Claim lookup, evidence bundle, and PDF job endpoints |
| CLI | Yes | npm package | `standards/CLI_MCP_AUTOMATION.md` | Researcher / newsroom command line verification |
| MCP | Yes | stdio server | `standards/shapes/MCP.md` | Agent-facing tools for claim verification and export |
| Skill | Yes | Revvel skill | `products/revvel-skill-runner/README.md` | Internal and customer-facing guided verification workflows |
| PDF | Yes | 1-3 page brief + source appendix | `docs/playbooks/pdf-wr-playbook.md` | Shareable evidence packs for schools, clinics, and journalists |
| PowerPoint / deck | No | N/A | N/A | Not required for the canonical product |
| Video | No | N/A | N/A | Optional marketing asset, not part of the required bundle |
| Docs | Yes | README, GTM, security, deployment | revvel-standards baseline docs | Required for market handoff |
| Agent automation | Yes | GitHub Actions / launch orchestration | `standards/AUTOMATED_PRODUCT_PIPELINE.md`, `scripts/autonomous-product-launcher.sh` | Required for repeatable S2M shipping |

### Platform Defaults & Website Requirements

- **Website in Test:** Vercel URL is required at implementation time; current
  gap is that this WR defines the product and build route, not the deployed
  repo.
- **Integration runtime:** Public website on Vercel, API/background jobs on
  DigitalOcean unless a reviewed exception beats it on cost/performance.
- **Admin surface:** Required. Editors need claim intake, source approval,
  correction workflow, and PDF generation controls.
- **User auth:** Required. Support Google, GitHub, and email login for saved
  searches, PDF exports, and team workspaces.
- **Commerce requirements:** Include cart/checkout path, Stripe or Polar.sh
  purchase flow, admin login, and user login because this is a ship-to-market
  website/app, not a content-only microsite.

---

## Step 2: Deep Research

### Market Opportunity Analysis

Trusted public-health organizations continue to treat online health
misinformation as an active operational problem, not a solved media issue.
Recent public-health and fact-checking sources show that vaccine
misinformation still spreads faster than corrections, that communities remain
exposed to false vaccine claims, and that fact-checking organizations are under
financial and operational pressure. That leaves room for a vertical product
that is faster to use than newsroom-style articles and more trustworthy than
generic AI answers.

### Target Audience & Trigger Events

| Audience Segment | Trigger Event | Intent Level | Why they buy / use |
| --- | --- | --- | --- |
| Parents and caregivers | Viral post claims a vaccine or treatment is dangerous | High | Need plain-language debunk fast |
| Journalists and moderators | Need a sourced answer before publishing or moderating | High | Need repeatable verification workflow |
| Clinics, schools, NGOs | Need printable evidence handouts | High | Need branded, shareable PDF output |
| Researchers and policy teams | Track recurring misinformation narratives | Medium | Need API, batch lookup, and source audit trail |
| AI agents / internal automations | Need structured verification tools | Medium | Need MCP + API, not manual browsing |

### SEO / Keyword Direction

The highest-intent landing pages should target recurring misinformation search
patterns rather than broad "COVID news" terms:

- `covid myth fact check`
- `vaccine misinformation explained`
- `did mrna change dna fact check`
- `covid vaccine chromosome 19 claim`
- `printable vaccine myth debunk`
- `health misinformation source checker`

**Positioning rule:** win on speed, source transparency, and exportability.
The site should answer the claim, show the evidence ladder, and let the user
export a one-page brief or call the API immediately.

### Competitor / Gap Analysis

| Competitor / source | What it does well | Gap we can ship against |
| --- | --- | --- |
| Reuters Fact Check | High trust, fast debunks | Not productized for API / CLI / PDF self-service |
| Full Fact | Strong methodology and deepfake tracking | Less focused on turnkey export and agent tooling |
| WHO / CDC myth pages | Authoritative guidance | Harder to search by claim variant or operationalize |
| Newsroom fact-checks broadly | Editorial rigor | Slow reuse across teams and no developer surface |
| Generic LLM chatbots | Instant answers | Weak source discipline and unstable trust posture |

### Community / Industry Signal

- Health misinformation remains a live public-health concern, with public
  agencies still publishing intervention guides and misinformation response
  frameworks.
- Fact-checking orgs are operationally stretched, which creates opportunity for
  a product that packages verification into reusable surfaces instead of
  article-only workflows.
- AI-only moderation still misses meaningful portions of misleading health
  content, so the winning product should combine evidence retrieval,
  structured explanation, and human-auditable sources.

### BOM (Bill of Materials)

| Category | Recommended tool / source | Cost | Why it wins |
| --- | --- | --- | --- |
| Public evidence sources | WHO, CDC, HHS, PAHO, Reuters/Full Fact source citations | Free | Trustworthy source chain for debunks |
| Website hosting | Vercel | From $20/mo | Fast website-in-test and deployment standard |
| API runtime | DigitalOcean App Platform | From $5-12/mo | Default backend runtime in this repo |
| App auth + DB | Supabase or Neon + auth layer | From free tier | Fits app standard and claim storage |
| LLM summarization | OpenRouter | Usage-based | Helps turn evidence into readable summaries |
| PDF rendering | Pandoc / WeasyPrint / Typst | Free | Matches PDF playbook |
| Payments | Polar.sh or Stripe | Rev share / transaction fees | Required for S2M checkout path |

**Estimated monthly infra floor:** roughly $25-$60 before usage-based LLM
costs.  
**ROI check:** one $29/mo team plan plus one $49 PDF / briefing sale already
clears baseline hosting cost.

### Compliance & Trust Surface

This product must ship with:

- explicit medical disclaimer language
- source links on every claim page
- last-reviewed timestamps
- correction request path
- editorial methodology page
- privacy-safe claim logging
- accessibility review for the public website

No claim page should present itself as personalized medical advice.
The product explains evidence and sources; it does not diagnose or treat.

---

## Step 3: Value, Goal Priority, and S2M Recommendation

### Why This Project Matters

This project aligns with the repo's revenue and trust goals because it creates
one core evidence engine and monetizes it across multiple shapes instead of
shipping a single fragile site. The same claim-evidence record powers organic
SEO traffic, premium exports, API access, newsroom workflows, and agent tools.
That compounding reuse is exactly the kind of product line revvel-standards is
designed to ship.

### Contribution to the $10M in 3 Years Goal

| Revenue surface | Offer | Initial pricing idea |
| --- | --- | --- |
| Public website | Free SEO acquisition | Free |
| PDF export | Pay-per-brief or bundle | $19-$49 |
| Team dashboard | Subscription for saved searches, history, exports | $29-$99/mo |
| API | Usage-based or seat-based | $49-$299/mo |
| White-label / enterprise | Branded clinic, newsroom, NGO deployment | Custom |

### Decision

**Ship the full bundle.**  
This WR should not stop at "add a fact-check."
The shipped product is the reusable verification engine plus every required
surface: website, API, CLI, MCP, skill, and PDF.

---

## Step 4: Revvel-Standards Build Process

### Canonical Execution Path

1. **Lock the brief in WR**
   - Use this WR as the canonical scope document.
   - The myth to seed first is the chromosome-19 / mRNA integration claim, but
     the product model must support many claim pages and evidence bundles.

2. **Scaffold the product workspace in revvel-standards**
   - Use `scripts/init-product.sh` for the product workspace and required
     shapes.
   - Use `scripts/autonomous-product-launcher.sh` to generate the ship-to-market
     execution calendar and launch checklist.

3. **Build the website/app**
   - Use `scripts/ui-creation-engine.js` plus `standards/shapes/APP.md`.
   - Required pages: landing page, searchable myth library, claim detail page,
     methodology page, pricing page, login/signup, dashboard, admin editor.
   - Required commerce: checkout/cart flow and subscription/pay-per-export path.

4. **Build the API**
   - Use `standards/shapes/API.md`.
   - Required endpoints:
     - `GET /v1/claims/:slug`
     - `POST /v1/claims/verify`
     - `POST /v1/briefs/render`
     - `GET /v1/sources/:id`
   - API must return structured evidence, confidence notes, and source URLs.

5. **Build the CLI**
   - Use `standards/CLI_MCP_AUTOMATION.md`.
   - Core commands:
     - `covid-fact-check verify "<claim>"`
     - `covid-fact-check sources "<claim>"`
     - `covid-fact-check export --format pdf`

6. **Build the MCP server**
   - Use `standards/shapes/MCP.md`.
   - Core tools:
     - `search_claim`
     - `verify_claim`
     - `list_sources`
     - `render_brief_pdf`

7. **Build the skill**
   - Register a guided verification skill consumable from
     `products/revvel-skill-runner/`.
   - The skill should orchestrate claim lookup, source retrieval, summary, and
     export without forcing the operator to manually stitch steps together.

8. **Build the PDF product**
   - Use `docs/playbooks/pdf-wr-playbook.md`.
   - Output: one-page plain-language debunk plus appendix of citations.
   - The PDF must be sellable or deliverable as a premium report asset.

9. **Deploy and monetize**
   - Vercel for the public app.
   - DigitalOcean for API/background jobs.
   - Polar.sh or Stripe for checkout and billing.
   - README must include the Website in Test Vercel URL.

10. **Certify**
    - Run build/test/lint/security gates for the shipped repo.
    - Verify accessibility, correction workflow, and source transparency before
      market launch.

### A/B Test Hypothesis

**Hypothesis:** a landing page that leads with "check a claim now" will convert
better than one that leads with "learn about misinformation" because the user
intent is urgent verification, not passive reading.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Product looks like medical advice | High | Use disclaimer, cite sources, avoid diagnosis language |
| AI summary drifts from source evidence | High | Keep source-first display and human-auditable citations |
| Scope collapses back to one article | High | Treat all output shapes above as required bundle |
| Trust is damaged by stale claim pages | High | Add last-reviewed date and editorial review queue |
| Paid product has weak conversion | Medium | Use free SEO pages to drive upgrades to PDF/API/team plans |

---

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | `scripts/ui-creation-engine.js`, `standards/shapes/APP.md` | Exists | Use for public site + dashboard + admin |
| API | `standards/shapes/API.md` | Exists | Implement claim/evidence endpoints |
| CLI | `standards/CLI_MCP_AUTOMATION.md`, `scripts/init-product.sh --shape cli` | Exists | Package newsroom/research commands |
| MCP | `standards/shapes/MCP.md` | Exists | Publish verification tools for agents |
| Skill | `products/revvel-skill-runner/` | Exists | Add guided verification skill |
| PDF | `docs/playbooks/pdf-wr-playbook.md` | Exists | Render exportable debunk briefs |
| PowerPoint / deck | No engine required | Out of scope | Do not expand scope here |
| Video | No engine required | Out of scope | Do not expand scope here |
| Docs | revvel-standards baseline repo docs | Exists | Ship README, GTM, deployment, security docs |
| Agent automation | `standards/AUTOMATED_PRODUCT_PIPELINE.md`, `scripts/autonomous-product-launcher.sh` | Exists | Use for repeatable S2M launch flow |

---

## Agent Self-Healing Journal

- **Issue detected:** the original WR was effectively a template dump and
  under-scoped the request to a single fact-check item.
- **Research / correction:** re-read revvel-standards build standards and
  mapped the issue to the full S2M bundle required by the repository and by the
  PR feedback.
- **Revvel-standards change to preserve:** future S2M health-information WRs
  should explicitly select the website, API, CLI, MCP, skill, PDF, docs, and
  automation surfaces instead of assuming a single article or page is enough.
- **Outcome to preserve:** when a user says S2M in this repo, the WR must define
  the whole marketable product and the concrete build route through
  revvel-standards, not just the first content artifact.

---

## References

- `standards/AUTOMATED_PRODUCT_PIPELINE.md`
- `standards/shapes/APP.md`
- `standards/shapes/API.md`
- `standards/CLI_MCP_AUTOMATION.md`
- `standards/shapes/MCP.md`
- `scripts/init-product.sh`
- `scripts/autonomous-product-launcher.sh`
- `scripts/ui-creation-engine.js`
- `products/revvel-skill-runner/README.md`
- `docs/playbooks/pdf-wr-playbook.md`
- WHO infodemic guidance: <https://www.who.int/news-room/feature-stories/detail/infodemic>
- HHS health misinformation guidance:
  <https://www.hhs.gov/surgeongeneral/reports-and-publications/health-misinformation/index.html>
- PAHO vaccine misinformation guidance:
  <https://www.paho.org/en/news/7-10-2025-paho-releases-new-guides-help-combat-vaccine-misinformation>
- BMJ review on vaccine hesitancy interventions:
  <https://www.bmj.com/content/384/bmj-2023-076542>
- Poynter / IFCN State of Fact-Checkers:
  <https://www.poynter.org/wp-content/uploads/2026/03/2026-State-of-Fact-Checkers-4.pdf>
- MedicalXpress summary of AI and crowdsourced fact-checking gaps:
  <https://medicalxpress.com/news/2026-04-health-myths-future-ai-crowdsourced.html>

---

**Research Status:** ✅ Complete  
**Implementation Priority:** P0  
**Approval Required:** @midnghtsapphire
