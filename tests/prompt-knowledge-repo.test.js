#!/usr/bin/env node
"use strict";

/**
 * Tests for scripts/prompt-knowledge-repo.js and the prompts/ knowledge tree.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "prompt-knowledge-repo.js");
const {
  validateCatalog,
  loadCatalog,
  slugify,
  parseArgs,
  REQUIRED_INTERNAL_PROMPTS,
} = require(SCRIPT);

function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    cwd: ROOT,
    ...opts,
  });
}

describe("prompt-knowledge-repo", () => {
  it("slugify normalizes ids", () => {
    assert.equal(slugify("concept.Hello World"), "hello-world");
    assert.equal(slugify("combo.GitHub_Request"), "github-request");
  });

  it("parseArgs handles flags and positionals", () => {
    const a = parseArgs([
      "add-concept",
      "--id",
      "concept.x",
      "--name",
      "X",
      "--summary",
      "S",
    ]);
    assert.equal(a._[0], "add-concept");
    assert.equal(a.id, "concept.x");
    assert.equal(a.name, "X");
    assert.equal(a.summary, "S");
  });

  it("catalog loads and validates with zero errors", () => {
    const catalog = loadCatalog();
    const errors = validateCatalog(catalog);
    assert.deepEqual(errors, []);
  });

  it("required internal system prompts exist and are non-trivial", () => {
    for (const rel of REQUIRED_INTERNAL_PROMPTS) {
      const abs = path.join(ROOT, rel);
      assert.ok(fs.existsSync(abs), `missing ${rel}`);
      const body = fs.readFileSync(abs, "utf8");
      assert.ok(body.length > 200, `${rel} too short`);
      assert.match(body, /Hard rules|Mandate|SYSTEM/i);
    }
  });

  it("external INDEX is unfiltered and non-empty", () => {
    const idx = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "prompts/external/system_prompts_leaks/INDEX.json"),
        "utf8"
      )
    );
    assert.ok(Array.isArray(idx.files));
    assert.ok(idx.files.length > 50, "expected full upstream inventory");
    assert.ok(idx.vendors);
    assert.ok(Object.keys(idx.vendors).length >= 5);
    assert.match(String(idx.source.policy), /no-censor/i);
    // sample required vendor families from upstream
    const vendors = Object.keys(idx.vendors);
    assert.ok(vendors.includes("Anthropic") || vendors.includes("OpenAI"));
  });

  it("cli validate exits 0", () => {
    const res = runCli(["validate"]);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /validate OK/);
  });

  it("cli list exits 0 and shows system prompts", () => {
    const res = runCli(["list"]);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /sp\.thought-process/);
    assert.match(res.stdout, /sp\.github-requests/);
  });

  it("export-notebooklm writes SOURCES.json with external urls", () => {
    const res = runCli(["export-notebooklm"]);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const sources = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "docs/notebooklm/sources/SOURCES.json"),
        "utf8"
      )
    );
    assert.equal(sources.policy.censor, false);
    assert.ok(sources.sources.length > 50);
    assert.ok(sources.sources.some((s) => s.kind === "external-url"));
    assert.ok(
      sources.sources.some((s) => s.id === "sp.github-requests"),
      "internal prompts included"
    );
    assert.ok(fs.existsSync(path.join(ROOT, "docs/notebooklm/exports/PACK_MANIFEST.md")));
  });

  it("add-concept / add-llm-combo / add-folder / add-metadata round-trip in temp copy logic", () => {
    // Exercise mutators against the real tree but unique ids, then clean up.
    const stamp = Date.now().toString(36);
    const conceptId = `concept.tmp-${stamp}`;
    const comboId = `combo.tmp-${stamp}`;
    const folderName = `tmp-lane-${stamp}`;

    const c1 = runCli([
      "add-concept",
      "--id",
      conceptId,
      "--name",
      "Temp concept",
      "--summary",
      "temporary test concept",
      "--related",
      "sp.cli",
    ]);
    assert.equal(c1.status, 0, c1.stderr || c1.stdout);

    const c2 = runCli([
      "add-llm-combo",
      "--id",
      comboId,
      "--name",
      "Temp combo",
      "--models",
      "openrouter/auto,perplexity/sonar",
      "--use-when",
      "tests only",
      "--system-prompts",
      "sp.cli",
    ]);
    assert.equal(c2.status, 0, c2.stderr || c2.stdout);

    const c3 = runCli([
      "add-folder",
      "--scope",
      "internal",
      "--name",
      folderName,
    ]);
    assert.equal(c3.status, 0, c3.stderr || c3.stdout);

    const c4 = runCli([
      "add-metadata",
      "--key",
      `test_${stamp}`,
      "--value",
      "1",
    ]);
    assert.equal(c4.status, 0, c4.stderr || c4.stdout);

    const v = runCli(["validate"]);
    assert.equal(v.status, 0, v.stderr || v.stdout);

    // cleanup catalog entries and files
    const catalogPath = path.join(ROOT, "prompts/catalog.json");
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    catalog.concepts = catalog.concepts.filter((c) => c.id !== conceptId);
    catalog.llm_combos = catalog.llm_combos.filter((c) => c.id !== comboId);
    catalog.entries = catalog.entries.filter(
      (e) =>
        e.id !== `entry.${conceptId}` &&
        e.id !== `entry.${comboId}` &&
        e.id !== `folder.internal.${folderName}` &&
        !String(e.path || "").includes(folderName)
    );
    if (catalog.metadata) delete catalog.metadata[`test_${stamp}`];
    fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

    const conceptPath = path.join(
      ROOT,
      "prompts/concepts",
      `${slugify(conceptId)}.md`
    );
    const comboPath = path.join(
      ROOT,
      "prompts/llm-combos",
      `${slugify(comboId)}.md`
    );
    const folderPath = path.join(ROOT, "prompts/internal", folderName);
    for (const p of [conceptPath, comboPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }

    const metaPath = path.join(ROOT, "prompts/metadata/catalog-meta.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      delete meta[`test_${stamp}`];
      fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
    }

    const v2 = runCli(["validate"]);
    assert.equal(v2.status, 0, v2.stderr || v2.stdout);
  });

  it("fetch-external rejects path escape", () => {
    const res = runCli([
      "fetch-external",
      "--source",
      "system_prompts_leaks",
      "--path",
      "../secret",
    ]);
    assert.notEqual(res.status, 0);
    assert.match(`${res.stderr}${res.stdout}`, /unsafe|refusing/i);
  });

  it("schema file exists", () => {
    assert.ok(
      fs.existsSync(
        path.join(ROOT, "schemas/prompt-knowledge-catalog.schema.json")
      )
    );
  });
});
