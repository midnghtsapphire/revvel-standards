# Revvel Security Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Security is not bolted on at the end — it is built into every layer from day one. Every Revvel application must implement all P0 requirements before any code reaches production. The items in this document are not suggestions; they are requirements that CI enforces.

---

## 2. Secret Management

### 2.1. No Hardcoded Secrets — EVER

Hardcoded API keys, passwords, tokens, and connection strings in source code are an automatic P0 compliance failure. The `check-compliance.js` script scans for common secret patterns and fails CI if any are found.

**What counts as a secret:**
- API keys (Stripe, Plaid, OpenAI, etc.)
- Database connection strings with credentials
- JWT signing secrets
- OAuth client secrets
- SSH private keys
- Any value that begins with `sk_`, `pk_`, `Bearer`, `ghp_`, `xox`, etc.

### 2.2. Environment Variables

All secrets must be injected at runtime via environment variables.

```text
# .env.example (commit this — no real values)
DATABASE_URL=postgresql://user:password@host:5432/dbname
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=your-32-char-secret-here
CLERK_SECRET_KEY=sk_...
```

**Rules:**
- `.env` is always in `.gitignore`
- `.env.example` is always committed and kept up to date
- GitHub Actions secrets are used for CI/CD — never `.env` files in pipelines

### 2.3. HashiCorp Vault (Production Secret Storage)

For production environments, all secrets must be stored in and retrieved from HashiCorp Vault.

**Authentication method:** AppRole (for CI/CD pipelines) + OIDC (for human operators)

```bash
# Minimal Vault setup for a new app
vault secrets enable -path=revvel/apps/YOUR_APP kv-v2
vault kv put revvel/apps/YOUR_APP/prod \
  DATABASE_URL="postgresql://..." \
  STRIPE_SECRET_KEY="sk_live_..." \
  JWT_SECRET="..."
```

**Vault AppRole retrieval in Node.js:**

```ts
import vault from 'node-vault';

const client = vault({ endpoint: process.env.VAULT_ADDR });

async function getSecrets() {
  await client.approleLogin({
    role_id: process.env.VAULT_ROLE_ID,
    secret_id: process.env.VAULT_SECRET_ID,
  });
  const result = await client.read('revvel/apps/YOUR_APP/prod');
  return result.data.data;
}
```

---

## 3. HTTP Security Headers (Helmet.js)

Every Express/Node.js backend must use `helmet` to set security headers. This is a P0 requirement.

```ts
import helmet from 'helmet';
import express from 'express';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://js.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if using external iframes (e.g., Stripe)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

**Required headers (enforced by Helmet):**

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS |
| `Content-Security-Policy` | (see config above) | Prevents XSS and injection |
| `Referrer-Policy` | `no-referrer-when-downgrade` | Controls referrer info |

---

## 4. CORS Configuration

```ts
import cors from 'cors';

const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Rules:**
- Never use `cors({ origin: '*' })` on any route that handles authenticated requests or sensitive data.
- Wildcard CORS is only acceptable for fully public, read-only, non-authenticated endpoints.

---

## 5. Rate Limiting

All API endpoints must implement rate limiting to prevent brute-force attacks, credential stuffing, and abuse.

```ts
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Global rate limiter (all routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Slow down repeated requests (before hard block)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => hits * 100,
});

app.use(globalLimiter);
app.use(speedLimiter);
app.use('/api/auth', authLimiter);
```

---

## 6. Input Validation (Zod — Mandatory)

All request inputs (body, query params, route params) must be validated with Zod before processing.

```ts
import { z } from 'zod';

const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive().max(999999),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid(),
});

// In route handler:
app.post('/api/products', async (req, res) => {
  const result = CreateProductSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  // result.data is now type-safe
  const product = await createProduct(result.data);
  res.json(product);
});
```

**Rules:**
- Never trust `req.body` directly without Zod validation.
- Always use `.safeParse()` not `.parse()` in route handlers (avoid uncaught exceptions).
- Validate query params and route params too — not just body.

---

## 7. SQL Injection Prevention

All database queries must use parameterized queries via the Drizzle ORM. Raw SQL strings with user input are strictly prohibited.

```ts
// ✅ CORRECT — Drizzle parameterized
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});

// ❌ WRONG — raw SQL with string interpolation
const user = await db.execute(sql`SELECT * FROM users WHERE email = '${email}'`);
```

If raw SQL is absolutely necessary (complex queries), always use Drizzle's `sql` tagged template literal:

```ts
// ✅ ACCEPTABLE — sql tagged template is parameterized
const result = await db.execute(
  sql`SELECT * FROM products WHERE price < ${maxPrice} AND category_id = ${categoryId}`
);
```

---

## 8. Dependency Vulnerability Scanning

### 8.1. Automated (CI)

`pnpm audit` or `npm audit` runs automatically in every CI pipeline. A critical-severity vulnerability blocks deployment.

```yaml
- name: Audit dependencies
  run: pnpm audit --audit-level=high
```

### 8.2. Snyk (Recommended)

Integrate Snyk for continuous monitoring:

```yaml
- name: Run Snyk vulnerability scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

### 8.3. OWASP ZAP (Pre-Production Scan)

Before every major release, run an OWASP ZAP scan against the staging environment:

```yaml
- name: OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.11.0
  with:
    target: 'https://staging.yourdomain.com'
    fail_action: true
```

---

## 9. Authentication Security

### 9.1. Clerk (Recommended)

Clerk is the preferred authentication provider. Follow these security rules:

- Enable **email verification** for all new accounts.
- Enable **MFA** as an option for all users; make it mandatory for admin users.
- Configure **session expiration** to 24 hours for regular users, 8 hours for admins.
- Use Clerk's **organization** feature for multi-tenant apps.

### 9.2. SAML / SSO (Enterprise & Organization Login)

For applications serving organization members or enterprise users, SAML SSO is **required** in addition to Clerk. Follow `SSO_SAML_STANDARD.md` for the full implementation guide.

**Key rules:**
- Every app must offer SSO as a login option on the login page.
- Admin accounts must use SSO — password-only login is **forbidden** for admins.
- In GitHub Actions, resolve a GitHub username to its corporate SSO email by querying the GraphQL SAML identity mapping directly (do **not** use `gagoar/get-saml-identity-action` — its published tag is broken and fails with `File not found: .../dist/index.js`):

```yaml
      - name: Get SAML identity for PR author
        id: saml
        uses: actions/github-script@v8
        env:
          TARGET_USERNAME: ${{ github.actor }}
        with:
          github-token: ${{ secrets.ORG_ADMIN_TOKEN }}
          script: |
            const result = await github.graphql(
              `query($org: String!, $login: String!) {
                organization(login: $org) {
                  samlIdentityProvider {
                    externalIdentities(first: 1, login: $login) {
                      nodes { samlIdentity { nameId } }
                    }
                  }
                }
              }`,
              { org: context.repo.owner, login: process.env.TARGET_USERNAME }
            );
            const provider = result.organization && result.organization.samlIdentityProvider;
            const node = provider && provider.externalIdentities.nodes[0];
            core.setOutput('identity', (node && node.samlIdentity && node.samlIdentity.nameId) || '');
```

The `ORG_ADMIN_TOKEN` must have `admin:org` scope and be stored as a repository secret. See `templates/cicd/get-saml-identity.yml` for the full workflow template.

### 9.3. Custom JWT (When Clerk Is Not Used)

If building a custom JWT system:

```ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

// Sign
const token = jwt.sign(
  { userId: user.id, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h', algorithm: 'HS256' }
);

// Verify
const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
```

**JWT rules:**
- Minimum secret length: 32 characters
- Always set `expiresIn`
- Store tokens in `httpOnly` cookies, not `localStorage`
- Rotate secrets if compromised

---

## 10. Security Checklist for Every PR

Before any code can be merged to `main`, the reviewer (Venice AI primary, Claude fallback) must confirm:

- [ ] No hardcoded secrets or credentials
- [ ] All new API routes have input validation (Zod)
- [ ] All new API routes have authentication/authorization checks
- [ ] No raw SQL with user-provided values
- [ ] No `console.log` statements that could leak sensitive data to production logs
- [ ] No `eval()`, `Function()`, or dynamic `require()`
- [ ] CORS configuration not widened beyond necessary origins
- [ ] Rate limiting applied to any new public endpoints

---

## 11. Automated Security Scanning

### 11.1. Security Scanning Workflow (`security.yml`)

Every Revvel application repository must include the `security.yml` workflow. Copy from `templates/cicd/security.yml`.

The workflow runs:
- On every push to `main`
- On every pull request to `main`
- Weekly on Monday at 6am UTC (scheduled baseline)

**Jobs:**
1. **Dependency Vulnerability Audit** — `pnpm audit --audit-level=high` (reports but does not block; change `continue-on-error: false` to make it a hard gate)
2. **TruffleHog Secret Scanning** — Scans the full git history for verified leaked secrets

```bash
# Copy to your app repo
cp templates/cicd/security.yml .github/workflows/security.yml
```

### 11.2. The Auto-Fix Loop (`auto-fix.yml`)

Every Revvel application repository must also include the `auto-fix.yml` workflow. Copy from `templates/cicd/auto-fix.yml`.

The auto-fix loop works as follows:

```text
CI workflow fails
    ↓
auto-fix.yml triggers on workflow_run completion (conclusion = failure)
    ↓
Fetches failed job names + run URL
    ↓
Creates GitHub Issue labeled 'auto-fix' + 'copilot'
    ↓
Issue body includes full instructions for Copilot to:
  1. Read the CI logs
  2. Identify root cause
  3. Fix following the MVI Contract
  4. Open a PR with all acceptance gates passing
    ↓
Copilot picks up the issue → fixes → opens PR
    ↓
CI passes on PR → merge → issue auto-closes
```

**Setup:**
```bash
# Copy to your app repo
cp templates/cicd/auto-fix.yml .github/workflows/auto-fix.yml

# Edit .github/workflows/auto-fix.yml:
# Replace OWNER_USERNAME with your GitHub username
```

**Labels auto-created:** `auto-fix` (color: `#0075ca`) and `copilot` (color: `#0075ca`) are created automatically by the workflow if they don't exist.

### 11.3. Error Monitoring (`monitored()` wrapper)

For runtime security monitoring, see `standards/ERROR_REPORTING_STANDARD.md`. The `monitored()` wrapper ensures that security-relevant errors (auth failures, data integrity issues) escalate to GitHub Issues automatically, providing an audit trail.

---

## 12. Repository Visibility & Code Provenance

### 12.1. All Repositories Must Be Private

Proprietary application code must never be publicly accessible. This is a P0 requirement.

- All `midnghtsapphire` and `Freedom Angel Corps` application repositories must be set to **Private**.
- Public visibility is only acceptable for intentionally open-sourced libraries with explicit approval.
- See `REPOSITORY_PRIVACY_MIGRATION_STANDARD.md` for the full process and bulk-privatization script.

### 12.2. Unknown Contributor Response Protocol

If GitGuardian, TruffleHog, or a manual git log audit detects commits attributed to unknown external email addresses (e.g., any address not belonging to the authorized team):

1. **Immediately run** `git log --all --format='%ae %an %H %s' | grep <unknown-email>` to identify the exact commits.
2. Determine whether the commit introduced functional code or was a merge artifact from a public template or tutorial.
3. If the commit introduced unauthorized code: treat as a P0 security event — open a GitHub Issue, rotate any credentials accessible from that code path, and initiate a git history rewrite per `REPOSITORY_PRIVACY_MIGRATION_STANDARD.md §3.4`.
4. If the commit was a false positive (e.g., an example commit from a tutorial included in a fork): document the finding and close the alert.

### 12.3. Code Provenance Scanning

Every repository must pass TruffleHog scanning before any production deployment (see §11.1). Additionally, run a periodic full-history audit:

```bash
# Full git history author audit
git log --all --format='%ae' | sort -u

# Check for any email not matching your known team
git log --all --format='%ae %an %H' \
  | grep -vE "your@email\.com|second@email\.com" \
  | head -20
```

Any unknown authors must be investigated before the repository is granted production deploy access.
