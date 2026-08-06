# @revvel/browserslist-config

Shared [Browserslist](https://browsersl.ist/) targets for Revvel products.
One place to change browser support for every product's transpile/autoprefix
pipeline.

## Install

```bash
npm install --save-dev @revvel/browserslist-config
```

Inside this monorepo, reference it with a file dependency:

```json
{
  "devDependencies": {
    "@revvel/browserslist-config": "file:../../packages/browserslist-config"
  }
}
```

## Use

`package.json`:

```json
{
  "browserslist": ["extends @revvel/browserslist-config"]
}
```

## Troubleshooting

- **`Cannot resolve @revvel/browserslist-config`** — Browserslist resolves
  the `extends` package from the consuming project; make sure it is listed in
  the product's `devDependencies` and installed.
