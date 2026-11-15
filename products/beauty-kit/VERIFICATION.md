# Verification summary (2026-11-12, America/Denver)

Run with `python3 products/_shared/verify_all.py` (227 of 227 checks pass).

## Booklet
- 24 pages, US Letter, all fonts embedded. Rendered pages to PNG and checked cover, contents, chapters, appendices, license.
- Every snippet in `src/snippets/` parsed: YAML (PyYAML), JSON, TOML (tomllib), workflows through actionlint, shell syntax. Action SHA pins are 40 hex.
- Banned-word scan passes (no third-party trademarks, no tracker or affiliate parameters).

## README Kit (Pro and Lite)
- Zip integrity, all SVG well-formed, 3 layouts (Lite: 1), HTML balanced, `<picture>` has dark source and light fallback, every image has alt text, local asset references resolve, only placeholder or own-repo URLs.
- Workflows: parse, actionlint clean, third-party actions pinned to full commit SHAs, both workflow folders identical.
- Scripts: compile, sample runs, guide examples run, `publish-output.sh` tested in a temp repo (accumulates files, idempotent).
- Banner and badge text contrast >= 4.5:1.

## Dev Palette Kit (Pro and Free)
- `.vsix` files built with @vscode/vsce 4.1.1; manifests checked (publisher, engines, themes, icon, license, readme). Theme JSONs parse; color keys are valid VS Code keys; token and UI contrast >= 4.5:1.
- Starship TOML validates against the official Starship schema. oh-my-posh themes validate against the official schema. Windows Terminal schemes parse and use valid keys.

## Not verified (honest limits)
- No live install of the `.vsix` into VS Code or Cursor (no editor binary on the box, disk too small to download one). Package structure and manifest were checked instead.
- GitHub Actions workflows were linted and the publish script was tested locally, but the snake (Platane/snk) and metrics (lowlighter/metrics) actions were not run on GitHub.
- Windows Terminal automatic light/dark switching is not claimed in the guide.
- License texts are drafts, not legal advice. Have them reviewed before selling.
