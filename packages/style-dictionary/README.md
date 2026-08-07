# @revvel/style-dictionary

Centralized design tokens for Revvel products, stored in
[Style Dictionary](https://styledictionary.com/)-compatible JSON
(`tokens/*.json`, each leaf `{ "value": ..., "type": ... }`). Products import
the generated SCSS/CSS instead of defining local variables — new values go in
here, never in a product stylesheet (enforced by
[`@revvel/stylelint-config`](../stylelint-config/README.md)).

`packages/style-dictionary/tokens/tokens.json` is the **single canonical source**
for all UI design tokens. If you add or change a token, edit `tokens/tokens.json`
here, then run `node packages/style-dictionary/build.js` and commit the updated
`dist/` alongside it. The repo-root `tokens.json` is a legacy artifact and may be
removed once all downstream consumers have been migrated to reference this package.

## Build

```bash
cd packages/style-dictionary
npm run build
```

Outputs (committed under `dist/`):

- `dist/_variables.scss` — `$color-bg-primary: #090d16;` SCSS variables
- `dist/variables.css` — `--color-bg-primary: #090d16;` custom properties
- `dist/tokens.flat.json` — flat token map for JS consumers

## Use in a product

```json
{
  "devDependencies": {
    "@revvel/style-dictionary": "file:../../packages/style-dictionary"
  }
}
```

```scss
@use "@revvel/style-dictionary/dist/_variables.scss" as *;

.card {
  background: $color-bg-surface;
  border-radius: $radii-md;
}
```

Or plain CSS:

```css
@import "@revvel/style-dictionary/dist/variables.css";
```

## Migrate legacy SCSS variables

Convert a product's `_variables.scss` into tokens deterministically (no
LLM paste-conversion needed):

```bash
node scss-to-tokens.js ../../products/<name>/styles/_variables.scss legacy.json
```

The converter prints any declaration it cannot convert safely (SCSS maps,
interpolation) and exits non-zero so partial conversions are never silent.
Merge the resulting JSON into `tokens/`, run `npm run build`, then delete the
legacy SCSS file and import `dist/_variables.scss` instead.

**Validation:** the SCSS must still build without errors, and compiled CSS
before/after the swap should diff clean. `tests/shared-packages.test.js`
asserts JSON↔SCSS round-trip parity automatically.

## Troubleshooting

- **Build fails with `Invalid token at "..."`** — a token leaf is missing its
  `value` property; fix the named path in `tokens/*.json`.
- **Converter exits with code 2** — some declarations were skipped; read the
  `SKIPPED` lines on stderr and migrate those by hand.
