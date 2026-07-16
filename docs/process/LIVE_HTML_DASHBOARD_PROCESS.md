# Live HTML Dashboard Process

Defines the standard process for building a live, self-refreshing HTML dashboard in
revvel-standards and clarifies which project types should use it.

---

## 5-step process (2026 roadmap)

1. **Connect data sources with MCP**
   - Bridge runtime data (GitHub, PostgreSQL, HubSpot, APIs) through MCP servers.
2. **Generate the HTML interface**
   - Produce a responsive HTML artifact from a prompt-driven UI workflow.
3. **Wire live logic**
   - Attach scripts/services that fetch live data at render-time.
4. **Save as reusable skill**
   - Store the generation/update recipe in a `skills/*/SKILL.md` file.
5. **Deploy via sandboxed URL**
   - Publish to a secure URL (Vercel for website-in-test) with controlled credentials.

---

## Where this process applies

| Output type / project type | Live HTML requirement |
| --- | --- |
| `production-app`, `desktop-tool` | **Full process required** (all 5 steps). |
| `mcp-product` | Required companion live HTML interface to test MCP behavior end-to-end. |
| `api-product` | Required companion live HTML console/dashboard to exercise API paths. |
| `cli-product`, `internal-script-automation` | Required companion live HTML test surface for non-CLI users. |
| `sellable-pdf`, documentation-only outputs | Optional unless the WR explicitly requests a live interface. |

This aligns with the repository rule that deliverables are only done when they are
testable live and include a website/UI surface where needed.

---

## Minimal implementation checklist

- [ ] Data contract defined (`dashboard-data.json` or API/MCP contract)
- [ ] HTML dashboard artifact generated
- [ ] Live script or endpoint wiring completed
- [ ] Skill file updated with regeneration/update instructions
- [ ] `README.md` includes `## Live Deployment` with the live URL

---

## Related documentation

- [System Map](./SYSTEM_MAP.md) — How live dashboards fit into the broader system
- [MCP Revvel Catalog](../MCP_REVVEL_CATALOG.md) — Available MCP servers for data sources
- [Skill Creation Guide](../SKILL_CREATION_GUIDE.md) — How to save dashboard generation as a skill
