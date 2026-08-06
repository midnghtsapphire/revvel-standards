#!/usr/bin/env node

/**
 * Greenfield UI Design Token Validator & Generator
 *
 * Single source of truth gate for the greenfield UI pipeline
 * (docs/GREENFIELD_UI_PIPELINE.md). Validates the root `tokens.json`
 * design-token file and, on success, can emit ready-to-consume
 * design-to-code handoff artifacts:
 *
 *   - CSS custom properties (`--color-bg-primary: #090d16;` ...)
 *   - A Tailwind `theme.extend` fragment (JSON) mapping token groups
 *     to `colors`, `spacing`, and `borderRadius`.
 *
 * Validation rules (all hard failures — CLAUDE.md gotcha #6: exit codes
 * must reflect the true postcondition, not "the tool finished running"):
 *   - File exists, parses as JSON, and is an object.
 *   - Top-level `name` and `version` are non-empty strings.
 *   - `tokens` object exists and contains the required groups:
 *     `color`, `spacing`, `radii` (each non-empty).
 *   - Every token is `{ value, type }`.
 *   - `color` tokens: type "color" and value is a 3/6/8-digit hex color.
 *   - `spacing` / `radii` tokens: type "dimension" and value is a
 *     non-negative `<number>px` (or `<number>rem`) dimension.
 *   - Token names are kebab-case (safe to embed in CSS variable names).
 *
 * Usage:
 *   node scripts/validate-design-tokens.js [path/to/tokens.json]
 *   node scripts/validate-design-tokens.js --emit-css        # CSS vars to stdout
 *   node scripts/validate-design-tokens.js --emit-tailwind   # theme fragment to stdout
 *
 * Exits 0 only when the token file is fully valid; exits 1 with every
 * violation listed otherwise. If validation "isn't passing" in CI, run the
 * script locally with the same file — the failure list is deterministic and
 * requires no network access or API keys (no OpenRouter fallback needed).
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_GROUPS = ["color", "spacing", "radii"];

// 3-digit (#abc), 6-digit (#aabbcc), or 8-digit (#aabbccdd, alpha) hex.
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Non-negative px or rem dimension, e.g. "4px", "0px", "0.5rem", "1.25rem".
const DIMENSION_RE = /^(?:\d+(?:\.\d+)?)(?:px|rem)$/;
// Kebab-case token names so they embed safely in CSS custom property names.
const TOKEN_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Expected token `type` for each group — explicit so adding a new group to
// REQUIRED_GROUPS forces a deliberate mapping choice instead of silently
// falling into dimension validation.
const TYPE_FOR_GROUP = {
  color: "color",
  spacing: "dimension",
  radii: "dimension",
};

// Tailwind `theme.extend` keys for each token group.
const TAILWIND_KEY_FOR_GROUP = {
  color: "colors",
  spacing: "spacing",
  radii: "borderRadius",
};

/**
 * Validate a parsed tokens document. Returns an array of human-readable
 * violation strings; an empty array means the document is valid.
 */
function validateTokens(doc) {
  const errors = [];

  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return ["tokens document must be a JSON object"];
  }

  if (typeof doc.name !== "string" || doc.name.trim() === "") {
    errors.push('top-level "name" must be a non-empty string');
  }
  if (typeof doc.version !== "string" || doc.version.trim() === "") {
    errors.push('top-level "version" must be a non-empty string');
  }

  const tokens = doc.tokens;
  if (tokens === null || typeof tokens !== "object" || Array.isArray(tokens)) {
    errors.push('top-level "tokens" must be an object');
    return errors;
  }

  for (const group of REQUIRED_GROUPS) {
    const groupTokens = tokens[group];
    if (groupTokens === null || typeof groupTokens !== "object" || Array.isArray(groupTokens)) {
      errors.push(`required token group "${group}" is missing or not an object`);
      continue;
    }
    const names = Object.keys(groupTokens);
    if (names.length === 0) {
      errors.push(`required token group "${group}" must not be empty`);
      continue;
    }

    for (const name of names) {
      const label = `${group}.${name}`;
      if (!TOKEN_NAME_RE.test(name)) {
        errors.push(`token "${label}" name must be kebab-case (a-z, 0-9, hyphens)`);
      }

      const token = groupTokens[name];
      if (token === null || typeof token !== "object" || Array.isArray(token)) {
        errors.push(`token "${label}" must be an object with "value" and "type"`);
        continue;
      }

      const expectedType = TYPE_FOR_GROUP[group];
      const hasValue = typeof token.value === "string" && token.value.trim() !== "";
      if (!hasValue) {
        errors.push(`token "${label}" is missing a string "value"`);
      }
      if (typeof token.type !== "string" || token.type.trim() === "") {
        errors.push(`token "${label}" is missing a string "type"`);
      } else if (token.type !== expectedType) {
        errors.push(`token "${label}" must have type "${expectedType}" (got "${token.type}")`);
      }
      if (!hasValue) {
        continue;
      }

      if (expectedType === "color") {
        if (!HEX_COLOR_RE.test(token.value)) {
          errors.push(`token "${label}" value "${token.value}" is not a valid hex color`);
        }
      } else if (!DIMENSION_RE.test(token.value)) {
        errors.push(
          `token "${label}" value "${token.value}" is not a valid px/rem dimension`
        );
      }
    }
  }

  return errors;
}

/**
 * Generate CSS custom properties from a valid tokens document.
 * Variable names are namespaced by group: `--color-bg-primary`,
 * `--spacing-md`, `--radii-lg`.
 */
function generateCssVariables(doc) {
  const lines = ["/* Generated from tokens.json — do not edit by hand. */", ":root {"];
  for (const group of REQUIRED_GROUPS) {
    for (const [name, token] of Object.entries(doc.tokens[group])) {
      lines.push(`  --${group}-${name}: ${token.value};`);
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}

/**
 * Generate a Tailwind CSS `theme.extend` fragment from a valid tokens
 * document, ready to spread into a product's `tailwind.config.ts`.
 */
function generateTailwindTheme(doc) {
  const extend = {};
  for (const group of REQUIRED_GROUPS) {
    const key = TAILWIND_KEY_FOR_GROUP[group];
    extend[key] = {};
    for (const [name, token] of Object.entries(doc.tokens[group])) {
      extend[key][name] = token.value;
    }
  }
  return { theme: { extend } };
}

function main(argv) {
  const args = argv.slice(2);
  const emitCss = args.includes("--emit-css");
  const emitTailwind = args.includes("--emit-tailwind");
  const positional = args.filter((a) => !a.startsWith("--"));
  const tokensPath = path.resolve(positional[0] || path.join(__dirname, "..", "tokens.json"));

  if (!fs.existsSync(tokensPath)) {
    console.error(`❌ Design token file not found: ${tokensPath}`);
    return 1;
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  } catch (err) {
    console.error(`❌ Design token file is not valid JSON: ${err.message}`);
    return 1;
  }

  const errors = validateTokens(doc);
  if (errors.length > 0) {
    console.error(`❌ ${tokensPath} failed design-token validation:`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    return 1;
  }

  if (emitCss) {
    process.stdout.write(generateCssVariables(doc));
  }
  if (emitTailwind) {
    process.stdout.write(JSON.stringify(generateTailwindTheme(doc), null, 2) + "\n");
  }
  if (!emitCss && !emitTailwind) {
    console.log(`✅ ${tokensPath} passed design-token validation.`);
  }
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = {
  validateTokens,
  generateCssVariables,
  generateTailwindTheme,
  main,
  REQUIRED_GROUPS,
};
