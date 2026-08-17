#!/usr/bin/env node
/**
 * @revvel/style-dictionary — SCSS variable -> JSON token converter.
 *
 * Automates the migration described in the WR: instead of pasting SCSS
 * variables into an LLM ("Convert this list of SCSS variables into JSON where
 * the SCSS variable name is the key and the value is nested in an object with
 * a property named 'value'"), run this deterministic script. Deterministic
 * beats an LLM here: same input, same output, no hallucinated values, and it
 * is directly testable for round-trip parity (JSON -> SCSS must reproduce the
 * original declarations).
 *
 * Usage:
 *   node scss-to-tokens.js path/to/_variables.scss [output.json]
 *
 * Output shape (Style Dictionary "value" format):
 *   { "brand-pink": { "value": "#ec4899" }, ... }
 *
 * Fallback / what to check if it fails: only simple `$name: value;`
 * declarations are converted. Maps (`$x: (a: 1)`), multi-line values, and
 * interpolation are reported to stderr and skipped so a human can migrate
 * them intentionally — silent partial conversion is worse than an error.
 */
"use strict";

const fs = require("node:fs");

// Matches `$name: value;` with optional `!default`, ignoring commented lines.
const DECLARATION = /^\s*\$([\w-]+)\s*:\s*([^;]+?)\s*(!default)?\s*;\s*(?:\/\/.*)?$/;

/**
 * Parse SCSS source into `{ tokens, skipped }`.
 * `tokens` is `{ name: { value } }`; `skipped` lists lines that look like
 * variable declarations but could not be converted safely.
 */
function scssToTokens(source) {
  const tokens = {};
  const skipped = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed.startsWith("$")) continue;
    const match = DECLARATION.exec(line);
    if (!match) {
      skipped.push({ line: i + 1, text: trimmed });
      continue;
    }
    const [, name, rawValue] = match;
    const value = rawValue.trim();
    // SCSS maps, interpolation, and variable references need a human decision.
    if (value.startsWith("(") || value.includes("#{") || /\$[\w-]+/.test(value)) {
      skipped.push({ line: i + 1, text: trimmed });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(tokens, name)) {
      skipped.push({ line: i + 1, text: trimmed });
      continue;
    }
    tokens[name] = { value };
  }
  return { tokens, skipped };
}

/** Render tokens back to SCSS declarations (used for round-trip validation). */
function tokensToScss(tokens) {
  return `${Object.entries(tokens)
    .map(([name, def]) => `$${name}: ${def.value};`)
    .join("\n")}\n`;
}

module.exports = { scssToTokens, tokensToScss };

if (require.main === module) {
  const [, , input, output] = process.argv;
  if (!input) {
    console.error("Usage: node scss-to-tokens.js <input.scss> [output.json]");
    process.exit(1);
  }
  const { tokens, skipped } = scssToTokens(fs.readFileSync(input, "utf8"));
  for (const s of skipped) {
    console.error(`SKIPPED (needs manual migration) line ${s.line}: ${s.text}`);
  }
  const json = `${JSON.stringify(tokens, null, 2)}\n`;
  if (output) {
    fs.writeFileSync(output, json);
    console.log(`Wrote ${Object.keys(tokens).length} tokens to ${output}`);
  } else {
    process.stdout.write(json);
  }
  // Exit non-zero when anything was skipped: the postcondition ("every
  // variable converted") does not hold, and CI must see that.
  if (skipped.length > 0) process.exit(2);
}
