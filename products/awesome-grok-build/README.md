# Awesome Grok Build

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/products/awesome-grok-build/)**

> Deploy path: Vercel project for `products/awesome-grok-build` (Next.js).
> Local preview: `npm run dev` → <http://localhost:3012>

## What It Is

Production SaaS surface that **vendors and wires**
[DominikTobureto/awesome-grok-build](https://github.com/DominikTobureto/awesome-grok-build)
into the revvel-standards monorepo.

Grok Build is xAI’s terminal-first coding agent. The upstream repo is a community
awesome-list + skill library (MIT). This product turns that library into a
**browsable, searchable install planner** with APIs — freemium SaaS ready for
Polar.sh checkout.

Independent community integration. **Not affiliated with, endorsed by, or
sponsored by xAI Corp.**

## Features

- **Skill catalog** — 13+ vendored `.grok/skills` with search, category filter, sort
- **Stack install planner** — Next.js, Python, library, security, docs, performance presets
- **Export formats** — Bash, PowerShell, Markdown brief, Grok prompt (copy-to-clipboard)
- **REST APIs** — `GET /api/skills`, `GET|POST /api/plan`
- **Monorepo wiring** — root `.grok/skills/`, `skills/awesome-grok-build/`, `templates/grok-build/`
- **Pro CTA** — optional `NEXT_PUBLIC_POLAR_CHECKOUT_URL` for Polar.sh billing

## Quick Start

```bash
cd products/awesome-grok-build
npm install
npm test
npm run build
npm run dev    # http://localhost:3012
```

## Monorepo wiring

| Path | Role |
| --- | --- |
| `products/awesome-grok-build/` | Next.js SaaS app + vendored content |
| `.grok/skills/*` | Grok Build CLI discovery at repo root |
| `skills/awesome-grok-build/` | Revvel skills vault entry |
| `templates/grok-build/` | AGENTS.md + `.grokignore` templates |
| `tests/awesome-grok-build.test.js` | Root regression suite |

Install skills into another checkout from this monorepo:

```bash
# from repo root
cp -R .grok/skills /path/to/project/.grok/
cp templates/grok-build/AGENTS.fullstack.md /path/to/project/AGENTS.md
cp templates/grok-build/grokignore.node /path/to/project/.grokignore
```

Or use the upstream one-liner (still supported):

```bash
curl -fsSL https://raw.githubusercontent.com/DominikTobureto/awesome-grok-build/main/install.sh | bash
```

## API

### `GET /api/skills?q=security&category=all&sort=name`

Returns filtered skill summaries + categories.

### `POST /api/plan`

```json
{
  "stack": "nextjs",
  "extraSkillIds": ["hooksmith"],
  "target": "."
}
```

Returns bash/PowerShell/Markdown/Grok prompt install plan.

## Runtime configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | Polar.sh (or other) checkout URL for Pro CTA |

```bash
cp .env.example .env.local   # if present; or export the var in your shell
```

## Research notes (WR bundle)

- **Upstream:** <https://github.com/DominikTobureto/awesome-grok-build> (MIT)
- **Stars:** check GitHub live — community list; count changes over time
- **SEO / marketing keywords:** grok build skills, xai grok cli, awesome grok build, AGENTS.md template, grokignore, coding agent starter kit
- **Monetization:** freemium SaaS — free catalog + planner; Pro for team profiles / private packs via Polar
- **Citations:** upstream README + xAI CLI install page <https://x.ai/cli>

## Validation

```bash
npm test
npm run lint
npm run build
# from monorepo root:
npm test -- --test-name-pattern=awesome-grok
npm run workflows:validate
```

## License

App code: MIT (revvel-standards). Vendored skill/template content: MIT from upstream
— see `UPSTREAM_LICENSE`.
