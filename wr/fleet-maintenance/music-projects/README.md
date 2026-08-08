# Music Projects

Music production, songwriting, stem separation, and distribution tools hub
for Freedom Angel Corp / MIDNGHTSAPPHIRE.

## Live Deployment

This repository is documentation-and-tooling first. The related shippable product
lives in `revvel-standards`:

- Music Video Creator (live):
  [https://revvel-standards.vercel.app/docs/music-video-creator/](https://revvel-standards.vercel.app/docs/music-video-creator/)

When this hub gains its own static surface, the live URL will be recorded here
under this heading.

## Project Information

| Field | Value |
| --- | --- |
| **Owner** | Freedom Angel Corp / Audrey Evans (@midnghtsapphire) |
| **Categories** | music, creative, tools, OSINT-adjacent media |
| **Status** | Active — fleet maintenance baseline |
| **License** | All Rights Reserved |
| **Hub issue** | [revvel-standards#16827](https://github.com/midnghtsapphire/revvel-standards/issues/16827) |

## Overview

`music-projects` is the private catalog and standards surface for music-domain
work across the fleet: production notes, stem-separation research, songwriting
pipelines, and distribution checklists. Application code may land under `src/`
or as linked products; documentation and review jury workflows stay here.

See [docs/OVERVIEW.md](docs/OVERVIEW.md) for architecture, monetization path,
and competitor context.

## Structure

```text
music-projects/
├── README.md                 # this file
├── CONTRIBUTING.md           # PR / branch / secrets conventions
├── AGENTS.md                 # universal agent instructions
├── CHANGELOG.md
├── LICENSE
├── package.json              # npm test / validate scripts
├── docs/
│   ├── README.md
│   └── OVERVIEW.md
├── tests/
│   └── repo-baseline.test.js
└── .github/workflows/        # full review jury
    ├── ai-pr-review-openrouter.yml
    ├── jules-pr-reviewer.yml
    ├── semgrep.yml
    └── codeql.yml
```

## Quick start

```bash
npm install
npm test
npm run validate:workflows
```

No API keys are required for baseline tests. Live AI review workflows need
repository secrets (see CONTRIBUTING.md).

## Review jury

Every PR is expected to pass the same jury used on `revvel-standards`:

| Workflow | Purpose |
| --- | --- |
| `ai-pr-review-openrouter.yml` | OpenRouter advisory rewrite review |
| `jules-pr-reviewer.yml` | Jules design/correctness review |
| `semgrep.yml` | SAST + secrets (ERROR severity gates) |
| `codeql.yml` | CodeQL for Actions + JS/TS + Python |

## Related products

| Product | Location | Notes |
| --- | --- | --- |
| Music Video Creator | `midnghtsapphire/revvel-standards/products/music-video-creator` | Next.js AI video toolkit |
| Melody Intel (fleet WR) | org research track | Adjacent music-intel naming |

## License

All Rights Reserved. Copyright 2010–2026 Freedom Angel Corp / Audrey Evans.
