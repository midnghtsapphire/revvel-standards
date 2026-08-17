/**
 * @revvel/eslint-config
 *
 * Shared ESLint flat config for Revvel Next.js/TypeScript products.
 *
 * Why this shape: every product under products/ is a Next.js app whose local
 * config was a copy-pasted `extends: ["next/core-web-vitals", "next/typescript"]`.
 * Centralising that here means a rules change lands once and ships to every
 * project as a dependency bump instead of N hand edits.
 *
 * Usage (eslint.config.mjs in a product):
 *
 *   import { buildConfig } from "@revvel/eslint-config";
 *   export default buildConfig();
 *
 * Fallback / what to check if it fails: this package resolves
 * `eslint-config-next` from the CONSUMING project (peer dependency), so if
 * ESLint errors with "Cannot find module 'eslint-config-next'", run
 * `npm install --save-dev eslint-config-next` inside the product first.
 */
"use strict";

const IGNORE_PATTERNS = [
  "node_modules/**",
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
];

/**
 * Build the flat config array. `eslint-config-next` is required lazily so the
 * package manifest itself can be validated (tests, audits) in environments
 * where the peer dependency is not installed.
 *
 * Version-gating rationale:
 *   - eslint-config-next ≤ 15  exports a legacy eslintrc object; FlatCompat
 *     adapts it to the flat-config shape.
 *   - eslint-config-next ≥ 16  exports flat-config arrays directly from
 *     `core-web-vitals` and `typescript` entry points; passing those through
 *     FlatCompat fails because FlatCompat expects eslintrc objects, not arrays.
 *
 * Detection: require `next/core-web-vitals` and check whether the export is an
 * Array.  If it is, spread it directly (Next 16+); otherwise fall back to the
 * FlatCompat adapter (Next 15).
 *
 * Fallback / what to check if it fails: ensure `eslint-config-next` is
 * installed as a devDependency in the consuming product (`npm install --save-dev
 * eslint-config-next`).  If ESLint still errors on the config shape, check
 * which major you're on with `npm ls eslint-config-next`.
 */
function buildConfig() {
  // eslint-disable-next-line global-require -- lazy: peer dep lives in the consuming project
  const coreWebVitals = require("eslint-config-next/core-web-vitals");

  // eslint-config-next ≥ 16: entry points export flat-config arrays directly.
  if (Array.isArray(coreWebVitals)) {
    // eslint-disable-next-line global-require -- lazy: peer dep lives in the consuming project
    const nextTypescript = require("eslint-config-next/typescript");
    if (!Array.isArray(nextTypescript)) {
      throw new Error(
        "@revvel/eslint-config: `eslint-config-next/typescript` did not export a " +
          "flat-config array. This is unexpected for eslint-config-next ≥ 16. " +
          "Check your installed version with `npm ls eslint-config-next`."
      );
    }
    return [
      { ignores: IGNORE_PATTERNS },
      ...coreWebVitals,
      ...nextTypescript,
    ];
  }

  // eslint-config-next ≤ 15: legacy eslintrc format — adapt via FlatCompat.
  // eslint-disable-next-line global-require -- lazy: peer dep lives in the consuming project
  const { FlatCompat } = require("@eslint/eslintrc");
  const compat = new FlatCompat({ baseDirectory: process.cwd() });
  return [
    { ignores: IGNORE_PATTERNS },
    ...compat.extends("next/core-web-vitals", "next/typescript"),
  ];
}

module.exports = { buildConfig, IGNORE_PATTERNS };
