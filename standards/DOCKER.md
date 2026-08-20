# Docker Standards

All midnghtsapphire projects MUST follow these Docker standards.

## Quick Start

### Backend (Python/FastAPI)
```bash
docker build -t thealttext-api .
docker run -p 8080:8080 thealttext-api
```

### Local Development
```bash
docker-compose up
```

---

## Requirements

### Dockerfile
- Use `python:3.12-slim` for Python projects
- Use multi-stage builds for production
- Install dependencies before copying code
- Use `--no-cache-dir` for pip

### Health Checks
Every container MUST have health checks:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

---

## Backend Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/thealttext
      - SENTRY_DSN=${SENTRY_DSN}
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=thealttext
```

---

## .dockerignore

```text
__pycache__
*.pyc
.env
.git
tests
.gitignore
node_modules
```

---

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thealttext-api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: thealttext-api:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
```

---

## GitHub Container Registry (GHCR)

Default registry for midnghtsapphire container images is **GitHub Container Registry**
(`ghcr.io`), not Docker Hub.

| Item | Value |
| --- | --- |
| Registry host | `ghcr.io` |
| Image naming | **lowercase only** — `ghcr.io/<owner>/<repo>/<package>:<tag>` |
| Same-repo push auth | Job `GITHUB_TOKEN` + workflow `permissions.packages: write` |
| Private pull (external host) | Secret **name** `GHCR_READ_TOKEN` (`read:packages`) — see `docs/SECRETS_MAP.md` |
| Publish workflow | `.github/workflows/ghcr-publish.yml` |
| Setup console | `products/ghcr-console` (port 3012) |
| Auditor | `node scripts/ghcr-setup.js` (exit 0 = wired) |
| Human runbook | `docs/GHCR_SETUP.md` |

### Example publish (Actions)

```yaml
permissions:
  contents: read
  packages: write

steps:
  - uses: docker/login-action@… # pin full SHA
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
  - uses: docker/build-push-action@… # pin full SHA
    with:
      context: products/ghcr-console
      push: true
      tags: ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
```

### Example pull / run

```bash
docker pull ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
docker run --rm -p 3012:3012 ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest
```

Login for **private** packages (token on stdin — never argv):

```bash
echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Reference: [Introducing GitHub Container Registry](https://github.blog/news-insights/product-news/introducing-github-container-registry/)

---

## Notes

- Always use health endpoints for container health checks
- Set appropriate resource limits
- Use secrets for sensitive data
- Prefer GHCR (`ghcr.io`) for images built from this monorepo; document package names in `docs/GHCR_SETUP.md`
