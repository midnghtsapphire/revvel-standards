# @revvel/stylelint-config

Shared [Stylelint](https://stylelint.io/) configuration for Revvel products.
Extends `stylelint-config-standard-scss`, allows Tailwind/Next.js at-rules,
and **blocks new local SCSS `$` variables** so all design values flow through
[`@revvel/style-dictionary`](../style-dictionary/README.md).

## Install

```bash
npm install --save-dev @revvel/stylelint-config stylelint stylelint-config-standard-scss
```

Inside this monorepo, reference it with a file dependency:

```json
{
  "devDependencies": {
    "@revvel/stylelint-config": "file:../../packages/stylelint-config"
  }
}
```

## Use

`stylelint.config.js` (or the `stylelint` key in `package.json`):

```js
module.exports = {
  extends: ["@revvel/stylelint-config"],
};
```

## Troubleshooting

- **`scss/dollar-variable-pattern` errors on a new variable** — that is the
  quality gate working. Add the value as a token under
  `packages/style-dictionary/tokens/` and consume the generated
  `_variables.scss` instead of declaring a local variable.
- **`Could not find "stylelint-config-standard-scss"`** — it is a peer
  dependency; install it in the product directory.
