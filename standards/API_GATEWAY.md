# Kong Gateway OSS Standard

**Version:** 1.0.0  
**Date:** April 30, 2026  
**Status:** Mandatory for all production deployments  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Implements:** `API_GATEKEEPER_STANDARD.md` Layer 2 (API Gateway / Proxy)

---

## 1. Why Kong OSS

Kong Gateway OSS is the **free, open-source** API gateway that sits in front of all Revvel services. It handles routing, authentication, rate limiting, and logging — so application code doesn't have to.

**What Kong replaces:**
- Manual nginx proxy configs
- Hardcoded rate limiting in app code
- Per-service auth middleware duplication
- Scattered logging across services

**What Kong provides:**
- Single entry point for all API traffic
- Plugin-based auth (key-auth, JWT, OAuth2, HMAC)
- Rate limiting per consumer, route, or service
- Request/response logging and metrics
- Health checks and load balancing
- Admin API that agents can call programmatically

**Cost:** $0 — Kong OSS is Apache 2.0 licensed.

---

## 2. Architecture

```text
Internet Traffic
      │
      ▼
┌─────────────────────────────┐
│   Caddy / Cloudflare        │  ← TLS termination, DDoS protection
│   (Layer 1 — Network Edge)  │
└──────────┬──────────────────┘
           │ :80 / :443
           ▼
┌─────────────────────────────┐
│      Kong Gateway OSS       │  ← Layer 2: routing, auth, rate limiting
│      Port 8000 (proxy)      │
│      Port 8001 (admin API)  │
└──────────┬──────────────────┘
           │
     ┌─────┼─────────┐
     ▼     ▼         ▼
  ┌─────┐ ┌──────┐ ┌──────────┐
  │ GE  │ │ NZ   │ │ RR       │
  │:3000│ │:5173 │ │:8080     │
  └─────┘ └──────┘ └──────────┘
  growling  neurooz  reese-
  eyes               reviews
```

**Port assignments:**

| Service | Internal Port | Kong Route |
|---------|--------------|------------|
| Kong Proxy | 8000 | External entry point |
| Kong Admin API | 8001 | `localhost` only — never expose externally |
| Kong Admin API (read-only) | 8002 | Optional, for monitoring |
| PostgreSQL (Kong datastore) | 5432 | Internal only |
| growlingeyes | 3000 | `/api/ge/*`, `growlingeyes.com/*` |
| neurooz | 5173 | `/api/nz/*`, `neurooz.com/*` |
| reese-reviews | 8080 | `/api/rr/*`, `reese-reviews.com/*` |

---

## 3. Deployment

### 3.1 Prerequisites

- Docker and Docker Compose installed
- Doppler CLI configured (or `DOPPLER_TOKEN` env var set)
- Domain DNS pointing to the server

### 3.2 Quick Start

```bash
# Clone revvel-standards and navigate to Kong install
cd /path/to/revvel-standards/install/kong

# Copy and configure environment
cp .env.example .env
# Edit .env with your values (or use Doppler)

# Start Kong + PostgreSQL
docker compose up -d

# Verify Kong is running
curl -s http://localhost:8001/status | python3 -m json.tool

# Bootstrap routes (run once after first deploy)
bash bootstrap.sh
```

### 3.3 With Doppler Integration

```bash
# Pull secrets from Doppler and start Kong
doppler run --project growlingeyes --config prd -- docker compose up -d

# Or export all secrets to .env
doppler secrets download --project growlingeyes --config prd --no-file --format env > .env
docker compose up -d
```

---

## 4. Configuration Files

All Kong configuration lives in `revvel-standards/install/kong/`:

```text
install/kong/
├── docker-compose.yml      # Kong + PostgreSQL containers
├── .env.example            # Environment template
├── bootstrap.sh            # Initial service/route/plugin setup
├── kong.yml                # Declarative config (alternative to Admin API)
├── plugins/                # Custom plugin configs
│   ├── rate-limiting.json
│   ├── key-auth.json
│   └── cors.json
└── README.md               # Quick reference
```

---

## 5. Admin API — Agent Reference

The Kong Admin API is how agents programmatically manage the gateway. It runs on port `8001` and is accessible only from `localhost` (never expose to the internet).

### 5.1 Services (upstream backends)

```bash
# List all services
curl -s http://localhost:8001/services | python3 -m json.tool

# Create a service
curl -s -X POST http://localhost:8001/services \
  -d name=growlingeyes \
  -d url=http://localhost:3000

# Update a service
curl -s -X PATCH http://localhost:8001/services/growlingeyes \
  -d url=http://localhost:3000

# Delete a service
curl -s -X DELETE http://localhost:8001/services/growlingeyes
```

### 5.2 Routes (how traffic reaches services)

```bash
# Create a route for growlingeyes API
curl -s -X POST http://localhost:8001/services/growlingeyes/routes \
  -d "name=ge-api" \
  -d "paths[]=/api/ge" \
  -d "strip_path=true"

# Create a route by hostname
curl -s -X POST http://localhost:8001/services/growlingeyes/routes \
  -d "name=ge-domain" \
  -d "hosts[]=growlingeyes.com" \
  -d "hosts[]=www.growlingeyes.com"

# List all routes
curl -s http://localhost:8001/routes | python3 -m json.tool
```

### 5.3 Plugins (middleware)

```bash
# Enable rate limiting on a service (100 req/min)
curl -s -X POST http://localhost:8001/services/growlingeyes/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=100" \
  -d "config.policy=local"

# Enable key-auth on a service
curl -s -X POST http://localhost:8001/services/growlingeyes/plugins \
  -d "name=key-auth" \
  -d "config.key_names[]=apikey" \
  -d "config.key_names[]=X-API-Key"

# Enable CORS
curl -s -X POST http://localhost:8001/services/growlingeyes/plugins \
  -d "name=cors" \
  -d "config.origins[]=https://growlingeyes.com" \
  -d "config.methods[]=GET" \
  -d "config.methods[]=POST" \
  -d "config.credentials=true"

# Enable request logging
curl -s -X POST http://localhost:8001/services/growlingeyes/plugins \
  -d "name=file-log" \
  -d "config.path=/var/log/kong/access.log"

# List all plugins on a service
curl -s http://localhost:8001/services/growlingeyes/plugins | python3 -m json.tool
```

### 5.4 Consumers (API users)

```bash
# Create a consumer
curl -s -X POST http://localhost:8001/consumers \
  -d "username=agent-OpenHands"

# Generate an API key for a consumer
curl -s -X POST http://localhost:8001/consumers/agent-OpenHands/key-auth \
  -d "key=your-api-key-here"

# List consumers
curl -s http://localhost:8001/consumers | python3 -m json.tool
```

### 5.5 Health and Status

```bash
# Kong node status
curl -s http://localhost:8001/status

# Kong node info
curl -s http://localhost:8001/

# Check upstream health
curl -s http://localhost:8001/upstreams/growlingeyes/health
```

---

## 6. Plugins — Required Configuration

Every Revvel service behind Kong MUST have these plugins enabled:

### 6.1 Mandatory Plugins

| Plugin | Purpose | Scope |
|--------|---------|-------|
| `rate-limiting` | Prevent abuse | Per-service |
| `cors` | Control cross-origin access | Per-service |
| `request-size-limiting` | Block oversized payloads | Global |
| `bot-detection` | Block scrapers/bots | Global |

### 6.2 Recommended Plugins

| Plugin | Purpose | When to Use |
|--------|---------|-------------|
| `ip-restriction` | Block known-bad IPs | When OSINT blocklists are populated |
| `key-auth` | API key authentication | Service-to-service APIs |
| `jwt` | JWT validation | User-facing APIs |
| `oauth2` | OAuth 2.0 flows | Third-party integrations |
| `file-log` | Request logging to file | Always in production |
| `http-log` | Send logs to external service | When using log aggregation |
| `response-ratelimiting` | Limit by response header | Tiered API plans |
| `acl` | Access control lists | Role-based route access |
| `request-transformer` | Modify headers/body | API versioning, header injection |

### 6.3 Plugin Configuration Standards

**Rate Limiting:**
- Default: 100 requests/minute per IP
- Authenticated users: 500 requests/minute
- Service-to-service: 1000 requests/minute
- Policy: `local` for single-node, `redis` for multi-node

**CORS:**
- Origins: explicit allowlist only — never `*` in production
- Credentials: `true` only when cookies are needed
- Max age: 3600 seconds

**Request Size:**
- Default max: 10 MB
- File upload endpoints: 100 MB (configure per-route)

---

## 7. Security Rules

1. **Admin API is localhost-only.** Never bind port 8001 to `0.0.0.0` or expose it through a reverse proxy. If remote admin is needed, use SSH tunneling.

2. **No anonymous access in production.** Every production route must have at least one auth plugin (key-auth, jwt, or oauth2).

3. **Rate limiting is mandatory.** No exceptions. Even internal services get rate limits to prevent cascading failures.

4. **HTTPS only.** Kong sits behind Caddy/Cloudflare which handles TLS. Kong itself communicates with backends over HTTP on the private network.

5. **Secrets via Doppler.** Kong's PostgreSQL password, admin API tokens, and plugin secrets come from Doppler — never hardcoded in docker-compose.yml.

6. **Log everything.** Enable file-log or http-log on every service. Logs must include: timestamp, client IP, method, path, status code, latency, consumer ID.

---

## 8. Monitoring

### 8.1 Health Check Endpoint

Kong exposes `/status` on the Admin API:

```json
{
  "server": {
    "connections_active": 2,
    "connections_reading": 0,
    "connections_writing": 1,
    "connections_waiting": 1,
    "total_requests": 1842
  },
  "database": {
    "reachable": true
  },
  "memory": {
    "workers_lua_vms": [
      { "http_allocated_gc": "48.01 MiB", "pid": 1234 }
    ]
  }
}
```

### 8.2 PM2 Integration (growlingeyes droplet)

If running alongside PM2-managed services:

```bash
# Check Kong container health
docker inspect --format='{{.State.Health.Status}}' kong-gateway

# Restart Kong if unhealthy
docker compose -f /opt/kong/docker-compose.yml restart kong
```

### 8.3 Uptime Monitoring

Add to your monitoring (UptimeRobot, Healthchecks.io, etc.):
- `https://growlingeyes.com/health` → through Kong → backend health
- `http://localhost:8001/status` → Kong itself (internal only)

---

## 9. Backup and Recovery

### 9.1 Export Configuration

```bash
# Export all Kong config as declarative YAML
curl -s http://localhost:8001/ | python3 -c "
import sys, json, yaml
data = json.load(sys.stdin)
print(yaml.dump(data, default_flow_style=False))
" > kong-backup-$(date +%Y%m%d).yml

# Or use deck (Kong's official CLI)
deck gateway dump -o kong-backup.yml
```

### 9.2 Import Configuration

```bash
# Apply declarative config
deck gateway sync kong.yml

# Or use bootstrap.sh for fresh setup
bash bootstrap.sh
```

---

## 10. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| `API_GATEKEEPER_STANDARD.md` | Kong implements Layer 2 of the Gatekeeper architecture |
| `SECURITY_STANDARD.md` | Kong enforces security policies at the edge |
| `DOCKER.md` | Kong follows Docker container standards |
| `08_SECRETS_MANAGEMENT_STANDARD.md` | Kong pulls secrets from Doppler |
| `MONITORING.md` | Kong feeds metrics into monitoring pipeline |
| `DEPLOYMENT_STANDARD.md` | Kong deployment follows the standard deploy process |

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `502 Bad Gateway` | Backend service is down | Check upstream: `curl http://localhost:3000/health` |
| `429 Too Many Requests` | Rate limit exceeded | Check consumer limits: `curl localhost:8001/consumers/{id}/plugins` |
| `503 Service Unavailable` | Kong can't reach database | Check PostgreSQL: `docker compose logs kong-db` |
| Admin API unreachable | Container not running | `docker compose ps` then `docker compose up -d` |
| Routes not matching | Path/host mismatch | `curl localhost:8001/routes` to verify config |
| Plugins not applying | Plugin scope wrong | Verify plugin is on correct service/route/global |

---

## 12. Agent Automation Patterns

### 12.1 Add a New Service (agent workflow)

```bash
# 1. Register the service
curl -s -X POST http://localhost:8001/services \
  -d name=my-new-service \
  -d url=http://localhost:4000

# 2. Add a route
curl -s -X POST http://localhost:8001/services/my-new-service/routes \
  -d "name=my-service-route" \
  -d "paths[]=/api/my-service"

# 3. Enable mandatory plugins
curl -s -X POST http://localhost:8001/services/my-new-service/plugins \
  -d "name=rate-limiting" -d "config.minute=100" -d "config.policy=local"

curl -s -X POST http://localhost:8001/services/my-new-service/plugins \
  -d "name=cors" \
  -d "config.origins[]=https://my-service.com" \
  -d "config.credentials=true"

# 4. Verify
curl -s http://localhost:8000/api/my-service/health
```

### 12.2 Rotate an API Key (agent workflow)

```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 32)

# 2. Add new key to consumer
curl -s -X POST http://localhost:8001/consumers/agent-OpenHands/key-auth \
  -d "key=$NEW_KEY"

# 3. Store new key in Doppler
curl -s -X POST https://api.doppler.com/v3/configs/config/secrets \
  -H "Authorization: Bearer $DOPPLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"growlingeyes\",\"config\":\"prd\",\"secrets\":{\"KONG_API_KEY\":\"$NEW_KEY\"}}"

# 4. Delete old key (after confirming new key works)
OLD_KEY_ID=$(curl -s http://localhost:8001/consumers/agent-OpenHands/key-auth | python3 -c "
import sys, json
keys = json.load(sys.stdin)['data']
if len(keys) > 1:
    print(keys[0]['id'])  # oldest key
")
curl -s -X DELETE "http://localhost:8001/consumers/agent-OpenHands/key-auth/$OLD_KEY_ID"
```

---

## 13. Migration Path

### From bare nginx/PM2 to Kong

1. Install Kong via Docker Compose (`install/kong/docker-compose.yml`)
2. Run `bootstrap.sh` to register existing services
3. Point Caddy/nginx upstream from `localhost:3000` to `localhost:8000` (Kong proxy)
4. Verify traffic flows: `curl -v https://growlingeyes.com/health`
5. Enable plugins incrementally (rate limiting first, then auth, then logging)
6. Remove redundant nginx proxy rules once Kong handles routing

### Timeline
- **Phase 1 (Day 1):** Kong installed, services registered, traffic routing through Kong
- **Phase 2 (Day 2-3):** Rate limiting + CORS + logging enabled
- **Phase 3 (Week 2):** Auth plugins configured, API keys issued to consumers
- **Phase 4 (Ongoing):** Monitoring, key rotation, new service onboarding automated
