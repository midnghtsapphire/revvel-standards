# Ship-to-Market Tooling Standardization — Research & Plan

**Repository:** midnghtsapphire/revvel-standards
**Date:** 2026-05-21
**Status:** 🟡 Research complete — implementation pending approval
**Trigger:** Readiness detector finding — *"No manifest found, No test runner, No build script."*

---

## TL;DR

The repo **is** working, but on hand-rolled tooling that a generic readiness
detector does not recognize and that **cannot enforce** the coverage gate the
PR-review automation advertises consistently with the proposed tooling (80%
lines/functions, 75% branches; add a statements threshold explicitly if that is
intended to be enforced). For a ship-to-market (S2M) repo the fix is to
**standardize on built-in Node tooling** — keep dependencies minimal:

- **Test runner:** `node --test` (built-in, zero deps) — replaces the brittle `&&` chain.
- **Coverage gate:** `c8` (one dev dep) enforcing 80% lines/functions and 75% branches in CI; include statements only if a statements threshold is configured.
- **Manifest:** declare root `workspaces`, pin `engines.node`, set `packageManager` + `"type"`.
- **Build/typecheck:** `tsc --checkJs --noEmit` (typecheck-as-build via JSDoc) — no bundler at root.
- **CI:** run the test+coverage+typecheck gate in **GitHub Actions** too (today only CircleCI runs tests) and mark them required.

---

## How was it working without it

It was working because the finding is a **false negative on form, true on substance**:

- A **manifest does exist** — root `package.json` (`name: revvel-standards`,
  `version: 2.0.0`, `private: true`). The detector likely flags it because the
  manifest is *bare*: `engines: {}`, `dependencies: {}`, no `packageManager`,
  no `workspaces`, `type` unset.
- A **test runner exists** — but it is hand-rolled. `npm test` chains ~35
  plain `#!/usr/bin/env node` scripts with `&&`:
  `node tests/a.test.js && node tests/b.test.js && …`. Each file defines its own
  `assertEqual`/`assertTrue` helpers and counts pass/fail itself. No framework
  is installed, so nothing advertises a "test runner" to a detector.
- **No build script** — and for a repo that is mostly Markdown, GitHub Actions
  workflows, and static HTML, there has historically been nothing to build, so
  the absence never hurt.

So the repo shipped on convention, not configuration. The real costs of that:

1. **Abort-on-first-failure.** The `&&` chain stops at the first failing file —
   later tests never run, so one break masks the rest.
2. **No coverage = an unenforceable gate.** The "Ready for Review" automation
   lists an 80/75 coverage gate, but with no coverage tooling it is decorative.
3. **No typecheck.** Pure-JS scripts with no `tsc --checkJs` catch type defects
   only at runtime.
4. **CI blind spot.** `npm test` runs in `.circleci/config.yml` but **not** in
   GitHub Actions, so PR status checks don't actually gate on the unit tests.
5. **Monorepo is implicit.** 15 `package.json` files exist (root, plus
   `products/*`, `mcp-servers/*`, and others) but the root declares no
   `workspaces`, so there is no single install / fan-out and detectors see an
   unconfigured root.

---

## Current-state audit

| Area | Today | Gap for S2M |
| --- | --- | --- |
| Manifest | Root `package.json`, bare | `engines.node` empty, no `packageManager`, no `workspaces`, `type` unset |
| Packages | 15 manifests (monorepo in fact) | Root doesn't declare workspaces |
| Test runner | ~35 hand-rolled node scripts via `&&` | No framework; aborts on first failure |
| Coverage | None | 80/75 gate advertised but unenforceable |
| Build / typecheck | None | No `tsc --checkJs`, no build for shippable sub-products |
| Lint / format | `markdownlint-cli2` (md only) | No ESLint/Prettier/Biome for `scripts/` JS |
| CI | Tests in CircleCI only | GitHub Actions doesn't run `npm test`; not a required check |
| Runtime | Node 22.22 / npm 10.9 | Not pinned anywhere |

---

## Recommended stack (one pick per area)

| Area | Recommendation | Main trade-off |
| --- | --- | --- |
| Test runner | **`node --test`** (built-in) | No snapshots/polished watch vs Vitest; fine for assert-style tests |
| Coverage | **`c8`** wrapping `node --test`, threshold gate in CI | One dev dep, but stable today (native coverage is still experimental) |
| Monorepo manifest | **Root npm `workspaces`** (stay on npm) | No remote task cache like Turborepo; unneeded at this size |
| Version pinning | `engines.node: ">=22 <25"` + `packageManager: "npm@10.9.x"` (Corepack) | Minor CI friction enforcing Corepack |
| Build/typecheck | **`tsc --checkJs --noEmit`** (JSDoc); `esbuild`/`tsup` only for shippable sub-products | Less safety than full TS migration |
| CI gate | engines + `npm ci` + lint + typecheck + test+coverage as required GH checks | Coverage gate needs `c8` today |

**Principle:** this is a docs + scripts + products standards repo, so optimize
for **minimal dependencies and zero per-developer config**, not app-grade DX.
That tips nearly every choice toward built-in Node tooling.

### Test-runner BOM

| Tool | Deps added | Coverage | TS support | Speed | Verdict |
| --- | --- | --- | --- | --- | --- |
| `node:test` | **0** (built-in) | Built-in but **experimental** | Native type-stripping (22.6+/24) | Fast, parallel | **Best fit** — zero footprint, stable runner |
| `node:test` + `c8` | **1** (`c8`) | Mature, lcov + threshold flags | Same | Fast | **Recommended for the gate** |
| Vitest | meta + many transitive | v8/istanbul, thresholds built in | Native (esbuild) | Fastest watch | Overkill unless products become apps |
| Jest | Many transitive | istanbul, thresholds built in | babel/ts-jest | Slowest | Avoid; ESM still experimental in 2026 |

---

## Why these choices (research summary)

- **Runner:** `node --test` is **Stability 2 (Stable)** since Node 20, ships
  with Node 22, adds zero dependencies, runs files in parallel, and has
  `spec`/`tap`/`junit` reporters. Vitest/Jest are better *application* runners
  (snapshots, fast watch, native TS) but pull large dependency trees a minimal
  standards repo is trying to avoid. Jest's ESM support is still flagged
  experimental in 2026 and fights the CommonJS-default setup.
- **Coverage:** Node's own threshold flags (`--test-coverage-lines/-branches/-functions`,
  added in **22.8.0**) exist and fail CI on a miss, **but the feature is still
  Stability 1 (Experimental) through Node 24+** and has no "statements" metric.
  For a *credible, stable* gate today, `c8` (same V8 engine Vitest's default
  provider uses) is the pragmatic pick — one dev dep, lcov output, per-metric
  thresholds. Revisit native coverage once it loses the experimental flag.
- **Workspaces:** declaring `workspaces` is what makes the "unconfigured root"
  finding go away and gives single-install + `--workspaces` fan-out. At ~15
  mostly-docs/scripts packages there is no heavy build graph, so **npm
  workspaces** is sufficient — Turborepo/Nx (task caching, affected-graph) and a
  pnpm migration are not justified yet; reserve them for when build/test time
  actually hurts.
- **Build:** an S2M docs+scripts repo doesn't need a root bundler. The strongest
  answer to "no build script" is **typecheck-as-build**: combining `// @ts-check`,
  JSDoc, and `tsc --checkJs --noEmit` gives real type checking in CI with no
  emitted output and no runtime changes. Give a real `tsup`/`esbuild` build only to
  genuinely shippable sub-products (e.g. a published MCP server).

---

## Target configuration (concrete)

Root `package.json` (additive):

```jsonc
{
  "private": true,
  "type": "commonjs",
  "packageManager": "npm@10.9.7",
  "engines": { "node": ">=22 <25" },
  "workspaces": ["products/*", "mcp-servers/*"],
  "scripts": {
    "test": "node --test tests/",
    "test:cov": "c8 --lines 80 --functions 80 --branches 75 --check-coverage node --test tests/",
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck",
    "test:workspaces": "npm test --workspaces --if-present"
  },
  "devDependencies": { "c8": "^10", "typescript": "^5" }
}
```

`tsconfig.json` (typecheck-only):

```jsonc
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "module": "nodenext",
    "target": "es2023"
  },
  "include": ["scripts/**/*.js", "tests/**/*.js"]
}
```

---

## Migration plan (lowest-risk, ordered)

1. **Confirm discovery works as-is.** `node --test` auto-discovers `**/*.test.js`
   and treats a plain script as a test that **passes on clean exit, fails on
   uncaught exception / non-zero exit**. The existing assert files that `throw`
   on failure are picked up unchanged — no rewrite needed.
2. **Replace the `&&` chain** with `"test": "node --test tests/"`. Now *all*
   files run (no abort-on-first-failure) with proper aggregation + a real reporter.
3. **Check for ordering/global side-effects.** The old chain ran files in one
   process sequentially; `node --test` runs each file in its own process in
   parallel. Isolate any test that relied on shared state (rare for assert scripts).
4. **Add the coverage gate** once green: `c8 … --check-coverage node --test tests/`.
5. **Harden the manifest** — `workspaces`, `engines.node`, `packageManager`, `"type"`.
6. **Add `typecheck`/`build`** — `tsc --noEmit` with `// @ts-check`/JSDoc.
7. **Mirror the gate into GitHub Actions** (`npm ci && npm run test:cov && npm run typecheck`)
   and set lint/typecheck/test as **required status checks** on the protected branch.

Steps 1–2 are nearly risk-free and immediately satisfy "test runner found" +
"all tests run." Steps 4–7 layer the gates on top.

---

## Ship-to-market readiness checklist (2026)

- [ ] Pinned runtime — `engines.node` + `.nvmrc` + `packageManager` (Corepack).
- [ ] Lockfile policy — commit `package-lock.json`; CI uses `npm ci`; fail on drift.
- [ ] Lint + format — keep `markdownlint`; add ESLint + Prettier (or Biome) for JS.
- [ ] Typecheck — `tsc --checkJs --noEmit`.
- [ ] Test + coverage gate — `node --test` + `c8` thresholds.
- [ ] CI required checks — run the gate in GitHub Actions, not only CircleCI.
- [ ] Supply chain — CycloneDX SBOM per release; `npm publish --provenance` for published sub-products.

---

## Sources

- Node.js — Test runner API (discovery, plain-script semantics, stability, reporters): <https://nodejs.org/api/test.html>
- Node.js v22.x — Test runner docs: <https://nodejs.org/docs/latest-v22.x/api/test.html>
- Node.js Learn — Collecting code coverage (flags, thresholds, exit code, experimental status): <https://nodejs.org/learn/test-runner/collecting-code-coverage>
- Node.js 22.8.0 release (threshold flags added): <https://nodejs.org/en/blog/release/v22.8.0>
- nodejs/node#54812 — coverage threshold maturity caveat: <https://github.com/nodejs/node/issues/54812>
- Node.js 24.0.0 release: <https://nodejs.org/en/blog/release/v24.0.0>
- c8 coverage tool: <https://github.com/bcoe/c8>
- Vitest — Comparisons with other runners: <https://vitest.dev/guide/comparisons.html>
- npm Docs — Workspaces (`--workspaces`, `--if-present`): <https://docs.npmjs.com/cli/v11/using-npm/workspaces/>
- Node.js — Corepack (`packageManager` field): <https://github.com/nodejs/corepack>
- Nx — Nx vs Turborepo: <https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo>
- TypeScript Handbook — JS projects (`checkJs`, `// @ts-check`, JSDoc): <https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html>
- Unit 42 — npm supply-chain mitigations (`npm ci`, lockfile, provenance): <https://unit42.paloaltonetworks.com/monitoring-npm-supply-chain-attacks/>

**Caveats:** Node's native coverage is *usable but still experimental* through
Node 24+ — hence `c8` for a hard gate; re-verify against the API docs for the
Node LTS you standardize on. Vitest/Jest speed claims come from secondary 2026
benchmarks (directionally reliable, exact multipliers vary).
