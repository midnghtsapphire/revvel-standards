# @revvel/prettier-config

Shared [Prettier](https://prettier.io/) configuration for Revvel products.
Matches the double-quote / semicolon / 2-space style already used across the
repository's scripts and tests.

## Install

```bash
npm install --save-dev @revvel/prettier-config prettier
```

Inside this monorepo, reference it with a file dependency:

```json
{
  "devDependencies": {
    "@revvel/prettier-config": "file:../../packages/prettier-config"
  }
}
```

## Use

Point your project at the shared config from `package.json` — no local
`.prettierrc` needed:

```json
{
  "prettier": "@revvel/prettier-config"
}
```

## Troubleshooting

- **Local overrides needed?** Create a `.prettierrc.js` that spreads the
  shared config, then override only the keys you must change:

  ```js
  module.exports = {
    ...require("@revvel/prettier-config"),
    printWidth: 80,
  };
  ```
