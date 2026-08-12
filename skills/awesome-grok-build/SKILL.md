---
name: awesome-grok-build
description: Use when configuring xAI Grok Build, installing .grok/skills, choosing AGENTS.md templates, or generating stack install plans from the vendored DominikTobureto/awesome-grok-build library.
version: 1.0.0
author: revvel-standards
---

# Awesome Grok Build (Revvel vault entry)

Wire-up of [DominikTobureto/awesome-grok-build](https://github.com/DominikTobureto/awesome-grok-build)
into this monorepo.

## Where things live

| Path | Purpose |
| --- | --- |
| `products/awesome-grok-build/` | Production SaaS skill browser + install planner |
| `.grok/skills/` | Grok Build CLI skill discovery (repo root) |
| `skills/awesome-grok-build/*/` | Per-skill copies in the Revvel vault |
| `templates/grok-build/` | AGENTS.md + grokignore templates |

## When to use

- User asks for Grok Build setup, skills, hooks, or AGENTS.md starters
- Need a stack-specific install plan (Next.js, Python, security, docs…)
- Auditing whether monorepo Grok skills are present before agent work

## Workflow

1. Prefer the live app / local product: `products/awesome-grok-build` (`npm run dev` → port **3012**).
2. Or copy from root: `cp -R .grok/skills <target>/.grok/` plus a template from `templates/grok-build/`.
3. For programmatic plans, use `products/awesome-grok-build/lib/catalog-engine.js` (`buildInstallPlan`).
4. Validate with `cd products/awesome-grok-build && npm test`.

## Example prompts

```text
Use awesome-grok-build. Generate a Next.js install plan and list the skills that will be copied.
```

```text
Use repo-health-check from the vendored Grok skills, then propose the smallest safe PR.
```

## Notes

- Upstream license: MIT (`products/awesome-grok-build/UPSTREAM_LICENSE`).
- Not affiliated with xAI.
- Optional billing surface: `NEXT_PUBLIC_POLAR_CHECKOUT_URL` on the product app.
