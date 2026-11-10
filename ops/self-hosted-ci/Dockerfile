# Self-hosted CI dispatcher image (act in host mode, no Docker daemon needed).
# Build from the repo root:  docker build -f ops/self-hosted-ci/Dockerfile .
# On Railway set RAILWAY_DOCKERFILE_PATH=ops/self-hosted-ci/Dockerfile.
FROM node:22-bookworm

ARG ACT_VERSION=0.2.82
ARG ACT_SHA256=76645c0bbe4bb69a8f0ba3caefa681b2f4c04babd4679c67861af9a276a3561f

RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl ca-certificates python3 python3-pip python3-venv jq \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL -o /tmp/act.tgz "https://github.com/nektos/act/releases/download/v${ACT_VERSION}/act_Linux_x86_64.tar.gz" \
  && echo "${ACT_SHA256}  /tmp/act.tgz" | sha256sum -c - \
  && tar -xzf /tmp/act.tgz -C /usr/local/bin act \
  && rm /tmp/act.tgz \
  && act --version

WORKDIR /app
COPY ops/self-hosted-ci/package.json ops/self-hosted-ci/package-lock.json ./
RUN npm ci --omit=dev
COPY ops/self-hosted-ci/dispatcher.js ./

ENV RUNNER_IMAGE=-self-hosted \
    WORK_DIR=/data/work \
    LOG_DIR=/data/logs \
    PORT=8080

EXPOSE 8080
CMD ["node", "dispatcher.js"]
