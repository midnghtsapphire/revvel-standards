# 2026-11-10 Codex WR #18330-18332: retired configuration retained in place.
# Active independent deployment: templates/cicd/deploy-static.mjs (no GitHub or external base image).
# # Build from the repository root so file:../../packages dependencies resolve.
# FROM node:22-alpine AS build
# WORKDIR /repo
# COPY packages ./packages
# COPY products/ai-video-toolkit/package*.json ./products/ai-video-toolkit/
# WORKDIR /repo/products/ai-video-toolkit
# RUN npm ci --legacy-peer-deps
# COPY products/ai-video-toolkit/ ./
# ENV NEXT_TELEMETRY_DISABLED=1
# ARG NEXT_PUBLIC_STRIPE_CHECKOUT_URL
# ENV NEXT_PUBLIC_STRIPE_CHECKOUT_URL=${NEXT_PUBLIC_STRIPE_CHECKOUT_URL}
# RUN npm run build
#
# # Static export needs no application secrets or Node server at runtime.
# FROM nginxinc/nginx-unprivileged:stable-alpine
# COPY products/ai-video-toolkit/deploy/nginx.conf /etc/nginx/conf.d/default.conf
# COPY --from=build /repo/products/ai-video-toolkit/out /usr/share/nginx/html
# EXPOSE 8080
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
#
#