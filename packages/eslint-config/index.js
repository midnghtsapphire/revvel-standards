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
 *   import revvel from "@revvel/eslint-config";
 *   export default revvel;
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
 */
function buildConfig() {
  // eslint-disable-next-line global-require -- lazy: peer dep lives in the consuming project
  const { FlatCompat } = require("@eslint/eslintrc");
  const compat = new FlatCompat({ baseDirectory: process.cwd() });
  return [
    { ignores: IGNORE_PATTERNS },
    ...compat.extends("next/core-web-vitals", "next/typescript"),
  ];
}

module.exports = { buildConfig, IGNORE_PATTERNS };
