# Security Skill

Apply Revvel security standards covering OWASP top 10, secret management, input sanitization, and authentication.

## P0 Requirements (All Must Be Met Before Production)

### Secret Management
- **No hardcoded secrets** — automatic CI failure if found (`check-compliance.js` scans)
- `.env` always in `.gitignore`; `.env.example` always committed
- Secrets in HashiCorp Vault (AppRole + OIDC) for production
- GitHub Actions Secrets for CI/CD pipelines

### HTTP Security Headers (Helmet.js — Mandatory)
```ts
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], ... } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
```
Required headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Content-Security-Policy`

### CORS
- Never `cors({ origin: '*' })` on authenticated or sensitive endpoints
- Whitelist only known origins; wildcard only for fully public read-only endpoints

### Rate Limiting
- Global: 200 req / 15 min
- Auth routes: 10 req / 15 min, skip successful requests
- Use `express-rate-limit` + `express-slow-down`

### Input Validation (Zod — Mandatory)
- All `req.body`, query params, route params must be validated with Zod
- Always use `.safeParse()` (not `.parse()`) in route handlers
- Never trust raw `req.body`

### SQL Injection Prevention
- Use Drizzle ORM parameterized queries only
- Raw SQL only via Drizzle `sql` tagged template (parameterized)
- String interpolation into SQL queries is strictly prohibited

## Authentication Rules

### Clerk (Preferred)
- Email verification required for all new accounts
- MFA mandatory for admins, optional for users
- Session expiry: 24h (users), 8h (admins)

### Custom JWT (When Clerk Not Used)
- Secret minimum 32 characters
- Always set `expiresIn`
- Store in `httpOnly` cookies — never `localStorage`

## Automated Scanning

- `security.yml` runs on every push to `main`, every PR, weekly on Mondays
- Jobs: dependency audit (`pnpm audit --audit-level=high`) + TruffleHog secret scanning
- `auto-fix.yml` creates GitHub issues labeled `auto-fix` + `copilot` when CI fails
- OWASP ZAP baseline scan before every major release against staging

## PR Security Checklist

- [ ] No hardcoded secrets
- [ ] Zod validation on all new routes
- [ ] Auth/authorization checks on all new routes
- [ ] No raw SQL with user input
- [ ] No `console.log` leaking sensitive data
- [ ] No `eval()` / `Function()` / dynamic `require()`
- [ ] CORS not widened unnecessarily
- [ ] Rate limiting on new public endpoints
