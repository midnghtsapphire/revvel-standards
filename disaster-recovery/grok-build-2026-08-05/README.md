# Disaster recovery pack — Grok Build 2026-08-05

Ephemeral App Builder sandboxes die. This directory is the **lifeboat** for:

- Formal dual-path verifier sources + sample report  
- Session thought process  
- Learnings block to merge into root `learnings.md`  
- Memory snapshot + full label inventory  

## Restore

1. Copy `formal/*` into a working tree or product that hosts the dashboard.  
2. Run `node scripts/formal-auto-wr.mjs` from repo root after copying report to `artifacts/`.  
3. Run `node scripts/agent-scorecard.mjs` for privilege suggestions.  
4. Read `thoughts/SESSION_THOUGHT_PROCESS.md` before continuing agent work.

## Policy

Update this pack (or create `disaster-recovery/grok-build-YYYY-MM-DD/`) at the end of any session that produces non-trivial standards, scripts, or formal results. **No secrets.**
