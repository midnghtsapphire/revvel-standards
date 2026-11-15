# oAudrey front page image. Added 2026-11-11 by MarketShipper.
# Build context is the repository root. There is no Next.js build: the page
# is static files under public/. The process is the shared static server so
# this Dockerfile does not copy a second server implementation.
# STATIC_ROOT points at /app/public. The default ../out path is for the
# Next exports and would 404 this site.
# The deck PDF is copied from the GOAP product so git keeps one file.
# What breaks if the shared COPY is removed: node cannot resolve the import
# and the container never binds /health.

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_ROOT=/app/public
COPY --chown=node:node packages/static-stripe-server /packages/static-stripe-server
COPY --chown=node:node products/oaudrey-home/server /app/server
COPY --chown=node:node products/oaudrey-home/hub-sources.json /app/hub-sources.json
COPY --chown=node:node products/oaudrey-home/public /app/public
COPY --chown=node:node products/goap-swarm-console/public/goap-agent-sales-deck.pdf /app/public/goap-agent-sales-deck.pdf
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
CMD ["node", "server/static-stripe-server.mjs"]
