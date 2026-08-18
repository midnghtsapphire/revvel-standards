/**
 * @revvel/stylelint-config
 *
 * Shared Stylelint config for Revvel products.
 *
 * Why these rules: products consume design tokens from
 * @revvel/style-dictionary instead of defining local SCSS variables, so this
 * config actively blocks new `$`-variable declarations in product stylesheets
 * (`scss/dollar-variable-pattern` with an intentionally unmatchable pattern).
 * New tokens go into packages/style-dictionary/tokens/, never into a product.
 *
 * Fallback / what to check if it fails: `stylelint-config-standard-scss` is a
 * peer dependency resolved from the consuming project. If Stylelint errors
 * with "Could not find config", install it in the product:
 *   npm install --save-dev stylelint stylelint-config-standard-scss
 */
"use strict";

module.exports = {
  extends: ["stylelint-config-standard-scss"],
  rules: {
    // Tailwind / Next.js at-rules that standard configs flag.
    "at-rule-no-unknown": null,
    "scss/at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["tailwind", "apply", "layer", "config", "theme"],
      },
    ],
    // Block new local SCSS variables: tokens come from @revvel/style-dictionary.
    // The pattern requires an impossible name, so every new $variable fails
    // with this message and points authors at the shared token pipeline.
    "scss/dollar-variable-pattern": [
      "^DO-NOT-DEFINE-LOCAL-VARIABLES$",
      {
        message:
          "Local SCSS variables are retired. Add tokens to @revvel/style-dictionary (packages/style-dictionary/tokens/) instead.",
      },
    ],
  },
};
