# README → Landing Page Automation

**Status:** ACTIVE · **Updated:** 2026-08-05  
**Brand:** MIDNGHTSAPPHIRE  
**Pattern:** readme-peacock–style README → static landing → GitHub Pages

## Hard rule

Production path is **not** `pip install readme-peacock && peacock` on a laptop.

1. **GitHub Actions** — `.github/workflows/readme-landing.yml`
2. **Headless script** — `scripts/readme-landing-build.mjs`
3. Optional third-party Action (pin SHA) — accelerator only
4. n8n/Make/Zapier — notify / mirror deploy only
5. Manual CLI — debug only

## Pipeline

```text
README.md (+ docs/*.md)
  → extract title, badges (shields.io), first H1
  → render landing HTML (theme: glass | dark | midnghtsapphire)
  → inject GitHub quick links (Issues, PRs, Releases, Wiki, Star)
  → attach OG + Twitter Card image (defaults to products/covers/cover-vault.jpg via jsDelivr @ commit SHA)
  → artifact site/
  → deploy GitHub Pages (Actions)
  → on failure → WR issue
```

## Themes

| id | Notes |
| --- | --- |
| `midnghtsapphire` | Default — deep ink + sapphire accent (brand) |
| `glass` | Glassmorphism / auto light-dark (peacock default) |
| `dark` | Always-dark high contrast |

## Security

- Third-party peacock Action is **not GitHub-certified** — pin full commit SHA if used
- Prefer first-party `scripts/readme-landing-build.mjs` for revvel-standards
- No API keys in HTML; static buttons only

## Related

- `standards/IMAGE_CREATION_SEO_AUTOMATION.md` — OG/hero assets for the landing
- `standards/AUTOMATION_FIRST_STACK.md` — preference order
