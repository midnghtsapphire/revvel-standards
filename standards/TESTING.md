# Testing Standards

All midnghtsapphire projects MUST follow these testing standards.

## Quick Start

### Python/FastAPI Projects
```bash
# Install test deps
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### TypeScript/React Projects
```bash
# Install test deps
npm install vitest @testing-library/react @playwright/test

# Run tests
npm run test        # unit tests
npm run test:e2e   # E2E tests
```

---

## Requirements

### Python (FastAPI/Flask)
- **Unit Tests**: pytest + pytest-asyncio
- **HTTP Testing**: httpx (ASGITransport)
- **Coverage**: 80% minimum
- **CI**: GitHub Actions

### TypeScript (React)
- **Unit Tests**: Vitest + @testing-library/react
- **E2E Tests**: Playwright
- **Coverage**: 80% minimum  
- **CI**: GitHub Actions

---

## Health Endpoint Tests

Every backend MUST have health endpoint tests:

```python
# tests/api/test_health.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_liveness_check(client):
    response = await client.get("/api/health/live")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_readiness_check(client):
    response = await client.get("/api/health/ready")
    assert response.status_code in [200, 503]
```

---

## Frontend E2E Tests

Every frontend MUST have E2E tests:

```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })
})
```

---

## CI Configuration

GitHub Actions must run tests on every PR:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          
      - name: Install dependencies
        run: pip install -r requirements.txt
        
      - name: Run tests
        run: pytest --cov
        
      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

---

## Coverage Requirements

| Type | Minimum |
|------|--------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

---

## Dependencies

### Python
```txt
pytest==8.0.0
pytest-asyncio==0.23.0
pytest-cov==4.1.0
httpx==0.27.0
```

### TypeScript
```json
{
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.2.0",
    "@vitest/coverage-v8": "^1.3.0",
    "jsdom": "^24.0.0",
    "vitest": "^1.3.0"
  }
}
```

---

## Notes

- Never mock what you can test directly
- Test real code paths, not mocks
- Health checks required for k8s/docker
- Readiness + Liveness probes required
