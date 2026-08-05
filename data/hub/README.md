# Public Hub registry — website publication lane

This directory is the source of truth for the generated tab list on
`index.html` (the "Freedom Angel Corp — Public Hub"). It closes the loop for
`#website` / `deliver:app` work requests (issue #15510): a merged website WR
lands here as one small JSON entry, and everything downstream is automated.

## How a website WR publishes to the hub

1. The WR's PR adds its page under the repo root (served by GitHub Pages via
   `.github/workflows/static.yml` and by Vercel) **and** one entry file:
   `data/hub/entries/<slug>.json`.
2. On merge to `main`, `.github/workflows/website-publish.yml` runs
   `node scripts/build-hub-registry.js`, which regenerates
   `hub-registry.json` + `hub-registry.js` at the repo root, and commits them
   if changed. `index.html` renders every registry entry as a card in the
   "Live tabs" grid — no hand edit, so the hub never drifts.
3. The same workflow comments the live Pages URL back on each entry's source
   WR issue (tracked via the `issue` field; commented once per issue).

## Entry format

```json
{
  "slug": "my-page",
  "title": "My Page",
  "description": "One-sentence description from the WR.",
  "path": "./my-page/",
  "tag": "Product",
  "issue": 15510
}
```

- `slug` — unique, kebab-case, must match the filename (`<slug>.json`).
- `title` / `description` — card heading and body, taken from the WR.
- `path` — repo-root-relative page path (`./my-page/` or `./my-page.html`).
  Must stay inside the repo; external URLs are rejected by the builder.
- `tag` — optional pill label shown on the card (defaults to `Website`).
- `issue` — optional source WR issue number; used to post the live URL back.

## Never hand-edit the outputs

`hub-registry.json` and `hub-registry.js` at the repo root are generated.
Change the entry files here (or `scripts/build-hub-registry.js`) instead,
then run:

```bash
node scripts/build-hub-registry.js
```
