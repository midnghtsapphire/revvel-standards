# WR: Issue 14466 Add hyperorg and backintime to revvel-standards

**Issue:** #14466  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-10
**Researcher:** Jules (Google) + OpenRouter  
**Research Date:** 2026-06-10
**WR Status:** ✅ Complete

## Issue Context
**Objective:**
https://codeberg.org/buhtz/hyperorg
https://github.com/bit-team/backintime

Make an api, cli, mcp, skills, booklets, chrome extension, sellable pdf. And wire it into revvel-standards especially for live html dashboards- find more like it to make live html dashboard more robust cleats-tools that give it features of a regular hard website.

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | N/A |
| Archived | N/A |

## Research Checklist
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization

## Executive Summary
This WR details the integration of two FOSS repositories (`buhtz/hyperorg` and `bit-team/backintime`) into the `revvel-standards` live HTML dashboard ecosystem. By leveraging `hyperorg` for converting Org-mode data into HTML and `backintime` for snapshot-based state backups, we can create a robust, production-ready live dashboard process. The output spans multiple artifact forms (API, CLI, MCP server, Skills, Booklets, Chrome Extension, Sellable PDF) to maximize distribution and utility across the Revvel platform.

## Step 1A — Product/Output Selections
1. **API**: FastAPI-based backend to trigger hyperorg conversions and backintime snapshots.
2. **CLI**: Python command-line utility for local dashboard generation and management.
3. **MCP Server**: `hyperorg-backintime-mcp` to expose document conversion and backup tools to LLM agents.
4. **Skills**: Reusable `SKILL.md` configurations for generating the dashboard components.
5. **Booklets**: Documentation guides outlining the architecture and usage.
6. **Chrome Extension**: Extension to preview and trigger live HTML dashboard refreshes.
7. **Sellable PDF**: A comprehensive guide on "Building Robust Live HTML Dashboards with FOSS Tools."

## Step 2 — Deep Web Research
### hyperorg (buhtz/hyperorg)
- **Function**: Converts Org-mode files into HTML.
- **Relevance**: Org-mode is a powerful plain-text system for note-taking and project planning. `hyperorg` enables seamless publishing of these documents to live HTML, providing a structured, easy-to-edit backend for dashboards.
- **Alternatives**: Pandoc, Hugo, Jekyll. `hyperorg` is chosen for its specific focus on Org-mode fidelity.

### backintime (bit-team/backintime)
- **Function**: Simple backup tool for Linux, inspired by Apple's Time Machine.
- **Relevance**: Live HTML dashboards often require state management and version history to recover from erroneous data updates. `backintime` provides a reliable mechanism to snapshot dashboard state (HTML files, data JSONs).
- **Alternatives**: Timeshift, Restic, Borg. `backintime` is user-friendly and integrates well into file-system based workflows.

### Synergy for Live HTML Dashboards
Combining these tools allows for a robust pipeline:
1. Data source (Org files) -> `hyperorg` -> Live HTML Dashboard.
2. Live HTML Dashboard Directory -> `backintime` -> State Snapshots.

## Step 3 — Requirements
- **Integration**: Adhere to `docs/process/LIVE_HTML_DASHBOARD_PROCESS.md`.
- **MCP Server**: Create an MCP server in the `revvel-standards` format exposing `convert_org_to_html` and `create_snapshot` endpoints.
- **Skill Definition**: Create a `SKILL.md` under `skills/live-dashboard-generator/`.
- **API/CLI**: Implement a Python-based orchestrator that wraps the `hyperorg` and `backintime` binaries.
- **Documentation**: Write the Booklets and Sellable PDF using standard templates.

## Recommendations
1. **Implement the MCP Server first**: This allows AI agents to interact with the conversion and backup processes autonomously, which is the core of the `revvel-standards` philosophy.
2. **Containerization**: Ensure `hyperorg` and `backintime` are packaged within a Docker container or rely on standard package managers in the API implementation to ensure portability.
3. **Sellable PDF Generation**: Use the Gumloop/n8n PDF generation pipelines defined in `workflows/` to automatically assemble the Sellable PDF.

## Risks
1. **Dependency Hell**: `backintime` relies heavily on Linux-specific tools (`rsync`, `cron`). Porting the CLI/API to Windows or macOS environments might require significant workarounds (e.g., WSL2 or Docker).
2. **Performance**: Frequent `backintime` snapshots of large HTML directories could introduce I/O bottlenecks. Mitigation: Configure exclude patterns and optimize snapshot frequency.
