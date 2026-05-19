# WR: revvel-skill-runner — Ship-to-Market

**Issue:** #13569
**Status:** Complete
**Owner:** @midnghtsapphire
**Phase Target:** Phase 1 ($10k/month)
**Last Updated:** 2025-01-20
**Methodology:** EXRUP (Explore, Research, Understand, Plan)

---

## 1. Executive Summary

`revvel-skill-runner` is a Next.js-based AI skill execution platform that allows developers, agency owners, and enterprises to compose, deploy, and monetize AI "skills" (prompt + tool + model bundles) as callable API endpoints. The product targets the gap between raw LLM APIs and full agent frameworks by providing a lightweight runner with built-in billing, observability, and version control.

**Revenue Target:** $10k MRR within 90 days of launch, scaling to $30k MRR by month 6.

---

## 2. Market Research

### 2.1 Target Audience

| Segment | Pain Point | Willingness to Pay |
|---|---|---|
| Solo developers building AI side projects | Don't want to manage prompt versioning + billing | $20–$50/mo |
| AI agencies serving SMB clients | Need to white-label skill bundles per client | $200–$2,000/mo |
| Enterprise dev teams | Compliance, audit logs, SSO | $2,000–$20,000/mo |

### 2.2 Competitive Analysis

| Competitor | Strength | Weakness | Our Edge |
|---|---|---|---|
| LangChain Hub | Ecosystem | No native billing | Stripe + Polar.sh built-in |
| Vellum | Enterprise polish | $500+/mo entry | $20/mo starter |
| PromptLayer | Observability | No execution layer | End-to-end runner |
| Flowise | Open source UI | Self-host friction | Hosted + open core |
| OpenAI Assistants | Native API | Vendor lock-in | Multi-model (Claude, Gemini, Llama) |

### 2.3 SEO Keyword Research

**Primary keywords (target rankings within 90 days):**
- "ai skill runner" — Low competition, ~200 searches/mo
- "prompt as api" — Medium, ~1,200/mo
- "monetize ai prompts" — Low, ~800/mo
- "langchain alternative" — Medium, ~2,400/mo
- "ai agent billing" — Low, ~400/mo

**Content plan:** 2 long-form posts/week on `/blog`, programmatic SEO for `/skills/[name]` directory pages.

---

## 3. Bill of Materials (BOM)

### 3.1 Infrastructure

| Component | Choice | Cost (Month 1) | Notes |
|---|---|---|---|
| Hosting | Vercel Pro | $20/mo | Edge functions for low-latency skill execution |
| Database | Neon Postgres | $19/mo | Serverless, branching for preview envs |
| Auth | Clerk | $0 (free tier <10k MAU) | SSO, organizations built-in |
| Payments | Polar.sh | 4% + Stripe fees | GitHub-native, sponsor-friendly |
| LLM Routing | OpenRouter | Pass-through + 5% | Multi-model from single API |
| Observability | Axiom | $25/mo | Log streaming + analytics |
| Email | Resend | $20/mo | Transactional + onboarding |
| Analytics | PostHog Cloud | $0 (free tier) | Product analytics + feature flags |

**Total fixed cost: ~$84/mo** + variable LLM passthrough.

### 3.2 Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes + Edge runtime, Drizzle ORM
- **Queue:** Upstash QStash (skill execution retries)
- **Storage:** Cloudflare R2 (skill artifacts, logs >30d)

---

## 4. Monetization Strategy

### 4.1 Pricing Tiers

| Tier | Price | Limits | Target |
|---|---|---|---|
| Free | $0 | 100 runs/mo, 1 skill | Trial / hobbyists |
| Starter | $20/mo | 5k runs, 10 skills | Solo devs |
| Pro | $99/mo | 50k runs, unlimited skills, team of 3 | Small agencies |
| Scale | $499/mo | 500k runs, SSO, audit logs | Larger agencies |
| Enterprise | Custom | SLA, dedicated, on-prem | Enterprise |

### 4.2 Path to $10k MRR

- 100 Starter ($20) = $2,000
- 50 Pro ($99) = $4,950
- 6 Scale ($499) = $2,994
- **Total: $9,944 MRR** — achievable with ~150 paying customers.

### 4.3 Acquisition Channels

1. **Polar.sh GitHub funding** — Open-source core, paid hosted runner
2. **Product Hunt launch** (week 4)
3. **HN Show HN** (week 6)
4. **Dev.to + Hashnode cross-posting** (2x/week)
5. **Twitter/X build-in-public** (daily)
6. **YouTube tutorials** — "Build a paid AI skill in 10 min"

---

## 5. Implementation Roadmap

### Week 1–2: Foundation
- [ ] Repo scaffold (Next.js 15 + Drizzle + Clerk)
- [ ] Skill schema + CRUD
- [ ] Single-model execution endpoint
- [ ] Polar.sh integration
- **Issue:** #13570 — Scaffold + skill execution MVP

### Week 3–4: MVP Launch
- [ ] Multi-model routing via OpenRouter
- [ ] Usage metering + Stripe/Polar billing
- [ ] Public skill directory
- [ ] Landing page + docs site
- **Issue:** #13571 — Billing + public launch

### Week 5–8: Growth
- [ ] Team/organization support
- [ ] Webhook integrations
- [ ] CLI tool (`npx revvel-skill`)
- [ ] Programmatic SEO pages

### Week 9–12: Scale
- [ ] SSO (SAML/OIDC)
- [ ] Audit logs
- [ ] Self-hosted enterprise tier
- [ ] Affiliate program

---

## 6. Deployment

**Production:** Vercel (`revvel-skill-runner.com`)
**Staging:** Vercel preview deployments per PR
**CI/CD:** GitHub Actions → Vercel

### Environment Variables

```
DATABASE_URL=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
POLAR_ACCESS_TOKEN=
OPENROUTER_API_KEY=
AXIOM_TOKEN=
RESEND_API_KEY=
UPSTASH_QSTASH_TOKEN=
```

---

## 7. Testing Strategy

- **Unit:** Vitest, target 80% coverage on `lib/`
- **Integration:** Playwright for skill execution flow
- **Load:** k6 — 1k concurrent skill runs
- **Security:** Snyk + GitHub Dependabot

---

## 8. Ship-to-Market Readiness Checklist

- [x] Market research complete
- [x] Competitive analysis complete
- [x] BOM finalized
- [x] Pricing locked
- [x] SEO keywords identified
- [x] Acquisition channels mapped
- [x] Tech stack chosen
- [x] Roadmap defined
- [x] P0 issues created (#13570, #13571)
- [x] Deployment plan documented

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM provider price hikes | OpenRouter abstraction, can swap providers |
| Commodity competition | Differentiate on billing UX + GitHub-native sponsorship |
| Slow organic growth | Build-in-public + 2x/wk content cadence |
| Vercel cost scaling | Migrate hot endpoints to Cloudflare Workers at >$500/mo Vercel bill |

---

## 10. Success Metrics (90 days)

- **MRR:** $10,000
- **Paying customers:** 150+
- **Free signups:** 2,500+
- **GitHub stars (open core):** 1,000+
- **Domain authority:** 20+
- **Organic traffic:** 5,000 visits/mo

---

**WR Status:** ✅ Complete — Ready to ship.
