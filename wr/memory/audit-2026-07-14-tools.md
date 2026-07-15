# Audit 2026-07-14 — Tools & Method Memory

Reusable audit toolchain (all reproducible, no API keys needed):

**External tools**
- `git clone --depth 1` — public repo pull
- `node --test` (Node 22 built-in runner) — 631-test suite execution
- `npx tsc -p tsconfig.json` — typecheck gate
- `npm install --no-save <pkgs>` — hypothesis testing without polluting lockfile
- Python 3 `json`/`yaml` — validity sweeps across 173 json / 370 yml files
- `grep -rhoE "require\('...'\)"` — undeclared-dependency detection
- `find -name .gitkeep` + dir-count — hollow-skeleton detection
- Zapier GitHub MCP (create_branch, get_file_contents, create_file, pull_request) — push lane when no direct GitHub connector is present

**Internal repo tools exercised**
- `npm test`, `npm run typecheck` (package.json scripts)
- `scripts/automation-doctor.js` (crashed pre-fix → now loadable)
- WR templates (WR_TEMPLATE_BASIC.md format followed for all 10 WRs)
- learnings.md append-only protocol honored

**Method (repeatable order):** structure survey → validity sweeps (json/yaml) → wiring resolution (workflow→script paths) → run own test suite → diagnose failures to root cause → prove fix empirically → security pass (pull_request_target, unpinned actions, secret grep) → hygiene pass (dupes, links, cron density) → file WRs with fix + vaccine.

**Push-time learning:** live HEAD had drifted from the audited clone (partial WR-A1 fix already on main). Rule: re-fetch and diff against live HEAD before applying any audited fix — audits decay.
