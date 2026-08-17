# WR: [WR] create this is government risk and compliance skill website, cli, mcp, api, skills and pdf

**Issue:** #13733  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Host Repository:**
[midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Source Repository to Copy/Upgrade:**
[midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance](https://github.com/midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance)  
**Research Date:** 2026-05-23  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Complete

---

## Executive Summary

The repo named in the issue is already a real asset: it ships nine installable GRC
skills, a public website, evaluation artifacts, and tests, and it reports 94% ± 10%
benchmark accuracy across 18 framework-specific test cases. The right WR outcome is
therefore not to criticize the issue wording, but to identify the highest-value product
that should be built by copying that repo as the base.

The strongest product wedge is a **government-first compliance acceleration platform**:
a FedRAMP/NIST-led website, API, CLI, MCP server, skills pack, and PDF export layer
that turns the existing static skill marketplace into a sellable compliance operating
system. This is the highest-value path because government and regulated compliance work
commands premium budgets, current competitors still leave customers doing manual evidence
collection, and the source repo already contains the domain knowledge needed to ship a
credible differentiated product.

---

## Step 1: Source Repository Discovery

### Why this is the repo to copy

The issue explicitly points to
[`midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance`](https://github.com/midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance)
as the base. That instruction is directionally correct. The repo already proves three
things that matter commercially:

1. **The knowledge asset exists already** — nine framework-specific skills are bundled.
2. **The product has visible proof** — a website, install instructions, and eval output.
3. **The knowledge is differentiated enough to monetize** — FedRAMP, HIPAA, ISO 27001,
   NIST CSF, PCI DSS, GDPR, TSA Cybersecurity, SOC 2, and ISO 42001 are all covered.

### Source Repository Metadata

| Property | Value |
| --- | --- |
| Repository | `midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance` |
| GitHub stars | 3 |
| License | MIT |
| Release badge in README | `v0.3.0` |
| Primary shape today | Static website + installable skills + eval artifacts |
| Frameworks covered | 9 |
| Benchmark claim | `94% ± 10%` across 18 tests |
| Current strengths | Expert prompt packs, framework depth, public credibility |
| Current gap | Not yet productized as SaaS/API/CLI/MCP/PDF suite |

The low star count does not change the recommendation. This is a niche compliance asset,
not a mass-market front-end library, and its value comes from specialized framework depth,
the packaged skill corpus, and the existing benchmark/evaluation proof rather than broad
community adoption.

### What exists today in the source repo

```text
Claude-Skills-Governance-Risk-and-Compliance/
├── README.md
├── index.html
├── grc-skills-eval-results.html
├── tests/
│   ├── test_plugin_structure.py
│   └── test_skill_installability.py
├── ISO 27001 - Claude Skill/
├── SOC 2 - Claude Skill/
├── FedRamp - Claude Skill/
├── HIPAA - Claude Skill/
├── GDPR - Claude Skill/
├── NIST Cybersecurity framework - Claude Skill/
├── PCI Compliance - Claude Skill/
├── TSA Compliance - Claude Skill/
└── ISO 42001 - Claude Skill/
```

### What the rewrite should do with it

Do **not** treat this as a vague “compliance repo.” Treat it as a pre-validated
knowledge engine that should be rebranded and expanded into a revenue product with the
following missing surfaces:

- multi-tenant website/app UI
- authenticated admin surface
- API for framework mapping and evidence generation
- CLI for local-first engineering teams
- MCP server for agent/tool use inside developer workflows
- PDF export for audit packets, SSP drafts, POA&Ms, and executive summaries

### Source citations

- Source repo README:
  <https://github.com/midnghtsapphire/Claude-Skills-Governance-Risk-and-Compliance>
- Revvel GRC skill mirrors the same repo and benchmark data:
  `/home/runner/work/revvel-standards/revvel-standards/skills/grc-compliance/SKILL.md`

---

## Step 1A: Highest-Value Product Recommendation

### Recommended product

**Working product name:** `AuthorityPilot Gov`

### Product thesis

Copy the source repo, keep its nine-framework knowledge base, and turn it into a
**government-first compliance copilot** that helps teams scope controls, map evidence,
generate documentation, and export stakeholder-ready outputs across website, API, CLI,
MCP, skills, and PDF surfaces.

### Why this is the highest-value product

1. **Government and regulated work pays more.** The repository pricing standard applies a
   25–40% higher margin to government work and prices a government MVP materially above a
   private one, which matches the commercial reality that regulated delivery carries
   compliance overhead and budget tolerance.
2. **FedRAMP/NIST is the best wedge.** FedRAMP and NIST work is painful, document-heavy,
   and hard to automate well. A FedRAMP-first wedge creates room to upsell into SOC 2,
   HIPAA, ISO 27001, and ISO 42001 once a customer is inside the product.
3. **The source repo already has the scarce asset.** The expensive part is the domain
   packaging across frameworks. That already exists. The missing value is packaging,
   orchestration, workflowing, auth, and monetization.
4. **Competitors are expensive and still manual.** Buyers routinely pay five-figure
   annual subscriptions for compliance automation, yet still complain about manual
   evidence gathering and weak cross-framework reuse.

### Core buyer

- cloud vendors pursuing FedRAMP or NIST 800-53 readiness
- government contractors needing repeatable evidence and policy drafting
- regulated startups that want a faster bridge from SOC 2/ISO 27001 into government work
- compliance consultants who need reusable output and white-label delivery

### Revenue model

| Offer | Price point | Buyer | Why it works |
| --- | ---: | --- | --- |
| Self-serve SaaS Starter | $149/mo | startups, consultants | low-friction entry for one framework |
| Pro multi-framework | $499/mo | scaling vendors | evidence reuse across frameworks |
| Government contractor tier | $1,500/mo | fed/gov teams | FedRAMP/NIST-heavy workflows |
| PDF / policy bundle add-on | $299 one-time or bundled | consultants, legal, ops | direct monetization of exports |
| Done-for-you acceleration sprint | $12k-$35k | teams under deadline | service layer over same engine |
| FedRAMP package / advisory lane | $25k-$75k | enterprise/gov vendors | premium wedge with highest urgency |

### Domain strategy

- `authoritypilot.ai`
- `fedrampcopilot.com`
- `govgrc.ai`
- `atoaccelerator.com`

Best positioning domain for commercial clarity: **`fedrampcopilot.com`** for the
acquisition wedge, with broader product branding kept under `AuthorityPilot Gov`.

---

## Step 1B: Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
| --- | --- | --- | --- | --- |
| Website / app UI | Yes | multi-page web app | `skills/ui-creation-engine/SKILL.md` | required customer-facing product |
| API | Yes | REST + webhook endpoints | `standards/API_GATEWAY.md` | framework mapping, evidence, exports |
| CLI | Yes | npm / Python CLI | `standards/CLI_MCP_AUTOMATION.md` | local-first engineering workflows |
| MCP | Yes | MCP server + tool manifest | `standards/CLI_MCP_AUTOMATION.md` | agent-facing compliance tools |
| Skill | Yes | upgraded skill marketplace | `skills/grc-compliance/SKILL.md` | reuse source repo knowledge asset |
| PDF | Yes | audit packet / executive report | `skills/figma-pdf/SKILL.md` + export workflow | monetizeable compliance outputs |
| PowerPoint / deck | No | — | — | not the first revenue wedge |
| Video | No | — | — | can follow after launch |
| Docs | Yes | README, API docs, implementation docs | revvel standards baseline | required for ship-to-market |
| Agent automation | Yes | workflow + scheduled jobs | `standards/CLI_MCP_AUTOMATION.md` | recurring evidence refresh |

### Platform defaults & website requirements

- **Website in Test:** required, but not yet created in this WR; implementation must ship a
  Vercel URL in the README.
- **Integration runtime:** DigitalOcean default for app runtime, jobs, and database-backed
  services; Vercel remains the website-in-test surface.
- **Admin surface:** required for tenant management, framework libraries, export history,
  billing visibility, and evidence review.
- **User auth:** required; support Apple, Google, and GitHub sign-in, plus admin login.

---

## Step 2: Deep Market Research

### Market opportunity

The broad GRC platform market is still growing quickly, with external market reporting
projecting growth from roughly **$57.37B in 2025** to **$65.86B in 2026**, with a path to
**$105.59B by 2030**.[^market-size] That is large enough to justify a focused product wedge
rather than shipping the source repo as a passive reference site.

Government-facing automation is especially attractive because FedRAMP and adjacent
frameworks are becoming more automation-oriented, while buyers still face expensive,
manual evidence work. That creates a high-value gap for a product that combines
framework-specific skill depth with exportable operational workflows.

### Buyer pain points worth solving

- manual evidence collection still dominates real audit preparation
- control overlap across SOC 2 / ISO 27001 / NIST / HIPAA still causes duplicate work
- vendor “AI” claims create trust problems when outputs are not audit-ready
- buyers need reusable outputs for engineers, auditors, executives, and agents
- premium vendors still leave too much human glue work in the process

### SEO and keyword wedge

These are the commercial-intent keywords the product should target first.

| Keyword | Intent | Est. CPC signal | Why it matters |
| --- | --- | --- | --- |
| FedRAMP automation software | very high | $15-$40 | strongest government wedge |
| AI compliance automation software | high | $12-$25 | broad category capture |
| NIST compliance automation | high | $10-$30 | strong buyer intent for public-sector adjacent teams |
| SOC 2 compliance automation | very high | $20-$40 | adjacent upsell and easier entry market |
| HIPAA compliance automation | very high | $15-$35 | regulated-healthcare expansion lane |

### Long-tail keywords

- FedRAMP POA&M generator
- NIST 800-53 evidence automation
- SSP draft generator
- AI compliance copilot for government contractors
- cross-framework compliance evidence reuse

### Competitive pricing signal

Public pricing discussions and buyer comparisons place mainstream compliance automation
platforms roughly in these bands:

| Competitor | Common pricing discussion range | Market signal |
| --- | ---: | --- |
| Vanta | $10k-$55k+/year | market leader, expensive renewals |
| Drata | $7.5k-$25k+/year | strong automation narrative |
| Secureframe | $7.5k-$32k+/year | guided onboarding strength |
| Hyperproof | $25k-$75k+/year | broader enterprise GRC platform |

This matters because the recommended product does **not** need a mass-market price to be
viable. One government-tier customer or one service sprint can cover infrastructure and
create immediate revenue.

### Monetization path

1. use FedRAMP/NIST landing pages to capture the highest-intent market
2. convert buyers into recurring SaaS subscriptions
3. sell PDF bundles and executive-ready export packs as add-ons
4. layer services and consulting on top of the same engine
5. use the same control mapping core to upsell adjacent frameworks

### Market and pricing citations

- GRC market growth:
  <https://www.researchandmarkets.com/reports/5983723/governance-risk-compliance-platform-market-report>
- AI / GRC buyer and market context:
  <https://digitalxforce.com/wp-content/uploads/2025/07/IDC-MarketScape-Worldwide-Governance-Risk-and-Compliance-Software-Vendor-Assessment-2025_.pdf>
- AI governance trend signal:
  <https://www.kearney.com/service/digital-analytics/article/kearney-ai-trends-report-2026>
- Buyer trust / hype gap signal:
  <https://infuse.com/insight/infuse-insights-report-voice-of-the-buyer-2026/>
- FedRAMP automation signal:
  <https://www.fedramp.gov/ai/>
- Public competitor pricing discussions:
  <https://soc2auditors.org/insights/soc-2-software-pricing-comparison/>
  <https://sprinto.com/blog/secureframe-vs-vanta-vs-drata/>

---

## Step 2B: Bill of Materials (BOM)

| Category | Recommended tool | Monthly cost | Why it wins |
| --- | --- | ---: | --- |
| Website UI | Vercel Pro | $20 | fastest website-in-test delivery |
| App runtime | DigitalOcean App Platform or Droplet | $24-$48 | default revvel runtime for backend work |
| Database | DigitalOcean Managed PostgreSQL | $15+ | managed relational store for evidence and exports |
| API gateway | Kong OSS | $0 | free gateway aligned to repo standard |
| Auth | Auth.js + OAuth providers | $0 software cost | supports Apple/Google/GitHub without extra SaaS lock-in |
| PDF export | Playwright / Chromium PDF | $0 | reliable server-side export path |
| Payments | Stripe + Polar.sh | transaction-based | aligns with developer-tool monetization |
| Monitoring | basic logs + Sentry starter | $0-$26 | enough for first production pass |

### BOM verdict

- **Best low-friction build:** Vercel + DigitalOcean + Kong + Auth.js + Playwright
- **Estimated base infra:** roughly **$59-$109/month** before payment processing
- **ROI break-even:** 1 PDF bundle sale or 1-2 days of consulting covers a month; one
  government-tier SaaS customer covers many months.

---

## Step 3: revvel-standards Alignment

### Prime directive alignment

This product is aligned because it converts an existing research asset into a premium,
recurring, government-facing software and services offer.

- **Fastest path to first revenue:** sell PDF bundles and compliance sprints
- **Best recurring path:** SaaS subscription for evidence reuse and agent workflows
- **Best strategic moat:** multi-surface delivery built from the same nine-framework core

### What must be built in the implementation repo

- website with clear FedRAMP / NIST / SOC 2 / HIPAA solution pages
- authenticated user area and admin area
- API for control mapping, evidence upload, and export jobs
- CLI for local repository scanning and draft generation
- MCP server for agentic use inside coding and compliance workflows
- PDF export for SSP summaries, POA&M drafts, and executive reports
- README that explains what the repository does now, how to use it now, and where the
  Vercel website-in-test lives

### Validation expectations

- docs lint clean for the WR file
- source repo parity maintained for skill content
- no unsupported “fully automated legal advice” claims
- explicit human-review disclaimer for regulated outputs
- end-to-end test coverage required once the UI/API implementation exists

---

## Step 4: Risks and Decisions

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Over-claiming legal/compliance certainty | High | require UI and PDF disclaimers that outputs are drafts, add ToS language that the product is not legal advice, and force a human-review step before any external submission |
| Sensitive customer evidence handling | High | RBAC, audit logs, encryption, least privilege |
| FedRAMP marketing without process rigor | High | keep claims scoped to readiness and workflow acceleration |
| Multi-framework sprawl at launch | Medium | launch FedRAMP/NIST-first, upsell others after core works |

### Decision

**Do not** frame the WR as “the issue lacks detail.”

**Do** frame it as:

> Copy the named GRC skills repo, rebrand it, and ship the highest-value product that the
> existing asset can support: a government-first compliance acceleration platform with
> website, API, CLI, MCP, skills, and PDF outputs.

---

## Implementation Priorities

### P0

1. create the new product repository from the source repo
2. rename and rebrand around the government compliance wedge
3. preserve the existing skill corpus and evaluation assets
4. build the website, auth, admin, API, CLI, MCP, and PDF surfaces
5. publish a Vercel website-in-test URL

### P1

1. add cross-framework evidence reuse
2. add billing, plan gating, and PDF upsells
3. add recurring evidence refresh jobs and agent automation

### P2

1. add consultant white-label delivery
2. add partner / reseller lane
3. add deck/video outputs if they help distribution

---

## Artifact Engine Map

| Artifact shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | `skills/ui-creation-engine/SKILL.md` | exists | use it to generate the customer-facing app |
| API | `standards/API_GATEWAY.md` | exists | front the app API with Kong OSS |
| CLI | `standards/CLI_MCP_AUTOMATION.md` | exists | create a repo scanner + export CLI |
| MCP | `standards/CLI_MCP_AUTOMATION.md` | exists | expose control mapping and export tools via MCP |
| Skill | `skills/grc-compliance/SKILL.md` | exists | keep the nine-framework skill base and refresh branding |
| PDF | `skills/figma-pdf/SKILL.md` | partial | adapt pipeline for compliance report exports |
| PowerPoint / deck | no selected engine | not in scope | skip for first launch |
| Video | no selected engine | not in scope | skip for first launch |
| Docs | revvel standards baseline docs | exists | require README, changelog, deployment, GTM, security |
| Agent automation | `standards/CLI_MCP_AUTOMATION.md` | exists | add scheduled evidence refresh and export jobs |

---

## Agent Self-Healing Journal

- **Issue detected:** the prior WR draft drifted into pushback about issue detail instead of
  performing the actual product selection work.
- **Correction made:** this rewrite anchored the WR to the repo the issue explicitly named
  and selected a monetizable product wedge based on that repo’s real assets.
- **What was kept:** the requirement to ship website, CLI, MCP, API, skills, and PDF
  outputs.
- **What was rejected:** framing that treated the issue as too vague to act on.
- **Durable lesson for revvel-standards:** when a WR says “copy this repo,” the research
  engine should first identify the repo’s proven asset, then choose the highest-value
  product wedge that asset can support, instead of criticizing the prompt.

[^market-size]:
    Research and Markets, "Governance Risk and Compliance Platform Market Report 2026" —
    <https://www.researchandmarkets.com/reports/5983723/governance-risk-compliance-platform-market-report>
