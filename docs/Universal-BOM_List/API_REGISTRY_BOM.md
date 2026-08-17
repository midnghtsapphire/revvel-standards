# API Registry BOM — Universal Revvel Standards

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Living Document  
**Scope:** All Revvel Projects  

> This document is the authoritative registry of every API — currently in use, needed, or recommended for evaluation — across the entire Revvel ecosystem. Each entry includes priority, cost, free tier availability, which projects need it, and setup notes. The coding agent MUST consult this registry before requesting new API credentials or recommending a new integration.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Active | API key exists, provisioned in Vault, in use |
| 🔵 Recommended | Should be added — not yet provisioned |
| 🟡 Evaluate | Worth evaluating for specific use cases |
| ❌ Not Provisioned | Identified as needed but no key yet |
| 🗑️ Skip | Not a fit for current Revvel stack |

---

## 1. AI / LLM APIs

### 1.1. Primary Reasoning LLMs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Anthropic Claude API** | Anthropic | ❌ No free tier | $3–75/M tokens | P0 | ❌ Not Provisioned | Audrey, Agent Factory, all agents | **Primary LLM for all Revvel agents.** Claude 3.7 Sonnet recommended for coding; Claude 3 Haiku for fast tasks. Add API key to Vault immediately |
| **OpenAI API** | OpenAI | ❌ No free tier | $0.15–30/M tokens | P0 | ✅ Active | Neurooz, GBrain, Revvel Forensic Studio, The Alt Text | API key provisioned in Vault at `revvel/shared/llm/openai`. GPT-4o for reasoning; GPT-4o mini for speed/cost |
| **Google Gemini API** | Google | ✅ Free tier (limited RPM) | $0 free / $0.075+/M tokens | P1 | 🔵 Recommended | Agent Factory, multi-model router | Gemini 1.5 Flash free tier useful for high-volume tasks; Pro for quality. Via Google AI Studio |
| **Google Vertex AI** | Google Cloud | 🆓 Free credits | Pay per use | P2 | 🟡 Evaluate | Enterprise projects | Managed Gemini + other models; better for production scale |

### 1.2. Fast / Cost-Optimized LLMs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Groq API** | Groq | 🆓 Free tier (rate limited) | $0 free / $0.06+/M tokens | P1 | 🔵 Recommended | Agent Factory, real-time features | Blazing fast inference (hundreds of tokens/sec); excellent for latency-sensitive tasks |
| **Together AI** | Together.ai | 🆓 Free $5 credits | $0.20+/M tokens | P1 | 🔵 Recommended | Skills, agent experiments | Run FOSS models (Llama 3, Mixtral, etc.) via API; good for non-OpenAI fallback |
| **Fireworks AI** | Fireworks | 🆓 Free credits | $0.20+/M tokens | P2 | 🟡 Evaluate | Skills | Fast FOSS model hosting |
| **Mistral API** | Mistral AI | ❌ No free tier | $0.20+/M tokens | P2 | 🟡 Evaluate | Agent Factory | European LLM; strong coding; good GDPR story |
| **Perplexity API** | Perplexity AI | ❌ No free tier | Tokens + tool calls (e.g. web_search ~$2.50/1k; verify price sheet) | P1 | 🔵 Recommended | Research agents, `products/pplx-api-skills` | Sonar/Agent API with built-in tools (“skills”), MCP, custom functions + citations. Ship path: `products/pplx-api-skills` (port 3012). Keep no-key bridge for free best-effort research only. |

### 1.3. Local / Self-Hosted LLMs

| Tool | License | Free? | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Ollama** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) | P1 | 🔵 Recommended | Run Llama 3, Mistral, CodeLlama locally; no API key; use for dev/test to save API costs |
| **LM Studio** | Proprietary | ✅ Free | $0 | P2 | 🟡 Evaluate | GUI for local models; good for non-technical evaluation |
| **vLLM** | Apache 2.0 ✅ FOSS | ✅ Free | $0 (compute cost) | P3 | 🟡 Evaluate | High-throughput self-hosted inference; evaluate when DigitalOcean GPU is available |
| **LocalAI** | MIT ✅ FOSS | ✅ Free | $0 | P3 | 🟡 Evaluate | OpenAI-compatible API for local models |

---

## 2. Search & Knowledge APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Brave Search API** | Brave | 🆓 Free (2,000 queries/mo) | $3+/1000 queries | P1 | 🔵 Recommended | Research agents, BOM self-healing | **Best FOSS-friendly search API.** Generous free tier; privacy-respecting; no Google dependency |
| **Serper API** | Serper.dev | 🆓 Free (2,500 queries) | $50/50k queries | P1 | 🔵 Recommended | Research agents | Google search results via API; very affordable; used by many AI agent frameworks |
| **Tavily API** | Tavily | 🆓 Free (1,000 queries/mo) | $10+/mo | P1 | 🔵 Recommended | Research agents, LangChain | Purpose-built search for AI agents; returns AI-optimized results |
| **Bing Web Search API** | Microsoft | 🆓 Free (1,000 queries/mo) | $3+/1000 queries | P2 | 🟡 Evaluate | Research agents | Azure Cognitive Services; solid alternative |
| **SerpAPI** | SerpAPI | 🆓 Free (100 searches/mo) | $50+/mo | P2 | 🟡 Evaluate | Research agents | Scrapes Google, Bing, Yahoo results |
| **Exa API** | Exa.ai | 🆓 Free credits | $0.01+/search | P2 | 🟡 Evaluate | RAG, semantic search | Neural search API; embeddings-based; good for document retrieval |

---

## 3. Maps & Geolocation APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Google Maps Platform** | Google | 🆓 $200/mo free credit | $7–14/1000 requests | P0 | ❌ Not Provisioned | Universal SAR App | Required for GPS and mapping features. $200/mo free credit covers most small apps |
| **Mapbox** | Mapbox | 🆓 Free (25k map loads/mo) | $0.50+/1000 loads | P1 | 🔵 Recommended | Universal SAR App | FOSS-friendly alternative to Google Maps; generous free tier; custom map styles |
| **OpenStreetMap / Leaflet** | ODbL ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | All mapping projects | Fully FOSS mapping; no API key needed for basic use; Nominatim for geocoding |
| **Nominatim** | ODbL ✅ FOSS | ✅ Free | $0 (self-host) / Free hosted (fair use) | P1 | 🔵 Recommended | Universal SAR App | FOSS geocoding from OpenStreetMap; use for address lookup |
| **ipapi.co** | Proprietary | 🆓 Free (1,000/day) | $15+/mo | P2 | 🟡 Evaluate | Analytics, personalization | IP-based geolocation |

---

## 4. Communications APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Resend** | Resend | ✅ Free (3k emails/mo, 100/day) | $20+/mo | P0 | ✅ Active | GrowlingEyes | **Already in Revvel stack.** Transactional email; easy API |
| **SendGrid** | Twilio | 🆓 Free (100 emails/day) | $19.95+/mo | P1 | 🟡 Evaluate | All email projects | Alternative to Resend; larger ecosystem |
| **Postmark** | Wildbit | 🆓 Free (100 emails/mo test) | $15+/mo | P2 | 🟡 Evaluate | All email projects | Excellent deliverability; developer-friendly |
| **Twilio SMS** | Twilio | 🆓 Free trial credit | $0.0079+/SMS | P1 | 🔵 Recommended | Universal SAR App, incident alerts | SMS for incident notifications; required for SAR app alerts |
| **Twilio Voice** | Twilio | 🆓 Free trial credit | $0.013+/min | P2 | 🟡 Evaluate | SAR App, emergency systems | Voice calls for emergency coordination |
| **Vonage (Nexmo)** | Vonage | 🆓 Free trial credit | $0.0075+/SMS | P2 | 🟡 Evaluate | All messaging | Alternative to Twilio; competitive pricing |
| **Firebase Cloud Messaging** | Google | ✅ Free | $0 | P0 | ❌ Not Provisioned | Universal SAR App, GrowlingEyes | **Required for push notifications.** Free; add to all mobile apps |
| **OneSignal** | OneSignal | 🆓 Free (10k subscribers) | $9+/mo | P1 | 🔵 Recommended | All apps with push | Easiest push notification setup; generous free tier; great alternative to FCM |
| **Novu** | MIT ✅ FOSS | 🆓 Free (30k events/mo) | $250+/mo | P2 | 🟡 Evaluate | Notification orchestration | FOSS notification infrastructure; email + SMS + push in one API |

---

## 5. Payments & Financial APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Stripe** | Stripe | ✅ No monthly fee | 2.9% + $0.30/transaction | P0 | ✅ Active | GrowlingEyes, Premolt | **Already in Revvel stack.** Standard payment processor |
| **Stripe Connect** | Stripe | ✅ No monthly fee | 0.25–2% platform fee | P1 | 🔵 Recommended | Marketplace apps | For marketplace-style apps where Revvel splits payments |
| **Stripe Billing** | Stripe | ✅ No monthly fee | 0.5–0.8% revenue | P1 | 🔵 Recommended | Neurooz, subscription apps | Recurring billing, subscription management |
| **Lemon Squeezy** | Lemon Squeezy | ✅ No monthly fee | 5% + $0.50/transaction | P2 | 🟡 Evaluate | Digital products, software licenses | Merchant of record (handles VAT globally); good for solo devs |
| **Paddle** | Paddle | ✅ No monthly fee | 5% + $0.50/transaction | P2 | 🟡 Evaluate | SaaS, digital products | Alternative merchant of record |

---

## 6. Authentication & Identity APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Clerk** | Clerk | 🆓 Free (10k MAU) | $25+/mo | P0 | 🔵 Recommended | All apps needing auth | Best-in-class auth DX; built-in Next.js integration; cited in `TESTING_STANDARD.md` |
| **Google OAuth 2.0** | Google | ✅ Free | $0 | P0 | ✅ Active | GrowlingEyes | **Already in Revvel stack.** |
| **Auth0** | Okta | 🆓 Free (7,500 MAU) | $23+/mo | P1 | 🟡 Evaluate | Enterprise apps | Enterprise-grade; more complex than Clerk |
| **Supabase Auth** | Supabase | 🆓 Free (50k MAU) | $25+/mo | P1 | 🟡 Evaluate | Apps using Supabase DB | Auth built into Supabase; good if already on Supabase |
| **Lucia Auth** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | FOSS auth option | TypeScript auth library; self-managed sessions |
| **Better Auth** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | All Next.js apps | Newer FOSS auth; excellent TypeScript support; growing fast |

---

## 7. Database & Storage APIs

### 7.1. Database Services

| API/Service | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **DigitalOcean Managed MySQL** | DigitalOcean | ❌ No free tier | ~$15+/mo | P0 | ✅ Active | All projects | **Already in Revvel stack.** Shared instance at `164.90.148.7` |
| **Supabase** | Supabase | 🆓 Free (500 MB, 50k MAU) | $25+/mo | P1 | 🔵 Recommended | New projects | Postgres + Auth + Storage + Realtime + Edge Functions in one; free tier is generous |
| **Neon** | Neon | 🆓 Free (0.5 GiB storage) | $19+/mo | P1 | 🟡 Evaluate | Serverless apps | Serverless Postgres; scale-to-zero; excellent for low-traffic apps |
| **PlanetScale** | PlanetScale | ❌ Free tier removed | $39+/mo | P3 | 🗑️ Skip | — | Removed free tier; not recommended |
| **Turso** | Turso | 🆓 Free (8 DBs, 500 queries/day) | $29+/mo | P2 | 🟡 Evaluate | Edge/mobile apps | SQLite at the edge; excellent for Neurooz or mobile-first apps |
| **Upstash Redis** | Upstash | 🆓 Free (10k commands/day) | $0.2+/100k commands | P1 | 🔵 Recommended | Caching, rate limiting, queues | Serverless Redis; use for rate limiting, session cache, job queues |

### 7.2. File & Object Storage

| API/Service | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Cloudflare R2** | Cloudflare | 🆓 Free (10 GB storage, 1M requests) | $0.015/GB | P0 | 🔵 Recommended | Revvel Music Studio, all media | **No egress fees.** Best cost for media/audio hosting; R2 + Workers ideal |
| **DigitalOcean Spaces** | DigitalOcean | ❌ No free tier | $25/mo (250 GB) | P1 | 🟡 Evaluate | All media | S3-compatible; already on DigitalOcean; simple to add |
| **AWS S3** | Amazon | 🆓 5 GB (12 months) | $0.023/GB | P2 | 🟡 Evaluate | All media | Industry standard; costly at scale compared to R2 |
| **Vercel Blob** | Vercel | 🆓 Free (200 MB) | $0.15+/GB | P3 | 🟡 Evaluate | Vercel-deployed apps | Convenient if using Vercel; limited free tier |
| **Uploadthing** | Uploadthing | 🆓 Free (2 GB, 100 uploads/mo) | $10+/mo | P2 | 🟡 Evaluate | File upload features | Simplest file upload API for Next.js |

### 7.3. Vector Databases (AI/RAG)

| API/Service | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Pinecone** | Pinecone | 🆓 Free (1 index, 100k vectors) | $70+/mo | P1 | 🔵 Recommended | Neurooz, RAG skills | Managed vector DB; easiest for prototyping RAG |
| **Qdrant** | Apache 2.0 ✅ FOSS | 🆓 Free (1 GB cloud) | $0 (self-hosted) / $25+/mo | P1 | 🔵 Recommended | Neurooz, RAG skills | **FOSS alternative to Pinecone**; self-host on DigitalOcean droplet |
| **Weaviate** | BSD ✅ FOSS | 🆓 Free (14-day sandbox) | $0 (self-hosted) / $25+/mo | P2 | 🟡 Evaluate | RAG skills | FOSS vector DB with GraphQL API |
| **Chroma** | Apache 2.0 ✅ FOSS | ✅ Free | $0 (self-hosted) | P1 | 🔵 Recommended | Dev/test RAG pipelines | Simplest FOSS vector DB; great for development |
| **pgvector** | PostgreSQL ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Apps already on Postgres | Add vector search to existing Postgres; no extra service |

---

## 8. Content & CMS APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Sanity** | Sanity | 🆓 Free (2 users, 25 GB CDN) | $15+/mo | P1 | 🔵 Recommended | Content-heavy apps | Structured content platform; GROQ query language; great React/Next.js integration |
| **Strapi** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) / $9+/mo (cloud) | P1 | 🔵 Recommended | All apps needing CMS | FOSS headless CMS; self-host on DigitalOcean droplet |
| **Contentful** | Proprietary | 🆓 Free (25k records) | $300+/mo | P3 | 🟡 Evaluate | Large content operations | Enterprise CMS; expensive; Sanity preferred |
| **Payload CMS** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) / $35+/mo | P2 | 🟡 Evaluate | Next.js apps | FOSS CMS with TypeScript-first design; excellent for Next.js |

---

## 9. Analytics & Product Intelligence APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **PostHog** | MIT ✅ FOSS | 🆓 Free (1M events/mo) | $0 free / $0.00031+/event | P0 | 🔵 Recommended | All apps | **Best FOSS analytics choice.** Product analytics + session replay + feature flags + A/B testing in one. Self-hostable. |
| **Plausible** | AGPL ✅ FOSS | ❌ No free tier | $9+/mo (hosted) / Free (self-host) | P1 | 🔵 Recommended | All websites | Privacy-first web analytics; GDPR-compliant by default; lightweight script |
| **Umami** | MIT ✅ FOSS | ✅ Free | $0 (self-hosted) / $9+/mo | P1 | 🟡 Evaluate | All websites | FOSS Google Analytics alternative; simple; self-hostable |
| **Mixpanel** | Proprietary | 🆓 Free (20M events/mo) | $20+/mo | P2 | 🟡 Evaluate | Growth/product analytics | Generous free tier; funnels, retention; PostHog preferred |
| **Amplitude** | Proprietary | 🆓 Free (10M events/mo) | $61+/mo | P3 | 🟡 Evaluate | Enterprise analytics; revvel-standards repo telemetry | PostHog or Mixpanel preferred. Repo telemetry wired via `.github/workflows/amplitude-events.yml`; secret `AMPLITUDE_API_KEY`. See `standards/AMPLITUDE_INTEGRATION_STANDARD.md`. |
| **Google Analytics 4** | Proprietary | ✅ Free | $0 | P2 | 🟡 Evaluate | Web apps | Free; privacy concerns (GDPR); Plausible preferred for EU compliance |

---

## 10. AI Agent Orchestration & Workflow APIs

| API/Tool | License | Free Tier | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **LangChain** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Framework for building LLM chains and agents; Python + JS versions |
| **LangSmith** | Proprietary | 🆓 Free (5k traces/mo) | $39+/mo | P1 | 🔵 Recommended | LLM observability, tracing, and evaluation; pairs with LangChain |
| **LlamaIndex** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | RAG and data pipeline framework; pairs well with vector DBs |
| **CrewAI** | MIT ✅ FOSS | ✅ Free | $0 | P1 | 🔵 Recommended | Multi-agent orchestration; role-based agents; aligns well with Agent Factory Standard |
| **AutoGen** | MIT ✅ FOSS | ✅ Free | $0 | P2 | 🟡 Evaluate | Microsoft's multi-agent framework; good for coding agent pipelines |
| **Dify** | Apache 2.0 ✅ FOSS | 🆓 Free tier (hosted) | $0 (self-hosted) / $59+/mo | P2 | 🟡 Evaluate | Visual LLM app builder; self-hostable; good for non-technical teammates |
| **Flowise** | Apache 2.0 ✅ FOSS | ✅ Free | $0 (self-hosted) | P2 | 🟡 Evaluate | Drag-and-drop LangChain builder; self-host on DigitalOcean |
| **n8n** | FOSS (fair-code) | 🆓 Free (self-hosted) | $0 (self-host) / $20+/mo | P1 | 🔵 Recommended | **Workflow automation** — connect any API, trigger agents, automate BOM updates |
| **Zapier** | Proprietary | 🆓 Free (100 tasks/mo) | $19.99+/mo | P2 | 🟡 Evaluate | Automation; n8n preferred for self-hosting |

---

## 11. Developer Infrastructure APIs

### 11.1. Version Control & CI

| API | Provider | Free Tier | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **GitHub API** | Microsoft | ✅ Free (rate limited) | $0 | P0 | ✅ Active | Core to Revvel workflow; issues, PRs, Actions |
| **GitHub Advanced Security** | Microsoft | 🆓 Free (public repos) | $19+/user/mo (private) | P1 | 🔵 Recommended | Enable CodeQL, secret scanning on all private repos |

### 11.2. Deployment & Hosting

| API/Service | Provider | Free Tier | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **DigitalOcean** | DigitalOcean | ❌ No free tier | $6+/mo | P0 | ✅ Active | Revvel's primary hosting; shared droplet |
| **Vercel** | Vercel | 🆓 Free (hobby) | $20+/mo (pro) | P1 | 🔵 Recommended | Excellent for Next.js deployments; consider for GrowlingEyes web frontend |
| **Cloudflare Workers** | Cloudflare | 🆓 Free (100k req/day) | $5+/mo (paid) | P1 | 🔵 Recommended | Edge compute; R2 storage; excellent free tier for lightweight APIs |
| **Railway** | Proprietary | 🆓 Free ($5 credit/mo) | $5+/mo | P2 | 🟡 Evaluate | Easy deployment; good for small services; consider for quick experiments |
| **Fly.io** | Proprietary | 🆓 Free (3 small VMs) | $1.94+/mo | P2 | 🟡 Evaluate | Docker-based deployment; global edge; generous free tier |

### 11.3. DNS & CDN

| Service | Provider | Free Tier | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Cloudflare DNS** | Cloudflare | ✅ Free | $0 | P0 | 🔵 Recommended | Free DNS + DDoS protection + CDN for all Revvel domains |
| **Namecheap DNS** | Namecheap | ✅ Free (with domain) | $0 | P0 | ✅ Active | Current DNS provider |

---

## 12. Music & Audio APIs (Revvel Music Studio)

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **Spotify Web API** | Spotify | ✅ Free | $0 | P1 | 🔵 Recommended | Revvel Music Studio | Search, metadata, playback control; no royalties required for metadata |
| **Bandcamp API** | Bandcamp | ✅ Free | $0 | P1 | 🔵 Recommended | Revvel Music Studio | Artist/album data; affiliate integration |
| **Last.fm API** | Last.fm | ✅ Free | $0 | P2 | 🟡 Evaluate | Music recommendations | Scrobbling, recommendation data |
| **Discogs API** | Discogs | ✅ Free | $0 | P2 | 🟡 Evaluate | Music studio | Vinyl/physical music marketplace data |
| **ACRCloud** | ACRCloud | 🆓 Free (1k recognitions/day) | $99+/mo | P2 | 🟡 Evaluate | Music recognition | Audio fingerprinting / music recognition API |
| **Cloudflare Stream** | Cloudflare | 🆓 Free (1k min stored, 1k min viewed) | $5+/1k min | P1 | 🔵 Recommended | Revvel Music Studio | Video/audio streaming with R2-like pricing; pairs with R2 storage |

---

## 13. SEO & Web Data APIs

| API | Provider | Free Tier | Cost | Priority | Status | Projects | Notes |
|---|---|---|---|---|---|---|---|
| **DataForSEO** | DataForSEO | 🆓 Free credits ($1) | $0.0075+/task | P1 | 🔵 Recommended | SEO agents, all apps | SERP data, keyword research, backlink data; very affordable API |
| **Ahrefs API** | Ahrefs | ❌ No free tier | $99+/mo (with Ahrefs plan) | P3 | 🟡 Evaluate | SEO agents | Premium SEO data; evaluate when revenue supports |
| **Semrush API** | Semrush | ❌ No free tier | $119+/mo | P3 | 🟡 Evaluate | SEO agents | Premium SEO data |
| **Screaming Frog** | Proprietary | 🆓 Free (500 URLs) | £149/year | P2 | 🟡 Evaluate | Site audits | Website crawler; use for periodic site audits |

---

## 14. Utility & Enrichment APIs

| API | Provider | Free Tier | Cost | Priority | Status | Notes |
|---|---|---|---|---|---|---|
| **Abstract API** | Abstract | 🆓 Free (various limits per API) | $9+/mo | P2 | 🟡 Evaluate | Suite of utility APIs: email validation, phone validation, IP geolocation |
| **Hunter.io** | Hunter | 🆓 Free (25 searches/mo) | $34+/mo | P2 | 🟡 Evaluate | Email finder for B2B outreach |
| **Clearbit** (now HubSpot) | HubSpot | ❌ Free tier removed | Contact sales | P3 | 🗑️ Skip | Expensive; not a fit for current stage |
| **ZeroBounce** | ZeroBounce | 🆓 Free (100 credits) | $18+/mo | P2 | 🟡 Evaluate | Email validation before sending |
| **OpenWeatherMap** | OpenWeatherMap | 🆓 Free (1k calls/day) | $40+/mo | P2 | 🟡 Evaluate | Universal SAR App, outdoor apps |
| **Open-Meteo** | Open-Meteo | ✅ Free ✅ FOSS | $0 | P1 | 🔵 Recommended | **Free weather API** — FOSS, no API key required, commercial use allowed; better than OpenWeatherMap for free tier |

---

## 15. Missing APIs — High Priority Gaps

> These are APIs that Revvel **needs but does not currently have**. The coding agent should open a `bom-purchase` issue for each P0 item.

| # | API | Use Case | Priority | Estimated Cost | Action Required |
|---|---|---|---|---|---|
| 1 | **Anthropic Claude API** | All AI agent operations, coding agent, BOM self-healing | 🔴 P0 | $20–100/mo | Add key to Vault; configure in `.mcp.json` |
| 2 | **OpenAI API** | Neurooz AI features | 🔴 P0 | $20–100/mo | Add key to Vault |
| 3 | **Firebase Cloud Messaging** | Push notifications (Universal SAR, GrowlingEyes) | 🔴 P0 | $0 | Create Firebase project; add config |
| 4 | **Sentry / GlitchTip** | Production error monitoring (no error tracking exists) | 🔴 P0 | $0 (self-host) | Deploy GlitchTip on DigitalOcean droplet |
| 5 | **Brave Search API** | Research agents, BOM self-healing agent | 🟡 P1 | $0 (free tier) | Register at brave.com/search/api/ |
| 6 | **Tavily API** | AI agent search | 🟡 P1 | $0 (free tier) | Register at tavily.com |
| 7 | **Groq API** | Fast LLM inference for real-time features | 🟡 P1 | $0 (free tier) | Register at console.groq.com |
| 8 | **PostHog** | Product analytics across all apps | 🟡 P1 | $0 (free tier) | Create account; add to all apps |
| 9 | **Google Maps Platform** | Universal SAR App mapping | 🟡 P1 | $0 ($200 free credit) | Enable in Google Cloud Console |
| 10 | **Twilio SMS** | SAR incident alerts | 🟡 P1 | Pay-per-use | Create Twilio account; add to SAR app |

---

## Revvel API Credentials — Vault Storage Standard

All API keys MUST be stored in the Revvel Vault (see `VAULT_AGENT_STANDARD.md`), never in `.env` files committed to git, and never hardcoded. The naming convention:

```text
ANTHROPIC_API_KEY          → /revvel/shared/llm/anthropic
OPENAI_API_KEY             → /revvel/shared/llm/openai
GROQ_API_KEY               → /revvel/shared/llm/groq
GOOGLE_MAPS_API_KEY        → /revvel/shared/maps/google
FIREBASE_SERVICE_ACCOUNT   → /revvel/shared/notifications/firebase
SENTRY_DSN                 → /revvel/<project>/monitoring/sentry-dsn
STRIPE_SECRET_KEY          → /revvel/<project>/payments/stripe-secret
RESEND_API_KEY             → /revvel/shared/email/resend
BRAVE_SEARCH_API_KEY       → /revvel/shared/search/brave
TAVILY_API_KEY             → /revvel/shared/search/tavily
CREWAI_API_KEY             → /revvel/shared/ai/crewai
```

---

*Last updated: April 14, 2026. The coding agent should update this file whenever a new API is provisioned or an existing one is deprecated.*
