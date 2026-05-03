# REVVEL MASTER STANDARDS & SPECIFICATIONS
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Status:** SINGLE SOURCE OF TRUTH (SSOT)  
**Version:** 2.0.0 (March 2, 2026)  
**Major Update:** Comprehensive resource expansion with 500+ direct links to cutting-edge tools and platforms

---

## Quick Links

📋 **[PORTFOLIO.md](docs/PORTFOLIO.md)** — Corporate identity, entity hierarchy, product brands, project tracking, and comprehensive tool/resource catalogs  
📚 **[Master Inventory](docs/Master_Inventory/)** — All detailed standards and specifications  
🛠️ **[Scripts](scripts/)** — Automation scripts for bootstrapping, compliance checking, and repo management

---

## 🎯 Revvel Rosette Automation (NEW!)

---

## 🚀 Agent Fallback System (NEW!)

**Automatic Devin → Cursor → OpenRouter fallback** ensures zero-downtime automation when AI agents hit rate limits.

### Quick Setup
```bash
./scripts/setup-agent-fallback.sh midnghtsapphire/YOUR-REPO
gh secret set DEVIN_API_KEY --repo YOUR-REPO
gh secret set CURSOR_API_KEY --repo YOUR-REPO
```

**Automatic Triggers:**
- ✅ Issues labeled with `wr:code`, `wr:auto`, or `agent-fallback`
- ✅ PRs opened or marked ready for review
- ✅ Manual via GitHub Actions UI or `gh` CLI
- ✅ Reusable from other workflows

**Fallback Chain:**
1. **Devin AI** (primary) — Complex multi-file changes, full autonomy
2. **Cursor** (secondary) — Fast iteration, smaller features  
3. **OpenRouter** (tertiary) — Multi-model backup, effectively unlimited
4. **Manual escalation** — Creates `needs-human` issue with full diagnostics

📖 **Documentation:**
- [`docs/AGENT_FALLBACK_QUICKSTART.md`](docs/AGENT_FALLBACK_QUICKSTART.md) — Quick start guide
- [`docs/AGENT_FALLBACK_PROCESS.md`](docs/AGENT_FALLBACK_PROCESS.md) — Complete documentation
- [`.github/workflows/agent-fallback.yml`](.github/workflows/agent-fallback.yml) — Implementation

**Use in workflows:**
```yaml
- uses: ./.github/workflows/agent-fallback.yml
  with:
    task_description: ${{ github.event.issue.body }}
    issue_number: ${{ github.event.issue.number }}
```

---

**Key Standards** — All standards live in [`docs/Master_Inventory/`](docs/Master_Inventory/)
- [`AGENT_FACTORY_STANDARD.md`](docs/Master_Inventory/AGENT_FACTORY_STANDARD.md) — trigger-driven agent factory (commands, settings, hooks, plugins) with self-healing guidance.
- [`OSINT_STANDARD.md`](docs/Master_Inventory/OSINT_STANDARD.md) — automated OSINT pipelines, threat intelligence feeds, dark web monitoring, vulnerability enrichment, and social media intelligence.
- [`AUTOMATED_AUDIT_AGENT_STANDARD.md`](docs/Master_Inventory/AUTOMATED_AUDIT_AGENT_STANDARD.md) — 24/7 autonomous code review and security auditing agents, compliance monitoring, self-healing patterns, and automated remediation workflows.
- [`API_GATEKEEPER_STANDARD.md`](docs/Master_Inventory/API_GATEKEEPER_STANDARD.md) — API security control plane: request validation, token management, rate limiting, RBAC/ABAC, OSINT blocklist enforcement, FOSS alternatives, and custom API standards.
- [`REPOSITORY_PRIVACY_MIGRATION_STANDARD.md`](docs/Master_Inventory/REPOSITORY_PRIVACY_MIGRATION_STANDARD.md) — **mandatory** process for making all repositories private, auditing git history for unauthorized contributors, and migrating from `midnghtsapphire` to the `Freedom Angel Corps` enterprise organization.
- [`TEST_ENVIRONMENTS_STANDARD.md`](docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md) — four-stage test pipeline (dev → staging → live-test → production), the **S.H.I.F.T. test harness**, and deployment targets (GitHub Actions/Pages → oaudrey subdomain → Freedom Angel Corps / DigitalOcean).

## 1. EXRUP / XRP Methodology (Extreme Rapid Programming)
**EXRUP** is the core execution framework for all Revvel and MIDNGHTSAPPHIRE projects. It is designed for maximum speed, one-iteration production delivery, and comprehensive artifact generation.

### Core Principles
- **One-Iteration Delivery:** The goal is to move from idea to production-ready deployment in a single, intense iteration.
- **Artifact-First:** Every project must generate a complete set of artifacts (Blueprints, Roadmaps, Specs) before or alongside code.
- **Genius Orchestration:** Use multi-agent AI systems (OpenRouter, Kimi, Venice, Grok, Sonnet 4 and 4.5, DeepSeek) to handle complex research, design, and coding tasks autonomously.
- **FOSS Priority:** Always prioritize Free and Open Source Software tools and libraries.

### Essential AI & Development Tools
**Multi-Agent AI Systems:**
- **OpenRouter** (https://openrouter.ai) - Unified API for multiple LLMs, cost-effective routing
- **Anthropic Claude** (Sonnet 4, 4.5) - Advanced reasoning, long context windows up to 200k tokens
- **DeepSeek** (https://deepseek.com) - Cutting-edge open models with competitive performance
- **Grok** (https://grok.x.ai) - Fast inference, real-time data access
- **Kimi** (https://kimi.ai) - Long-context Chinese/English model (200k+ tokens)
- **Venice.ai** (https://venice.ai) - Privacy-focused AI with uncensored models

**Development & Coding Assistants:**
- **Cursor** (https://cursor.sh) - AI-first code editor with GPT-4 integration
- **GitHub Copilot** - Context-aware code completion
- **Codeium** (https://codeium.com) - Free AI autocomplete for 70+ languages
- **Tabnine** (https://tabnine.com) - Privacy-focused code completion
- **Replit Ghostwriter** - AI pair programmer for collaborative coding

**Research & Knowledge Tools:**
- **Perplexity AI** (https://perplexity.ai) - Research assistant with citations
- **Elicit** (https://elicit.org) - AI research assistant for academic papers
- **Consensus** (https://consensus.app) - Evidence-based answers from research papers
- **Scite** (https://scite.ai) - Smart citations showing supporting/contrasting evidence

### The 8-Phase Lifecycle
| Phase | Name | Focus | Key Deliverable |
|-------|------|-------|-----------------|
| **0** | Inception | Idea Validation & Legal | Entity Registration, EIN |
| **1** | Planning | Strategic Blueprints | Roadmap, Technical Architecture |
| **2** | Design | Visual & UX | Wireframes, Mockups, Prototypes |

### Frontend Frameworks & Libraries

**React Ecosystem:**
- **React** (https://react.dev) - Component-based UI library
- **Next.js** (https://nextjs.org) - Full-stack React framework (recommended)
- **Remix** (https://remix.run) - Full-stack web framework
- **Gatsby** (https://gatsbyjs.com) - Static site generator
- **Create React App** (deprecated - use Vite instead)

**Vue Ecosystem:**
- **Vue 3** (https://vuejs.org) - Progressive JavaScript framework
- **Nuxt 3** (https://nuxt.com) - Vue meta-framework
- **Vite** (https://vitejs.dev) - Next-generation build tool
- **Quasar** (https://quasar.dev) - Vue component framework

**Other Frameworks:**
- **Svelte** (https://svelte.dev) - Compiled framework (no virtual DOM)
- **SvelteKit** (https://kit.svelte.dev) - Svelte application framework
- **Solid.js** (https://solidjs.com) - Reactive UI library
- **Angular** (https://angular.io) - Full-featured framework by Google
- **Preact** (https://preactjs.com) - 3KB React alternative
- **Alpine.js** (https://alpinejs.dev) - Lightweight JavaScript framework
- **Astro** (https://astro.build) - Content-focused web framework
- **Qwik** (https://qwik.builder.io) - Resumable web framework

**UI Component Libraries:**
- **shadcn/ui** (https://ui.shadcn.com) - Re-usable components (Radix + Tailwind)
- **Radix UI** (https://radix-ui.com) - Unstyled, accessible components
- **Headless UI** (https://headlessui.com) - Unstyled components by Tailwind Labs
- **Material UI** (https://mui.com) - React components implementing Material Design
- **Ant Design** (https://ant.design) - Enterprise-class UI design system
- **Chakra UI** (https://chakra-ui.com) - Simple and modular components
- **Mantine** (https://mantine.dev) - Fully-featured React components library
- **Daisy UI** (https://daisyui.com) - Tailwind CSS component library

**CSS Frameworks:**
- **Tailwind CSS** (https://tailwindcss.com) - Utility-first CSS framework (recommended)
- **UnoCSS** (https://unocss.dev) - Instant on-demand atomic CSS
- **Bootstrap** (https://getbootstrap.com) - Classic responsive framework
- **Bulma** (https://bulma.io) - Modern CSS framework
- **Foundation** (https://get.foundation) - Responsive front-end framework
| **3** | Development | Rapid Coding | Functional MVP, GitHub Repo |
| **4** | Testing | QA & Security | Unit/E2E Tests, Security Scan |

### Testing & Quality Assurance Tools

**Unit Testing:**
- **Vitest** (https://vitest.dev) - Fast unit test framework (Vite-powered)
- **Jest** (https://jestjs.io) - JavaScript testing framework
- **Mocha** (https://mochajs.org) - Feature-rich test framework
- **Chai** (https://chaijs.com) - BDD/TDD assertion library
- **AVA** (https://avajs.dev) - Minimalist testing framework

**End-to-End Testing:**
- **Playwright** (https://playwright.dev) - Cross-browser automation (recommended)
- **Cypress** (https://cypress.io) - Front-end testing tool
- **Puppeteer** (https://pptr.dev) - Chrome DevTools Protocol automation
- **WebdriverIO** (https://webdriver.io) - Next-gen browser automation
- **TestCafe** (https://testcafe.io) - Node.js E2E testing framework

**API Testing:**
- **Postman** (https://postman.com) - API development and testing platform
- **Insomnia** (https://insomnia.rest) - API client and testing tool
- **HTTPie** (https://httpie.io) - Human-friendly HTTP client
- **REST Client** (VS Code extension) - Send HTTP requests from editor
- **Hoppscotch** (https://hoppscotch.io) - Open-source API development ecosystem

**Security Testing:**
- **OWASP ZAP** (https://zaproxy.org) - Web app security scanner (FREE, open source)
- **Snyk** (https://snyk.io) - Dependency vulnerability scanning (FREE tier)
- **Semgrep** (https://semgrep.dev) - Static analysis for code security
- **npm audit** - Built-in npm vulnerability checker
- **Trivy** (https://trivy.dev) - Container and dependency scanner
- **SonarQube** (https://sonarqube.org) - Code quality and security analysis

**Performance Testing:**
- **Lighthouse** (Chrome DevTools) - Web performance auditing
- **WebPageTest** (https://webpagetest.org) - Website performance testing
- **k6** (https://k6.io) - Load testing tool for developers
- **Artillery** (https://artillery.io) - Load testing and smoke testing
- **Locust** (https://locust.io) - Python-based load testing tool

**Code Quality:**
- **ESLint** (https://eslint.org) - JavaScript linting
- **Biome** (https://biomejs.dev) - Fast linter/formatter (Rust-based)
- **Prettier** (https://prettier.io) - Code formatter
- **SonarLint** (VS Code extension) - Real-time code analysis
- **CodeClimate** (https://codeclimate.com) - Automated code review
| **5** | Deployment | Production Launch | App Store/Web Deployment |
| **6** | Compliance | Legal & Ethics | Privacy Policy, SOC2/HIPAA |
| **7** | Maintenance | Continuous Improvement | Monitoring, Patches, Updates |

---


**For comprehensive lists of AI tools, development frameworks, testing tools, databases, and learning resources, see [PORTFOLIO.md](docs/PORTFOLIO.md).**

---

## 2. Branding & Naming Conventions

### General Naming Rules
- **Catchy & Addictive:** Names must be short, punchy, and memorable.
- **The "Up" Prefix:** For specialized tools and MCPs, use the "Up" prefix (e.g., *UpSEO*, *UpQA*, *UpFastMoney*).
- **SEO Optimization:** Always use top-trending, high-volume search terms in project titles and descriptions.

### SSRN & Academic Paper Naming
**MANDATORY FORMAT:** `Walter_Evans_[ShortTitle]_[YYYYMMDD].pdf`
- *Example:* `Walter_Evans_Quantum_Cognition_20260123.pdf`

### Domain Selection Process
1. **Research:** Use AI to identify "hot trending" SEO keywords for the current and future year (up to 2030).
2. **Availability:** Check for exact-match or high-relevance domains.
3. **Branding:** Ensure the domain aligns with the "punchy, creative, short" naming standard.

### SEO & Trend Research Tools
**Keyword Research:**
- **Ahrefs** (https://ahrefs.com) - Comprehensive SEO toolkit, keyword difficulty, backlink analysis
- **SEMrush** (https://semrush.com) - All-in-one marketing toolkit, competitor analysis
- **Google Keyword Planner** (https://ads.google.com/keywordplanner) - Free keyword volume data
- **Ubersuggest** (https://neilpatel.com/ubersuggest) - Free keyword suggestions and SEO data
- **AnswerThePublic** (https://answerthepublic.com) - Visualize search questions and autocomplete

**Trend Analysis:**
- **Google Trends** (https://trends.google.com) - Real-time search trend data
- **Exploding Topics** (https://explodingtopics.com) - Identify trending topics before they peak
- **TrendHunter** (https://trendhunter.com) - Crowdsourced trend spotting
- **Product Hunt** (https://producthunt.com) - Daily trending products and startups
- **Hacker News** (https://news.ycombinator.com) - Tech industry trends and discussions

**Domain Tools:**
- **Namecheap** (https://namecheap.com) - Domain registration with privacy protection
- **GoDaddy Domain Search** - Bulk domain availability checking
- **Lean Domain Search** (https://leandomainsearch.com) - Domain name generator
- **Instant Domain Search** (https://instantdomainsearch.com) - Real-time domain availability

---

## 3. Accessibility Module Specifications
All Revvel applications must implement the following accessibility modes to serve neurodivergent and underserved populations.

### Accessibility Modes
- **WCAG AAA:** High contrast, large text (18px+), focus indicators, and reduced motion.
- **ADHD Mode:** Simplified layout, focus-mode timers (Pomodoro integration), and "sensory-safe" UI.
- **Dyslexic Mode:** Uses special fonts (e.g., *OpenDyslexic*, *Atkinson Hyperlegible*) with increased line height (1.9) and letter spacing (0.2em).
- **Neuro Mode:** Sensory-safe environment—no animations, no transitions, increased contrast, and simplified navigation.
- **ECO CODE Mode:** Low-power mode—minimal animations, no box shadows, no filters, and optimized for battery life.
- **No Blue Light Mode:** Warm color palette (amber/sepia accents) to reduce eye strain.
- **Menstrual UI:** Healing UI designed with soft pastels, cycle trackers, and confidence-boosting affirmations.

### Accessibility Resources & Tools
**Accessibility Testing:**
- **axe DevTools** (https://deque.com/axe) - Browser extension for automated accessibility testing
- **WAVE** (https://wave.webaim.org) - Web accessibility evaluation tool
- **Lighthouse** (Chrome DevTools) - Built-in accessibility auditing
- **Pa11y** (https://pa11y.org) - Automated accessibility testing tool
- **Tenon.io** (https://tenon.io) - Accessibility as a service API

**Font Resources:**
- **OpenDyslexic** (https://opendyslexic.org) - Free font for dyslexic readers
- **Atkinson Hyperlegible** (https://brailleinstitute.org/freefont) - Free, highly readable font
- **Lexend** (https://lexend.com) - Font family designed to reduce visual stress
- **Google Fonts** (https://fonts.google.com) - Filter by readability and accessibility

**Color & Contrast Tools:**
- **WebAIM Contrast Checker** (https://webaim.org/resources/contrastchecker) - WCAG compliance checking
- **Contrast Ratio** (https://contrast-ratio.com) - Real-time contrast calculation
- **Colorable** (https://colorable.jxnblk.com) - Color palette contrast tester
- **Who Can Use** (https://whocanuse.com) - Vision simulator for color combinations

**Accessibility Guidelines:**
- **WCAG 2.2 Guidelines** (https://w3.org/WAI/WCAG22/quickref) - Official accessibility standards
- **A11y Project** (https://a11yproject.com) - Community-driven accessibility resource
- **Inclusive Components** (https://inclusive-components.design) - Accessible UI patterns

---

## 4. Business Model & Token Economy
Revvel operates on a unified, token-based freemium model.

### Subscription Tiers (Unified Platform)
| Tier | Price/Month | Tokens | Key Features |
|------|-------------|--------|--------------|
| **Free** | $0 | 50 | Basic access, community support |
| **Starter** | $9 | 100 | Core modules (Skin, Makeup) |
| **Pro** | $29 | 500 | All modules, priority support |
| **Business** | $99 | 2,000 | API access, white-labeling |
| **Enterprise**| $299 | 10,000 | Dedicated support, custom integrations |

### Monetization Rules
- **Token Usage:** Each AI action (generation, analysis) consumes a specific number of tokens (typically 2-5).
- **Affiliate Auto-Linker:** Every product mention must automatically generate an Amazon affiliate link (Tag: `meetaudreyeva-20`).
- **Self-Service Ads:** The "Selling Space" portal allows businesses to buy banner/sponsored space directly.

### Affiliate Marketing Automation Engine (MANDATORY)
Every Revvel application MUST include a built-in affiliate marketing automation module.

#### Active Affiliate & Referral Links
| Platform | URL | Code |
|---|---|---|
| **Amazon** | Auto-generated per product | Tag: `meetaudreyeva-20` |
| **Make.com** | https://www.make.com/en/register?pc=risingaloha | risingaloha |
| **GoHighLevel** | https://www.gohighlevel.com/?fp_ref=audrey51 | audrey51 |
| **VideoGen** | https://videogen.io/?fpr=audrey21 | audrey21 |
| **Chime** | https://www.chime.com/r/audreyevans44/?c=s | audreyevans44 |
| **DigitalOcean** | https://m.do.co/c/fe8240d60588 | fe8240d60588 |
| **Monday.com** | https://try.monday.com/9828lfh0uct0 | 9828lfh0uct0 |

#### Auto-Campaign Generator
Every app must include a Marketing Dashboard with campaign generation buttons at these tiers:
- **20 campaigns** — Quick burst
- **50 campaigns** — Standard push
- **100 campaigns** — Growth mode
- **200 campaigns** — Aggressive scaling
- **500 campaigns** — Full blast

Each campaign auto-generates using OpenRouter LLM:
1. Ad copy / social media post text
2. Email marketing content with affiliate links embedded
3. Hashtags and SEO keywords
4. Platform-specific formatting
5. Scheduled delivery queue

### Marketing & Automation Tools

**Marketing Automation:**
- **Make.com** (https://make.com) - Visual automation platform (FREE tier: 1000 ops/month)
- **Zapier** (https://zapier.com) - App integration and workflow automation
- **n8n** (https://n8n.io) - Open-source workflow automation (self-hostable)
- **Pipedream** (https://pipedream.com) - Developer-first automation platform
- **ActivePieces** (https://activepieces.com) - Open-source Zapier alternative

**Email Marketing:**
- **SendGrid** (https://sendgrid.com) - Email delivery service (FREE: 100 emails/day)
- **Mailgun** (https://mailgun.com) - Developer-focused email API
- **Postmark** (https://postmarkapp.com) - Transactional email service
- **Resend** (https://resend.com) - Modern email API for developers (FREE: 3000/month)
- **Loops** (https://loops.so) - Email for SaaS products
- **Brevo** (https://brevo.com) - All-in-one marketing platform (FREE tier)

**Social Media Management:**
- **Buffer** (https://buffer.com) - Social media scheduling (FREE: 3 channels)
- **Hootsuite** (https://hootsuite.com) - Social media management suite
- **Later** (https://later.com) - Visual social media planner
- **Metricool** (https://metricool.com) - Social media analytics and scheduling
- **Publer** (https://publer.io) - Multi-platform social media manager

**Analytics & Tracking:**
- **Google Analytics 4** (https://analytics.google.com) - Web analytics (FREE)
- **Plausible** (https://plausible.io) - Privacy-friendly analytics
- **Umami** (https://umami.is) - Open-source web analytics
- **PostHog** (https://posthog.com) - Product analytics platform (FREE tier)
- **Mixpanel** (https://mixpanel.com) - User behavior analytics
- **Hotjar** (https://hotjar.com) - Heatmaps and user recordings

**Affiliate Management:**
- **Tapfiliate** (https://tapfiliate.com) - Affiliate tracking software
- **Rewardful** (https://rewardful.com) - Stripe-based affiliate program
- **FirstPromoter** (https://firstpromoter.com) - SaaS affiliate management
- **Refersion** (https://refersion.com) - Affiliate and influencer platform

#### Social Media Distribution
Campaigns must support posting to ALL platforms or individually:
- **All Platforms** — One-click blast to every channel
- **Facebook** — Individual targeting
- **Instagram** — Individual targeting
- **TikTok** — Individual targeting (hashtag: #MeetAudreyEvans)
- **Twitter/X** — Individual targeting
- **LinkedIn** — Individual targeting
- **Pinterest** — Individual targeting

Integration via Make.com webhooks or GoHighLevel API for scheduling and delivery.

#### Email Campaign Automation
- Auto-create email campaigns with affiliate links
- Templates: product reviews, deals, recommendations, seasonal promotions
- Bulk generation at 20/50/100/200/500 tiers
- Track open rates, click-through, and affiliate conversions

### Email Collection & Newsletter System (MANDATORY)
Every Revvel application MUST include email collection and newsletter functionality.

#### Email Collection
- **Subscribe form** on every app — footer, popup, or dedicated page
- **Fields:** Email (required), Name (optional), Interests (optional checkboxes)
- **Double opt-in** with confirmation email for GDPR/CAN-SPAM compliance
- **Centralized subscriber database** — all apps feed into ONE master email list
- **Segmentation:** Subscribers tagged by which app they signed up from
- **Storage:** SQLite/PostgreSQL with encrypted email storage
- **Export:** CSV export for backup or migration to Mailchimp/SendGrid/GoHighLevel

#### Auto-Newsletter Generation
- **Triggered on every new site/app launch** — auto-generate and send announcement
- **Weekly digest** — auto-compiled from all app activity across the ecosystem
- **New content alerts** — when reviews, blog posts, or products are added
- **Templates auto-generated via OpenRouter LLM:**
  1. New App Launch announcement
  2. Weekly Ecosystem Update
  3. Product Review Roundup (Reese Reviews)
  4. Deal/Affiliate Spotlight
  5. Seasonal/Holiday promotions
- **Affiliate links embedded in every newsletter automatically**
- **Unsubscribe link** in every email (legally required)
- **Delivery:** Via SMTP, SendGrid, or GoHighLevel email API

#### Subscriber Dashboard
- Total subscribers count
- Growth chart (daily/weekly/monthly)
- Segmentation breakdown (by app, by interest)
- Email delivery stats (sent, opened, clicked, bounced)
- One-click send to all subscribers or filtered segments

### SEO Infrastructure (MANDATORY)
Every Revvel application MUST include comprehensive SEO infrastructure for organic traffic growth.

#### About Section (Multi-Page)
Every app must have a deep About section with multiple sub-pages:
- **About Us** — Company story, mission, values
- **About the Team** — Founder bio, team members
- **About the Technology** — How the app works, tech stack
- **About Our Mission** — Social impact, accessibility commitment
- **About Our Partners** — Affiliates, integrations, collaborators
- **Press & Media** — Press releases, media mentions, press kit
- **Careers** — Job listings (even placeholder for growth)
- **Testimonials** — User reviews and success stories
- **Awards & Recognition** — Certifications, compliance badges
- **Contact** — Multiple contact methods, support form

#### Blog System
- **Auto-generated blog posts** via OpenRouter LLM on app launch and weekly
- **SEO-optimized** with target keywords, meta descriptions, schema markup
- **Categories:** How-To, Industry News, Product Updates, Tips & Tricks, Case Studies
- **Minimum 20 blog posts** at launch, auto-growing weekly
- **Internal linking** between blog posts and app pages
- **RSS feed** for syndication

#### FAQ System
- **Comprehensive FAQ page** with 50+ questions at launch
- **Categorized:** Getting Started, Pricing, Features, Technical, Legal, Accessibility
- **Schema markup** (FAQPage) for Google rich snippets
- **Auto-expanding** — new FAQs generated from user questions
- **Searchable** with instant filter

#### Backlink Strategy (1000+ Links)
- **Internal backlinks:** Every page links to 5-10 other pages within the app
- **Cross-app backlinks:** Every Revvel app links to every other Revvel app
- **Blog-to-page backlinks:** Every blog post links to relevant app features
- **SEO landing pages:** 15-50 city/industry/niche-specific pages per app
- **Directory submissions:** Auto-submit to 100+ web directories
- **Social profile backlinks:** Link from all social media profiles
- **Guest post templates:** Auto-generated outreach emails for guest blogging
- **Target: 1000+ backlinks** per app through internal + cross-app + directory + social + content strategy

#### Technical SEO
- **Sitemap.xml** auto-generated
- **Robots.txt** configured
- **Schema.org markup** on every page (Organization, Product, FAQ, Article, BreadcrumbList)
- **Open Graph tags** for social sharing
- **Twitter Card tags**
- **Canonical URLs** on every page
- **Page speed optimized** (Lighthouse 90+)

---

## 5. Deployment & Process Standards

### Automated Deployment Pipeline
- **Mobile (iOS/Android):** Use **Fastlane** for automated store submission.
- **Desktop:** Use **Electron Builder** to package web apps as `.exe`, `.dmg`, and `.AppImage`.
- **CI/CD:** GitHub Actions must be used for all repositories to automate testing and deployment on push to `main`.

### Deployment & DevOps Tools
**CI/CD Platforms:**
- **GitHub Actions** (https://github.com/features/actions) - Native GitHub automation (FREE for public repos)
- **GitLab CI/CD** (https://gitlab.com) - Comprehensive DevOps platform
- **CircleCI** (https://circleci.com) - Fast, scalable CI/CD
- **Travis CI** (https://travis-ci.org) - Classic open-source CI tool
- **Jenkins** (https://jenkins.io) - Self-hosted automation server

**Mobile Deployment:**
- **Fastlane** (https://fastlane.tools) - iOS/Android automation toolkit
- **App Center** (https://appcenter.ms) - Microsoft's mobile DevOps platform
- **Bitrise** (https://bitrise.io) - Mobile-focused CI/CD
- **Codemagic** (https://codemagic.io) - Flutter and native app CI/CD

**Desktop Packaging:**
- **Electron Builder** (https://electron.build) - Complete Electron packaging solution
- **Tauri** (https://tauri.app) - Lightweight alternative to Electron (Rust-based)
- **Neutralinojs** (https://neutralino.js.org) - Lightweight cross-platform framework
- **NW.js** (https://nwjs.io) - Node.js + Chromium desktop apps

**Container & Orchestration:**
- **Docker** (https://docker.com) - Industry standard containerization
- **Kubernetes** (https://kubernetes.io) - Container orchestration
- **Docker Compose** - Multi-container application deployment
- **Podman** (https://podman.io) - Daemonless container engine

**Cloud Platforms:**
- **DigitalOcean** (https://digitalocean.com) - Developer-friendly cloud (from $4/month)
- **Vercel** (https://vercel.com) - Zero-config deployment for Next.js/React (FREE tier)
- **Netlify** (https://netlify.com) - JAMstack deployment platform (FREE tier)
- **Cloudflare Pages** (https://pages.cloudflare.com) - Edge deployment (FREE)
- **Railway** (https://railway.app) - Modern app deployment with $5/month free credit
- **Render** (https://render.com) - Alternative to Heroku (FREE tier available)
- **Fly.io** (https://fly.io) - Global app deployment platform

### Required Artifacts for Every Project
- **README.md:** Standard project overview.
- **BLUEPRINT.md:** Technical architecture and data flow.
- **ROADMAP.md:** 12-month strategic timeline.
- **KANBAN_CARDS.md:** Initial task list for the first iteration.
- **INVESTORS_PACK.md:** Business case, budget, and ROI analysis.
- **CHANGELOG.md:** Auto-updated on every push. No undocumented changes ever.
- **LICENSE:** Proprietary — All Rights Reserved, Audrey Evans / GlowStarLabs.

### Required Deployment Environments
- **oAudrey UI (Live-Test Stage):** All projects MUST have a user interface accessible via an `<app>.oaudrey.com` subdomain for live testing and review, enabling Audrey to test and review the application before production deployment. See [`TEST_ENVIRONMENTS_STANDARD.md`](docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md) for details.

### Design & Prototyping Tools

**UI/UX Design:**
- **Figma** (https://figma.com) - Industry-standard collaborative design (FREE for individuals)
- **Penpot** (https://penpot.app) - Open-source Figma alternative
- **Sketch** (https://sketch.com) - macOS-native design tool
- **Adobe XD** (https://adobe.com/xd) - Adobe's UI/UX design platform
- **Lunacy** (https://icons8.com/lunacy) - Free Sketch alternative for Windows

**Prototyping:**
- **Framer** (https://framer.com) - Interactive prototyping with code
- **ProtoPie** (https://protopie.io) - Advanced interaction prototyping
- **Principle** (https://principleformac.com) - Animated design tool
- **InVision** (https://invisionapp.com) - Digital product design platform

**Wireframing:**
- **Excalidraw** (https://excalidraw.com) - Hand-drawn style diagrams (FREE, open source)
- **Balsamiq** (https://balsamiq.com) - Rapid wireframing tool
- **Whimsical** (https://whimsical.com) - Visual workspace for diagrams
- **Draw.io / diagrams.net** (https://diagrams.net) - Free diagramming tool

**Design Systems:**
- **Storybook** (https://storybook.js.org) - Component library documentation
- **Zero Height** (https://zeroheight.com) - Design system documentation platform
- **Supernova** (https://supernova.io) - Design system platform with code export

**Asset & Icon Libraries:**
- **Iconify** (https://iconify.design) - 200,000+ open source icons
- **Heroicons** (https://heroicons.com) - Beautiful hand-crafted SVG icons
- **Lucide** (https://lucide.dev) - Community-driven icon library
- **Phosphor Icons** (https://phosphoricons.com) - Flexible icon family
- **Feather Icons** (https://feathericons.com) - Simply beautiful icons
- **Unsplash** (https://unsplash.com) - Free high-resolution photos
- **Pexels** (https://pexels.com) - Free stock photos and videos

### Auto-Documentation (MANDATORY)
- Every change to any repo, droplet, config, or deployment MUST be auto-logged with timestamp, what changed, and who/what made the change.
- CHANGELOG.md in every repo, updated automatically on every push.
- INFRASTRUCTURE_MAP.md in revvel-standards is the single source of truth for all infrastructure.
- SPRINT_STATE.md must be updated at the end of every session.

---

## 6. Strategic Blue Ocean Areas
Current high-priority innovation sectors for MIDNGHTSAPPHIRE:
- **Universal Data Router:** Plugin-driven data staging and routing engine.
- **Project Face:** AI skin analysis with climate/weather integration.
- **Clinical Trials Finder:** Matching users to medical research via APIs.
- **Forensic Studio:** AI-powered image analysis and beauty enhancement.
- **Sustainable Coding:** Eco-friendly, low-carbon code standards.

### Database & Backend Resources

**SQL Databases:**
- **PostgreSQL** (https://postgresql.org) - Advanced open-source relational database
- **MySQL** (https://mysql.com) - Popular open-source database
- **SQLite** (https://sqlite.org) - Embedded database (perfect for small apps)
- **MariaDB** (https://mariadb.org) - MySQL fork with enhanced features
- **CockroachDB** (https://cockroachlabs.com) - Distributed SQL database

**NoSQL Databases:**
- **MongoDB** (https://mongodb.com) - Document database (FREE tier: Atlas)
- **Redis** (https://redis.io) - In-memory data store and cache
- **Cassandra** (https://cassandra.apache.org) - Distributed wide-column database
- **Couchbase** (https://couchbase.com) - NoSQL cloud database
- **ArangoDB** (https://arangodb.com) - Multi-model database

**Modern Database Options:**
- **Supabase** (https://supabase.com) - Open-source Firebase alternative (Postgres)
- **PocketBase** (https://pocketbase.io) - Open-source backend in one file (Go + SQLite)
- **Appwrite** (https://appwrite.io) - Open-source backend server
- **Firebase** (https://firebase.google.com) - Google's backend platform (FREE tier)
- **Convex** (https://convex.dev) - Real-time backend with TypeScript

**ORMs & Query Builders:**
- **Prisma** (https://prisma.io) - Next-generation TypeScript ORM
- **Drizzle** (https://orm.drizzle.team) - TypeScript ORM for edge
- **Kysely** (https://kysely.dev) - Type-safe SQL query builder
- **TypeORM** (https://typeorm.io) - ORM for TypeScript and JavaScript
- **Sequelize** (https://sequelize.org) - Promise-based Node.js ORM
- **Knex.js** (https://knexjs.org) - SQL query builder for Node.js

**Backend Frameworks:**
- **Express.js** (https://expressjs.com) - Minimalist Node.js framework
- **Fastify** (https://fastify.dev) - Fast and low-overhead web framework
- **NestJS** (https://nestjs.com) - Progressive Node.js framework
- **Hono** (https://hono.dev) - Ultrafast web framework for edges
- **Elysia** (https://elysiajs.com) - Ergonomic Bun framework
- **tRPC** (https://trpc.io) - End-to-end typesafe APIs

**API Development:**
- **GraphQL** (https://graphql.org) - Query language for APIs
- **Apollo Server** (https://apollographql.com/server) - GraphQL server
- **REST** (RESTful architecture principles)
- **gRPC** (https://grpc.io) - High-performance RPC framework
- **OpenAPI/Swagger** (https://swagger.io) - API documentation standard

---

## 7. Auto-Documentation & Change Tracking
All Revvel projects enforce strict documentation standards:
- **No undocumented changes.** Every commit, deployment, and config change is logged.
- **CHANGELOG.md** is mandatory in every repo and auto-updated.
- **SPRINT_STATE.md** in revvel-standards tracks cross-project progress.
- **INFRASTRUCTURE_MAP.md** in revvel-standards maps all droplets, domains, and services.
- **REPO_CATALOG.md** in revvel-standards catalogs every repository with description and status.

---


---

## Corporate Identity & Portfolio

For complete information about:
- **Corporate Identity & Entity Hierarchy** (Freedom Angel Corp, divisions, sub-brands, Schema.org implementation)
- **Learning Resources & Documentation** (online learning platforms, tutorials, books)
- **Cutting-Edge Technology Discovery** (technology radars, newsletters, evaluation frameworks)
- **Project Tracking Systems** (BOM, per-project docs)
- **Brand & Design Standards** (Revvel emblem)
- **CI/CD & Testing Templates**
- **Bootstrap & Setup Scripts**
- **GitHub Projects Setup**
- **Freedom Angel Corps Repo Manager UI**

**See: [PORTFOLIO.md](docs/PORTFOLIO.md)**

---

**END OF DOCUMENT**

---

## WR Framework

This repository is now the **durable operational memory** for Audrey Evans / Freedom Angel Corp / Revvel.

### Current State: QUIET MODE
No automation runs. PR #2 will add optional cron — and even then nothing fires until an issue titled `exit-quiet-mode` is opened.

### Cold-start reading order
1. `wr/NORTH_STAR.md`
2. `docs/BRAND_ARCHITECTURE.md`
3. `projects/_self/GRANTS_AND_COMPLIANCE.md`
4. `projects/_self/TAX_STRATEGY.md`
5. `projects/_self/NONPROFIT_ROADMAP.md`
6. `projects/_self/HUMAN_SUPPORT.md`
7. `inventory/federal-and-state-records.md`
8. `inventory/github-orgs.md`
9. `inventory/ideas-found.md`
10. `docs/STACK.md`
11. `docs/MIGRATION_PLAN.md`
12. `wr/memory/decisions.jsonl`

### Compliance clock
- 🔴 2026-05-05 — CAGE 8ZRW3 (XI Website Solutions LLC) renewal
- 🔴 2026-05-14 — CAGE 90SN0 (Freedom Angel Corp) renewal
- 🟡 IRS transcript call this quarter

All action data lives in `projects/_self/GRANTS_AND_COMPLIANCE.md`.

### OpenRouter Coding Agent

Label any issue `wr:code` and OpenRouter writes the code. See [`docs/OPENROUTER_AGENT.md`](docs/OPENROUTER_AGENT.md).

---

## GOALS — GOAP Agent Master Prompt (One Source of Truth)

**Goap** is Audrey's autonomous goal-oriented action planner, Gatekeeper, and Revenue Forge — a pragmatic agent focused on building scalable revenue-generating systems with minimal daily input.

### Quick Reference

**Core Mission**: Build autonomous systems targeting 5–10M+ net worth for Audrey and 2–5M+ per child within 3–5 years.

**Six High-Level Goals** (Prioritized – Money First):
1. **Financial Freedom** — Multiple leveraged income streams (review-to-resale, music, rentals, product flips, grants, software)
2. **Lifestyle & Environment** — Waterfront property, multi-location living (including international)
3. **Family & Presence** — Unstructured quality time with children, travel, supporting their independence
4. **Creative Expression & Impact** — Profitable songwriting and original concepts (AI assists, Audrey owns vision)
5. **Health & Longevity** — Outdoor movement, longevity experimentation
6. **Autonomy & Leverage** — Proactive personal agent system that surfaces opportunities and executes

**Current #1 Priority**: **Reese-Reviews Leverage System** — Raise Amazon Vine review completion from 47% to 90%+ within 4–6 weeks while reducing active time to <45 min/day (target 15–30 min). Careese handles majority via simple buttons. Human-in-the-loop for video recording and final submission.

**Operating Standards**: Proactive research, failure journaling in `learnings.md`, n8n + Gumloop + Apify automation, one-click/button-driven flows, monetization-first decision making.

### Full Documentation

The complete versioned prompt with all details, deployment instructions, and both canonical and consolidated variants is maintained in:

**[`GOAP_AGENT_PROMPT.md`](GOAP_AGENT_PROMPT.md)**

This file includes:
- Fenced canonical prompt (copy-paste ready for OpenClaw, OpenRouter, Claude, GPT, etc.)
- Deployment instructions and test message
- Consolidated short version (non-authoritative summary)
- Gatekeeper responsibilities for Reese-Reviews system
- Self-improvement loop details
- Revisioning guidelines

---

## Test

| Feature | Status |
|---------|--------|
| Feature | ✅ Ready |

