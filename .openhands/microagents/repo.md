# Repo: revvel-standards

## Description

This is the **single source of truth** for all Revvel and MIDNGHTSAPPHIRE standards, processes, and specifications. It is a **documentation and workflow repository**, not a code application.

## What It Contains

- **WR (Work Request) templates** — `wr/WR_TEMPLATE_BASIC.md` (recommended) and `wr/WR_TEMPLATE_FULL.md` (advanced)
- **GitHub Actions workflows** — Automation for research, ship-to-market, status auditing
- **Labels** — Standard labels for WR lifecycle management
- **Agents instructions** — How AI agents should behave
- **Process documentation** — Ship-to-market, research fleet, review fleet

## How to Use

### For New WRs
1. Copy `wr/WR_TEMPLATE_BASIC.md` to a new file in your WRs directory
2. Fill in **Title** and **Description**
3. The research engine auto-fills everything else

### For Workflows
- **Research Fleet**: Triggered by label `research`
- **Ship-to-Market**: Triggered by label `deliver:*`
- **Status Audit**: Run manually via GitHub Actions

## Environment

This is a **documentation-only repository**. No build step required.
- No `package.json` with runnable code
- No tests to execute
- Just Markdown files and GitHub Actions YAML

## Key Files

| Path | Purpose |
|------|---------|
| `wr/WR_TEMPLATE_BASIC.md` | Simple WR template |
| `wr/WR_TEMPLATE_FULL.md` | Advanced WR template |
| `.github/workflows/ship-to-market.yml` | Ship WR to production |
| `.github/workflows/research.yml` | Run market research |
| `SHIP_STATUS.md` | Status tracking |

---

*Updated: 2026-05-19*
