# Monitoring Standards

All midnghtsapphire projects MUST follow these monitoring standards.

## Quick Start

### Python (FastAPI)
```bash
pip install sentry-sdk
```

### Set Sentry DSN
```bash
export SENTRY_DSN="https://..."
```

---

## Requirements

### Error Tracking
- **Sentry** required for all projects
- Set `SENTRY_DSN` environment variable
- Integrate with FastAPI/Flask

### Health Checks
Every backend MUST have:

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/health` | Basic health | No |
| `/health/live` | Liveness probe | No |
| `/health/ready` | Readiness probe | No |

---

## Sentry Integration

### FastAPI
```python
# app/core/sentry.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

def init_sentry(dsn: str | None = None):
    if not dsn:
        return
    
    sentry_sdk.init(
        dsn=dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
    )
```

### React
```javascript
// index.jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
});
```

---

## Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

---

## Rate Limiting

Required for public APIs:
- Use slowapi or equivalent
- Default: 100/minute per IP
- Auth endpoints: 10/minute

---

## Configuration

| Setting | Value |
|---------|-------|
| SENTRY_TRACES_SAMPLE_RATE | 0.1 |
| HEALTH_CACHE_TTL | 60s |
| DEFAULT_RATE_LIMIT | 100/min |
| AUTH_RATE_LIMIT | 10/min |
