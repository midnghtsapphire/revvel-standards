# syntax=docker/dockerfile:1.7
# Root Dockerfile for monorepo docker delivery (ship-to-market deliver-docker).
# Builds the GHCR console product image so `context: .` workflows have a
# working default target. Preferred dedicated path:
#   docker build -f products/ghcr-console/Dockerfile products/ghcr-console
#
# Image (via ghcr-publish.yml):
#   ghcr.io/midnghtsapphire/revvel-standards/ghcr-console

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY products/ghcr-console/package.json products/ghcr-console/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY products/ghcr-console/package.json products/ghcr-console/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY products/ghcr-console/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3012
ENV HOSTNAME=0.0.0.0

LABEL org.opencontainers.image.source="https://github.com/midnghtsapphire/revvel-standards"
LABEL org.opencontainers.image.description="GHCR setup console (root build context) for revvel-standards"
LABEL org.opencontainers.image.licenses="MIT"

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3012

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:3012/" >/dev/null || exit 1

CMD ["node", "server.js"]
