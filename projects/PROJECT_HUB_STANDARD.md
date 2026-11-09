# Project Hub Standard

**Rule:** Every project lives as a folder in `projects/` — one hub domain
(oaudrey.com), many projects, no domain-per-project spend.

## Layout

```
projects/<slug>/
  project.json      # registry entry (required)
  docs/             # public pages for the project (optional)
  assets/           # images, downloads (optional)
```

## project.json fields

| field | values | meaning |
|---|---|---|
| `slug` | kebab-case | URL path segment |
| `domain_strategy` | `path` / `subdomain` / `own-domain` | how it is served |
| `own_domain` | string or null | set only for kept domains |
| `redirect_from` | list | old domains that 301 here |
| `repo` | owner/name | source repo |
| `status` | `live` / `building` / `retired` | lifecycle |

## URL mapping

- `domain_strategy: path`      -> https://oaudrey.com/<slug>/
- `domain_strategy: own-domain`-> project keeps its domain; hub links out
- Old domains -> 301 redirect to the hub path (recorded in `redirect_from`)

## Adding a project

1. `mkdir projects/<slug>/docs`
2. Add `project.json` (copy an existing one)
3. Push. `scripts/build-hub-registry.js` regenerates `hub-registry.json`.

## Kept domains (do not consolidate)

growlingeyes.com, growlingeye.com (redirect), uprisinghope, risingaloha,
oaudrey.com (the hub itself), freedomangelscorp.com.
Everything else: folder + redirect, $0/yr.
