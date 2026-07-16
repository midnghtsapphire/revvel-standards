# REVVEL Portfolio & Corporate Identity

**Part of:** [REVVEL MASTER STANDARDS](../README.md)  
**Version:** 2.0.0  
**Last Updated:** 2026-05-02

This document contains the corporate identity, entity hierarchy, product portfolio, project tracking systems, and comprehensive tool/resource catalogs for the REVVEL ecosystem.

---

## Table of Contents

1. [Corporate Identity & Entity Hierarchy](#1-corporate-identity--entity-hierarchy)
2. [Learning Resources & Documentation](#2-learning-resources--documentation)
3. [Cutting-Edge Technology Discovery & Evaluation](#3-cutting-edge-technology-discovery--evaluation)
4. [Project Tracking — BOM & Per-Project Docs](#4-project-tracking--bom--per-project-docs)
5. [Brand & Design — Revvel Emblem Standard](#5-brand--design--revvel-emblem-standard)
6. [CI/CD Templates](#6-cicd-templates)
7. [Testing Templates](#7-testing-templates)
8. [Bootstrap a New Project](#8-bootstrap-a-new-project)
9. [GitHub Projects Setup](#9-github-projects-setup)
10. [Freedom Angel Corps Repo Manager UI](#10-2026-04-15-freedom-angel-corps-repo-manager-ui--reusable-master-prompt)

---

## 1. Corporate Identity & Entity Hierarchy

All Revvel applications inherit their corporate identity and SEO authority from the parent entity structure. This section documents the full corporate tree, the reasoning behind it, and how it must be implemented in every app.

### Why Entity Hierarchy Matters

**Problem:** New websites and apps have zero domain authority. Google treats them as untrusted, unranked newcomers. Building authority from scratch takes years.

**Solution:** By linking every app to an established parent corporation through Schema.org Organization markup, we transfer the corporate entity's age, legitimacy, and trust signals to every product. Google's Knowledge Graph connects the dots — a 2010 corporation with SBA certification, veteran affiliations, and multiple business registrations carries far more weight than a standalone app.

**How it works:** Every app includes JSON-LD structured data that declares it as a product/service of the parent organization. The parent organization's `foundingDate`, `taxID`, certifications, and affiliations flow down to every child entity. This is 100% legitimate white-hat SEO — it's simply telling Google the truth about your corporate structure.

### Parent Entity: Freedom Angel Corp (2010)

| Field | Value |
|---|---|
| **Legal Name** | Freedom Angel Corp. |
| **Type** | Non-Profit Corporation |
| **EIN** | 86-1209156 |
| **Founded** | 2010 |
| **State** | Colorado |
| **Founder/CEO** | Audrey Evans |
| **SBA Certified** | Yes (Zonehub) |
| **Motto 1** | "Home of the Free Because of The Brave" |
| **Motto 2** | "End Trafficking and Violence of All Living Things In Mortal Danger of Extinction. Even A Spider In Sudan, Ooray" |
| **American Legion** | Member #302393962 |
| **PMI** | Membership ID #593830 |
| **Colorado Supreme Court** | CLE Training — Moniker: ANGEL |
| **Classification** | Minority-owned, veteran-connected, multi-tiered business corporation |

### Divisions & Sub-Brands

| Entity | Type | Focus | Parent |
|---|---|---|---|
| **Freedom Angel Fighters** | Program | Advocacy & Anti-Trafficking | Freedom Angel Corp |
| **Angel Reporter(s)** | Brand | Investigative Journalism | Freedom Angel Corp |
| **Aloha Notary & Copies** | Service | Notary for Native Hawaiian Veterans & Military | Freedom Angel Corp |

### Information Technology Entities (All Under Freedom Angel Corp)

| Entity | Type | Focus | Copyright |
|---|---|---|---|
| **Angel Reporter LLC** | LLC (CA) | Media & Reporting Technology | 2010, 2018 |
| **XI Website Solutions LLC** | LLC | Web Development & Design | 2010 |
| **Spiderwebz Designs** | DBA | Creative Design & Branding | 2010 |
| **Evans Digital** | DBA | Digital Marketing & Technology | 2010 |
| **Fast Macros** | DBA | Automation & Productivity Tools | 2010 |

### Modern Product Brands (Under IT Entities)

| Brand | Focus | Domain |
|---|---|---|
| **Audrey Evans Official / GlowStarLabs** | Umbrella for all tech products | glowstarlabs.com |
| **Revvel / Hailstorm** | Music artist brand (music only) | — |
| **Reese Reviews** | Product review & Vine business | reesereviews.com |
| **MeetAudreyEvans** | Personal hub & portfolio | meetaudreyevans.com |
| **YumYumCode** | Developer tools & coding | yumyumcode.com |
| **GrowlingEyes** | Security & surveillance | growlingeyes.com |
| **TruthSlayer** | Fact-checking & investigation | truthslayer.com |

### Schema.org Implementation (MANDATORY)

Every Revvel application MUST include the following JSON-LD in the `<head>` of every page:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Freedom Angel Corp",
  "alternateName": ["GlowStarLabs", "Audrey Evans Official"],
  "foundingDate": "2010",
  "founder": {
    "@type": "Person",
    "name": "Audrey Evans",
    "alternateName": "Audrey Walter-Evans",
    "sameAs": [
      "https://meetaudreyevans.com",
      "https://www.linkedin.com/in/audrey-evans-96a56552",
      "https://github.com/MIDNGHTSAPPHIRE"
    ]
  },
  "taxID": "86-1209156",
  "nonprofitStatus": "NonprofitType",
  "memberOf": [
    {"@type": "Organization", "name": "American Legion", "membershipNumber": "302393962"},
    {"@type": "Organization", "name": "Project Management Institute", "membershipNumber": "593830"},
    {"@type": "Organization", "name": "Small Business Administration", "description": "SBA Certified, Zonehub"}
  ],
  "slogan": "Home of the Free Because of The Brave",
  "description": "A minority-owned, veteran-connected, multi-tiered business corporation supporting disabled veterans, at-risk seniors, and underserved communities.",
  "subOrganization": [
    {"@type": "Organization", "name": "Angel Reporter LLC", "foundingDate": "2010"},
    {"@type": "Organization", "name": "XI Website Solutions LLC", "foundingDate": "2010"},
    {"@type": "Organization", "name": "Evans Digital", "foundingDate": "2010"},
    {"@type": "Organization", "name": "Fast Macros", "foundingDate": "2010"},
    {"@type": "Organization", "name": "Spiderwebz Designs", "foundingDate": "2010"}
  ]
}
```

Each individual app adds its own `Product` or `WebApplication` schema that references the parent:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "[APP NAME]",
  "url": "[APP URL]",
  "provider": {
    "@type": "Organization",
    "name": "Freedom Angel Corp",
    "foundingDate": "2010",
    "taxID": "86-1209156"
  },
  "dateCreated": "[APP LAUNCH DATE]",
  "applicationCategory": "[CATEGORY]"
}
```

### Why This Works for SEO

1. **Entity Age (2010):** Google rewards established entities. Every app inherits 15+ years of corporate history.
2. **EIN Verification:** A real tax ID proves this is a legitimate business, not a spam farm.
3. **SBA Certification:** Government certification adds massive trust signals.
4. **Veteran/Military Affiliation:** American Legion membership adds institutional credibility.
5. **PMI Certification:** Professional management credential adds business legitimacy.
6. **Cross-linking:** Every app links to every other app through the parent entity, creating a massive internal link network.
7. **Knowledge Graph:** Google builds a Knowledge Graph entry for the parent entity, and every app benefits from that graph.

---

## 2. Learning Resources & Documentation

Continuous learning is essential for maintaining cutting-edge expertise. These resources provide comprehensive training across all technology domains.

### Online Learning Platforms

**Comprehensive Courses:**
- **Frontend Masters** (<https://frontendmasters.com>) - In-depth web development courses ($39/month)
- **Egghead.io** (<https://egghead.io>) - Concise programming tutorials
- **Pluralsight** (<https://pluralsight.com>) - Technology skills platform
- **Udemy** (<https://udemy.com>) - Marketplace for courses (frequent sales)
- **Coursera** (<https://coursera.org>) - University-level courses and degrees
- **edX** (<https://edx.org>) - University courses from MIT, Harvard, etc.

**Free Learning Resources:**
- **freeCodeCamp** (<https://freecodecamp.org>) - Free coding bootcamp with certifications
- **The Odin Project** (<https://theodinproject.com>) - Free full-stack curriculum
- **MDN Web Docs** (<https://developer.mozilla.org>) - Definitive web platform documentation
- **Web.dev** (<https://web.dev>) - Google's modern web development guides
- **JavaScript.info** (<https://javascript.info>) - Comprehensive JS tutorial
- **CSS-Tricks** (<https://css-tricks.com>) - CSS techniques and tutorials
- **Roadmap.sh** (<https://roadmap.sh>) - Developer roadmaps and learning paths

**Video Learning:**
- **YouTube Channels:**
  - **Fireship** (<https://youtube.com/@fireship>) - 100-second tech explainers
  - **Traversy Media** - Web development tutorials
  - **Web Dev Simplified** - Clear explanations of complex topics
  - **Theo** (<https://youtube.com/@t3dotgg>) - Modern web dev insights
  - **Kevin Powell** - CSS mastery
  - **Ben Awad** - Full-stack development
  - **Jack Herrington** - Advanced TypeScript and React

**Interactive Platforms:**
- **Scrimba** (<https://scrimba.com>) - Interactive coding screencasts
- **Exercism** (<https://exercism.org>) - Code practice with mentorship (FREE)
- **LeetCode** (<https://leetcode.com>) - Coding interview preparation
- **HackerRank** (<https://hackerrank.com>) - Programming challenges
- **CodeWars** (<https://codewars.com>) - Coding challenges and kata
- **Advent of Code** (<https://adventofcode.com>) - Annual coding puzzles

### Documentation & References

**Official Documentation:**
- **React Docs** (<https://react.dev>)
- **Vue Docs** (<https://vuejs.org/guide>)
- **Node.js Docs** (<https://nodejs.org/docs>)
- **TypeScript Handbook** (<https://typescriptlang.org/docs>)
- **Python Docs** (<https://docs.python.org>)
- **Rust Book** (<https://doc.rust-lang.org/book>)
- **Go Documentation** (<https://go.dev/doc>)

**Cheat Sheets & Quick References:**
- **DevDocs** (<https://devdocs.io>) - Searchable documentation browser
- **Devhints** (<https://devhints.io>) - Cheat sheets for developers
- **OverAPI** (<https://overapi.com>) - Collecting all cheat sheets
- **QuickRef** (<https://quickref.me>) - Quick reference guides
- **TLDR Pages** (<https://tldr.sh>) - Simplified man pages

**Books & Deep Dives:**
- **You Don't Know JS** (<https://github.com/getify/You-Dont-Know-JS>) - JavaScript deep dive (FREE)
- **Eloquent JavaScript** (<https://eloquentjavascript.net>) - Modern JS introduction (FREE)
- **Clean Code** by Robert C. Martin - Software craftsmanship
- **The Pragmatic Programmer** - Practical programming wisdom
- **Designing Data-Intensive Applications** - Modern data systems
- **System Design Interview** - Scalable system design

### Community & Support

**Forums & Q&A:**
- **Stack Overflow** (<https://stackoverflow.com>) - Programming Q&A
- **Reddit** - r/webdev, r/javascript, r/reactjs, r/programming
- **Discord Communities:**
  - Reactiflux - React and general web dev
  - The Programmer's Hangout
  - Svelte - Svelte framework community
  - Tailwind CSS - Tailwind community

**Professional Networks:**
- **GitHub** (<https://github.com>) - Code hosting and collaboration
- **LinkedIn** (<https://linkedin.com>) - Professional networking
- **Twitter/X** - Follow tech leaders and stay updated
- **Mastodon** - Decentralized social network for developers

---

## 3. Cutting-Edge Technology Discovery & Evaluation

Staying ahead requires systematic discovery and evaluation of emerging technologies. This section provides direct resources and methodologies for identifying and adopting cutting-edge tools.

### Technology Radar & Trend Platforms

**Industry Technology Radars:**
- **ThoughtWorks Technology Radar** (<https://thoughtworks.com/radar>) - Quarterly assessments of tools, techniques, platforms
- **InfoQ Trends** (<https://infoq.com/presentations>) - Software architecture and development trends
- **Gartner Hype Cycle** (<https://gartner.com>) - Enterprise technology maturity tracking
- **CNCF Landscape** (<https://landscape.cncf.io>) - Cloud-native technology ecosystem map
- **State of JS** (<https://stateofjs.com>) - Annual JavaScript ecosystem survey
- **State of CSS** (<https://stateofcss.com>) - CSS features and tools adoption trends
- **DB-Engines** (<https://db-engines.com>) - Database popularity and trend tracking

**Developer Communities:**
- **Hacker News** (<https://news.ycombinator.com>) - Tech industry pulse, daily updates
- **Reddit** - r/programming, r/webdev, r/MachineLearning, r/artificial
- **Dev.to** (<https://dev.to>) - Developer community and tutorials
- **Hashnode** (<https://hashnode.com>) - Developer blogging and networking
- **Stack Overflow Trends** (<https://insights.stackoverflow.com/trends>) - Technology adoption data

**GitHub & Open Source:**
- **GitHub Trending** (<https://github.com/trending>) - Daily/weekly trending repositories
- **GitHub Topics** (<https://github.com/topics>) - Curated technology collections
- **Awesome Lists** (<https://github.com/sindresorhus/awesome>) - Curated lists of resources
- **Open Source Insights** (<https://deps.dev>) - Dependency analysis and security
- **Libraries.io** (<https://libraries.io>) - Open source discovery across package managers

**AI & Machine Learning:**
- **Papers with Code** (<https://paperswithcode.com>) - Latest ML research with implementations
- **Hugging Face** (<https://huggingface.co>) - ML models, datasets, and demos
- **AI Index** (<https://aiindex.stanford.edu>) - Stanford's annual AI progress report
- **arXiv** (<https://arxiv.org>) - Preprint research papers (cs.AI, cs.LG categories)
- **Anthropic Research** (<https://anthropic.com/research>) - Cutting-edge AI safety research
- **OpenAI Research** (<https://openai.com/research>) - Latest GPT and AI developments
- **Google AI Blog** (<https://ai.googleblog.com>) - DeepMind and Google AI updates

### Technology Newsletters & Aggregators

**Weekly/Daily Digests:**
- **TLDR Newsletter** (<https://tldr.tech>) - Daily tech news in 5 minutes
- **Changelog** (<https://changelog.com>) - Open source and developer news
- **JavaScript Weekly** (<https://javascriptweekly.com>) - JS ecosystem updates
- **React Status** (<https://react.statuscode.com>) - React news and tutorials
- **Node Weekly** (<https://nodeweekly.com>) - Node.js ecosystem updates
- **Frontend Focus** (<https://frontendfoc.us>) - HTML, CSS, WebDev news
- **Postgres Weekly** (<https://postgresweekly.com>) - PostgreSQL updates
- **Go Weekly** (<https://golangweekly.com>) - Go language news
- **Rust Weekly** (<https://this-week-in-rust.org>) - Rust ecosystem updates
- **AI Weekly** (<https://aiweekly.co>) - Artificial intelligence developments

**Podcasts:**
- **Changelog** - Developer stories and open source
- **Syntax.fm** - Web development topics
- **JS Party** - JavaScript community discussions
- **The Diff** - Meta engineering podcast
- **Latent Space** - AI engineering and applications
- **Practical AI** - Applied machine learning

### Evaluation Framework for New Technologies

**Before Adopting Any New Technology, Assess:**

1. **Maturity & Stability:**
   - Project age and version history (avoid pre-1.0 for production)
   - Release cadence and breaking changes frequency
   - Long-term support (LTS) commitments
   - Backward compatibility guarantees

2. **Community & Ecosystem:**
   - GitHub stars, forks, and contributor count
   - Active maintainers and corporate backing
   - Stack Overflow questions and answers volume
   - NPM downloads (for JS packages): <https://npmtrends.com>
   - Package Health Score: <https://snyk.io/advisor>

3. **Documentation & Learning Resources:**
   - Official documentation quality
   - Interactive tutorials and examples
   - Video courses on YouTube, Udemy, Frontend Masters
   - Books and authoritative guides

4. **Security & Compliance:**
   - Known vulnerabilities (check <https://snyk.io>, <https://ossindex.sonatype.org>)
   - Security audit history
   - Dependency risk assessment
   - License compatibility (FOSS preferred)

5. **Performance & Scalability:**
   - Benchmark comparisons
   - Production usage at scale (read case studies)
   - Resource consumption (memory, CPU, bundle size)
   - Edge case handling and limits

6. **Migration Path:**
   - Migration guides from current stack
   - Breaking change policies
   - Exit strategy (can you migrate away easily?)
   - Data portability

### Specific Cutting-Edge Areas to Watch (2026+)

**Web & Frontend:**
- **Astro** (<https://astro.build>) - Multi-framework static site generation
- **Qwik** (<https://qwik.builder.io>) - Resumability-based framework (instant loading)
- **Solid.js** (<https://solidjs.com>) - Fine-grained reactivity (faster than React)
- **Svelte 5** (<https://svelte.dev>) - Runes API, improved reactivity
- **Turbo** (<https://turbo.hotwired.dev>) - Server-rendered HTML over the wire
- **htmx** (<https://htmx.org>) - Hypermedia-driven applications (minimal JS)
- **Alpine.js** (<https://alpinejs.dev>) - Lightweight JavaScript framework

**Backend & APIs:**
- **Bun** (<https://bun.sh>) - All-in-one JavaScript runtime (faster than Node.js)
- **Deno 2.0** (<https://deno.com>) - Secure TypeScript runtime with built-in tools
- **Hono** (<https://hono.dev>) - Ultrafast web framework for edge computing
- **tRPC** (<https://trpc.io>) - End-to-end typesafe APIs without schemas
- **GraphQL Yoga** (<https://the-guild.dev/graphql/yoga-server>) - Modern GraphQL server
- **Nitro** (<https://nitro.unjs.io>) - Universal web server engine
- **Encore** (<https://encore.dev>) - Backend development platform with infrastructure automation

**Databases & Data:**
- **Turso** (<https://turso.tech>) - Edge-hosted SQLite (libSQL)
- **Neon** (<https://neon.tech>) - Serverless Postgres with autoscaling
- **PlanetScale** (<https://planetscale.com>) - MySQL-compatible serverless database
- **Supabase** (<https://supabase.com>) - Open source Firebase alternative (Postgres-based)
- **Drizzle ORM** (<https://orm.drizzle.team>) - TypeScript ORM with edge support
- **Prisma** (<https://prisma.io>) - Next-generation Node.js/TypeScript ORM
- **DuckDB** (<https://duckdb.org>) - In-process analytical database (OLAP)
- **LanceDB** (<https://lancedb.com>) - Vector database for AI applications

**AI & Machine Learning:**
- **Ollama** (<https://ollama.ai>) - Run LLMs locally (Llama, Mistral, etc.)
- **LangChain** (<https://langchain.com>) - Framework for LLM applications
- **LlamaIndex** (<https://llamaindex.ai>) - Data framework for LLM applications
- **Vercel AI SDK** (<https://sdk.vercel.ai>) - TypeScript toolkit for AI apps
- **AutoGen** (<https://microsoft.github.io/autogen>) - Multi-agent conversation framework
- **LiteLLM** (<https://litellm.ai>) - Unified API for 100+ LLMs
- **Instructor** (<https://python.useinstructor.com>) - Structured output from LLMs
- **Langfuse** (<https://langfuse.com>) - LLM engineering platform (observability)

**DevOps & Infrastructure:**
- **Coolify** (<https://coolify.io>) - Self-hostable Heroku/Vercel alternative
- **Kamal** (<https://kamal-deploy.org>) - Deploy web apps anywhere with Docker
- **Pulumi** (<https://pulumi.com>) - Infrastructure as code using real programming languages
- **Nix** (<https://nixos.org>) - Reproducible builds and deployments
- **Terraform** (<https://terraform.io>) - Multi-cloud infrastructure provisioning
- **ArgoCD** (<https://argoproj.github.io>) - GitOps continuous delivery for Kubernetes
- **Temporal** (<https://temporal.io>) - Durable execution for workflows

**Testing & Quality:**
- **Playwright** (<https://playwright.dev>) - Modern end-to-end testing (faster than Selenium)
- **Vitest** (<https://vitest.dev>) - Next-generation testing framework (Vite-native)
- **Testing Library** (<https://testing-library.com>) - User-centric testing utilities
- **Storybook 8** (<https://storybook.js.org>) - Component-driven development
- **Chromatic** (<https://chromatic.com>) - Visual testing and review

**Developer Experience:**
- **Biome** (<https://biomejs.dev>) - Fast formatter/linter (Rust-based, replaces ESLint+Prettier)
- **Bun** package manager - Faster than npm/pnpm
- **Turbo** (<https://turbo.build>) - Incremental bundler and build system
- **Vite 5** (<https://vitejs.dev>) - Lightning-fast build tool
- **esbuild** (<https://esbuild.github.io>) - Extremely fast JavaScript bundler
- **swc** (<https://swc.rs>) - Rust-based JavaScript/TypeScript compiler

**Mobile & Cross-Platform:**
- **Expo** (<https://expo.dev>) - React Native framework with managed workflow
- **Tamagui** (<https://tamagui.dev>) - Universal UI kit for React Native and Web
- **Flutter 3.x** (<https://flutter.dev>) - Google's cross-platform framework
- **Capacitor** (<https://capacitorjs.com>) - Native bridge for web apps
- **Ionic** (<https://ionicframework.com>) - Hybrid mobile framework

### Technology Adoption Strategy

**Gradual Integration Model:**

1. **Evaluate (Week 1):** Research, read documentation, check community health
2. **Prototype (Week 2):** Build small proof-of-concept with the technology
3. **Test (Week 3):** Compare performance, developer experience, and integration complexity
4. **Pilot (Month 2):** Use in one non-critical project or feature
5. **Scale (Month 3+):** Roll out to additional projects if pilot succeeds
6. **Standardize (Month 6+):** Add to official tech stack if proven valuable

**Red Flags to Avoid:**
- ❌ No commits in 6+ months
- ❌ Major unresolved security vulnerabilities
- ❌ Frequent breaking changes with no migration guides
- ❌ Poor documentation or English-only
- ❌ Single maintainer with no community
- ❌ Vendor lock-in with no open-source alternative
- ❌ Requires extensive custom tooling or workarounds

**Green Flags to Prioritize:**
- ✅ Active development with regular releases
- ✅ Responsive maintainers and community
- ✅ Comprehensive documentation and examples
- ✅ Used in production by major companies
- ✅ Clear migration guides and changelogs
- ✅ Strong TypeScript support
- ✅ Performance benchmarks and optimization guides
- ✅ Security-first design and regular audits

---

## 4. Project Tracking — BOM & Per-Project Docs

Every active Revvel project has a dedicated docs directory with a Bill of Materials (BOM), brand identity document, and sprint log.

| Project | Docs Directory | BOM | Brand |
|---|---|---|---|
| GrowlingEyes | [`docs/growlingeyes/`](../docs/growlingeyes/) | [BOM.md](../docs/growlingeyes/BOM.md) | [BRAND.md](../docs/growlingeyes/BRAND.md) |
| Neurooz | [`docs/neurooz/`](../docs/neurooz/) | [BOM.md](../docs/neurooz/BOM.md) | — |
| Revvel Music Studio | [`docs/revvel-music-studio/`](../docs/revvel-music-studio/) | [BOM.md](../docs/revvel-music-studio/BOM.md) | — |
| Universal SAR App | [`docs/universal-sar-app/`](../docs/universal-sar-app/) | [BOM.md](../docs/universal-sar-app/BOM.md) | — |
| Premolt | [`docs/premolt/`](../docs/premolt/) | [BOM.md](../docs/premolt/BOM.md) · [PLAN.md](../docs/premolt/PLAN.md) | — |
| penny-sovereign-yield-scout | [`penny-sovereign-yield-scout/`](../penny-sovereign-yield-scout/) | [CHANGELOG.md](../penny-sovereign-yield-scout/CHANGELOG.md) | [branding/](../penny-sovereign-yield-scout/branding/) |
| Oz OS | [midnghtsapphire/oz-os](https://github.com/midnghtsapphire/oz-os) | Research Intelligence Operating System — intel.md, research-packs, method-packs, 6 agent specs, autonomy tiers | — |
| Bar Chart Race Engine | [midnghtsapphire/bar-chart-race-engine](https://github.com/midnghtsapphire/bar-chart-race-engine) | Animated infographic video generator (8 races: electricity, literacy, life expectancy, internet, CO2, GDP, renewable energy, non-HE washers) | — |

**Master shopping list (all outstanding purchases):** [`docs/_MASTER_BOM.md`](_MASTER_BOM.md)

**Master inventory (all services, APIs, subscriptions, and physical products):** [`docs/_MASTER_INVENTORY.md`](_MASTER_INVENTORY.md)

Regenerate the master BOM: `bash scripts/sync-bom.sh`

---

## 5. Brand & Design — Revvel Emblem Standard

Every Revvel project derives its visual identity from the **Revvel Emblem Standard**.

- **Revvel Emblem Standard:** [`templates/brand/REVVEL_EMBLEM_STANDARD.md`](../templates/brand/REVVEL_EMBLEM_STANDARD.md)
- **Brand Identity Template:** [`templates/brand/BRAND_IDENTITY_TEMPLATE.md`](../templates/brand/BRAND_IDENTITY_TEMPLATE.md)
- **Icon Size Reference:** [`templates/brand/ICON_SIZE_SPEC.md`](../templates/brand/ICON_SIZE_SPEC.md)
- **How to use brand templates:** [`templates/brand/README.md`](../templates/brand/README.md)

---

## 6. CI/CD Templates

All CI/CD workflows for Revvel applications. Copy from `templates/cicd/` into `.github/workflows/` of every app repo.

| Workflow | File | Purpose |
|---|---|---|
| Deploy | `deploy.yml` | Auto-deploy to DigitalOcean on push to `main`; **includes DeployBot tracking** |
| CI | `ci.yml` | TypeScript check + Vitest tests + Playwright E2E |
| Auto-Fix | `auto-fix.yml` | Creates GitHub Issue + Copilot instructions on CI failure |
| Security | `security.yml` | `pnpm audit` + TruffleHog secret scanning |
| PandaOps AI Review | `panda-ops.yml` | OpenAI-powered inline PR feedback on every pull request |
| Deploy Android | `deploy-android.yml` | Manual PWA → Play Store (inactive until account ready) |
| Deploy iOS | `deploy-ios.yml` | Manual PWA → App Store (inactive until account ready) |
| Monitor | `monitor.yml` | Uptime/health-check monitoring |

**DeployBot** ([deploybot.app](https://deploybot.app/)) is integrated into `deploy.yml` — it tracks every GitHub Deployment across all Revvel repos automatically once installed at the organisation level. Install once at: `github.com/apps/deploybot-app → Install → midnghtsapphire`.

**Waydev** ([github.com/marketplace/waydev](https://github.com/marketplace/waydev)) is the developer productivity analytics GitHub App for the `midnghtsapphire` organisation. It is installed once at the organisation level and passively tracks PR cycle time, commit frequency, code churn, and deployment frequency across all repos — no workflow changes required. See [`docs/WAYDEV_SETUP.md`](WAYDEV_SETUP.md) for full setup, pricing, and evaluation instructions.

Full README: [`templates/cicd/README.md`](../templates/cicd/README.md)

---

## 7. Testing Templates

Stack-agnostic test templates proven in GrowlingEyes. Copy and adapt for every project.

| Template | Type | Purpose |
|---|---|---|
| `field-validation.test.ts` | Vitest unit | Validates database field constraints |
| `ui-db-map.test.ts` | Vitest integration | Validates API response shapes match DB |
| `panel-data-void.spec.ts` | Playwright E2E | Validates pages load with real data |

Instructions: [`templates/testing/README.md`](../templates/testing/README.md)

---

## 8. Bootstrap a New Project

One command to scaffold a complete new Revvel app from all standard templates:

```bash
# From your new app repo root:
bash path/to/revvel-standards/scripts/bootstrap-new-project.sh <app_name> <droplet_ip> <production_url>

# Example:
bash ../revvel-standards/scripts/bootstrap-new-project.sh neurooz 164.90.148.7 neurooz.com
```

This creates:
- `SYSTEM_STATE.md` + `CONTEXT_PRIMER.md` (session state standards)
- `.github/workflows/` (7 CI/CD workflows: ci, auto-fix, security, deploy, syntax-check, deploy-android, deploy-ios)
- `scripts/pwa-audit.sh` (PWA readiness checker)
- `docs/MOBILE_DEPLOYMENT.md` (store deployment guide)
- `fastlane/` scaffold (inactive until accounts ready)
- `tests/` structure with all three test templates

---

## 9. GitHub Projects Setup

Labels, milestones, and project board setup for every new Revvel repository.

- **Full guide:** [`docs/GITHUB_PROJECTS_SETUP.md`](GITHUB_PROJECTS_SETUP.md)
- **PR Review Automation:** [`docs/PR_REVIEW_STATUS_AUTOMATION.md`](PR_REVIEW_STATUS_AUTOMATION.md) — Automated PR review status labels and badges
- **Quick Setup:** [`docs/GITHUB_AUTOMATION_QUICKSTART.md`](GITHUB_AUTOMATION_QUICKSTART.md) — 5-minute automation setup script
- **Badge Guide:** [`docs/PR_STATUS_BADGES_GUIDE.md`](PR_STATUS_BADGES_GUIDE.md) — Add dynamic status badges to your README

Standard labels include: `bug`, `enhancement`, `security`, `bom-purchase`, `design`, `blocked`, `auto-fix`, `copilot`, `documentation`

Standard milestones map to the 8 EXRUP phases (Phase 0: Inception through Phase 7: Maintenance).

---

## 10. [2026-04-15] Freedom Angel Corps Repo Manager UI + Reusable Master Prompt

**New UI:** [`ui/freedom-angel-repo-manager/`](../ui/freedom-angel-repo-manager/) — a zero-dependency, GitHub-wired inventory and audit dashboard. Enables non-technical family members to audit any MIDNGHTSAPPHIRE owner/organization against the Revvel Standards via a personal access token (or no token for public repos). Implements all 7 mandatory accessibility modes from [`ACCESSIBILITY_STANDARD.md`](Master_Inventory/ACCESSIBILITY_STANDARD.md).

**Reusable Master Prompt:** [`ui/freedom-angel-repo-manager/MASTER_PROMPT.md`](../ui/freedom-angel-repo-manager/MASTER_PROMPT.md) — the copy-paste prompt that converts any OpenRouter / Grok / Claude / GPT / DeepSeek / Kimi agent into an EXRUP-compliant Revvel Standards agent. Also appended verbatim to [`AGENT_FACTORY_STANDARD.md`](Master_Inventory/AGENT_FACTORY_STANDARD.md) and [`AUDREY_AUTONOMOUS_AGENT_STANDARD.md`](Master_Inventory/AUDREY_AUTONOMOUS_AGENT_STANDARD.md).

**Bootstrap verification:** open `ui/freedom-angel-repo-manager/index.html` locally, load repositories for `midnghtsapphire`, run **Audit all repositories**, and export the JSON report. Full 10-step verification checklist is in the UI's [`README.md`](../ui/freedom-angel-repo-manager/README.md#4-bootstrap-verification-steps).

---
