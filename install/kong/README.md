# Kong Gateway OSS — Quick Reference

**Full standard:** [`standards/KONG_GATEWAY.md`](../../standards/KONG_GATEWAY.md)

## Quick Start

```bash
# 1. Configure
cp .env.example .env
# Edit .env with real values (or use Doppler)

# 2. Start
docker compose up -d

# 3. Bootstrap (run once)
bash bootstrap.sh

# 4. Verify
curl http://localhost:8001/status
curl http://localhost:8000/api/ge/health
```

## With Doppler

```bash
doppler run --project growlingeyes --config prd -- docker compose up -d
```

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Kong + PostgreSQL containers |
| `.env.example` | Environment variable template |
| `bootstrap.sh` | Register services, routes, plugins (run once) |
| `kong.yml` | Declarative config (alternative to bootstrap.sh) |

## Common Commands

```bash
# List services
curl -s http://localhost:8001/services | python3 -m json.tool

# List routes
curl -s http://localhost:8001/routes | python3 -m json.tool

# Check health
curl -s http://localhost:8001/status

# View logs
docker compose logs -f kong

# Restart
docker compose restart kong

# Export current config
deck gateway dump -o backup.yml
```

## Agent Access

Agents manage Kong via the Admin API on port 8001 (localhost only):

```bash
# Add a new service
curl -s -X POST http://localhost:8001/services -d name=myapp -d url=http://host.docker.internal:4000

# Add a route
curl -s -X POST http://localhost:8001/services/myapp/routes -d "paths[]=/api/myapp"

# Enable rate limiting
curl -s -X POST http://localhost:8001/services/myapp/plugins -d "name=rate-limiting" -d "config.minute=100"
```

See `standards/KONG_GATEWAY.md` §5 for the complete Admin API reference.
