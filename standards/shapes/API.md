# API Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `api`
**Template:** `templates/agent-generated-product/build/api/`

---

## When to Use This Shape

- Other developers or applications will call it programmatically
- Recurring SaaS revenue through usage-based or subscription pricing
- Data aggregation, transformation, or enrichment service
- Problem requires server-side compute (AI inference, web scraping, etc.)
- High-value B2B use case with clear per-request economics

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate developer demand | RapidAPI trending, ProgrammableWeb, HN, Reddit | Confirmed demand ≥ 50 developer mentions / 30 days |
| Audit existing APIs | RapidAPI search, Google, Product Hunt | `research/competitors.md` — pricing, rate limits, DX quality |
| Identify differentiation | Competitor review analysis | `research/gap.md` — what competitors do poorly |
| Define API surface | User complaints + competitor gaps | `research/openapi.yml` — draft OpenAPI spec |
| Determine pricing tiers | Usage analysis of competitor APIs | `decision/pricing.json` — free tier limits, paid tiers |

**Gate:** `research/brief.md` must exist before proceeding.

---

## 2. Create Phase

### Project Structure

```text
build/api/
  src/
    index.ts            # Server entry (Fastify or Express)
    routes/             # Route handlers
      v1/               # Versioned API routes
        items.ts
        health.ts
    middleware/          # Auth, rate limiting, logging
      auth.ts
      rateLimit.ts
    services/           # Business logic (not in routes)
    lib/                # DB client, helpers, types
  tests/
    routes/             # Route tests
    services/           # Service unit tests
    integration/        # Full API integration tests
  docs/
    openapi.yml         # OpenAPI 3.1 spec (source of truth)
  Dockerfile
  docker-compose.yml    # Local dev with DB
  package.json
  tsconfig.json
  README.md
```

### Framework

**Default: Fastify** (TypeScript, fast, schema validation, OpenAPI generation)

```bash
npm init -y
npm install fastify @fastify/rate-limit @fastify/cors @fastify/swagger
npm install -D typescript @types/node vitest
```

Alternative: **Python FastAPI** (if the service is ML/AI-heavy)

```bash
pip install fastapi uvicorn pydantic
```

### API Design Rules

1. **Version all endpoints:** `/v1/items`, never `/items`
2. **JSON responses only** (unless file download)
3. **Standard error format:**
   ```json
   { "error": { "code": "RATE_LIMITED", "message": "...", "status": 429 } }
   ```
4. **Pagination:** cursor-based (`?cursor=abc&limit=50`)
5. **Auth:** API key in `Authorization: Bearer <key>` header
6. **Rate limiting:** per-key, tiered by plan
7. **CORS:** configurable allowed origins
8. **Health check:** `GET /health` returns `{ "status": "ok", "version": "1.0.0" }`

### Quality Gates

- [ ] OpenAPI spec (`docs/openapi.yml`) matches implementation
- [ ] All routes have input validation (Zod or JSON Schema)
- [ ] All routes have unit tests (≥ 70% coverage)
- [ ] Integration test: start server, hit every endpoint, verify responses
- [ ] Rate limiting configured and tested
- [ ] Auth middleware rejects invalid/missing keys
- [ ] Dockerfile builds and runs
- [ ] No secrets in source (gitleaks clean)
- [ ] TypeScript strict mode, no `any`

---

## 3. Design Phase

| Asset | Purpose | Tool |
|-------|---------|------|
| API docs site | Developer documentation | Redoc or Swagger UI (auto-generated from OpenAPI) |
| Logo / icon | RapidAPI listing, landing page | Figma |
| Landing page | SEO + signup + docs link | Figma → HTML |
| OG image | Social sharing (1200×630) | Figma |
| Code examples | Quick-start snippets in 5 languages | LLM-generated from OpenAPI spec |

### Auto-Generated Docs

```bash
# Redoc (static HTML from OpenAPI spec)
npx @redocly/cli build-docs docs/openapi.yml -o docs/index.html

# Or serve Swagger UI via Fastify
# (already included with @fastify/swagger)
```

---

## 4. Publish Phase

### Deployment

| Target | How | When |
|--------|-----|------|
| **DigitalOcean App Platform** | `doctl apps create --spec .do/app.yaml` | Default |
| **Fly.io** | `fly deploy` | If global edge needed |
| **Railway** | `railway up` | Quick alternative |
| **Self-hosted (droplet)** | Docker Compose via Kong Gateway | If already on droplet |

### API Marketplace Listings

| Marketplace | How | Commission |
|-------------|-----|------------|
| **RapidAPI** | Submit via dashboard → API pricing tiers | 20% of revenue |
| **Postman API Network** | Publish collection + workspace | Free listing |
| **Own docs site** | Redoc/Swagger + Stripe checkout for API keys | 0% (own infra) |

### API Key Management

```text
User signs up → Stripe checkout → webhook → generate API key → email to user
```

Key storage: database table `api_keys` with columns:
- `key_hash` — **prefer HMAC-SHA256** with a server-held pepper for API tokens.
  bcrypt is acceptable **only** if the API key is **≤ 72 bytes** (bcrypt
  silently truncates beyond that, creating collision risk — flagged in the
  Octopus audit 2026-05-28). Never store plaintext.
- `user_id`
- `plan` (free, pro, enterprise)
- `rate_limit` (requests/minute by plan)
- `created_at`, `last_used_at`

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **DigitalOcean token** | Deploy to App Platform | Doppler `revvel-standards/prd/DIGITALOCEAN_TOKEN` |
| **Database (PostgreSQL)** | API key storage, data | Doppler (per-project `DATABASE_URL`) |
| **Stripe API key** | Subscription billing | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **RapidAPI provider key** | Marketplace listing (optional) | Doppler `revvel-standards/prd/RAPIDAPI_PROVIDER_KEY` |
| **Domain DNS** | Custom API domain | Cloudflare or DO DNS |
| **Kong Gateway** | Routing (if on shared droplet) | See [`KONG_GATEWAY.md`](../KONG_GATEWAY.md) |

---

## Monetization Models

| Model | Implementation | Example |
|-------|---------------|---------|
| **Freemium** | Free tier (100 req/day), paid tiers via Stripe | Most common |
| **Pay-per-request** | Stripe metered billing | AI inference APIs |
| **Subscription** | Monthly plans with request quotas | Data APIs |
| **Enterprise** | Custom pricing, dedicated infra | High-volume B2B |

---

## Acceptance Criteria

- [ ] API runs and responds to all documented endpoints
- [ ] OpenAPI spec is accurate and serves interactive docs
- [ ] Auth + rate limiting work correctly
- [ ] Deployed to at least one hosting platform
- [ ] Listed on RapidAPI or own docs site
- [ ] Tests pass with ≥ 70% coverage
- [ ] Landing page + docs site deployed
- [ ] Stripe Product + Price created per tier
- [ ] `state.json` step = `deployed`, `certified = true`
