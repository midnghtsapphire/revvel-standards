# 2026-11-10 Codex WR #18330-18332: retired configuration retained in place.
# Active independent deployment: templates/cicd/deploy-static.mjs (no GitHub or external base image).
# # Build from the repository root so file:../../packages dependencies resolve.
# FROM node:22-alpine AS build
# WORKDIR /repo
# COPY packages ./packages
# COPY products/screen-recorder-finder/package*.json ./products/screen-recorder-finder/
# WORKDIR /repo/products/screen-recorder-finder
# RUN npm ci --legacy-peer-deps
# COPY products/screen-recorder-finder/ ./
# ENV NEXT_TELEMETRY_DISABLED=1
# ARG NEXT_PUBLIC_STRIPE_CHECKOUT_URL
# ENV NEXT_PUBLIC_STRIPE_CHECKOUT_URL=${NEXT_PUBLIC_STRIPE_CHECKOUT_URL}
# RUN npm run build
#
# # Static export needs no application secrets or Node server at runtime.
# FROM nginxinc/nginx-unprivileged:stable-alpine
# COPY products/screen-recorder-finder/deploy/nginx.conf /etc/nginx/conf.d/default.conf
# COPY --from=build /repo/products/screen-recorder-finder/out /usr/share/nginx/html
# EXPOSE 8080
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
#
#

# 2026-11-11 MarketShipper WR #18332: active image, added under the retired
# block above. The retired block stays commented so that decision remains
# visible. This image uses a public node base because App Platform and
# CircleCI build a Dockerfile; the static artifact in
# templates/cicd/deploy-static.mjs remains for hosts that do not run Docker.
# Build context is the repository root.

FROM node:22-alpine AS build
WORKDIR /repo
COPY products/screen-recorder-finder/package.json products/screen-recorder-finder/package-lock.json ./products/screen-recorder-finder/
WORKDIR /repo/products/screen-recorder-finder
# --ignore-scripts: this static export does not need dependency lifecycle
# scripts, and running them would execute code from the lockfile.
RUN npm ci --ignore-scripts
# The pricing button is compiled from packages/static-stripe-server. The
# runtime stage copies that package to /packages: from /app/server the import
# ../../../packages collapses to /packages on a Linux root.
COPY packages/static-stripe-server /repo/packages/static-stripe-server
COPY products/screen-recorder-finder/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV STRIPE_MODE=test
ENV STATIC_ROOT=/app/out
COPY --from=build --chown=node:node /repo/products/screen-recorder-finder/out ./out
COPY --from=build --chown=node:node /repo/products/screen-recorder-finder/server ./server
COPY --from=build --chown=node:node /repo/packages/static-stripe-server /packages/static-stripe-server
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
CMD ["node", "server/static-stripe-server.mjs"]
