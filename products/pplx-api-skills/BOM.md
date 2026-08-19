# BOM — pplx-api Skills Console

Product-local Bill of Materials. Canonical registry:
[`docs/Universal-BOM_List/API_REGISTRY_BOM.md`](../../docs/Universal-BOM_List/API_REGISTRY_BOM.md).

| Component | Version / pin | Role | Notes |
| --- | --- | --- | --- |
| Next.js | ^15.5 | App framework | App Router, route handlers |
| React | ^19 | UI | Client console |
| TypeScript | ^5 | Types | `tsc --noEmit` lint |
| Tailwind | ^3.4 | Styling | |
| tsx | ^4.22 | Tests | `node:test` runner |
| Perplexity API | <https://api.perplexity.ai> | Live LLM + tools | Needs `PERPLEXITY_API_KEY` |
| No-key bridge | helallao/perplexity-ai | Free research lane | Separate scripts path — not this app’s runtime |

## Skills surface

See `app/lib/skills/registry.ts` and in-app **Skill registry** panel.
