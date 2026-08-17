#!/usr/bin/env bash
set -euo pipefail

# Kong Gateway Bootstrap Script
# Run ONCE after first deploy to register services, routes, and plugins.
# See: standards/KONG_GATEWAY.md
#
# Usage:
#   bash bootstrap.sh
#   bash bootstrap.sh --dry-run   # print commands without executing

KONG_ADMIN="${KONG_ADMIN_URL:-http://localhost:8001}"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[KONG]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

kong_api() {
  local method="$1" path="$2"
  shift 2
  if $DRY_RUN; then
    echo "  curl -s -X $method ${KONG_ADMIN}${path} $*"
    return 0
  fi
  local response
  response=$(curl -s -w "\n%{http_code}" -X "$method" "${KONG_ADMIN}${path}" "$@")
  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]] || [[ "$http_code" == "409" ]]; then
    return 0
  else
    err "HTTP $http_code on $method $path: $body"
    return 1
  fi
}

# ── Wait for Kong ──────────────────────────────────────────────
log "Waiting for Kong Admin API at ${KONG_ADMIN}..."
if ! $DRY_RUN; then
  for i in $(seq 1 30); do
    if curl -sf "${KONG_ADMIN}/status" > /dev/null 2>&1; then
      break
    fi
    if [ "$i" -eq 30 ]; then
      err "Kong Admin API not reachable after 30 attempts"
      exit 1
    fi
    sleep 2
  done
fi
log "Kong is ready."

# ── Services ───────────────────────────────────────────────────
log "Registering services..."

GROWLINGEYES_URL="${GROWLINGEYES_URL:-http://host.docker.internal:3000}"
NEUROOZ_URL="${NEUROOZ_URL:-http://host.docker.internal:5173}"
REESE_REVIEWS_URL="${REESE_REVIEWS_URL:-http://host.docker.internal:8080}"

kong_api POST /services \
  -d "name=growlingeyes" \
  -d "url=${GROWLINGEYES_URL}" \
  -d "connect_timeout=10000" \
  -d "read_timeout=60000" \
  -d "retries=3"

kong_api POST /services \
  -d "name=neurooz" \
  -d "url=${NEUROOZ_URL}" \
  -d "connect_timeout=10000" \
  -d "read_timeout=60000" \
  -d "retries=3"

kong_api POST /services \
  -d "name=reese-reviews" \
  -d "url=${REESE_REVIEWS_URL}" \
  -d "connect_timeout=10000" \
  -d "read_timeout=60000" \
  -d "retries=3"

# ── Routes ─────────────────────────────────────────────────────
log "Registering routes..."

# growlingeyes — path-based and domain-based
kong_api POST /services/growlingeyes/routes \
  -d "name=ge-api" \
  -d "paths[]=/api/ge" \
  -d "strip_path=true" \
  -d "protocols[]=http" \
  -d "protocols[]=https"

kong_api POST /services/growlingeyes/routes \
  -d "name=ge-domain" \
  -d "hosts[]=growlingeyes.com" \
  -d "hosts[]=www.growlingeyes.com" \
  -d "protocols[]=http" \
  -d "protocols[]=https"

# neurooz — path-based and domain-based
kong_api POST /services/neurooz/routes \
  -d "name=nz-api" \
  -d "paths[]=/api/nz" \
  -d "strip_path=true" \
  -d "protocols[]=http" \
  -d "protocols[]=https"

kong_api POST /services/neurooz/routes \
  -d "name=nz-domain" \
  -d "hosts[]=neurooz.com" \
  -d "hosts[]=www.neurooz.com" \
  -d "protocols[]=http" \
  -d "protocols[]=https"

# reese-reviews — path-based and domain-based
kong_api POST /services/reese-reviews/routes \
  -d "name=rr-api" \
  -d "paths[]=/api/rr" \
  -d "strip_path=true" \
  -d "protocols[]=http" \
  -d "protocols[]=https"

kong_api POST /services/reese-reviews/routes \
  -d "name=rr-domain" \
  -d "hosts[]=reese-reviews.com" \
  -d "hosts[]=www.reese-reviews.com" \
  -d "protocols[]=http" \
  -d "protocols[]=https"

# ── Global Plugins ─────────────────────────────────────────────
log "Enabling global plugins..."

# Request size limiting (10 MB default)
kong_api POST /plugins \
  -d "name=request-size-limiting" \
  -d "config.allowed_payload_size=10" \
  -d "config.size_unit=megabytes"

# Bot detection
kong_api POST /plugins \
  -d "name=bot-detection"

# ── Per-Service Plugins ────────────────────────────────────────
log "Enabling per-service plugins..."

# Explicit domain map — avoids bash string munging bugs
declare -A CORS_DOMAINS=(
  [growlingeyes]=growlingeyes.com
  [neurooz]=neurooz.com
  [reese-reviews]=reese-reviews.com
)

for SERVICE in growlingeyes neurooz reese-reviews; do
  # Rate limiting: 100 req/min per IP
  kong_api POST "/services/${SERVICE}/plugins" \
    -d "name=rate-limiting" \
    -d "config.minute=100" \
    -d "config.policy=local" \
    -d "config.fault_tolerant=true" \
    -d "config.hide_client_headers=false"

  # CORS
  kong_api POST "/services/${SERVICE}/plugins" \
    -d "name=cors" \
    -d "config.origins[]=https://${CORS_DOMAINS[$SERVICE]}" \
    -d "config.origins[]=https://www.${CORS_DOMAINS[$SERVICE]}" \
    -d "config.methods[]=GET" \
    -d "config.methods[]=POST" \
    -d "config.methods[]=PUT" \
    -d "config.methods[]=PATCH" \
    -d "config.methods[]=DELETE" \
    -d "config.methods[]=OPTIONS" \
    -d "config.headers[]=Content-Type" \
    -d "config.headers[]=Authorization" \
    -d "config.headers[]=X-Requested-With" \
    -d "config.credentials=true" \
    -d "config.max_age=3600"

  log "  ${SERVICE}: rate-limiting + cors enabled"
done

# ── Consumers ──────────────────────────────────────────────────
log "Creating default consumers..."

# Agent consumer (for Devin and other AI agents)
kong_api POST /consumers -d "username=agent-devin"
kong_api POST /consumers -d "username=agent-copilot"

# ── Summary ────────────────────────────────────────────────────
echo ""
log "Bootstrap complete."
log ""
log "Services:  3 (growlingeyes, neurooz, reese-reviews)"
log "Routes:    6 (path + domain per service)"
log "Plugins:   global (request-size-limiting, bot-detection)"
log "           per-service (rate-limiting, cors)"
log "Consumers: 2 (agent-devin, agent-copilot)"
log ""
log "Verify:    curl http://localhost:8000/api/ge/health"
log "Admin:     curl http://localhost:8001/services"
