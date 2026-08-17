# @revvel/typescript-config

Shared [TypeScript](https://www.typescriptlang.org/) configurations for
Revvel products. Two presets:

- `base.json` — strict modern defaults for plain TS packages/scripts.
- `next.json` — extends `base.json` with DOM libs, JSX, and the Next.js
  language-service plugin for products under `products/`.

## Install

```bash
npm install --save-dev @revvel/typescript-config typescript
```

Inside this monorepo, reference it with a file dependency:

```json
{
  "devDependencies": {
    "@revvel/typescript-config": "file:../../packages/typescript-config"
  }
}
```

## Use

Next.js product `tsconfig.json`:

```json
{
  "extends": "@revvel/typescript-config/next.json",
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Plain TS package:

```json
{
  "extends": "@revvel/typescript-config/base.json"
}
```

## Troubleshooting

- **`File '@revvel/typescript-config/next.json' not found`** — `extends`
  resolves through Node module resolution, so the package must be installed
  in the product's `node_modules`. Check `npm ls @revvel/typescript-config`.
- **Project-specific keys** (`paths`, `include`, `exclude`) stay in the
  product tsconfig; only compiler defaults are shared.
