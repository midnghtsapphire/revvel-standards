# @revvel/eslint-config

Shared ESLint flat config for Revvel Next.js/TypeScript products. Extends
`next/core-web-vitals` and `next/typescript` and ignores build output
directories, so individual products no longer carry a hand-copied
`eslint.config.mjs` body.

## Install

```bash
npm install --save-dev @revvel/eslint-config eslint eslint-config-next
```

Inside this monorepo, reference it with a file dependency:

```json
{
  "devDependencies": {
    "@revvel/eslint-config": "file:../../packages/eslint-config"
  }
}
```

## Use

`eslint.config.mjs`:

```js
import { buildConfig } from "@revvel/eslint-config";

export default buildConfig();
```

## Troubleshooting

- **`Cannot find module 'eslint-config-next'`** — the Next.js config is a
  peer dependency resolved from your project. Run
  `npm install --save-dev eslint-config-next` in the product directory.
- **Rules firing on `.next/` output** — the shared config already ignores
  `.next/`, `out/`, `build/`, and `node_modules/`; make sure you are not
  passing explicit file globs that override the `ignores` entry.
