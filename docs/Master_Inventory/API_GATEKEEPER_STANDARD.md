# Revvel API Gatekeeper Standard

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

The **API Gatekeeper** is the central security control plane for all Revvel API surfaces. It enforces authentication, authorization, rate limiting, request validation, audit logging, and threat blocking at the edge — before any request reaches application logic. This standard defines the architecture, implementation patterns, and operational requirements for the API Gatekeeper across all Revvel applications.

The Gatekeeper is not a single product — it is a layered architecture that can be implemented using FOSS tools (Kong, Traefik, Caddy, express-gateway), cloud-native services (Cloudflare Workers, AWS API Gateway, Vercel Edge Middleware), or custom implementations following the patterns in this document.

---

## 2. Core Principles

- **Zero trust** — every request is untrusted until it passes all validation layers.
- **Defense in depth** — multiple independent control layers (network, transport, application).
- **Fail closed** — unknown or malformed requests are rejected, not passed through.
- **Audit everything** — every request, response, and block decision is logged with full context.
- **Token rotation by default** — all tokens have a defined TTL and rotation schedule.
- **FOSS first** — prefer open-source gatekeeper tooling; avoid proprietary lock-in.

---

## 3. Gatekeeper Architecture

```text
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    LAYER 1: Network Edge                 │
│  Cloudflare / Caddy / Nginx  —  TLS termination, DDoS   │
│  IP reputation, geoblocking, bot detection               │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 LAYER 2: API Gateway / Proxy             │
│  Kong / Traefik / express-gateway / custom middleware    │
│  Rate limiting, request/response transformation          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              LAYER 3: Authentication & Authorization     │
│  JWT validation, API key verification, OAuth 2.0 / OIDC  │
│  RBAC / ABAC policy enforcement (OPA / Casbin)           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 LAYER 4: Request Validation              │
│  Schema validation (Zod / AJV), input sanitization       │
│  Content-type enforcement, payload size limits           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                LAYER 5: Business Logic / API             │
│  Application handlers, service calls, DB queries         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Request Validation and Filtering

### 4.1. Mandatory Validation Rules

Every request must pass ALL of these checks before reaching application logic:

| Check | Rule | Action on Fail |
|-------|------|---------------|
| TLS | HTTPS only, TLS 1.2+ | Block + 426 |
| Content-Type | Must match endpoint contract | Block + 415 |
| Payload size | Max 10 MB (configurable per endpoint) | Block + 413 |
| Schema | Request body must match Zod schema | Block + 422 |
| SQL injection | Parameterized queries only; reject raw interpolation | Block + 400 |
| XSS | Sanitize all string inputs with DOMPurify or equivalent | Strip + log |
| Path traversal | Reject `../`, `%2e%2e`, encoded traversal sequences | Block + 400 |
| CSRF | Require `X-Requested-With` or CSRF token for state-changing requests | Block + 403 |
| CORS | Validate `Origin` against allowlist (see `SECURITY_STANDARD.md` §4) | Block + 403 |

### 4.2. Request Validation Middleware (Express / Hono)

```typescript
// src/middleware/gatekeeper.ts
import { z, ZodSchema } from "zod";
import { NextFunction, Request, Response } from "express";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const purify = createDOMPurify(new JSDOM("").window as unknown as Window);

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Payload size check
    const contentLength = parseInt(req.headers["content-length"] ?? "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ error: "Payload too large" });
    }

    // Schema validation
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    // Sanitize string fields
    req.body = sanitizeStrings(parsed.data);
    next();
  };
}

function sanitizeStrings<T>(data: T): T {
  if (typeof data === "string") return purify.sanitize(data) as unknown as T;
  if (Array.isArray(data)) return data.map(sanitizeStrings) as unknown as T;
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, sanitizeStrings(v)])
    ) as T;
  }
  return data;
}
```

### 4.3. OSINT-Derived Blocklist Enforcement

The Gatekeeper consumes blocklists produced by the OSINT pipeline (`OSINT_STANDARD.md`) and enforces them at the request layer:

```typescript
// src/middleware/blocklist.ts
import fs from "fs";

interface BlockEntry {
  type: "ip" | "ip-range" | "domain" | "user-agent";
  value: string;
  reason: string;
  confidence: number;
}

const BLOCKLIST_PATH = process.env.BLOCKLIST_PATH ?? "feeds/blocklist.json";

function loadBlocklist(): BlockEntry[] {
  try {
    return JSON.parse(fs.readFileSync(BLOCKLIST_PATH, "utf8"));
  } catch {
    return [];
  }
}

let blocklist = loadBlocklist();
// Refresh every 5 minutes
setInterval(() => { blocklist = loadBlocklist(); }, 5 * 60 * 1000);

export function enforceBlocklist() {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip ?? req.socket.remoteAddress ?? "";
    const userAgent = req.headers["user-agent"] ?? "";

    for (const entry of blocklist) {
      if (entry.confidence < 0.7) continue; // ignore low-confidence indicators
      if (entry.type === "ip" && entry.value === clientIP) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (entry.type === "user-agent" && userAgent.includes(entry.value)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    next();
  };
}
```

---

## 5. Token Management and Rotation

### 5.1. Token Types and Lifetimes

| Token Type | Lifetime | Storage | Rotation Trigger |
|------------|----------|---------|-----------------|
| Access token (JWT) | 15 minutes | Memory only | Expiry |
| Refresh token | 7 days | HttpOnly cookie | Use-once or expiry |
| API key (service-to-service) | 90 days | HashiCorp Vault | 90-day schedule or compromise |
| Webhook signing secret | 1 year | HashiCorp Vault | Annual schedule or compromise |
| Session token | 24 hours | Server-side store | Logout or expiry |

### 5.2. JWT Implementation

```typescript
// src/auth/tokens.ts
import jwt from "jsonwebtoken";
import { z } from "zod";

const TokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(["admin", "user", "service", "readonly"]),
  scope: z.array(z.string()),
  iat: z.number(),
  exp: z.number(),
  jti: z.string().uuid(), // JWT ID — required for revocation
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

export function issueAccessToken(payload: Omit<TokenPayload, "iat" | "exp" | "jti">): string {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(),
    },
    SECRET,
    {
      algorithm: "HS256",
      expiresIn: "15m",
      issuer: "revvel-gatekeeper",
      audience: "revvel-api",
    }
  );
}

export function verifyToken(token: string): TokenPayload {
  const raw = jwt.verify(token, SECRET, {
    algorithms: ["HS256"],
    issuer: "revvel-gatekeeper",
    audience: "revvel-api",
  });
  return TokenPayloadSchema.parse(raw);
}
```

### 5.3. API Key Rotation Workflow

```yaml
# templates/cicd/rotate-api-keys.yml
name: Scheduled API Key Rotation

on:
  schedule:
    - cron: "0 2 1 */3 *"   # 1st of every 3rd month at 2am UTC
  workflow_dispatch:
    inputs:
      service:
        description: "Service name to rotate (or 'all')"
        required: true
        default: "all"

jobs:
  rotate:
    name: Rotate API Keys
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Vault
        uses: hashicorp/vault-action@v3
        with:
          url: ${{ secrets.VAULT_ADDR }}
          method: approle
          roleId: ${{ secrets.VAULT_ROLE_ID }}
          secretId: ${{ secrets.VAULT_SECRET_ID }}

      - name: Generate and store new keys
        run: python scripts/gatekeeper/rotate_keys.py \
          --service "${{ github.event.inputs.service || 'all' }}" \
          --vault-path "revvel/apps/${{ github.repository }}/api-keys"

      - name: Update GitHub Secrets
        run: python scripts/gatekeeper/sync_secrets.py

      - name: Notify rotation completion
        run: python scripts/audit/notify.py \
          --channel security-alerts \
          --message "API key rotation completed for ${{ github.repository }}"
```

### 5.4. Token Revocation

A token revocation list (TRL) must be maintained. All Gatekeeper middleware checks the TRL on every request.

```typescript
// src/auth/revocation.ts — Redis-backed TRL
import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();

const REVOKED_PREFIX = "revoked:jti:";

export async function revokeToken(jti: string, expiresInSeconds: number): Promise<void> {
  await redis.set(`${REVOKED_PREFIX}${jti}`, "1", { EX: expiresInSeconds });
}

export async function isRevoked(jti: string): Promise<boolean> {
  return (await redis.exists(`${REVOKED_PREFIX}${jti}`)) === 1;
}
```

---

## 6. Authentication and Authorization Flows

### 6.1. Supported Auth Flows

| Flow | Use Case | Standard |
|------|---------|---------|
| JWT Bearer | Stateless API access | RFC 7519 |
| OAuth 2.0 Authorization Code + PKCE | User-facing web/mobile apps | RFC 6749 + RFC 7636 |
| Client Credentials | Service-to-service | RFC 6749 §4.4 |
| API Key (HMAC-signed) | Third-party integrations | Custom (see §6.3) |
| mTLS | High-security service mesh | RFC 8446 |

### 6.2. Role-Based Access Control (RBAC)

```typescript
// src/auth/rbac.ts — OPA-compatible permission matrix
export const PERMISSIONS = {
  admin: ["*"],
  user: [
    "read:own-profile",
    "write:own-profile",
    "read:public-data",
    "write:own-content",
  ],
  service: [
    "read:all",
    "write:events",
    "write:metrics",
  ],
  readonly: [
    "read:public-data",
  ],
} satisfies Record<string, string[]>;

export function can(role: keyof typeof PERMISSIONS, action: string): boolean {
  const perms = PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(action);
}
```

### 6.3. HMAC API Key Pattern

```typescript
// src/auth/apikey.ts
import crypto from "crypto";

export function verifyApiKey(
  providedKey: string,
  storedHash: string,
  requestBody: string,
  timestamp: string
): boolean {
  // Reject requests older than 5 minutes (replay protection)
  if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", providedKey)
    .update(`${timestamp}.${requestBody}`)
    .digest("hex");

  // Compare stored hash of key (never compare raw keys)
  const keyHash = crypto.createHash("sha256").update(providedKey).digest("hex");
  const timingSafe = crypto.timingSafeEqual(
    Buffer.from(keyHash),
    Buffer.from(storedHash)
  );

  return timingSafe;
}
```

---

## 7. Rate Limiting and Throttling

### 7.1. Rate Limit Tiers

| Tier | Limit | Window | Applied To |
|------|-------|--------|-----------|
| Global | 10,000 req/min | 1 min | Per IP |
| Authenticated user | 1,000 req/min | 1 min | Per user ID |
| API key | 5,000 req/min | 1 min | Per API key |
| Unauthenticated | 100 req/min | 1 min | Per IP |
| Auth endpoints | 10 req/min | 1 min | Per IP (brute-force protection) |
| Webhook | 500 req/min | 1 min | Per source IP |

### 7.2. Rate Limiter Implementation

```typescript
// src/middleware/rateLimiter.ts — Redis sliding window
import { RateLimiterRedis } from "rate-limiter-flexible";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect();

export const globalLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:global",
  points: 10000,     // requests
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block for 60 seconds after limit exceeded
});

export const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:auth",
  points: 10,
  duration: 60,
  blockDuration: 300, // 5 min block on brute force
});

export function rateLimitMiddleware(limiter: RateLimiterRedis) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await limiter.consume(req.ip ?? "unknown");
      next();
    } catch {
      res.set("Retry-After", "60");
      res.status(429).json({ error: "Too many requests" });
    }
  };
}
```

---

## 8. Action Authorization Patterns

### 8.1. Workflow and Trigger Security

GitHub Actions workflows triggered via the API or webhook must validate that the trigger source is authorized.

```yaml
# Mandatory check on all workflow_dispatch and repository_dispatch events
  authorize-trigger:
    name: Authorize Workflow Trigger
    runs-on: ubuntu-latest
    steps:
      - name: Validate caller identity
        run: |
          # Reject triggers from non-approved actors
          APPROVED_ACTORS="dependabot[bot] github-actions[bot] copilot"
          if [[ "${{ github.actor }}" != "midnghtsapphire" ]] && \
             [[ ! " $APPROVED_ACTORS " =~ " ${{ github.actor }} " ]]; then
            echo "Unauthorized actor: ${{ github.actor }}"
            exit 1
          fi

      - name: Validate event signature
        if: github.event_name == 'repository_dispatch'
        run: |
          echo "${{ toJSON(github.event.client_payload) }}" | \
            python scripts/gatekeeper/verify_dispatch_signature.py
```

### 8.2. Workflow Permission Management

All GitHub Actions workflows must declare minimal permissions:

```yaml
# REQUIRED at the top of every workflow file
permissions:
  contents: read         # Default: read only
  # Add only what is needed:
  # pull-requests: write  # If opening PRs
  # security-events: write  # If uploading SARIF
  # issues: write         # If opening issues
  # id-token: write       # If using OIDC
```

**Forbidden:** `permissions: write-all` — this is never acceptable in a production workflow.

---

## 9. Audit Logging

### 9.1. Mandatory Log Fields

Every API request must produce a structured log entry with these fields:

```typescript
// src/audit/auditLog.ts
interface AuditLogEntry {
  timestamp: string;          // ISO 8601 UTC
  request_id: string;         // UUID v4
  method: string;             // GET, POST, etc.
  path: string;               // Normalized path (no query params)
  status_code: number;
  duration_ms: number;
  client_ip: string;          // Forwarded IP (validated)
  user_id?: string;           // If authenticated
  api_key_id?: string;        // Key ID (not the key itself)
  user_agent: string;
  blocked: boolean;           // True if gatekeeper blocked the request
  block_reason?: string;      // Why it was blocked
  rate_limited: boolean;
  geo?: {
    country: string;
    city: string;
    is_vpn: boolean;
    is_tor: boolean;
  };
}
```

### 9.2. Log Integrity

All audit logs are:
- **Append-only** — no update or delete operations on log records.
- **Shipped immediately** to a log aggregation service (Loki, Elastic, Datadog, CloudWatch).
- **Retained for minimum 90 days** (365 days for regulated apps).
- **Never logged**: passwords, full credit card numbers, SSNs, full JWT tokens, session tokens.

```typescript
// Log sanitization
function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const REDACTED_KEYS = new Set([
    "password", "token", "secret", "authorization",
    "x-api-key", "cookie", "set-cookie",
  ]);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      REDACTED_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v,
    ])
  );
}
```

---

## 10. FOSS Gatekeeper Implementations

### 10.1. Kong Gateway (Recommended for Self-Hosted)

```yaml
# docker-compose.yml — Kong Gateway with rate limiting + JWT plugins
version: "3.9"
services:
  kong:
    image: kong:3.7-ubuntu
    environment:
      KONG_DATABASE: "off"               # DB-less mode
      KONG_DECLARATIVE_CONFIG: /kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    volumes:
      - ./kong.yml:/kong.yml:ro
    ports:
      - "8000:8000"   # Proxy
      - "8001:8001"   # Admin API (internal only)
```

```yaml
# kong.yml — declarative config
_format_version: "3.0"
services:
  - name: revvel-api
    url: http://app:3000
    plugins:
      - name: rate-limiting
        config:
          minute: 1000
          policy: redis
          redis_host: redis
      - name: jwt
        config:
          claims_to_verify: [exp, nbf]
      - name: request-validator
        config:
          body_schema: '{"type":"object"}'
          allowed_content_types: ["application/json"]
      - name: ip-restriction
        config:
          deny: []   # Populated from OSINT blocklist
```

### 10.2. Traefik (Recommended for Container / Kubernetes)

```yaml
# traefik/dynamic.yml
http:
  middlewares:
    revvel-ratelimit:
      rateLimit:
        average: 100
        burst: 50

    revvel-headers:
      headers:
        contentTypeNosniff: true
        browserXssFilter: true
        contentSecurityPolicy: "default-src 'self'"
        stsSeconds: 31536000
        stsIncludeSubdomains: true

    revvel-auth:
      forwardAuth:
        address: http://auth-service:4000/validate
        authResponseHeaders:
          - X-User-ID
          - X-User-Role
```

### 10.3. Caddy (Recommended for Simple/Edge Deployments)

```text
# Caddyfile
api.revvel.io {
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 1000
            window 1m
        }
    }

    reverse_proxy app:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
    }

    log {
        output file /var/log/caddy/api-access.log
        format json
    }
}
```

### 10.4. Custom Express/Hono Gateway

```typescript
// src/gatekeeper.ts — minimal custom gateway
import express from "express";
import helmet from "helmet";
import { enforceBlocklist } from "./middleware/blocklist";
import { rateLimitMiddleware, globalLimiter, authLimiter } from "./middleware/rateLimiter";
import { validateRequest } from "./middleware/gatekeeper";
import { auditLogger } from "./audit/auditLog";

const app = express();

// Layer 1: Security headers
app.use(helmet());

// Layer 2: OSINT blocklist enforcement
app.use(enforceBlocklist());

// Layer 3: Global rate limiting
app.use(rateLimitMiddleware(globalLimiter));

// Layer 4: Audit logging (before routing so all requests are logged)
app.use(auditLogger());

// Layer 5: Body parsing with size limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

export default app;
```

---

## 11. Custom API Development Standards

### 11.1. Endpoint Contract Requirements

Every API endpoint must:

1. **Document its schema** using Zod (runtime) + TypeScript types (compile-time).
2. **Validate all inputs** before touching business logic (see §4.2).
3. **Return structured errors** in the format: `{ error: string, code: string, details?: object }`.
4. **Include in OpenAPI spec** — auto-generated from Zod schemas via `zod-to-openapi`.
5. **Be idempotent** for state-changing operations (POST with idempotency key, PUT, DELETE).

### 11.2. Idempotency Key Pattern

```typescript
// src/middleware/idempotency.ts
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours in seconds

export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

    const key = req.headers["idempotency-key"] as string;
    if (!key) return next(); // Optional for non-critical endpoints

    const cached = await redis.get(`idempotent:${key}`);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Capture response for caching
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) {
        redis.set(`idempotent:${key}`, JSON.stringify(body), { EX: IDEMPOTENCY_TTL });
      }
      return originalJson(body);
    };

    next();
  };
}
```

### 11.3. Error Response Standard

```typescript
// src/errors.ts
export class GatekeeperError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

// Centralized error handler
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof GatekeeperError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      request_id: req.headers["x-request-id"],
    });
    return;
  }

  // Never expose internal errors to clients
  console.error("[GatekeeperError]", err);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    request_id: req.headers["x-request-id"],
  });
}
```

---

## 12. Agent and Workflow Integration

### 12.1. Agent Authorization Matrix

| Agent | Allowed Actions | Required Token Scope |
|-------|----------------|---------------------|
| OSINT Pipeline | Read feeds, write reports | `write:reports` |
| Audit Agent | Read all code, open issues/PRs | `read:code`, `write:issues` |
| Remediation Bot | Push branches, open PRs | `write:pull-requests` |
| Dependency Watcher | Read lock files, open issues | `read:code`, `write:issues` |
| Config Drift Detector | Read configs, post comments | `read:code`, `write:comments` |

### 12.2. Trigger Security Controls

```yaml
# Every workflow must validate its trigger source
jobs:
  security-check:
    name: Validate Trigger
    runs-on: ubuntu-latest
    outputs:
      authorized: ${{ steps.check.outputs.authorized }}
    steps:
      - id: check
        run: |
          # Only allow trusted actors on sensitive workflows
          TRUSTED="${{ github.actor }}"
          case "$TRUSTED" in
            midnghtsapphire|dependabot[bot]|github-actions[bot]|copilot)
              echo "authorized=true" >> $GITHUB_OUTPUT ;;
            *)
              echo "authorized=false" >> $GITHUB_OUTPUT
              echo "::warning::Untrusted actor: $TRUSTED" ;;
          esac
```

---

## 13. Gatekeeper Directory Structure

```text
src/
├── gatekeeper.ts           # Main gateway entry point
├── auth/
│   ├── tokens.ts           # JWT issue/verify
│   ├── apikey.ts           # HMAC API key verification
│   ├── rbac.ts             # Role-based access control
│   └── revocation.ts       # Token revocation list (Redis)
├── middleware/
│   ├── gatekeeper.ts       # Schema validation + sanitization
│   ├── blocklist.ts        # OSINT-derived IP/UA blocklist
│   ├── rateLimiter.ts      # Redis sliding window rate limiter
│   └── idempotency.ts      # Idempotency key handler
├── audit/
│   └── auditLog.ts         # Structured audit logger
└── errors.ts               # GatekeeperError + error handler

scripts/
└── gatekeeper/
    ├── rotate_keys.py      # Vault-backed API key rotation
    ├── sync_secrets.py     # Sync Vault secrets → GitHub Secrets
    └── verify_dispatch_signature.py  # Webhook HMAC verification
```

---

## 14. Required Environment Variables

```bash
# .env.example
JWT_SECRET=<min-32-char-random-string>
REDIS_URL=redis://localhost:6379
VAULT_ADDR=https://vault.example.com
BLOCKLIST_PATH=feeds/blocklist.json

# Optional: external OIDC provider
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>   # In Vault, not here
```

---

## 15. FOSS Alternatives Reference

| Category | FOSS Option | Hosted/SaaS Alternative |
|----------|-------------|------------------------|
| API Gateway | Kong, Traefik, Tyk | AWS API GW, Kong Cloud |
| Auth/Identity | Keycloak, Authentik, Zitadel | Auth0, Clerk |
| Rate Limiting | rate-limiter-flexible | Upstash Rate Limit |
| Secret Management | HashiCorp Vault | AWS Secrets Manager |
| Audit Logging | Loki + Grafana | Datadog, Splunk |
| Policy Engine | Open Policy Agent (OPA) | AWS IAM, Styra DAS |
| Blocklist Management | OpenCTI, MISP | Cloudflare Gateway |
| Certificate Management | Certbot, Caddy | AWS ACM |
| Service Mesh | Istio, Linkerd | AWS App Mesh |
| WAF | ModSecurity, Coraza | Cloudflare WAF, AWS WAF |

---

## 16. References

- `SECURITY_STANDARD.md` — base security requirements (CORS, headers, rate limiting §5)
- `OSINT_STANDARD.md` — OSINT blocklists consumed by the gatekeeper
- `AUTOMATED_AUDIT_AGENT_STANDARD.md` — audit agents that monitor gatekeeper logs
- `VAULT_AGENT_STANDARD.md` — secret storage for tokens and keys
- `AGENT_FACTORY_STANDARD.md` — agent trigger and routing matrix
- `templates/cicd/security.yml` — security workflow that includes gatekeeper tests
- Open Policy Agent: <https://www.openpolicyagent.org>
- Kong Gateway Docs: <https://docs.konghq.com>
- Traefik Docs: <https://doc.traefik.io/traefik>
- rate-limiter-flexible: <https://github.com/animir/node-rate-limiter-flexible>
- OWASP API Security Top 10: <https://owasp.org/www-project-api-security>
