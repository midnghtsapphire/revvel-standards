# Master Inventory — All MIDNGHTSAPPHIRE Businesses & Projects

> **Note:** This document tracks every active service, API, subscription, software tool, and operational resource across all MIDNGHTSAPPHIRE ventures. It is the companion to [`_MASTER_BOM.md`](_MASTER_BOM.md), which tracks purchases and technical stack choices. **No API keys or secret tokens are stored here** — each entry describes *what the service does*, not the credential itself.
>
> The **⚡ UPGRADE TRIGGER** column is the distinguishable column that shows the specific usage threshold, quota limit, or event that requires purchasing a higher tier or upgrading.

**Last Updated:** April 2026  
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Status:** Living Document

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Active | Provisioned and in use |
| 🔵 Configured | Set up but not yet in active production use |
| 🟡 Research Topic | Worth evaluating — not yet adopted |
| ⚠️ Expiring Soon | Renewal or upgrade decision needed within 30 days |
| ❌ Expired / Lapsed | Subscription ended or free trial over — action required |
| 🗑️ Removed | Evaluated and rejected — kept for reference |
| 🧪 Trial Active | Free trial in progress — decision pending |

---

## How to Use This Document

- **APIs / services:** Do **not** paste credentials or tokens. Describe what the service does.
- **⚡ UPGRADE TRIGGER:** Fill in the specific event that will require you to pay more (e.g., "over 3,000 emails/month", "more than 25k map loads/month", "trial ends April 28").
- **Research Topic:** Add items under `🟡 Research Topic` status with a short rationale and any known alternatives.
- **Update this file** after any new signup, cancellation, trial start, or tier change.

---

## 1. Revvel Tech Ecosystem — APIs & Services

> Covers all software projects: GrowlingEyes, Neurooz, Soul2Bowl, Penny Sovereign Yield Scout, Premolt, Revvel Forensic Studio, Revvel Music Studio, The Alt Text, Universal SAR App, Revvel Standards.

### 1.1 AI / LLM Services

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Anthropic Claude API | Primary reasoning LLM for all autonomous agents; handles coding, planning, research tasks | Anthropic | No free tier | $20–100/mo | First production agent run (no free tier — costs from first token) | ❌ Expired / Lapsed | Audrey Agent, Goap Agent, Agent Factory, all agents |
| OpenAI API | AI and LLM features for Neurooz; GPT-4o for reasoning, GPT-4o mini for cost-efficient tasks | OpenAI | No free tier | $10–100/mo | First production call (no free tier — costs from first token) | ❌ Expired / Lapsed | Neurooz |
| Google Gemini API | Multi-modal reasoning; free tier covers high-volume lower-priority tasks | Google AI Studio | 15 RPM / 1M tokens/day (free) | $0 free / $0.075+/M tokens | Exceeds 1M tokens/day or requires higher RPM | 🟡 Research Topic | Agent Factory (evaluate) |
| Groq API | Ultra-fast LLM inference (Llama, Mixtral); low-latency tasks | Groq | Rate-limited free tier | $0 free / $0.06+/M tokens | Rate limit hit on free tier during production | 🟡 Research Topic | Neurooz real-time features (evaluate) |
| OpenRouter | Routes requests to cheapest available LLM per task; manages fallbacks | OpenRouter | Pay-per-token (no free tier) | $5–50/mo | Budget threshold exceeded per month | 🔵 Configured | All AI projects |
| Venice.ai | Privacy-focused LLM; uncensored model access | Venice.ai | Limited free tier | $0–20/mo | Free tier request limit hit | 🟡 Research Topic | Research / evaluation |

### 1.2 Search & Research APIs

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Brave Search API | Web search for research agents; privacy-respecting | Brave | 2,000 queries/mo | $3+/1,000 queries | Exceeds 2,000 queries/month | 🟡 Research Topic | Research agents (evaluate) |
| Serper API | Returns Google search results via API for AI agent research tasks | Serper.dev | 2,500 free queries (one-time) | $50/50k queries | Free credits exhausted | 🟡 Research Topic | Research agents (evaluate) |
| Tavily API | Search purpose-built for AI agents; returns AI-optimized result format | Tavily | 1,000 queries/mo | $10+/mo | Exceeds 1,000 queries/month | 🟡 Research Topic | Research agents, LangChain (evaluate) |
| Perplexity API | LLM with real-time web search built in; research agent use | Perplexity AI | No free tier | $5/1,000 searches | First search call (no free tier) | 🟡 Research Topic | Research agents (evaluate) |

### 1.3 Maps & Geolocation

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Google Maps Platform | GPS, mapping, routing for SAR app; $200/mo free credit | Google | $200/mo free credit (~28k map loads) | $0–50/mo | Exceeds $200/mo credit (~28k map loads/month) | ❌ Expired / Lapsed | Universal SAR App |
| Mapbox | Custom map styles; alternative to Google Maps | Mapbox | 25,000 map loads/mo | $0.50+/1k loads | Exceeds 25,000 map loads/month | 🟡 Research Topic | Universal SAR App (evaluate) |
| OpenStreetMap / Nominatim | Free and open-source geocoding; no API key required | OSM Foundation | Unlimited (fair use) | $0 | Fair use policy violated (high-volume scraping) | 🔵 Configured | Universal SAR App |

### 1.4 Payments & Billing

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Stripe | Processes payments, subscriptions, and invoices; handles card transactions | Stripe | No monthly fee (transaction %) | 2.9% + $0.30/txn | N/A (scales with volume) | ❌ Expired / Lapsed | Premolt, Revvel Music Studio |
| Paddle | Merchant-of-record; handles international VAT and taxes automatically | Paddle | No monthly fee (transaction %) | 5% + $0.50/txn | N/A (evaluate vs Stripe at scale) | 🟡 Research Topic | International SaaS (evaluate) |
| LemonSqueezy | Simple digital product sales and subscriptions | LemonSqueezy | No monthly fee (transaction %) | 5% + $0.50/txn | N/A (evaluate for info products) | 🟡 Research Topic | Evaluate for low-volume products |

### 1.5 Email & Communication

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Resend | Transactional email delivery (account confirmations, alerts, receipts) | Resend | 3,000 emails/mo | $0 free / $20+/mo | Exceeds 3,000 emails/month | ✅ Active | All projects |
| Loops | Email marketing and drip campaigns for SaaS products | Loops | 1,000 contacts free | $49+/mo | Exceeds 1,000 contacts | 🟡 Research Topic | The Alt Text, Neurooz (evaluate) |
| Buttondown | Newsletter platform for content distribution | Buttondown | 100 subscribers free | $9+/mo | Exceeds 100 subscribers | 🟡 Research Topic | Any newsletter project (evaluate) |
| Firebase Cloud Messaging (FCM) | Push notifications for mobile apps | Google | Unlimited (free) | $0 | N/A (free tier is generous) | ❌ Expired / Lapsed | Universal SAR App, GrowlingEyes |
| TelAPI | Twilio-compatible SMS / voice / telephony REST API; Python client ([telapi-python](https://github.com/TelAPI/telapi-python)) for sending SMS, placing calls, and handling IVR flows | TelAPI | Pay-per-use (no free tier) | Usage-based (per SMS / per minute) | First production SMS or voice call (no free tier) | 🟡 Research Topic | Integrate for later — candidate for SAR alerts, 2FA, and outbound notifications (evaluate vs Twilio) |

### 1.6 Authentication

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Clerk | User authentication and identity management (sign-in, sign-up, session handling) | Clerk | 10,000 MAU free | $25+/mo | Exceeds 10,000 monthly active users | 🟡 Research Topic | Evaluate for new projects |
| Google OAuth | Sign in with Google; identity verification | Google | Free | $0 | N/A (free) | ❌ Expired / Lapsed | Soul2Bowl |
| Better Auth | Open-source authentication framework (self-hosted) | FOSS | Unlimited (self-hosted) | $0 | N/A (self-hosted) | 🟡 Research Topic | All new projects (evaluate) |

### 1.7 Storage & Media

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| DigitalOcean Spaces | Object storage for images, media, and user uploads; CDN included | DigitalOcean | No free tier | $5/mo (250 GB) | Exceeds 250 GB storage or 1 TB transfer | ❌ Expired / Lapsed | Soul2Bowl, Revvel Music Studio |
| Cloudflare R2 | S3-compatible object storage; zero egress fees | Cloudflare | 10 GB/mo free | $0 free / $0.015/GB | Exceeds 10 GB/month free storage | 🟡 Research Topic | Revvel Music Studio, audio storage (evaluate) |
| AWS S3 | Industry-standard object storage | Amazon | Free tier: 5 GB / 20k requests | $0.023/GB/mo | Exceeds 5 GB or 20,000 GET requests/month | 🟡 Research Topic | Media storage (evaluate) |

### 1.8 Hosting & Infrastructure

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| DigitalOcean Droplet (shared) | Linux VPS hosting all deployed Revvel apps via PM2 | DigitalOcean | No free tier | $12–24/mo | CPU/RAM consistently >80% or disk full | ✅ Active | All deployed projects |
| DigitalOcean Managed MySQL | Shared production database for all Revvel apps | DigitalOcean | No free tier | $15/mo | Connection pool exhausted or storage >20 GB | ✅ Active | All projects with databases |
| GitHub Actions | CI/CD pipelines: automated testing, builds, and deployments | GitHub | 2,000 min/mo (free public repos = unlimited) | $0 | Exceeds 2,000 minutes/month on private repos | ✅ Active | All projects |
| Vercel | Frontend deployment (alternative to DigitalOcean for Next.js) | Vercel | 100 GB bandwidth/mo | $0 free / $20+/mo | Exceeds 100 GB bandwidth/month | 🟡 Research Topic | Next.js projects (evaluate) |
| Railway | One-click app deployment with managed databases | Railway | $5 free credit/mo | $5–20+/mo | Free credit exhausted | 🟡 Research Topic | Rapid prototypes (evaluate) |
| InfinityFree | Free web hosting with PHP and MySQL support for testing dynamic sites ([dash.infinityfree.com](https://dash.infinityfree.com)); unlimited bandwidth/storage with fair use policy; includes SSL, custom domains, and auto-installer for WordPress/Joomla | InfinityFree | Unlimited (free with fair use) | $0 | Fair use policy violated (excessive CPU/resource usage) or need email hosting | 🟡 Research Topic | Dynamic site testing, PHP/MySQL prototypes (evaluate) |

### 1.9 Monitoring & Observability

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| GlitchTip | Self-hosted error tracking; captures application exceptions | Self-hosted (DigitalOcean) | Unlimited (self-hosted) | $0 | Server runs out of disk or memory | 🟡 Research Topic | All deployed apps (evaluate) |
| Sentry | Error tracking and performance monitoring; captures exceptions and traces | Sentry | 5,000 errors/mo (free tier) | $0 free / $26+/mo | Exceeds 5,000 errors/month | 🟡 Research Topic | All deployed apps (evaluate) |
| UptimeRobot | Pings deployed URLs every 5 minutes; sends alerts on downtime | UptimeRobot | 50 monitors free | $0 free / $7+/mo | Exceeds 50 uptime monitors | 🟡 Research Topic | All deployed URLs (evaluate) |
| Plausible Analytics | Privacy-first web analytics; GDPR-compliant; no cookies | Plausible | No free tier | $9+/mo | First use (no free tier) | 🟡 Research Topic | Soul2Bowl, The Alt Text (evaluate) |
| PostHog | Product analytics, session replays, feature flags | PostHog | 1M events/mo free | $0 free / $450+/mo | Exceeds 1M events/month | 🟡 Research Topic | All web apps (evaluate) |

### 1.10 Security & Secrets Management

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| HashiCorp Vault | Stores all API credentials and secrets; apps retrieve secrets at runtime | Self-hosted (DigitalOcean) | Unlimited (self-hosted) | $0 | Server resource constraints | ✅ Active | All projects |
| GitGuardian | Scans every commit for accidentally committed secrets (API keys, passwords) | GitGuardian | Unlimited (free for individuals) | $0 | N/A (free for individual developers) | 🟡 Research Topic | All repos (evaluate) |
| Gitleaks | Pre-commit hook that blocks commits containing secrets | FOSS | Unlimited | $0 | N/A (FOSS) | 🟡 Research Topic | All repos (evaluate) |
| Snyk | Scans dependencies for known security vulnerabilities; auto-creates fix PRs | Snyk | Free tier (limited scans) | $0 free / $25+/mo | Exceeds free tier scan limit | 🟡 Research Topic | All projects with npm/pip deps (evaluate) |
| Infisical | Open-source secrets manager; replaces manual `.env` file management — [evaluated here](STARRED_REPOS_EVAL_2026-04-20.md#1-infisical--application-secrets-and-configuration-management) | Self-hosted or Cloud | Free (self-hosted) | $0 / $6+/mo cloud | Switching to cloud tier | 🟡 Research Topic | All projects (evaluate; pilot recommended) |

### 1.11 Code Quality & Autonomous Review

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| RecurseML | Autonomous PR code review; enforces Revvel coding standards and catches AI-generated bugs | RecurseML | 14-day trial | $250/yr | Trial ends April 28, 2026 — must decide | 🧪 Trial Active | All repos |
| GitHub Copilot | AI code completion and chat inside IDE; context-aware suggestions | GitHub | No free tier for business use | $10–19/mo/seat | First seat activated (no free tier) | ⚠️ Expiring Soon | All developers |
| Codacy | Static analysis, test coverage tracking, code duplication detection — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#51-duplicate-recurseml--openrouter-ai-reviewer) (defer) | Codacy | Free for open-source | $15+/mo (private) | Repo becomes private | 🟡 Research Topic | All repos (evaluate) |
| SonarQube Cloud | SAST security scanning and code smell detection — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#41-sonarqube-cloud--sast--smells-public-repos) | SonarSource | Free for public repos | $75+/mo (private) | Repo becomes private | 🟡 Research Topic | Security-sensitive projects (evaluate) |
| vscode-copilot-chat-bedrock | VS Code extension that exposes AWS Bedrock models (Claude, Llama, Titan, Mistral) inside Copilot Chat — [evaluated here](STARRED_REPOS_EVAL_2026-04-20.md#2-vscode-copilot-chat-bedrock--aws-bedrock-models-in-copilot-chat) | `gabrielkoo` (community) | Free extension | $0 extension + AWS Bedrock per-token (~$3/M in, $15/M out for Claude 3.5 Sonnet) | Opening an AWS account with Bedrock enabled | 🟡 Research Topic | None (OpenRouter already covers these models; defer) |
| API CraftPro | Auto-generates a full Go + Gin backend REST API (CRUD, JWT/PASETO auth, unit tests, GitHub Actions CI/CD, Dockerfile, Postman collection) from an uploaded SQL schema and pushes it to GitHub — [evaluated here](API_CRAFTPRO_EVAL_2026-04-20.md) | API CraftPro (GitHub Marketplace app) | Free trial (capped generations) | $0 trial / paid tier (verify at adoption) | Free trial generations exhausted, or adopting Go + Gin as a permanent stack (not today) | 🟡 Research Topic | None (prototype-only candidate; Revvel default stack is Node/TypeScript, not Go — defer) |
| LieberLieber `setup-LemonTree.Automation@v6` | GitHub Action that installs **LemonTree.Automation** — a paid, Windows-only CLI for diff/merge/consistency-check of Sparx Systems Enterprise Architect UML/SysML model files (`.eapx` / `.qea` / `.qeax`) — [evaluated here](LEMONTREE_AUTOMATION_EVAL_2026-04-28.md) | LieberLieber (vendor) | None — quote-only commercial license; evaluation key by request | Annual license (quote-only) + 2× Windows runner minute multiplier on private repos | A Revvel project starts authoring Sparx EA models AND no free/text-serialized modeling alternative fits | 🗑️ Removed | None — Revvel ships zero Enterprise Architect models; action is inert without `.eapx`/`.qea`/`.qeax` files (rejected — wrong stack) |
| Gradle GitHub Actions / extensions (20-item sweep) | Sweep of 19 Gradle-related GitHub Actions plus Buildless (build-cache SaaS) — [evaluated here](GRADLE_ACTIONS_EVAL_2026-04-28.md). Recommendation: adopt the **official** [`gradle/actions/setup-gradle@v4`](https://github.com/gradle/actions) (Cordova-Android cache + wrapper validation), defer [`gradle-update/update-gradle-wrapper-action`](https://github.com/gradle-update/update-gradle-wrapper-action) until a standalone JVM project ships, skip the other 18 (vendor reskins of the official action, niche helpers, one mis-listed Docker-Bake action, and the paid Buildless app). | Gradle Inc. + community + Buildless | Free for the official action; Buildless is quote-based; rest are free | $0 if we adopt the official action only; would be ~$0.01–$0.04/min on BuildJet runners or quote-based for Buildless if those reskins were adopted | Cordova-Android pipeline starts producing AABs end-to-end (then flip the official action to ✅ Active in the follow-up adoption PR) | 🟡 Research Topic | None today; will activate on Cordova-Android build job in [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) per [eval §3.2](GRADLE_ACTIONS_EVAL_2026-04-28.md) |

### 1.12 Mobile App Distribution

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Apple Developer Program | Required for iOS App Store publishing and TestFlight beta distribution | Apple | No free tier | $99/yr | Ready to submit to App Store | ❌ Expired / Lapsed | GrowlingEyes, Neurooz, Universal SAR App |
| Google Play Developer | Required for Android Play Store publishing | Google | One-time $25 registration | $25 one-time | Ready to submit to Play Store | ❌ Expired / Lapsed | All mobile apps |
| Expo EAS Build | Cloud-based iOS and Android build service; no local Xcode required | Expo | 30 builds/mo free | $0 free / $29+/mo | Exceeds 30 builds/month | 🟡 Research Topic | All Expo/React Native projects (evaluate) |

### 1.13 Domain Names & DNS

| Domain / Service | What It Does | Provider | Renewal Cycle | Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| thealttext.com | Domain for The Alt Text SaaS product | Namecheap | Annual | ~$15/yr | Domain expiry date | ❌ Expired / Lapsed | The Alt Text |
| premolt.com (or similar) | Domain for Premolt product | Namecheap | Annual | ~$15/yr | Domain expiry date | ❌ Expired / Lapsed | Premolt |
| revvelforensics.com (or similar) | Domain for Revvel Forensic Studio | Namecheap | Annual | ~$15/yr | Domain expiry date | ❌ Expired / Lapsed | Revvel Forensic Studio |
| revvelmusic.com (or similar) | Domain for Revvel Music Studio | Namecheap | Annual | ~$15/yr | Domain expiry date | ❌ Expired / Lapsed | Revvel Music Studio |
| pennyscout.io (or similar) | Domain for Penny Sovereign Yield Scout | Namecheap | Annual | ~$15/yr | Domain expiry date | ❌ Expired / Lapsed | Penny Sovereign Yield Scout |
| universalsar.com (or similar) | Domain for Universal SAR App | Namecheap | Annual | ~$15/yr | Domain expiry date | ❌ Expired / Lapsed | Universal SAR App |
| Cloudflare DNS | DNS management, CDN, and DDoS protection for all deployed domains | Cloudflare | N/A | $0 (free tier) | Need advanced WAF or DDoS protection (paid plan) | ✅ Active | All domains |

### 1.14 Back-Office: ERP, CRM & Accounting (Cross-Entity)

> Single shared system for every MIDNGHTSAPPHIRE legal entity (Vine House, Vine House Capital, Revvel Tech, reese-reviews, and future brands). Authoritative specification: [`ODOO_INTEGRATION_STANDARD.md`](Master_Inventory/ODOO_INTEGRATION_STANDARD.md).

| Service | What It Does | Provider | Free Tier Limit | Est. Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| Odoo Community Edition | Multi-company ERP + CRM + accounting in one database; contacts, leads, sales, purchase, stock, projects, invoicing, journals, tax reports | Odoo S.A. (LGPL-3.0) | Unlimited users & companies (self-hosted) | $0 licence + $0 incremental infra (shared droplet + managed Postgres) | Needs Enterprise-only module — must first evaluate OCA replacement | 🟡 Research Topic | All entities: Vine House, Vine House Capital, Revvel Tech, reese-reviews |
| OCA `account_financial_report` | Free replacement for Enterprise-only advanced financial reports (P&L variants, partner ledger, aged balance) | Odoo Community Association | Free | $0 | N/A | 🟡 Research Topic | Odoo instance (all companies) |
| OCA `mis_builder` | KPI dashboards and consolidated multi-company reports inside Odoo | Odoo Community Association | Free | $0 | N/A | 🟡 Research Topic | Phase 3 rollout per Odoo standard |
| `revvel_odoo_bridge` (custom addon) | Thin Revvel-owned Odoo addon adding `x_external_system` / `x_external_id` fields and inbound webhook ingestion from Shopify, Stripe, Revvel apps, and reese-reviews | MIDNGHTSAPPHIRE | Free (internal) | $0 | N/A | 🟡 Research Topic | Source of truth for all Odoo ↔ Revvel integration |

---

## 2. Vine House — Products Business

> Vine House produces and sells physical and digital products. Capital from Vine House funds the rental company.

### 2.1 E-Commerce Platforms

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Shopify | Online storefront for Vine House product sales; inventory management and order fulfillment | Shopify | No free tier | $39–399+/mo | Outgrows current plan transaction limits or needs advanced features | 🟡 Research Topic | Primary storefront option — evaluate plan tier |
| WooCommerce | Self-hosted e-commerce plugin for WordPress; no monthly fee | WooCommerce / WordPress | Free (self-hosted) | $0 + hosting | Server resources or need paid extensions | 🟡 Research Topic | Evaluate vs Shopify for cost control |
| Etsy | Marketplace listing for handmade or specialty Vine House products | Etsy | No monthly fee | $0.20/listing + 6.5% fee | N/A (scales with listings) | 🟡 Research Topic | Evaluate for handmade / specialty products |
| Amazon Seller Central | Marketplace selling on Amazon; fulfillment by Amazon (FBA) option | Amazon | No monthly fee (Individual) | $0 (individual) / $39.99/mo (Pro) | Exceeds 40 sales/month (Individual plan limit) | 🟡 Research Topic | Evaluate for volume product sales |
| Square | In-person and online payments; POS for physical product sales | Square | Free (2.6% + $0.10/swipe) | $0 free / $29+/mo | Needs advanced POS features or multi-location | 🟡 Research Topic | Evaluate for in-person sales events |

### 2.2 Inventory Management

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Airtable | Flexible database / spreadsheet for tracking product inventory, SKUs, and stock levels | Airtable | 1,200 records/base (free) | $0 free / $20+/mo | Exceeds 1,200 records per base | 🟡 Research Topic | Evaluate as inventory database |
| Notion | Product catalog, inventory notes, and operational documentation | Notion | Unlimited pages (free for personal) | $0 free / $10+/mo | Needs team collaboration features | 🟡 Research Topic | Evaluate for product documentation |
| inFlow Inventory | Purpose-built small business inventory management with purchase orders | inFlow | 100 products free | $89+/mo | Exceeds 100 products | 🟡 Research Topic | Evaluate for full inventory management |
| Zoho Inventory | Inventory + order management with multi-channel selling support | Zoho | 50 orders/mo free | $0 free / $29+/mo | Exceeds 50 orders/month | 🟡 Research Topic | Evaluate for multi-channel inventory |

### 2.3 Shipping & Fulfillment

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Shippo | Multi-carrier shipping labels at discounted rates; order tracking | Shippo | 30 shipments/mo free | $0 free / $19+/mo | Exceeds 30 shipments/month | 🟡 Research Topic | Evaluate for product shipping |
| ShipStation | Order management + multi-carrier shipping for high-volume sellers | ShipStation | No free tier | $9.99+/mo | First use (no free tier) | 🟡 Research Topic | Evaluate at higher order volumes |
| EasyPost | Shipping API for building custom fulfillment integrations | EasyPost | Free tier available | $0 free / variable | Exceeds free tier usage | 🟡 Research Topic | Evaluate for custom shipping integration |
| USPS / UPS / FedEx accounts | Carrier accounts for negotiated shipping rates | Various | No fees | Varies by shipment | N/A | 🟡 Research Topic | Establish carrier accounts when volume warrants |

---

## 3. Vine House Capital — Rental Company

> Vine House Capital is the rental company funded by Vine House product revenue. Tracks leases, tenant payments, and property management.

### 3.1 Property Management & Leasing

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Stessa | Free rental property income and expense tracking; connects to bank accounts | Stessa | Unlimited properties (free) | $0 free / $20+/mo | Needs premium reports or tax tools | 🟡 Research Topic | Best free option for landlords — evaluate first |
| Rentec Direct | Tenant screening, rent collection, lease management, maintenance requests | Rentec Direct | No free tier | $35+/mo | First property under management | 🟡 Research Topic | Evaluate for full property management |
| TurboTenant | Free landlord software: tenant screening, lease templates, rent collection | TurboTenant | Unlimited (free for landlords) | $0 (tenant pays screening fee) | Need premium features (online rent collection fee waiver) | 🟡 Research Topic | Evaluate as free landlord tool |
| Avail | Tenant screening, lease agreements, rent collection, maintenance tracking | Avail | Free (limited) / $7/unit | $0 free / $7+/unit/mo | Needs unlimited listing or premium features | 🟡 Research Topic | Evaluate vs TurboTenant |
| Cozy (now part of Apartments.com) | Free rent collection, tenant screening, lease storage | Apartments.com | Free for landlords | $0 | Tenant screening fee exceeds included credits | 🟡 Research Topic | Evaluate for free rent collection |

### 3.2 Accounting & Financial Tracking

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Wave Accounting | Free invoicing, bookkeeping, and income/expense tracking for small businesses | Wave | Unlimited (free) | $0 | Needs payroll or credit card payments feature | 🟡 Research Topic | Superseded by Odoo CE for consolidated books — see [`ODOO_INTEGRATION_STANDARD.md`](Master_Inventory/ODOO_INTEGRATION_STANDARD.md) |
| Odoo Community Edition (self-hosted) | Multi-company ERP + CRM + free accounting; authoritative back-office for Vine House Capital ledger | Odoo S.A. (LGPL-3.0) | Unlimited users, unlimited companies (self-hosted) | $0 licence + shared droplet/Postgres | Needs Enterprise-only module (e.g. advanced payroll) — evaluate against OCA first | 🟡 Research Topic | Planned default — see [`ODOO_INTEGRATION_STANDARD.md`](Master_Inventory/ODOO_INTEGRATION_STANDARD.md) |
| QuickBooks Online | Full accounting, bank sync, tax reports; rental-specific features available | Intuit | No free tier | $30+/mo | First use (no free tier) | 🟡 Research Topic | Deferred in favor of Odoo CE |
| FreshBooks | Invoicing and expense tracking focused on service businesses | FreshBooks | No free tier | $19+/mo | First use (no free tier) | 🟡 Research Topic | Evaluate vs Wave |

### 3.3 Tenant Payments

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Stripe (rent collection) | Collect rent payments via credit/debit card with ACH option | Stripe | No monthly fee | 2.9% + $0.30/txn (card) / 0.8% (ACH) | N/A (scales with volume; evaluate ACH to reduce fees) | 🟡 Research Topic | Evaluate for digital rent collection |
| Zelle / ACH direct | Direct bank transfer for rent; no transaction fees | Bank-to-bank | Free | $0 | N/A (free) | 🟡 Research Topic | Lowest cost option — evaluate first |
| PayRent | Rent-specific payment platform; ACH and credit card collection | PayRent | Free (basic) | $0 free / variable | Needs premium rent reporting or auto-pay features | 🟡 Research Topic | Evaluate as rent-only payment tool |

---

## 4. E-Commerce Storefronts

> Includes the coffee store, specialty stores, and any other product websites sold under MIDNGHTSAPPHIRE brands.

### 4.1 Coffee Store

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Shopify (Coffee Store) | Dedicated storefront for coffee product sales; product pages, cart, checkout | Shopify | No free tier | $39+/mo | Outgrows plan limits or needs B2B wholesale features | 🟡 Research Topic | Evaluate as primary platform |
| WooCommerce (Coffee Store) | Self-hosted alternative; one-time setup cost, no monthly platform fee | WooCommerce | Free (self-hosted) | $0 + hosting | Server resource or plugin subscription costs | 🟡 Research Topic | Evaluate for cost control vs Shopify |
| Coffee supplier / wholesale API | Connects storefront to supplier catalog for dropshipping or fulfillment | TBD | TBD | TBD | TBD | 🟡 Research Topic | Identify supplier and integration method |
| Square for Coffee | POS for in-person coffee sales events; integrates with online store | Square | Free (2.6% + $0.10/swipe) | $0 free / $60+/mo (retail POS) | Needs kitchen display, advanced inventory | 🟡 Research Topic | Evaluate for in-person events |

### 4.2 Specialty Stores

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Multi-store Shopify plan | Manages multiple specialty product storefronts under one account | Shopify | No free tier | $39–399+/mo per store | Each additional store requires separate plan | 🟡 Research Topic | Evaluate Shopify multi-store vs separate accounts |
| Amazon Handmade / Specialty | Marketplace for specialty products reaching Amazon's customer base | Amazon | 15% referral fee | $0 (included in Pro seller) | Pro seller plan required beyond 40 listings | 🟡 Research Topic | Evaluate for reach on specialty items |
| eBay Seller Account | Sell specialty items to eBay marketplace buyers | eBay | 250 free listings/mo | $0 free / $7.95+/mo store | Exceeds 250 free listings/month | 🟡 Research Topic | Evaluate for specialty/collectible items |
| BigCommerce | Scalable e-commerce platform; better for high-SKU stores than Shopify | BigCommerce | No free tier | $29+/mo | First use (no free tier) | 🟡 Research Topic | Evaluate at higher product volume |
| Faire | Wholesale marketplace connecting specialty brands with independent retailers | Faire | Free to list | 15% on first orders / 9% recurring | N/A (percentage model) | 🟡 Research Topic | Evaluate for wholesale channel |

### 4.3 Shared E-Commerce Infrastructure

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Stripe (e-commerce) | Processes all e-commerce card payments and manages subscriptions | Stripe | No monthly fee | 2.9% + $0.30/txn | N/A (scales with revenue) | 🟡 Research Topic | Evaluate as primary payment processor |
| Mailchimp | Email marketing campaigns for store promotions and customer retention | Mailchimp | 500 contacts / 1,000 emails/mo | $0 free / $13+/mo | Exceeds 500 contacts or 1,000 emails/month | 🟡 Research Topic | Evaluate for store email marketing |
| Klaviyo | E-commerce email automation; abandoned cart recovery, order follow-ups | Klaviyo | 500 contacts / 500 emails/mo | $0 free / $20+/mo | Exceeds 500 contacts or emails/month | 🟡 Research Topic | Evaluate vs Mailchimp for e-commerce |
| Yotpo / Okendo | Product reviews and user-generated content for storefronts | Yotpo / Okendo | Limited free tier | $0 free / $19+/mo | Needs advanced review features | 🟡 Research Topic | Evaluate for store social proof |

---

## 5. Face App — Mature Women & Seniors Platform

> The face app is designed for mature older women and seniors. It focuses on beauty, wellness, skincare, and self-care tools tailored to this demographic.

### 5.1 AI & Image Processing

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| OpenAI GPT-4o Vision | Analyzes facial images; provides personalized skincare or beauty recommendations | OpenAI | No free tier | $10–100/mo | First production call (no free tier) | ❌ Expired / Lapsed | Core AI feature — provision before launch |
| Replicate | Runs open-source image ML models; skin tone analysis, feature detection | Replicate | Free credits (~$0.10 initial) | $0.001–0.01/call | Free credits exhausted | 🟡 Research Topic | Evaluate for image analysis models |
| AWS Rekognition | Facial analysis API: age estimation, expression, landmark detection | Amazon | 5,000 images/mo free (12 months) | $0 free / $0.001+/image | Exceeds 5,000 images/month or 12-month trial ends | 🟡 Research Topic | Evaluate for facial feature detection |
| Mediapipe (Google) | Open-source face landmark detection; runs on device; no API cost | Google / FOSS | Unlimited (on-device) | $0 | N/A (runs on device) | 🟡 Research Topic | Evaluate for privacy-preserving on-device features |

### 5.2 Mobile App Infrastructure

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Expo / React Native | Cross-platform mobile app framework (iOS + Android from one codebase) | Expo (FOSS) | Unlimited (FOSS) | $0 | N/A (FOSS framework) | 🟡 Research Topic | Recommended stack for face app |
| Expo EAS Build | Cloud builds for iOS and Android without local Xcode | Expo | 30 builds/mo free | $0 free / $29+/mo | Exceeds 30 builds/month | 🟡 Research Topic | Required for App Store submissions |
| Firebase (Auth + Firestore) | User authentication, real-time database, push notifications | Google | Generous free tier (Spark plan) | $0 free / pay-per-use | Exceeds Spark plan limits (50k reads/day, 20k writes/day) | 🟡 Research Topic | Evaluate for backend + auth + notifications |
| Apple Developer Program | Required for iOS App Store submission and TestFlight | Apple | No free tier | $99/yr | Ready to submit to App Store | ❌ Expired / Lapsed | Face app iOS distribution |
| Google Play Developer | Required for Android Play Store submission | Google | One-time $25 registration | $25 one-time | Ready to submit to Play Store | ❌ Expired / Lapsed | Face app Android distribution |

### 5.3 Content & Community

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|---|
| Sanity CMS | Headless CMS for managing skincare articles, tips, and beauty guides | Sanity | Free (limited) | $0 free / $15+/mo | Exceeds free tier API calls or seats | 🟡 Research Topic | Evaluate for content management |
| Contentful | Headless CMS alternative; structured content for app articles | Contentful | 25k records / 48 content types (free) | $0 free / $300+/mo | Exceeds free tier record limit | 🟡 Research Topic | Evaluate vs Sanity |
| Circle.so | Community platform (private community for app users) | Circle | No free tier | $49+/mo | First use (no free tier) | 🟡 Research Topic | Evaluate for user community feature |

### 5.4 Accessibility & Senior UX

| Service / Standard | What It Does | Provider | Cost | ⚡ UPGRADE TRIGGER | Status | Notes |
|---|---|---|---|---|---|---|
| @axe-core/playwright | Automated WCAG accessibility testing in CI pipeline | Deque (FOSS) | $0 | N/A (FOSS) | 🟡 Research Topic | Required for WCAG 2.1 AA compliance testing |
| VoiceOver / TalkBack testing | Screen reader compatibility testing for senior users | Apple / Google | $0 (built-in) | N/A | 🟡 Research Topic | Manual testing required before App Store submission |
| UserTesting.com | Remote user research with real senior testers | UserTesting | No free tier | $49+/test (first test session) | 🟡 Research Topic | Evaluate for senior-specific UX validation |
| Dynamic Type / Font scaling | iOS dynamic type and Android font scaling support | Apple / Google | $0 (platform feature) | N/A | 🟡 Research Topic | Must implement before launch |

---

## 6. GitHub Repository & Developer Tools

> Tools that are referenced in this repository or used across the development workflow.

| Service | What It Does | Provider | Free Tier Limit | Monthly Cost | ⚡ UPGRADE TRIGGER | Status | Used By |
|---|---|---|---|---|---|---|---|
| GitHub (Free) | Version control, issues, pull requests, Actions for public repos | GitHub | Unlimited public repos; 2k Actions min/mo | $0 | Needs private repos, more Actions minutes, or team features | ✅ Active | All projects |
| GitHub Pro / Team | Adds private repos, more Actions minutes, code review features | GitHub | N/A | $4–4/mo (Pro) / $4/seat (Team) | Needs private repo advanced features | 🟡 Research Topic | Evaluate upgrade tier |
| GitHub Copilot Individual | AI code completion and chat in IDE | GitHub | No free tier | $10–19/mo/seat | First seat activated | ⚠️ Expiring Soon | All developers |
| Dependabot | Automated dependency update PRs when vulnerabilities are found | GitHub | Free (built into GitHub) | $0 | N/A (free with GitHub) | ✅ Active | All repos |
| GitHub Advanced Security | Code scanning (CodeQL), secret scanning, dependency review | GitHub | Free for public repos | $0 public / $19+/mo private | Repo becomes private and needs security scanning | 🟡 Research Topic | Security-sensitive private repos |
| Namecheap | Domain registrar for all MIDNGHTSAPPHIRE domains | Namecheap | No free tier | ~$15/yr per domain | Domain expiry date | ✅ Active | All domains |

---

## 7. Research Topics — Suggested Tools to Evaluate

> These items have been identified as potentially valuable but have **not yet been adopted**. Each entry includes a rationale and suggested next steps.

| Tool / Service | Category | What It Does | Why Evaluate | Est. Cost | Suggested Next Step | Priority |
|---|---|---|---|---|---|---|
| **Airtable** | Inventory Management | Flexible database with spreadsheet UI; ideal for product catalog and inventory tracking across businesses | No code required; connects to Zapier for automation | Free (1,200 records) / $20+/mo | Create one base for Vine House product inventory | P1 |
| **Stessa** | Rental Accounting | Free rental property P&L tracker; connects to bank; generates Schedule E reports for taxes | Purpose-built for landlords; genuinely free | $0 free / $20+/mo premium | Sign up and connect Vine House Capital bank account | P1 |
| **TurboTenant** | Rental Management | Free landlord software for tenant screening, lease templates, rent collection | Free for landlords (tenants pay screening fee) | $0 for landlords | Sign up and create first lease template | P1 |
| **Wave Accounting** | Accounting | Free invoicing and bookkeeping for small businesses; bank sync included | Genuinely free for core features; no credit card required | $0 free / $16+/mo payroll | Set up Wave for Vine House Capital financials | P1 |
| **Shopify** | E-Commerce | Full-featured storefront platform for Vine House, coffee store, and specialty stores | Powers millions of stores; integrates with all major shipping and payment providers | $39+/mo | Start Shopify trial for coffee store or Vine House | P1 |
| **GitGuardian** | Security | Real-time commit scanning for accidentally committed API keys and secrets | Free for individuals; instant protection against leaking credentials | $0 (individual) | Install GitGuardian GitHub app on all repos | P0 |
| **UptimeRobot** | Monitoring | 5-minute uptime checks for all deployed URLs; sends email/SMS alerts on downtime | Free for 50 monitors; zero setup friction | $0 | Add all deployed Revvel app URLs to UptimeRobot | P0 |
| **Sentry** (free tier) | Error Monitoring | Captures application exceptions in production; stack traces, user context | Free 5k errors/month is sufficient for early-stage apps | $0 | Add Sentry DSN to every deployed app's `.env` | P0 |
| **Klaviyo** | Email Marketing | E-commerce focused email automation; abandoned cart, order follow-ups | Purpose-built for e-commerce; better ROI than generic email tools | Free (500 contacts) / $20+/mo | Evaluate once coffee store has first 100 customers | P2 |
| **Faire** | Wholesale | Wholesale marketplace connecting specialty brands with independent retailers | Reach retail buyers without a sales team | 15% first order / 9% recurring | Evaluate for specialty store wholesale channel | P2 |
| **Circle.so** | Community | Private community platform for face app user engagement and content | Senior users benefit from moderated community; in-app integration possible | $49+/mo | Evaluate once face app has first 100 users | P2 |
| **Mediapipe** | AI/Image | On-device face landmark detection; no API cost; fully private | Privacy-preserving; ideal for senior audience who may be sensitive about face data | $0 (FOSS) | Prototype face landmark detection with Mediapipe | P1 |
| **Better Auth** | Authentication | Open-source auth framework; self-hosted; no per-user pricing | No vendor lock-in; free at any scale; full control | $0 (self-hosted) | Evaluate for face app and new project auth | P1 |

---

## 8. Expired / Lapsed — Action Required

> Items that have expired, lapsed, or whose free trial has ended and require an immediate decision.

| Item | What It Does | Business | Last Active | ⚡ Action Required | Priority |
|---|---|---|---|---|---|
| Anthropic Claude API | Primary LLM for all autonomous agents | Revvel Tech | — | Provision API key in Vault; fund account | P0 |
| OpenAI API | AI features for Neurooz; GPT-4o for reasoning | Revvel Tech | — | Provision API key; fund account | P0 |
| Google Maps Platform | GPS and mapping for Universal SAR App | Revvel Tech | — | Enable billing in Google Cloud Console | P0 |
| Firebase Cloud Messaging | Push notifications for mobile apps | Revvel Tech | — | Create Firebase project; enable FCM | P0 |
| Stripe (Premolt) | Payment processing for Premolt subscriptions | Revvel Tech | — | Activate Stripe account in live mode | P0 |
| Stripe (Revvel Music Studio) | Music marketplace payment processing | Revvel Tech | — | Activate Stripe account in live mode | P0 |
| DigitalOcean Spaces | Object storage for media and user uploads | Revvel Tech | — | Create Spaces bucket; configure CDN | P0 |
| Apple Developer Program | iOS App Store publishing for all mobile apps | Revvel Tech | — | Purchase $99/yr membership | P1 |
| Google Play Developer | Android Play Store publishing for all mobile apps | Revvel Tech | — | Register $25 one-time developer account | P1 |
| thealttext.com domain | Keeps The Alt Text product accessible | Revvel Tech | — | Verify renewal date; renew at Namecheap | P0 |
| Google OAuth (Soul2Bowl) | Google Sign-In for Soul2Bowl users | Revvel Tech | — | Create Google Cloud project; configure OAuth | P0 |
| OpenAI GPT-4o Vision (Face App) | Core AI for face app personalization features | Face App | — | Provision API key before app launch | P0 |

---

## 9. GitHub Apps & Integrations

> Ready-to-install GitHub Apps that can be added via the GitHub Marketplace. No code required.

| App | What It Does | Cost | ⚡ UPGRADE TRIGGER | Status | Install Link |
|---|---|---|---|---|---|
| **Bito AI** | Persistent-memory code review with agentic workflows; enforces repo conventions automatically | Free (limited) / $20+/mo | Exceeds free tier limits | ✅ Active | Installation ID: [128849516](https://github.com/settings/installations/128849516) |
| **RecurseML** | Autonomous code review on every PR; enforces Revvel standards | $250/yr | Trial ends April 28, 2026 | 🧪 Trial Active | Already installed |
| **Dependabot** | Automated dependency update PRs for security vulnerabilities | Free | N/A (always free) | ✅ Active | Built into GitHub |
| **GitGuardian** | Scans every push for accidentally committed secrets | Free (individual) | Needs team plan for multiple contributors | 🟡 Research Topic | [marketplace.github.com](https://github.com/marketplace/gitguardian) |
| **Snyk** | Dependency vulnerability scanning + automatic fix PRs | Free (limited) / $25+/mo | Exceeds free scan quota | 🟡 Research Topic | [marketplace.github.com](https://github.com/marketplace/snyk) |
| **Codecov** | Test coverage reports posted to every PR — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#31-codecov--coverage-reporting) | Free (public repos) / $10+/mo | Repo becomes private | 🟡 Research Topic (Adopt) | [marketplace.github.com](https://github.com/marketplace/codecov) |
| **Linear** | Issue tracking and sprint planning; GitHub issue sync | Free (limited) / $8+/seat/mo | Exceeds free tier limits | 🟡 Research Topic | [linear.app](https://linear.app) |
| **Sentry** | Error monitoring posts alerts and deployment tracking to GitHub | Free (5k errors/mo) | Exceeds 5k errors/month | 🟡 Research Topic | [marketplace.github.com](https://github.com/marketplace/sentry-io) |
| **Semgrep** | Custom SAST in YAML; mirrors [`recurse-rules.md`](../recurse-rules.md) as a second signal to CodeQL — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#32-semgrep--custom-sast-rules) | Free (Community) | Team features or >20 contributors | 🟡 Research Topic (Adopt) | [marketplace.github.com](https://github.com/marketplace/semgrep-dev) |
| **pre-commit ci** | Hosted pre-commit runner that auto-pushes fix commits on PRs — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#33-pre-commit-ci--hosted-pre-commit-auto-fix) | Free (public repos) / $5/mo private | Repo becomes private | 🟡 Research Topic (Adopt) | [marketplace.github.com](https://github.com/marketplace/pre-commit-ci) |
| **SonarQube Cloud** | SAST + code-smell metrics (complexity, duplication) — free while repos are public — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#41-sonarqube-cloud--sast--smells-public-repos) | Free (public) / $75+/mo private | Any repo flips to private | 🟡 Research Topic | [marketplace.github.com](https://github.com/marketplace/sonarcloud) |
| **Infracost** | Terraform cloud-cost estimates in PRs — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#42-infracost--terraform-cost-estimates-in-prs) | Free (Cloud tier) | Enterprise SSO / policy needs | 🟡 Research Topic (on condition) | [marketplace.github.com](https://github.com/marketplace/infracost) |
| **Argos Visual Testing** | Visual regression diffs on UI PRs — [evaluated here](CODE_QUALITY_APPS_EVAL_2026-04-23.md#43-argos-visual-testing--visual-regression) | Free (5k screenshots/mo OSS) | Exceeds 5k screenshots/mo | 🟡 Research Topic (on condition) | [marketplace.github.com](https://github.com/marketplace/argos-ci) |
| **Sourcery / DeepSource / Qlty Cloud / CodeFactor / CodeAnt AI / CR.GPT / Code Review Doctor** | AI / aggregator PR reviewers | varies | — | 🗑️ Removed — [duplicates RecurseML + OpenRouter reviewer](CODE_QUALITY_APPS_EVAL_2026-04-23.md#51-duplicate-recurseml--openrouter-ai-reviewer) | see eval |
| **Aikido Security / DeepScan / Datree / Imgbot / CodeScene / Coveralls** | Security bundle / JS SAST / K8s policy / image optimizer / behavioral analysis / coverage | varies | — | 🗑️ Removed — [wrong stack or duplicates existing tooling](CODE_QUALITY_APPS_EVAL_2026-04-23.md#5-skip--defer--and-below) | see eval |

> Full rationale for adoption / deferral / rejection of the 20 apps in the April 2026 code-quality sweep: [`CODE_QUALITY_APPS_EVAL_2026-04-23.md`](CODE_QUALITY_APPS_EVAL_2026-04-23.md).

---

## 10. Inventory Summary by Business

| Business / Project | Active Services | Research / Pending | Expired / Action Needed | Est. Monthly Cost |
|---|---|---|---|---|
| Revvel Tech Ecosystem | GitHub, Dependabot, HashiCorp Vault, Cloudflare DNS, DigitalOcean Droplet, DigitalOcean MySQL, GitHub Actions, Resend | Most APIs | Anthropic, OpenAI, Google Maps, FCM, Stripe, Spaces, Domain renewals | ~$27–50/mo (infra only) |
| Vine House Products | — | Shopify/WooCommerce, Airtable, Shippo, Square | — | TBD |
| Vine House Capital (Rental) | — | Stessa, TurboTenant, Wave Accounting | — | $0 (free tools available) |
| Coffee Store | — | Shopify, Square, Mailchimp/Klaviyo | — | TBD |
| Specialty Stores | — | Multi-store Shopify, Amazon, Faire, eBay | — | TBD |
| Face App | — | React Native, Firebase, Replicate, Mediapipe | OpenAI GPT-4o, Apple Dev, Google Play | TBD |

---

*This document is the Master Inventory for all MIDNGHTSAPPHIRE ventures. Update after any signup, cancellation, tier upgrade, or new evaluation. Do not store API keys or tokens — describe what each service does.*

*Last Updated: April 2026 — maintained by Audrey Evans (MIDNGHTSAPPHIRE)*
