# Life Insurance Lead Engine — App

## Install

```bash
npm install
npm run dev
```

Open <http://localhost:3000>

## Build

```bash
npm run build && npm start
```

## Live Deployment

<!-- live-deployment -->
**Live:** _not deployed yet — set this once the Vercel project is created._

**To deploy (≈2 min, no secrets needed — uses the free public NPPES API):**
1. Vercel → Add New… → Project → import `midnghtsapphire/revvel-standards`.
2. **Root Directory** = `products/life-insurance-lead-engine/build`.
3. Framework auto-detects **Next.js**. No environment variables.
4. **Deploy** → paste the live URL into the **Live:** line above.

Per `docs/DEFINITION_OF_DONE.md`: not done until the live URL is here.

## E2E tests (Cypress)

```bash
npm install                # picks up cypress + @testing-library/cypress
npm run dev                # in one terminal, app at http://localhost:3000
npm run cypress            # in another, opens Cypress interactive
# OR: one command, headless (builds, starts, runs, stops):
npm run e2e
```

Specs live in `cypress/e2e/`. The smoke spec hits the landing page and verifies
the `LeadGenerator` and `Dedupe` sections render.

**Applitools (visual regression) is a planned follow-on.** Deliberately deferred
from this initial Cypress wiring to isolate install risk (React 19 / Next 16
peer-dep conflicts on the visual-eyes SDK). Free tier 100 checkpoints/mo;
when added, set the key with `./scripts/secret-set.sh APPLITOOLS_API_KEY <key>`.

CI: `.github/workflows/cypress-lead-engine.yml` runs on PRs touching this app.
