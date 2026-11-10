# MASTER BUILD PROMPT — Recovery Methods Platform (SaaS)

> Paste into an autonomous agent orchestrator (OpenHands, Claude Code swarm, Devin-style).
> Decompose into parallel workstreams; each `## WORKSTREAM` = one sub-agent.
> Build into a fresh GitHub repo. Conventional commits. Trunk-based, short-lived feature branches.
> One PR per workstream. Do not merge to main without green CI.
> Spec is literal and testable. Build exactly what is listed. If a dependency is missing, build the
> dependency; do not invent scope. Report blockers in /docs/BUILD_LOG.md.

---

## 1. TECH STACK

- **Monorepo:** TypeScript, pnpm workspaces + turborepo.
- **Backend:** Node + Express + tRPC. Zod validation on every input/output.
- **DB:** MySQL 8 + Drizzle ORM. Migrations committed.
- **Frontend:** React + Vite + TailwindCSS.
- **Auth:** email/password + Google OAuth (Lucia or Auth.js). DB sessions. argon2 hashing.
- **Payments:** Stripe — recurring subscriptions AND a token/credit (metered) system.
- **Infra:** Docker; DigitalOcean (PM2 + Nginx) primary; Vercel config for frontend. rsync deploy + GitHub Actions.
- **Media:** self-hosted `<video>` + HLS default; pluggable Mux/Cloudflare Stream/YouTube adapter.
- **Errors:** Sentry. **Analytics:** self-hosted Plausible/Umami.

---

## 2. REPO HIERARCHY (SEO-optimized, shallow, crawlable)

```
/
  README.md
  /docs            (ARCHITECTURE, RUNBOOK, SEO_PLAYBOOK, BUILD_LOG)
  /packages
    /db            (Drizzle schema, migrations, seed)
    /api           (Express + tRPC routers)
    /web           (React + Vite frontend)
    /admin         (admin route group or app)
    /shared        (types, zod schemas, Admiralty scoring lib, constants)
    /marketing     (SEO components, sitemap gen, structured data, MDX blog)
  /infra           (Dockerfiles, nginx.conf, pm2.config.js, deploy.sh, gh-actions)
  /content         (MDX articles, case-method library, seed copy, explainer-script.md)
  /public          (static assets, og-images, robots.txt, sitemap.xml)
```

**Public URL hierarchy (topic-cluster model):**
```
/
/methods/                      (pillar hub)
/methods/riverine-recovery/
/methods/wilderness-search/
/methods/evidence-scoring/
/tools/drift-estimator/
/tools/evidence-scorer/
/resources/data-sources/
/blog/{slug}/
/pricing/
/login  /signup  /account  /account/billing
/admin/...
/legal/terms  /legal/privacy  /legal/disclaimer
```
Breadcrumbs + BreadcrumbList JSON-LD on every page. Cluster pages link up to pillar + sideways to siblings.

---

## 3. WORKSTREAM: DATABASE & DOMAIN MODEL

Drizzle schema: users, sessions, oauth_accounts, subscriptions, stripe_customers, token_ledger
(credits earned/spent, metered), plans, invoices, workspaces, cases (case_class, incident,
evidence[] with source_reliability A-F + information_credibility 1-6, analysis), evidence_items,
data_sources (link library, taggable, tier-coded A1/A2/B2/B3), content_blocks (CMS), affiliate_links,
affiliate_clicks, seo_meta (per-route), media_assets (with alt + caption fields), nav_items,
referral_codes, audit_log. Seed: the two worked case records (riverine + wilderness) and the
data-source link library. Provide migrate + seed + reset scripts.

## 4. WORKSTREAM: AUTH

Email/password + Google OAuth. Email verification, password reset. DB sessions, httpOnly secure
cookies, CSRF protection. `role` on user: user | editor | admin. Middleware: requireAuth,
requireRole. Rate-limit auth endpoints.

## 5. WORKSTREAM: PAYMENTS (Stripe)

- Stripe Checkout + Customer Portal. Tiers: Free, Analyst (monthly/annual), Org/Team. Per-tier feature gates.
- **Token/credit system:** one-time credit-pack purchases; credits consumed by metered actions
  (drift estimator run, report export, AI-assist). token_ledger; atomic deduction in a transaction;
  reject on insufficient balance.
- Webhooks: checkout.session.completed, invoice.paid, customer.subscription.updated/deleted,
  payment_intent.succeeded. Signature verification + idempotency keys → update DB.
- Billing UI at /account/billing: plan, token balance, history, manage/cancel.
- Test/live env separation. Keys via env only.

## 6. WORKSTREAM: ADMIN PANEL (full CMS — non-technical editing of every surface)

Protected `/admin`:
- **Content blocks CMS:** edit hero (headline, subhead, CTA, background), all section copy, feature
  lists, testimonials, FAQ. MDX/WYSIWYG editor. Draft → preview → publish.
- **SEO manager:** per-route meta title, description, canonical, OG + Twitter tags, JSON-LD type,
  robots directives. Live SERP + social preview.
- **Media manager:** upload/replace images and explainer video; edit alt text + captions on every
  asset; auto responsive sizes; flag missing alt text.
- **Navigation editor:** add/remove/reorder nav + footer (drag-drop); internal routes + external links.
- **Affiliate manager:** CRUD affiliate links (merchant, URL, tracking param, category, tier); insert
  via shortcode into content; click analytics; FTC-disclosure component with admin on/off toggle per placement.
- **Data-source library manager:** CRUD link library; assign tier codes; tag by method step.
- **Case-template manager:** edit seeded case methods + evidence-scoring rubric.
- **Pricing/plan editor:** edit displayed tiers, prices, feature matrix (label-sync to Stripe).
- **User admin:** list users, roles, sub status, token balances; impersonate (audited).
- **Audit log viewer:** who/what/when/before/after on every admin change.
- **Settings:** site name, logo, theme tokens, social handles, analytics IDs, feature flags.

## 7. WORKSTREAM: SEO ENGINE (high SEO for the category)

- SSR/SSG meta per public route (react-helmet-async + Vite SSR or prerender). All meta admin-editable (§6).
- **JSON-LD:** Organization, WebSite + SearchAction, BreadcrumbList, Article, FAQPage, HowTo,
  VideoObject, SoftwareApplication, Product/Offer. Validate against schema.org.
- Auto sitemap.xml (split if large) + robots.txt + canonicals.
- Topic-cluster internal linking auto-wired; breadcrumbs everywhere.
- Core Web Vitals budget green: lazy media, image CDN, code-split, preconnect.
- OG/Twitter image auto-generation per page.
- Semantic HTML, heading-hierarchy lint, alt-text enforcement (block publish if missing).
- Seed /blog and /methods with existing method content (riverine recovery, evidence scoring,
  drift modeling, data-source guide). hreflang scaffolding.

## 8. WORKSTREAM: AUTO-MARKETING

- **Programmatic SEO:** generate one quality landing page per data category from the structured
  library; thin-content guard.
- **Email:** transactional (Resend/Postmark adapter) + double-opt-in newsletter on publish.
- **Social auto-post adapter:** queue posts to X / LinkedIn / Facebook on publish (pluggable).
- **Referral program:** referral codes → token credits for referrer + referee (ties to §5).
- **Analytics:** conversion events (signup, subscribe, token purchase, tool run); funnel dashboards in admin.
- **IndexNow + sitemap ping** on publish.

## 9. WORKSTREAM: EXPLAINER VIDEO (home page)

- Hero/section video slot: poster image, VTT captions, transcript, VideoObject JSON-LD.
- Produce a 60–90s storyboard + script (problem → evidence scoring → data sourcing → probability
  zone → output) saved to /content/explainer-script.md.
- Admin field swaps the video URL. Adapter: self-hosted HLS default; Mux/Cloudflare/YouTube optional.

## 10. WORKSTREAM: INTERACTIVE TOOLS (metered value)

- **Evidence Scorer:** enter clues, assign A-F / 1-6, auto-compute code, sort by combined weight.
  Free tier limited; full export metered (tokens).
- **Drift / Probability-Zone Estimator:** inputs (governing discharge, water temp, LKP, channel
  geometry); output a probability-weighted envelope; USGS NWIS API auto-pull of gauge data; metered per run.
- **Data-source finder:** filter library by case class / method step / tier.

## 11. WORKSTREAM: CI/CD, TESTING, SECURITY

- GitHub Actions: lint, typecheck, vitest unit, integration, Drizzle migrate check, Playwright e2e on PR. Block merge on red.
- helmet, rate limiting, zod validation, parameterized queries (Drizzle), env secrets, dependency audit, Stripe webhook signature checks.
- Dockerfile + docker-compose (local), nginx.conf, pm2.config.js, deploy.sh (DO), .env.example documenting every var.
- README: one-command local bootstrap + deployment runbook.

## 12. DELIVERABLES CHECKLIST

- [ ] Monorepo tree (§2) committed
- [ ] DB schema + migrations + seed (two cases + link library)
- [ ] Auth (email + Google), roles, sessions
- [ ] Stripe subscriptions + token ledger + webhooks + billing UI
- [ ] Admin: hero/copy/SEO meta/alt text/nav/affiliate/media/pricing/users/audit
- [ ] SEO engine: all JSON-LD types, sitemap, robots, breadcrumbs, CWV budget
- [ ] Auto-marketing: programmatic SEO, email, social adapter, referral, analytics, IndexNow
- [ ] Explainer video slot + script + captions + VideoObject schema
- [ ] Interactive tools (evidence scorer, drift estimator w/ USGS API, source finder)
- [ ] CI/CD + tests + Docker + deploy scripts + .env.example
- [ ] /docs: ARCHITECTURE.md, RUNBOOK.md, SEO_PLAYBOOK.md, BUILD_LOG.md
- [ ] Legal route pages (Terms, Privacy, Disclaimer) rendered from CMS content blocks

## 13. SUGGESTIONS — MORE, NOT LESS

1. **Org API + webhooks** (push/pull case data; API keys, scopes).
2. **PWA / offline mode** — cache tools + library for field use.
3. **Map layer** — Leaflet/MapLibre: plot LKP, gauges, snag features, probability-zone overlay.
4. **PDF report export** — branded, metered.
5. **Team workspaces** — multi-seat orgs, shared library, permissions.
6. **Evidence chain** — timestamp + hash each evidence edit (provenance).
7. **Notifications** — email/in-app on case updates or new sources in a watched category.
8. **AI-assist (metered)** — Claude API drafts analysis from structured inputs; human-in-the-loop; token-billed.
9. **WCAG 2.2 AA audit** — accessibility pass (aligns with your accessibility-compliance work).
10. **A/B testing framework** for hero/CTA, admin-toggleable, feeding the funnel.
11. **Multi-currency + Stripe Tax** for international orgs.
12. **Status page + uptime monitoring**; Sentry already wired.
13. **Knowledge-graph / related-content engine** to strengthen topic clusters.
14. **Cookie consent banner** tied to analytics (toggleable).
15. **Webhook-driven content syndication** to your other MIDNGHTSAPPHIRE properties for backlinks.

## 14. EXECUTION ORDER (dependency-aware)

P1: scaffold → DB → auth → shared libs (Admiralty scorer).
P2: Stripe (subs + tokens) → billing UI.
P3: public site + SEO engine + content seed → explainer video slot.
P4: admin panel (CMS, SEO, media/alt, nav, affiliate, pricing, users, audit).
P5: interactive tools + USGS integration.
P6: auto-marketing + analytics + referral.
P7: CI/CD hardening, tests, docs, legal route pages, deploy.
P8 (§13): map layer, PDF export, API, PWA, WCAG.

Each phase: open PR → pass CI → update /docs → log progress in BUILD_LOG.md → advance.
