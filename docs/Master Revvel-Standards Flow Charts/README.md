# Master Revvel-Standards Flow Charts

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Auto-Maintained — Do Not Edit Metadata Block Manually
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Maintained by:** `scripts/sync-flow-charts.js` + `.github/workflows/flow-chart-sync.yml`

---

## What Is This Folder

This folder contains the **official, always-up-to-date visual and textual maps** of how everything in the Revvel ecosystem works — from the moment you have an idea all the way to a deployed, documented feature.

Think of it as the **instruction manual for the whole machine**.

---

## Documents in This Folder

| File | What It Is | Best For |
|---|---|---|
| [`MASTER_FLOW_SIMPLE.md`](./MASTER_FLOW_SIMPLE.md) | Plain numbered steps — written for an 8-year-old | Quick reference, onboarding |
| [`MASTER_FLOW_WIREFRAME.md`](./MASTER_FLOW_WIREFRAME.md) | ASCII box-and-arrow diagram | Developers, at-a-glance architecture |
| [`MASTER_FLOW_3D.md`](./MASTER_FLOW_3D.md) | Mermaid layered flow chart (3D-style) | Presentations, visual thinkers |
| [`TOOLS_CATALOG.md`](./TOOLS_CATALOG.md) | Every tool, API, MCP, CLI with description | Deep reference |
| [`TOOLS_CATALOG.csv`](./TOOLS_CATALOG.csv) | Same data as CSV for Excel / database upload | Spreadsheets, databases |

---

## Auto-Upkeep

These files are **automatically kept in sync** by the `flow-chart-sync` GitHub Actions workflow.

- **Trigger:** Every push to `main` that changes any `.md` or `.yml` file in the repo
- **What it does:**
  1. Scans the entire `docs/` tree for all markdown files
  2. Updates the metadata block (version, date, doc counts) in each flow chart
  3. Detects renamed or moved files and patches all cross-references
  4. Commits and pushes any changes back to the branch

**You do not need to update these files manually.**  
If you rename a document or move a folder, the workflow will catch it on the next push.

---

## How to Use This Folder

1. **New team member?** Start with [`MASTER_FLOW_SIMPLE.md`](./MASTER_FLOW_SIMPLE.md)
2. **Want the full picture?** Read [`MASTER_FLOW_WIREFRAME.md`](./MASTER_FLOW_WIREFRAME.md)
3. **Need tool details?** Open [`TOOLS_CATALOG.md`](./TOOLS_CATALOG.md)
4. **Building a database?** Download [`TOOLS_CATALOG.csv`](./TOOLS_CATALOG.csv)

---

## Metadata (Auto-Updated)

<!-- SYNC-META-START -->
- **Last sync:** 2026-05-05
- **Total docs in repo:** 582
- **Total tools catalogued:** 80
- **Workflow:** `.github/workflows/flow-chart-sync.yml`
- **Script:** `scripts/sync-flow-charts.js`
<!-- SYNC-META-END -->
