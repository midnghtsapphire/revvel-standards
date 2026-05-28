# Life Insurance Lead Engine — App

## Install

```bash
npm install
npm run dev
```

Open http://localhost:3000

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

## E2E tests (Cypress + Applitools)

```bash
npm install                # picks up cypress + @testing-library/cypress + @applitools/eyes-cypress
npm run dev                # in one terminal, app at http://localhost:3000
npm run cypress            # in another, opens Cypress interactive
# OR: one command, headless:
npm run e2e                # builds, starts, runs Cypress headless, stops
```

Specs live in `cypress/e2e/`. The smoke spec hits the landing page, verifies the
`LeadGenerator` / `Dedupe` sections render, and takes one Applitools visual
checkpoint. **Applitools is optional** — without `APPLITOOLS_API_KEY` set, the
eyes calls are no-ops and Cypress still passes. Get a free key (100 checkpoints/mo)
at [applitools.com](https://applitools.com) and add it via:
```bash
./scripts/secret-set.sh APPLITOOLS_API_KEY <key>
```

CI: `.github/workflows/cypress-lead-engine.yml` runs on PRs touching this app.
