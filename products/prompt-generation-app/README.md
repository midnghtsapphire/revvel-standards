# Revvel PromptForge

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/prompt-generation-app/)**

## Mission Alignment

Part of the $10k/month → $10M/3yr pipeline. Monetization:
- $29 per packet (one-shot)
- $99/month workspace (unlimited packets)
- $499 setup service (custom packet templates)
Research-backed prompt generation app for Revvel work requests, product ideas, and PR packets.

## What Problem It Solves

Audrey's work requests often contain mixed notes, rough snippets, and LLM-generated fragments. Those inputs are useful, but they are not the source of truth. Revvel PromptForge turns the rough input into a structured packet that asks:

- What problem are we solving?
- Who are we marketing to?
- What public evidence supports the opportunity?
- What competitors already exist?
- What public chatter or buyer pain is visible?
- Which claims are safe to reuse?
- What implementation and code-review prompts should be handed to agents?

## How It Is Different

Most prompt tools sell libraries or rewrite prompt text. PromptForge creates a due-diligence packet: source log, competitor matrix, blue/red-ocean score, legal OSINT boundary, implementation prompt, and reviewer prompt.

## Research Sources Used

| Source | What It Proved |
|---|---|
| Research and Markets Prompt Engineering Market Report 2026 | Prompt engineering market grows from $1.13B in 2025 to $1.49B in 2026, then $4.51B by 2030 at 31.9% CAGR. |
| PromptBase | Prompt marketplace demand and pricing: 270k prompts, 39k+ reviews, 450k+ users, common prompt prices around $2.99-$6.99. |
| AIPRM pricing and plan docs | Prompt management, private prompt, prompt list, team, live crawling, and forking feature comparisons. |
| `midnghtsapphire/oz-prompt-library` | Existing internal prompt template and Blue Ocean App Discovery prompt. |
| `midnghtsapphire/WEBSITE-FACTORY-GENERATOR` | Existing internal multi-LLM OpenRouter prompt-generation pattern. |
| `midnghtsapphire/zeuroo` | Existing internal AI gateway and prompt optimization/cost-routing asset. |

## Legal Research Boundary

This app's evidence packet uses legal public OSINT only: public web pages, public GitHub repositories, public docs, and public community chatter. It does not require credentialed dark-web access, private account scraping, or bypassing platform terms.

## Features

- Interactive prompt packet generator
- Market fact cards with source URLs
- Competitor and gap matrix
- Blue-ocean and red-ocean scoring
- Internal Revvel prompt asset list
- Exportable markdown packet
- Code-review and fact-review prompt
- Seven accessibility display modes
- Static export for Vercel

## Accessibility Posture

PromptForge includes keyboard-reachable controls, visible focus states, contrast-focused themes, dyslexia-friendly spacing, large text, and monospace rendering. These align with core WCAG 2.2 Level A/AA-oriented interaction and readability goals, but the app does **not** claim full WCAG AAA conformance.

## Tech Stack

- Next.js 15 static export
- React 18
- TypeScript
- Tailwind CSS
- Deterministic JavaScript generation helper

## Local Development

```bash
cd products/prompt-generation-app
npm install
npm run dev
```

Opens at <http://localhost:3006>.

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
- Accessibility: 7 display modes (enhanced contrast, dyslexia-friendly, focus mode, high-contrast, large text, monospace, and default) persisted to localStorage.

## Deployment

Target domain: `promptforge.revvel.co`

Vercel config:
- Root directory: `products/prompt-generation-app`
- Build command: `npm run build`
- Output directory: `out`

## License

Proprietary — Revvel.
Open `http://localhost:3006`.

## Test

| Feature | Status | URL |
|---|---|---|
| Local prompt generator UI | Verified by build and generator tests | <http://localhost:3006> |
| Static Vercel deployment target | Ready for Vercel import | <https://promptforge.revvel.co> |

## Deployment

Create a Vercel project from `midnghtsapphire/revvel-standards` with root directory:

```text
products/prompt-generation-app
```

Build command:

```bash
npm run build
```

Output directory:

```text
out
```

## Monetization Wedge

- $29 downloadable prompt research packet
- $99/month prompt workspace for founders and agencies
- $499 setup service for turning one product idea into a research-backed WR and PR packet

## Validation

```bash
node ../../tests/prompt-generation-app.test.js
npm run build
```
