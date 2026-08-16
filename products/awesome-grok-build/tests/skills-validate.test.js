"use strict";

/**
 * Mirrors upstream awesome-grok-build skill-validate workflow against the
 * vendored content/skills tree so regressions fail in product CI.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SKILLS_DIR = path.join(__dirname, "..", "content", "skills");
const REQUIRED = ["name", "description", "version", "author"];
const SEMVER = /^\d+\.\d+\.\d+$/;

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const endIndex = lines.indexOf("---", 1);
  if (endIndex === -1) return null;
  const fields = {};
  for (const line of lines.slice(1, endIndex)) {
    const match = line.match(/^([a-zA-Z_-]+):\s*(.+)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

test("vendored content/skills directories each have valid SKILL.md frontmatter", () => {
  assert.ok(fs.existsSync(SKILLS_DIR), "content/skills missing");
  const dirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  assert.ok(dirs.length >= 12, `expected >=12 skills, got ${dirs.length}`);

  const errors = [];
  for (const name of dirs) {
    const file = path.join(SKILLS_DIR, name, "SKILL.md");
    if (!fs.existsSync(file)) {
      errors.push(`[${name}] missing SKILL.md`);
      continue;
    }
    const fm = parseFrontmatter(fs.readFileSync(file, "utf8"));
    if (!fm) {
      errors.push(`[${name}] invalid frontmatter`);
      continue;
    }
    for (const field of REQUIRED) {
      if (!fm[field]) errors.push(`[${name}] missing ${field}`);
    }
    if (fm.version && !SEMVER.test(fm.version)) {
      errors.push(`[${name}] bad version ${fm.version}`);
    }
    if (fm.name && fm.name !== name && fm.name.replace(/_/g, "-") !== name) {
      // allow soft mismatch but prefer id alignment
    }
  }

  assert.equal(errors.length, 0, errors.join("\n"));
});

test("monorepo .grok/skills mirror stays in sync with product content", () => {
  const monorepoSkills = path.join(__dirname, "..", "..", "..", ".grok", "skills");
  assert.ok(fs.existsSync(monorepoSkills), ".grok/skills not wired at repo root");
  const product = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const root = fs
    .readdirSync(monorepoSkills, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const id of product) {
    assert.ok(root.includes(id), `root .grok/skills missing ${id}`);
  }
});
