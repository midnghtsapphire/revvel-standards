# PR deliverables: one of each category, plus three sellable PDFs

Owner rule from Audrey Evans, 14 Nov 2026 (America/Denver), written down by TriageChief. Her words:

> "for each category: github action or docker package, github app or app, cli, mcp, api, skill, tool? And 3 sellable pdf from that group or something new."

**Status of the scope below: proposed, Audrey to confirm.** The seven categories, the three PDFs and the BOM rule are her words. The list of which PRs qualify (section 2) is TriageChief's proposal so that docs-only and chore PRs are not blocked. Until she confirms it, nothing here fails a check, a WR or a PR.

## 1. The rule

Every **qualifying PR** (section 2) produces one deliverable in each of these seven categories:

| # | Category | What counts |
| --- | --- | --- |
| 1 | GitHub Action or Docker package | A reusable Action (composite or container) or a published-ready Docker image that does one job from the PR's work. |
| 2 | GitHub App or app | A GitHub App, or a small standalone app, that exposes the PR's work to a person. |
| 3 | CLI | A command-line tool with `--help`, a usage example and tests. |
| 4 | MCP server | A Model Context Protocol server exposing the PR's work as tools. |
| 5 | API | A documented HTTP API (OpenAPI file) over the PR's work. |
| 6 | Skill | A `SKILL.md` that teaches an agent to use the PR's work. |
| 7 | Tool | Any other single-purpose utility (script, extension, template, calculator) that does not fit 1 to 6. |

Each deliverable is a **lighter, single-purpose version** of the PR's capability. It does not need to be the whole product. Reuse before rebuilding (Definition of Done rule 3): wrap what the PR already built, and check `docs/APP_REGISTRY.md` first.

Each deliverable needs a **live test surface** as [Definition of Done](./DEFINITION_OF_DONE.md) rule 1 already says: "Even an API, CLI, or MCP server gets a web interface to test it." Where hosting does not exist yet, see sections 4 and 5.

### Three sellable PDFs

The same PR also produces **3 sellable PDFs**. They are drawn from the seven deliverables above (for example a how-to, a template pack or a buyer's guide for one of them), or they are new ones. This reuses the existing PDF pipeline: choose **sellable-pdf** and **Autocreate 3** in the WR form (see [`workflows/PDF_WR_PLAYBOOK.md`](../workflows/PDF_WR_PLAYBOOK.md)). Nothing new is invented for that part.

### Where it is recorded

Add a `DELIVERABLES.md` next to the PR's main work (for example `products/<name>/DELIVERABLES.md`) with ten rows: the seven categories and the three PDFs. Each row says one of:

- **built**: path or link, plus how to run it, plus the live test surface link or the local command;
- **blocked on BOM**: the name of the missing hosting, secret or data, and a link to its row on the BOM list (section 4).

## 2. Proposed scope (proposed, Audrey to confirm)

**Qualifying PRs (proposed):** product and app work, meaning WRs whose Output Type is `production-app`, `desktop-tool`, `cli-product`, `mcp-product`, `api-product` or `invention-flow`.

**Not qualifying (proposed):** docs-only PRs, chore PRs, dependency bumps, bug fixes and style fixes on an existing product, research, infrastructure, compliance and security work, standards and rule changes, bot operations, backups, and reverts. These follow the existing PR template and Definition of Done only.

A WR with Output Type `sellable-pdf` produces its PDFs as before; the seven-category rule does not apply to it unless Audrey says so.

Open questions for Audrey (answering them replaces this section):

1. Is this the right qualifying list, or should every non-docs PR qualify?
2. Should the seven deliverables be required per PR, or once per product with later PRs updating them?
3. Should an existing product get a one-time catch-up, or only new PRs from the confirmation date?

## 3. How the rule is checked

Today it is a checklist item in the PR template and a line in the Definition of Done. It is **not** a workflow gate, and this change adds no workflow, CI or permission change. A reviewer looks at `DELIVERABLES.md`. If a gate is wanted later, that is a separate WR for Audrey to decide.

## 4. Missing hosting, secrets or data goes on the BOM, and never fails the WR or PR

This is the rule from [`GROK-BOTS-BOX-IS-SCRATCH.md`](https://github.com/midnghtsapphire/revvel-standards/pull/18404) and the Universal BOM List, applied here:

- A deliverable that cannot be built or hosted because of missing **hosting, a secret, an API, inventory or data** is marked **blocked on BOM** in `DELIVERABLES.md`.
- The missing item is added to the BOM "Audrey to get" list with: what it is, why it is needed, which WR or PR, free or paid, and the link to get it. Use the existing process: [`docs/Universal-BOM_List/README.md`](./Universal-BOM_List/README.md) and the project's `BOM.md`, rolled up into [`docs/_MASTER_BOM.md`](./_MASTER_BOM.md).
- A blocked row **never fails or holds the WR or the PR**. The rest of the PR still ships. Do not ask Audrey for a secret mid-work.
- Do not fill a gap with a stand-in presented as real. Labeled synthetic data is dev-only and is never evidence.

## 5. Why per-PR test sites are blocked today

The standard, [`TEST_ENVIRONMENTS_STANDARD.md`](./Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md) (15 Apr 2026), describes four stages: dev (local), staging (CI plus a preview), live-test (a production-like site on a product subdomain for invited testers) and production (the public site). A read-only inventory on 14 Nov 2026 found:

- **dev** exists as a convention only (bots run things locally and run tests).
- **staging** is mostly unavailable: GitHub Actions is billing-locked, so CircleCI is the real check. Some GitHub Pages sites load.
- **live-test and production were never stood up.** The product subdomains do not resolve, the apex domain is only a landing page, there are no DigitalOcean App Platform apps, and the hosting connection available to bots is read-only.

So an automatic test site per PR cannot exist yet. Until the live-test stage is built, each deliverable's test surface is a **local run command** in `DELIVERABLES.md` (a playground page or command that a person can run and watch), and the missing hosting is one BOM row. When the live-test stage exists, the live URL replaces the local command. Building those stages is separate work for Audrey to approve and fund; this rule does not start it.

## 6. Free public versions

Audrey also asked for lighter free versions of some Actions, MCP servers and CLIs, in their own public repository, for sharing on LinkedIn and Facebook groups. That is a separate repo, [`midnghtsapphire/github-free-toolkit`](https://github.com/midnghtsapphire/github-free-toolkit), and not part of this rule. Private tools and secrets are not copied into it.
