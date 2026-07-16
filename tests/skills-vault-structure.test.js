"use strict";

// Guards the skills-vault convention from skills/README.md: every skill folder
// must ship BOTH SKILL.md and <skill-name>.skill.yml. Issue #15490 was filed
// because skills/mabl-expert/ landed without its .skill.yml — this test locks
// the fix in place and stops any NEW skill from repeating the mistake.
//
// Pre-existing legacy folders that still lack a .skill.yml are frozen in
// LEGACY_MISSING_SKILL_YML below. The list may only shrink (backfill a
// .skill.yml, then delete the entry) — never grow.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");

const SKILLS_DIR = path.resolve(__dirname, "..", "skills");

// Frozen baseline of skills that predate enforcement. Do NOT add to this list;
// new skills must include <skill-name>.skill.yml from their first commit.
const LEGACY_MISSING_SKILL_YML = new Set([
  "49agents",
  "auto-documentation",
  "code-review",
  "concurrent-development",
  "dare-log",
  "dragnet-scaffold",
  "error-reporting",
  "figma-pdf",
  "fork-audit-bot",
  "mvi-contract",
  "noimosai",
  "patch-agent",
  "product-pipeline",
  "prompt-routing",
  "roo-cline",
  "self-healer",
  "seo-metadata",
  "shift-testing",
  "system-state",
  "tax-legal-agent",
  "ui-creation-engine",
  "usda-loan-agent",
  "vault-agent",
]);

function skillFolders() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(SKILLS_DIR, name, "SKILL.md")));
}

test("mabl-expert has both required files (regression for issue #15490)", () => {
  const dir = path.join(SKILLS_DIR, "mabl-expert");
  assert.ok(fs.existsSync(path.join(dir, "SKILL.md")), "SKILL.md missing");
  assert.ok(
    fs.existsSync(path.join(dir, "mabl-expert.skill.yml")),
    "mabl-expert.skill.yml missing — required by skills/README.md",
  );
});

test("mabl-expert.skill.yml parses and carries core metadata", () => {
  const doc = yaml.parse(
    fs.readFileSync(
      path.join(SKILLS_DIR, "mabl-expert", "mabl-expert.skill.yml"),
      "utf8",
    ),
  );
  assert.equal(doc.name, "mabl-expert");
  assert.ok(doc.version, "version missing");
  assert.ok(doc.description, "description missing");
  assert.ok(
    Array.isArray(doc.triggers) && doc.triggers.length > 0,
    "triggers missing",
  );
});

test("mabl-expert is registered in SKILLS_INDEX.yml and REGISTRY.md", () => {
  const index = fs.readFileSync(
    path.join(SKILLS_DIR, "SKILLS_INDEX.yml"),
    "utf8",
  );
  const registry = fs.readFileSync(
    path.join(SKILLS_DIR, "REGISTRY.md"),
    "utf8",
  );
  assert.ok(
    index.includes("skills/mabl-expert/"),
    "SKILLS_INDEX.yml entry missing",
  );
  assert.ok(registry.includes("mabl-expert"), "REGISTRY.md entry missing");
});

test("every non-legacy skill folder ships its <name>.skill.yml", () => {
  const missing = skillFolders().filter(
    (name) =>
      !LEGACY_MISSING_SKILL_YML.has(name) &&
      !fs.existsSync(path.join(SKILLS_DIR, name, `${name}.skill.yml`)),
  );
  assert.deepEqual(
    missing,
    [],
    `Skill folder(s) missing required <name>.skill.yml (see skills/README.md): ${missing.join(", ")}`,
  );
});

test("legacy allowlist only shrinks — entries with a backfilled .skill.yml must be removed", () => {
  const stale = [...LEGACY_MISSING_SKILL_YML].filter((name) =>
    fs.existsSync(path.join(SKILLS_DIR, name, `${name}.skill.yml`)),
  );
  assert.deepEqual(
    stale,
    [],
    `These skills now have a .skill.yml — remove them from LEGACY_MISSING_SKILL_YML: ${stale.join(", ")}`,
  );
});
