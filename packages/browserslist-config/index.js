/**
 * @revvel/browserslist-config
 *
 * Shared Browserslist targets for Revvel products.
 *
 * Why these targets: our products are modern Next.js apps sold to current
 * browsers; supporting dead or unmaintained browsers costs transpile bytes
 * with zero revenue upside. This mirrors Next.js's own modern-browser floor.
 *
 * Usage in a product package.json:
 *   "browserslist": ["extends @revvel/browserslist-config"]
 *
 * Fallback / what to check if it fails: Browserslist resolves the extends
 * package from the consuming project, so the product must list
 * @revvel/browserslist-config in its devDependencies. If resolution fails,
 * verify the dependency is installed (`npm ls @revvel/browserslist-config`).
 */
"use strict";

module.exports = [
  "defaults",
  "not dead",
  "not op_mini all",
  "maintained node versions",
];
