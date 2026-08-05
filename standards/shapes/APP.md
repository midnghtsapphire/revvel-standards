# Full Application Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `app`
**Template:** runs through the full revvel-standards pipeline
**Related:** [`SAAS_PRODUCTS.md`](../SAAS_PRODUCTS.md), [`OAUDREY_DEPLOYMENT_STANDARD.md`](../OAUDREY_DEPLOYMENT_STANDARD.md)

---

## When to Use This Shape

- ROI gate strongly justifies the higher build cost
- Problem requires persistent user state, accounts, or complex UI
- Full CRUD application with authentication
- Mobile app (iOS + Android) via Expo
- Web app with backend and database
- **This is the most expensive shape** — only use when simpler shapes can't solve the problem

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate strong demand | Social listening: ≥ 200 complaints + high payability | Demand must be 4x higher than PDF/CLI threshold |
| Deep competitor analysis | Top 20 competitors, not just 10 | `research/competitors.md` — feature matrix, pricing, reviews |
| Define MVP scope | Absolute minimum to launch | `research/mvp.md` — max 5 features for v1 |
| Architecture decision | Web-only vs. mobile vs. both | `research/architecture.md` |
| Revenue projection | Monthly recurring revenue model | `decision/pricing.json` — must show ≥ 10x ROI in 90 days |

**Gate:** `research/brief.md` must exist AND ROI gate (step 4) must be human-approved.

---

## 2. Create Phase

### Platform Decision

| Platform | When | Stack |
|----------|------|-------|
| **Web-only** | Browser is sufficient, faster to build | React + Vite + Tailwind + Supabase |
| **Mobile (iOS + Android)** | Users need it on their phone | Expo + React Native + NativeWind + Supabase |
| **Web + Mobile** | Maximum reach, justified by revenue | Expo (with web export) OR separate web + mobile |

**Default: Web-only** unless the research specifically shows mobile is required.

### Project Structure (Web)

```text
build/app/
  src/
    pages/              # Route pages
    components/         # UI components
    hooks/              # React hooks
    lib/                # Utilities, API client, types
    stores/             # State management (Zustand or TanStack)
  server/               # Backend (if not using Supabase)
    routes/
    middleware/
    services/
  supabase/             # If using Supabase
    migrations/
    functions/
  public/
  tests/
  Dockerfile
  package.json
  tsconfig.json
```

### Project Structure (Mobile — Expo)

```text
build/app/
  app/                  # Expo Router file-based routing
    (tabs)/             # Tab navigation
    auth/               # Auth screens
    [id].tsx            # Dynamic routes
  components/
  hooks/
  lib/
  constants/
  assets/
  app.json              # Expo config
  eas.json              # EAS Build config
  package.json
```

### Tech Stack Defaults

| Layer | Default |
|-------|---------|
| Frontend | React + TypeScript + Vite + Tailwind |
| Mobile | Expo + React Native + NativeWind |
| Backend | Supabase (auth + DB + edge functions) or Node.js + Fastify |
| Database | PostgreSQL (via Supabase or direct) |
| Auth | Supabase Auth or custom JWT |
| Payments | Stripe (web) or RevenueCat (mobile IAP) |
| Hosting | DigitalOcean App Platform or Vercel (web), Expo EAS (mobile) |

### Quality Gates

- [ ] All pages render without errors
- [ ] Auth flow works (signup, login, logout, password reset)
- [ ] Core feature works end-to-end
- [ ] Responsive design (mobile viewport for web apps)
- [ ] Tests pass with ≥ 60% coverage
- [ ] Lighthouse score ≥ 80 (Performance, Accessibility)
- [ ] No secrets in source (gitleaks clean)
- [ ] TypeScript strict mode, no `any`
- [ ] Dockerfile builds and runs (web apps)
- [ ] EAS build succeeds (mobile apps)

---

## 3. Design Phase

Full apps require comprehensive design:

| Asset | Purpose | Tool |
|-------|---------|------|
| Wireframes | Layout and flow | Figma |
| UI components | Design system / component library | Figma |
| App icon | Store listing (1024×1024) | Figma |
| Screenshots | Store listing (6.5" + 5.5" for mobile) | Device frames in Figma |
| Landing page | Marketing site | Figma → HTML |
| OG image | Social sharing | Figma |
| Onboarding flow | First-run experience | Figma |
| Feature tour | In-app tutorial | Figma |

### Figma Workflow

1. Create project in Figma: `<product-slug>`
2. Design system: import Revvel brand tokens from `templates/brand/`
3. Wireframes → High-fidelity → Developer handoff
4. Export assets at 1x, 2x, 3x for mobile
5. Store in `build/app/assets/` and `build/app/design/`

---

## 4. Publish Phase

### Web App Deployment

| Target | How | When |
|--------|-----|------|
| **DigitalOcean App Platform** | `.do/app.yaml` + `doctl` | Default for full-stack |
| **Vercel** | `vercel deploy` | Static or SSR (Next.js) |
| **Fly.io** | `fly deploy` | Global edge |
| **Self-hosted (droplet)** | Docker Compose + Kong | If shared infrastructure |

### Mobile App Deployment

| Target | How | When |
|--------|-----|------|
| **Apple App Store** | `eas submit --platform ios` | iOS users |
| **Google Play Store** | `eas submit --platform android` | Android users |
| **TestFlight** | `eas build --platform ios --profile preview` | Beta testing |

### App Store Checklist

- [ ] App name and subtitle (30 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars, comma-separated)
- [ ] Screenshots (6.7", 6.5", 5.5" sizes)
- [ ] App icon (1024×1024, no transparency)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire completed
- [ ] In-app purchase products configured (if applicable)
- [ ] Review notes for Apple reviewer

### Landing Page / Marketing Site

```text
<product-slug>.revvel.io
```

Must include:
- Hero with app screenshots/demo
- Feature highlights (3-5 key features)
- Pricing section
- App Store / Play Store download badges
- Social proof (reviews, download count, testimonials)
- SEO: JSON-LD SoftwareApplication schema
- CTA: Download or Sign Up

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **Supabase project** | Auth + DB + edge functions | Doppler (per-project) |
| **Stripe API key** | Payments | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **RevenueCat API key** | Mobile IAP (if applicable) | Doppler (per-project) |
| **Apple Developer account** | App Store submission | Apple Developer Portal |
| **Google Play Console** | Play Store submission | Google Play Console |
| **DigitalOcean token** | Deployment | Doppler `revvel-standards/prd/DIGITALOCEAN_TOKEN` |
| **EAS credentials** | Expo build service | `eas credentials` |
| **Figma access** | Design handoff | Doppler `revvel-standards/prd/FIGMA_ACCESS_TOKEN` |
| **Domain DNS** | Custom domain | Cloudflare or DO DNS |
| **Kong Gateway** | API routing (if on droplet) | See [`KONG_GATEWAY.md`](../KONG_GATEWAY.md) |

---

## Monetization Models

| Model | Implementation | Best for |
|-------|---------------|----------|
| **Subscription** | Stripe Billing (web) or RevenueCat (mobile) | SaaS apps with ongoing value |
| **One-time purchase** | Stripe Payment Link or App Store IAP | Simple tools |
| **Freemium** | Free tier + paid features | User acquisition |
| **Credits** | See [`TOKEN.md`](TOKEN.md) | Usage-based apps |

### RevenueCat Setup (Mobile IAP)

```bash
# Install
npm install react-native-purchases

# Configure
Purchases.configure({ apiKey: process.env.REVENUECAT_API_KEY });

# Check entitlements
const { customerInfo } = await Purchases.getCustomerInfo();
const isPro = customerInfo.entitlements.active["pro"] !== undefined;
```

---

## MVI Contract

Every full app MUST have an MVI (Minimum Viable Iteration) contract per [`MVI_CONTRACT_STANDARD.md`](../MVI_CONTRACT_STANDARD.md):

```markdown
# MVI Contract: <Product Name>

## v1.0 — MVP (ship in ≤ 7 days)
- [ ] Feature 1 (core value proposition)
- [ ] Feature 2 (minimum to charge)
- [ ] Auth (signup/login)
- [ ] Payments (Stripe or IAP)
- [ ] Landing page

## v1.1 — Quick Wins (ship in ≤ 3 days after v1.0)
- [ ] Feature 3
- [ ] Feature 4
- [ ] Onboarding flow

## v2.0 — Growth (ship in ≤ 14 days after v1.1)
- [ ] Feature 5-8
- [ ] Analytics integration
- [ ] Email automation
```

---

## Acceptance Criteria

- [ ] App runs without errors in production
- [ ] Auth flow works (signup, login, logout)
- [ ] Core feature works end-to-end
- [ ] Payments work (test mode verified)
- [ ] Deployed to production hosting
- [ ] Listed on app stores (if mobile)
- [ ] Landing page deployed with SEO
- [ ] Tests pass with ≥ 60% coverage
- [ ] MVI contract exists and v1.0 is complete
- [ ] `state.json` step = `deployed`, `certified = true`
