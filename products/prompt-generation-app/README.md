# Revvel PromptForge

Static Next.js app that turns rough WR/product ideas into source-backed prompt packets with market facts, competitor gaps, blue/red-ocean scoring, legal OSINT boundaries, implementation prompts, and reviewer prompts.

## Mission Alignment

Part of the $10k/month → $10M/3yr pipeline. Monetization:
- $29 per packet (one-shot)
- $99/month workspace (unlimited packets)
- $499 setup service (custom packet templates)

## Local Development

```bash
cd products/prompt-generation-app
npm install
npm run dev
```

Opens at http://localhost:3006.

## Build (Static Export)

```bash
npm run build
```

Outputs to `out/`. Deploy to Vercel, Cloudflare Pages, or any static host.

## Testing

From repo root:

```bash
node tests/prompt-generation-app.test.js
```

Or via the root test runner:

```bash
npm test
```

## Architecture

- `lib/prompt-generator.js` — deterministic packet generator (pure functions, no network calls). Produces:
  - Market facts with source citations
  - Competitor gap matrix
  - Blue-ocean / red-ocean scores (0–100)
  - Legal OSINT boundary checklist
  - Implementation prompts (builder-ready)
  - Reviewer prompts (audit-ready)
- `app/page.tsx` — input form + packet renderer with markdown export.
- Accessibility: 7 display modes (WCAG AAA, dyslexia-friendly, focus mode, high-contrast, etc.) persisted to localStorage.

## Deployment

Target domain: `promptforge.revvel.co`

Vercel config:
- Root directory: `products/prompt-generation-app`
- Build command: `npm run build`
- Output directory: `out`

## License

Proprietary — Revvel.
