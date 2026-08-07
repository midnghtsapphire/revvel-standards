# Shared Tooling Packages (`packages/`)

WR #16973 deliverable: one place for code-quality configuration and design
tokens, consumed by products as a dependency instead of hand-copied config
files. **Script over agent:** the SCSS→JSON token conversion is a
deterministic script (`packages/style-dictionary/scss-to-tokens.js`), not an
LLM paste job — same input, same output, testable for parity.

`products/affiliate-hub` is the reference integration — all six packages are
wired in there. Use it as the copy-paste starting point when integrating other
products.

## The packages

| Package | What it centralizes | Consume via |
| --- | --- | --- |
| `@revvel/eslint-config` | ESLint flat config (`next/core-web-vitals` + `next/typescript`, build-output ignores) | `eslint.config.mjs` → `export default buildConfig()` |
| `@revvel/prettier-config` | Prettier formatting rules | `"prettier": "@revvel/prettier-config"` in `package.json` |
| `@revvel/stylelint-config` | Stylelint SCSS rules + **blocks new local `$` variables** | `extends: ["@revvel/stylelint-config"]` |
| `@revvel/browserslist-config` | Browser support targets | `"browserslist": ["extends @revvel/browserslist-config"]` |
| `@revvel/typescript-config` | `base.json` (strict TS) and `next.json` (Next.js apps) | `"extends": "@revvel/typescript-config/next.json"` |
| `@revvel/style-dictionary` | Design tokens (Style Dictionary JSON) + generated SCSS/CSS variables | `@use "@revvel/style-dictionary/dist/_variables.scss"` |

Each package ships its own `README.md` with install, usage, and
troubleshooting steps — read those for exact click-by-click integration.

## Plain-English quick start for a product

From inside `products/<name>/`:

1. Add the file dependencies to `package.json` `devDependencies`:

   ```json
   {
     "@revvel/eslint-config": "file:../../packages/eslint-config",
     "@revvel/prettier-config": "file:../../packages/prettier-config",
     "@revvel/stylelint-config": "file:../../packages/stylelint-config",
     "@revvel/browserslist-config": "file:../../packages/browserslist-config",
     "@revvel/typescript-config": "file:../../packages/typescript-config",
     "@revvel/style-dictionary": "file:../../packages/style-dictionary"
   }
   ```

2. Run `npm install` in the product directory.
3. Replace the local config bodies with the one-line `extends`/import shown
   in the table above.
4. Success looks like: `npm run lint` and `npm run build` finish with the
   same result as before the swap, and the product no longer contains a
   hand-maintained rules block.

## Design token workflow

1. **Never** add a new `$variable` to a product SCSS file — the shared
   Stylelint config fails the lint with a message pointing here.
2. Add the value to `packages/style-dictionary/tokens/tokens.json`
   (Style Dictionary format: `{ "value": ..., "type": ... }` leaves).
3. Run `npm run build` inside `packages/style-dictionary/` and commit the
   regenerated `dist/` files. `tests/shared-packages.test.js` fails CI if the
   committed `dist/` drifts from the token source.
4. Products import `dist/_variables.scss` (SCSS) or `dist/variables.css`
   (CSS custom properties).

### Migrating legacy SCSS variables

```bash
node packages/style-dictionary/scss-to-tokens.js products/<name>/styles/_variables.scss out.json
```

- Simple `$name: value;` declarations become `{ "name": { "value": ... } }`.
- SCSS maps and interpolation are printed as `SKIPPED` and the script exits
  non-zero — migrate those by hand; partial conversion is never silent.
- Validation contract (from the WR): the product SCSS must still build, and
  the compiled CSS before/after the swap should diff clean. The test suite
  additionally asserts a lossless JSON↔SCSS round trip.

## Validation

```bash
node --test tests/shared-packages.test.js
```

Covers: manifest validity for all six packages, config content assertions,
token build output (SCSS + CSS + flat JSON), committed-dist drift detection,
and SCSS→JSON→SCSS round-trip parity.
