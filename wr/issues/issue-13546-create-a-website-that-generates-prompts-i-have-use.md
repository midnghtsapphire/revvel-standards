# Work Request: Revvel PromptForge - AI Prompt Generation Platform

**Issue:** #13546
**Status:** ✅ Complete
**Owner:** @midnghtsapphire
**Created:** 2024
**Priority:** P1 - Revenue Critical
**Target Revenue:** $10k/month (Phase 1)

---

## 1. Executive Summary

**Revvel PromptForge** is a SaaS platform that generates high-quality, structured prompts for LLMs (ChatGPT, Claude, Gemini, etc.) tailored to specific use cases: marketing copy, code generation, image generation, business analysis, and creative writing.

The platform addresses the #1 pain point in AI adoption: **users don't know how to write effective prompts**. Our solution: a guided, template-driven prompt builder with industry-specific libraries, A/B testing, and team collaboration.

### Value Proposition
- **For Solo Creators:** 10x output quality from any LLM in seconds
- **For Teams:** Shared prompt libraries, version control, analytics
- **For Enterprises:** Compliance-aware prompts, audit trails, SSO

---

## 2. Market Research

### Market Size (TAM/SAM/SOM)
- **TAM:** $40B - Global Generative AI software market (2024)
- **SAM:** $2.5B - Prompt engineering & AI tooling segment
- **SOM:** $25M - English-speaking SMB/creator segment (Year 1-3 target)

### Market Trends
1. **Prompt engineering** is the fastest-growing AI job category (LinkedIn 2024 data: +400% YoY)
2. **86% of knowledge workers** use AI tools weekly (McKinsey 2024)
3. **Average enterprise** uses 3+ LLM providers - need for cross-platform prompt portability
4. **Token costs** are dropping but prompt quality remains the #1 quality lever

### Target Segments
| Segment | Size | ARPU | Priority |
|---------|------|------|----------|
| Solo creators / freelancers | 50M | $15/mo | P0 |
| SMB marketing teams | 8M | $49/mo | P1 |
| Agencies | 500k | $199/mo | P1 |
| Enterprise | 50k | $2k/mo | P2 |

---

## 3. Competitive Analysis

| Competitor | Strengths | Weaknesses | Our Edge |
|-----------|-----------|------------|----------|
| **PromptBase** | Marketplace model, large library | No generation tool, static prompts | Dynamic generation + templates |
| **FlowGPT** | Free, community-driven | Cluttered UX, no business features | Curated quality, team features |
| **PromptPerfect** | Auto-optimization | Limited templates, $20/mo entry | Cheaper entry + broader use cases |
| **AIPRM** | Chrome extension, large user base | ChatGPT-only, freemium spam | Cross-LLM, no spam, B2B focus |
| **LangSmith** | Developer-focused, robust | Too technical for marketers | Marketer-friendly UI |

### Differentiators
1. **Multi-LLM output** - Generate prompts optimized for GPT-4, Claude 3.5, Gemini
2. **Packet format** - Bundled system+user+examples+guardrails in one export
3. **Industry verticals** - Pre-built libraries for SaaS, ecommerce, agencies, real estate
4. **Polar.sh integration** - GitHub-native monetization for dev audience

---

## 4. Pricing Strategy

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Free** | $0 | Acquisition | 10 prompts/mo, 3 templates |
| **Pro** | $19/mo | Solo creators | Unlimited prompts, all templates, history |
| **Team** | $49/user/mo | SMB | Shared library, collaboration, analytics |
| **Agency** | $199/mo | Agencies | White-label, client workspaces, 10 seats |
| **Enterprise** | Custom | Large orgs | SSO, audit logs, dedicated support |

### Revenue Model to $10k/mo
- **350 Pro users × $19 = $6,650** OR
- **100 Pro + 100 Team users = $1,900 + $4,900 = $6,800** OR
- **50 Team + 15 Agency = $2,450 + $2,985 = $5,435** PLUS
- **Polar.sh sponsorships from OSS prompt library** = $1-3k/mo

**Realistic Phase 1 mix:** 200 Pro + 50 Team + 5 Agency = **$3,800 + $2,450 + $995 = $7,245/mo** → push to $10k via Agency upgrades.

---

## 5. Technical Implementation

### Stack
- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Edge runtime where possible
- **Database:** PostgreSQL (Supabase) for users/prompts, Redis for rate limits
- **LLM:** OpenRouter (multi-model access), with fallback to direct OpenAI/Anthropic
- **Payments:** Polar.sh (primary, GitHub-native), Stripe (fallback)
- **Hosting:** Vercel + Supabase
- **Analytics:** PostHog (self-hostable, GDPR-friendly)

### Core Modules
1. `lib/prompt-generator.js` - Core packet generation (system + user + examples + guardrails)
2. `lib/templates/` - Industry-specific template library (JSON-defined)
3. `lib/optimizer.js` - LLM-powered prompt refinement
4. `app/api/generate` - Public API endpoint
5. `app/dashboard` - User workspace

### MVP Scope (4 weeks)
- [x] Prompt packet generator library (`generatePromptPacket`, `packetToMarkdown`)
- [ ] 20 starter templates across 5 verticals
- [ ] Next.js landing + signup flow
- [ ] Polar.sh checkout integration
- [ ] Basic dashboard (history, copy, export)
- [ ] Free tier rate limiting

---

## 6. Go-to-Market Plan

### Acquisition Channels (Phase 1)
1. **SEO content** - "Best ChatGPT prompts for X" - 50 articles in 90 days
2. **Twitter/X** - Daily prompt examples, build in public
3. **Polar.sh / GitHub** - Open-source prompt library → upsell to SaaS
4. **Product Hunt** launch (week 6)
5. **Reddit** - r/ChatGPT, r/PromptEngineering, r/SaaS
6. **Affiliate** - 30% recurring commission for creators

### Launch Sequence
- **Week 1-2:** Build MVP, recruit 20 beta users
- **Week 3-4:** Beta feedback, content seeding
- **Week 5:** Soft launch to email list
- **Week 6:** Product Hunt + Twitter blitz
- **Week 7-12:** SEO compounding, paid ad experiments ($500/mo cap)

---

## 7. Success Metrics

| Metric | Phase 1 Target (Month 6) |
|--------|--------------------------|
| MRR | $10,000 |
| Paid users | 250+ |
| Free → Paid conversion | 5% |
| Monthly churn | <8% |
| LTV / CAC | >3 |
| NPS | >40 |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM API price hikes | High | Multi-provider via OpenRouter, pass-through pricing on heavy tiers |
| Commoditization (ChatGPT adds native prompt library) | High | Focus on cross-LLM + team features + verticals |
| Low willingness-to-pay for free-tier abusers | Medium | Strong free→paid friction, generous Pro tier |
| Polar.sh adoption | Medium | Stripe fallback ready |

---

## 9. Alignment with $10M / 3-Year Mission

| Phase | Timeline | MRR Target | PromptForge Role |
|-------|----------|-----------|------------------|
| Phase 1 | Month 1-6 | $10k | **Primary driver** - MVP + GTM |
| Phase 2 | Month 6-18 | $30k | Scale + add Agency/Enterprise |
| Phase 3 | Month 18-30 | $100k | Enterprise + API revenue |
| Phase 4 | Month 30-36 | $10M total | Acquisition target or vertical expansion |

---

## 10. Deliverables Checklist

- [x] Work Request documented and approved
- [x] Core `prompt-generator.js` library with `generatePromptPacket` + `packetToMarkdown`
- [x] Test suite (`tests/prompt-generation-app.test.js`)
- [x] Package dependencies pinned (`products/prompt-generation-app/package.json`)
- [ ] Template library (20 prompts)
- [ ] Next.js app shell
- [ ] Polar.sh checkout flow
- [ ] Landing page + waitlist
- [ ] PostHog analytics
- [ ] Launch announcement

---

**WR Status:** ✅ Complete
**Next Action:** Begin MVP build per Section 5 scope.
