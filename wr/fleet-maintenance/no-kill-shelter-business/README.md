# No-Kill Shelter Business

Business-model documentation and operating standards for a no-kill animal
shelter under Freedom Angel Corp / MIDNGHTSAPPHIRE.

## Live Deployment

This repository is documentation-first. When a public static or app surface
ships (for example an adoption board or donor portal), record the verified
live URL under this heading.

Related org surfaces:

- Freedom Angel portfolio / brand hub (when deployed): document the URL here
  after a production deploy is confirmed.

## Project Information

| Field | Value |
| --- | --- |
| **Owner** | Freedom Angel Corp / Audrey Evans (@midnghtsapphire) |
| **Categories** | nonprofit, animal welfare, shelter operations, OSINT-adjacent research |
| **Status** | Active — fleet maintenance baseline |
| **License** | All Rights Reserved |
| **Hub issue** | [revvel-standards#16831](https://github.com/midnghtsapphire/revvel-standards/issues/16831) |

## Overview

`no-kill-shelter-business` is the private catalog for no-kill shelter
operations: intake policies, foster networks, adoption funnels, volunteer
scheduling, donor stewardship, and compliance notes. Application code may
land under `src/` or as linked products; documentation and review jury
workflows stay here.

See [docs/OVERVIEW.md](docs/OVERVIEW.md) for architecture, monetization path,
and competitor context.

## Structure

```text
no-kill-shelter-business/
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

## Related products / research

| Asset | Location | Notes |
| --- | --- | --- |
| Fleet WR package | `midnghtsapphire/revvel-standards/wr/fleet-maintenance/no-kill-shelter-business` | Portable re-apply package |
| K9 / animal-adjacent fleet tracks | org research WRs | Neighbor rescue / community sites |

## License

All Rights Reserved. Copyright 2010–2026 Freedom Angel Corp / Audrey Evans.
