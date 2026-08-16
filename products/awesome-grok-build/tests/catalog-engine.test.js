"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const engine = require(path.join(__dirname, "..", "lib", "catalog-engine.js"));

test("catalog vendors at least 12 upstream skills", () => {
  const catalog = engine.getCatalog();
  assert.ok(catalog.skillCount >= 12);
  assert.match(catalog.source, /DominikTobureto\/awesome-grok-build/);
  assert.equal(catalog.sourceLicense, "MIT");
});

test("every skill has required frontmatter-shaped fields", () => {
  const skills = engine.listSkills();
  const result = engine.validateSkillRecords(skills);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.passed, skills.length);
});

test("searchSkills filters by query and category", () => {
  const security = engine.searchSkills({ query: "security", category: "all" });
  assert.ok(security.some((s) => s.id === "security-audit"));

  const empty = engine.searchSkills({ query: "zzznomatchzzz" });
  assert.equal(empty.length, 0);

  const byCat = engine.searchSkills({ category: "testing" });
  assert.ok(byCat.every((s) => s.category === "testing"));
});

test("getSkillById is case-insensitive and null-safe", () => {
  assert.equal(engine.getSkillById(""), null);
  assert.equal(engine.getSkillById(null), null);
  const skill = engine.getSkillById("Repo-Health-Check");
  assert.ok(skill);
  assert.equal(skill.id, "repo-health-check");
});

test("stack presets produce install plans with bash and powershell", () => {
  const presets = engine.listStackPresets();
  assert.ok(presets.length >= 5);

  const plan = engine.buildInstallPlan({
    stack: "nextjs",
    extraSkillIds: ["hooksmith", "does-not-exist"],
    target: "/tmp/demo-app",
  });

  assert.equal(plan.stack.id, "nextjs");
  assert.ok(plan.skillCount >= 6);
  assert.ok(plan.skills.some((s) => s.id === "nextjs-fullstack"));
  assert.ok(plan.skills.some((s) => s.id === "hooksmith"));
  assert.deepEqual(plan.missing, ["does-not-exist"]);
  assert.match(plan.bash, /mkdir -p/);
  assert.match(plan.bash, /\/tmp\/demo-app/);
  assert.match(plan.powershell, /Copy-Item/);
  assert.match(plan.markdown, /Grok Build install plan/);
  assert.match(plan.grokPrompt, /repo-health-check|nextjs/);
});

test("python and security presets pick distinct templates", () => {
  const py = engine.buildInstallPlan({ stack: "python" });
  const sec = engine.buildInstallPlan({ stack: "security" });
  assert.equal(py.stack.grokignore, "grokignore.python");
  assert.equal(sec.stack.agentsTemplate, "AGENTS.security.md");
  assert.ok(sec.skills.some((s) => s.id === "security-audit"));
});

test("monetization path and resources are documented for WR research bundle", () => {
  const mon = engine.getMonetizationPath();
  assert.equal(mon.model, "freemium-saas");
  assert.ok(mon.keywords.includes("grok build skills"));
  assert.ok(mon.free.length >= 2);
  assert.ok(mon.pro.length >= 2);

  const resources = engine.getOfficialResources();
  assert.ok(resources.some((r) => /x\.ai\/cli/.test(r.url)));
  assert.ok(resources.some((r) => /awesome-grok-build/.test(r.url)));
});
