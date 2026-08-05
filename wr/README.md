# Weekly Research (WR) - Repository Reviews

This directory contains Weekly Research (WR) documents for each repository in the midnghtsapphire organization, following the revvel-standards workflow defined in `/docs/WEEKLY_RESEARCH_PROCESS.md` and `/promptforproject.md`.

## Overview

Each repository gets a comprehensive WR that includes:
- Market opportunity analysis
- Technology stack review
- Security and vulnerability assessment  
- Performance optimization recommendations
- Monetization strategies
- Deployment verification
- Ship-to-market readiness

## Directory Structure

```text
wr/
├── README.md                    # This file
├── WR_TRACKER.md               # Master tracker for all WRs
├── WR_QUEUE.md                 # Idea / suggestion queue (park now, prioritize later)
├── WR_TEMPLATE_IDEA.md         # Lightweight idea/spec capture (feeds the queue)
├── WR_TEMPLATE_RESEARCH.md     # Fine-grained personal research template
├── WR_TEMPLATE_BASIC.md        # Bug / chore / docs WR template
├── WR_TEMPLATE_FULL.md         # Full product / sellable-asset WR template
├── ideas/                       # Idea files (WR_TEMPLATE_IDEA instances)
├── research/                    # Personal research files (WR_TEMPLATE_RESEARCH instances)
├── scripts/
│   ├── generate-wr.sh          # Script to generate WR from template
│   └── update-tracker.sh       # Script to update WR tracker
└── repos/
    ├── XHUMANITY.md            # Oldest repository
    ├── k9-community-site.md
    ├── certifixes.md
    └── ...                      # One WR per repository
```

## Template Guide

| Template | When to use | Output lives in |
|----------|-------------|-----------------|
| `WR_TEMPLATE_IDEA.md` | Quick idea capture — fill only what you know now | `wr/ideas/` |
| `WR_TEMPLATE_RESEARCH.md` | Targeted personal research — answer one specific question | `wr/research/` |
| `WR_TEMPLATE_BASIC.md` | Bug / chore / docs / refactor WR | `wr/issues/` |
| `WR_TEMPLATE_FULL.md` | New product or sellable asset — full market research | `wr/issues/` |

### Idea → Full WR promotion path

```text
Capture idea
  → copy WR_TEMPLATE_IDEA.md → wr/ideas/YYYY-MM-DD-{slug}.md
  → add row to WR_QUEUE.md (status: Queued)
      ↓  when prioritized
  → copy WR_TEMPLATE_FULL.md → wr/issues/issue-{N}-{slug}.md
  → file GitHub issue [WR] {Title}
  → update WR_QUEUE.md row (status: Promoted)
```

## Usage

### Quick Start

```bash
# Generate WR for a single repository
cd wr/scripts
./generate-wr.sh neurooz

# Generate WRs for P0 (highest priority) repositories
./batch-generate-wrs.sh p0

# Update tracker with current statistics
./update-tracker.sh
```

### Via GitHub Actions

Create an issue with title:
```text
[WR] Repository Review - [repository-name]
```

The automation will generate the WR and create a PR with findings.

### Detailed Documentation

See [USAGE.md](USAGE.md) for complete usage guide, examples, and troubleshooting.

## WR Process

Each WR follows the 7-step process defined in `/promptforproject.md`:

1. **Repository Discovery** - Analyze repo state, commits, issues, PRs
2. **Deep Web Research** - Market analysis, tech stack, SEO/content
3. **Requirements from revvel-standards** - Apply AGENTS.md principles
4. **Redevelopment & Redesign** - Fix errors, enhance features, add monetization
5. **Deployment Verification** - Vercel deployment, UI verification
6. **Documentation Requirements** - TEST section, deployment URLs
7. **Save & Track** - Document findings, track progress

## Prime Directive

All WRs must align with the Prime Directive from `docs/AGENTS.md`:
- **10M by 2030** - Revenue goal
- **$2000+/month** - Monthly revenue target (starting May 1, 2026)
- **Ship to Market** - Working, tested code (not plans)
- **Driven Autonomy** - Never stop at blockers
- **Self-Healing** - Fix errors autonomously

## Related Documentation

- `/docs/WEEKLY_RESEARCH_PROCESS.md` - WR process and format
- `/docs/AGENTS.md` - Universal agent instructions
- `/promptforproject.md` - Project research workflow
- `/.github/workflows/weekly-research.yml` - WR automation workflow

## Statistics

- **Total Repositories:** 140
- **WRs Created:** 1
- **WRs In Progress:** 1
- **WRs Completed:** 0
- **Ship-to-Market Ready:** 0

**Priority Distribution:**
- P0 (Critical): ~10 repositories
- P1 (High): ~20 repositories
- P2 (Medium): ~40 repositories
- P3 (Low): ~50 repositories
- P4 (Maintenance): ~20 repositories

**Target Revenue:** $2000+/month (Start: May 1, 2026) - **URGENT**

Last updated: 2026-05-02
