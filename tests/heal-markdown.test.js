"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  convertSetextToAtx,
  demoteExtraH1s,
  heal,
  countLintErrors,
  parseArgs,
} = require("../scripts/heal-markdown.js");

test("convertSetextToAtx: = underline becomes H1, - underline becomes H2", () => {
  const input = "Intro Title\n===========\n\nSection Name\n------------\n\nbody";
  const out = convertSetextToAtx(input);
  assert.equal(out, "# Intro Title\n\n## Section Name\n\nbody");
});

test("convertSetextToAtx: thematic break after blank line is untouched", () => {
  const input = "some paragraph\n\n---\n\nmore text";
  assert.equal(convertSetextToAtx(input), input);
});

test("convertSetextToAtx: front matter fence at line 0 is untouched", () => {
  const input = "---\ntitle: x\n---\n\nbody";
  assert.equal(convertSetextToAtx(input), input);
});

test("convertSetextToAtx: table separator rows are untouched", () => {
  const input = "| a | b |\n|---|---|\n| 1 | 2 |";
  assert.equal(convertSetextToAtx(input), input);
});

test("convertSetextToAtx: list items and blockquotes are not heading text", () => {
  const input = "- item\n---\n\n> quote\n---";
  assert.equal(convertSetextToAtx(input), input);
});

test("convertSetextToAtx: multi-line paragraphs are left alone", () => {
  // "second line" has non-blank text directly above it → part of a paragraph,
  // not a heading we should convert.
  const input = "first line\nsecond line\n---\nafter";
  assert.equal(convertSetextToAtx(input), input);
});

test("convertSetextToAtx: content inside code fences is untouched", () => {
  const input = "```\nFake Heading\n====\n```\ntext";
  assert.equal(convertSetextToAtx(input), input);
});

test("demoteExtraH1s: keeps first H1, demotes later ones to H2", () => {
  const input = "# WR: Title\n\nbody\n\n# Research Packet\n\n## sub\n\n# Another";
  const out = demoteExtraH1s(input);
  assert.equal(out, "# WR: Title\n\nbody\n\n## Research Packet\n\n## sub\n\n## Another");
});

test("demoteExtraH1s: ignores # lines inside code fences", () => {
  const input = "# Real Title\n\n```bash\n# comment not a heading\n```\n\n# Second";
  const out = demoteExtraH1s(input);
  assert.equal(out, "# Real Title\n\n```bash\n# comment not a heading\n```\n\n## Second");
});

test("demoteExtraH1s: demotes missing-space H1 variants so MD018 fix cannot resurrect a second H1", () => {
  const input = "# First\n\n#Second";
  assert.equal(demoteExtraH1s(input), "# First\n\n##Second");
});

test("demoteExtraH1s: H2+ headings are never touched", () => {
  const input = "## only h2s\n\n### and h3";
  assert.equal(demoteExtraH1s(input), input);
});

test("heal: setext H1 counts toward single-title demotion", () => {
  const input = "Top Title\n=========\n\n# Second Title";
  const { text } = heal(input);
  assert.equal(text, "# Top Title\n\n## Second Title");
});

test("heal: is idempotent (auto-heal workflow loop safety)", () => {
  const input =
    "# WR: something\n\nIssue body\n\nResearch Packet: Auto\n====\n\nDetails.\n---\n\n# Trailing H1";
  const once = heal(input).text;
  const twice = heal(once);
  assert.equal(twice.text, once);
  assert.equal(twice.changed, false);
});

test("heal: reports changed=false for already-clean text", () => {
  const input = "# Title\n\nclean body\n";
  const { changed } = heal(input);
  assert.equal(changed, false);
});

test("countLintErrors counts ' error ' lines only", () => {
  const output = [
    "Finding: a.md",
    "a.md:12 error MD012/no-multiple-blanks Multiple consecutive blank lines",
    "a.md:18 error MD025/single-title/single-h1 Multiple top-level headings",
    "Summary: 2 error(s)",
  ].join("\n");
  assert.equal(countLintErrors(output), 2);
  assert.equal(countLintErrors(""), 0);
});

test("parseArgs separates flags from files", () => {
  const opts = parseArgs(["--strict", "a.md", "--quiet", "b.md"]);
  assert.equal(opts.strict, true);
  assert.equal(opts.quiet, true);
  assert.deepEqual(opts.files, ["a.md", "b.md"]);
});
