# Product Shape Standards

Each product that exits the Solution-Shape Router (step 5 of [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md)) is built, certified, and published according to the standard for its shape.

## Shape Index

| Shape | Standard | When to use |
|-------|----------|-------------|
| PDF / booklet | [`PDF.md`](PDF.md) | One-shot reference content; no state; SEO-driven discovery |
| CLI tool | [`CLI.md`](CLI.md) | Developer tooling; single binary; brew/npm install |
| MCP server | [`MCP.md`](MCP.md) | LLM agents call it; extends agent capabilities |
| API service | [`API.md`](API.md) | Other devs/apps call it; recurring SaaS revenue |
| Agent skill | [`SKILL.md`](SKILL.md) | ClawBot / OpenHands / other agents execute it |
| Excel / spreadsheet | [`EXCEL.md`](EXCEL.md) | Business users; template-driven; data-heavy |
| Token / credits | [`TOKEN.md`](TOKEN.md) | Usage-based access; prepaid credits; gated content |
| Full app | [`APP.md`](APP.md) | Full application through revvel-standards pipeline |

## How Shapes Relate to the Pipeline

```text
AUTOMATED_PRODUCT_PIPELINE.md (the master pipeline)
  └── Step 5: Solution-Shape Router picks one shape
        └── This folder: the build + publish standard for that shape
              └── templates/agent-generated-product/build/<shape>/
                    └── The actual scaffolded code
```

Each standard below defines:
1. **Research** — what to look for specific to this shape
2. **Create** — tooling, structure, quality gates
3. **Design** — Figma handoff, landing page, assets
4. **Publish** — where to sell, how to upload
5. **Connections** — APIs, integrations, accounts needed before build starts
