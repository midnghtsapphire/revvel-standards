'use strict';

/**
 * Regression tests for WR-16425 — Prompt Obfuscation standard
 * (Pape et al., USENIX Security 2025).
 *
 * Locks: standard file exists, open-access citation present, no paywall-bypass
 * guidance, SECURITY.md + IPI cross-links, WR research doc present.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const STANDARD = 'standards/PROMPT_OBFUSCATION_STANDARD.md';
const SECURITY = 'standards/SECURITY.md';
const IPI = 'standards/INDIRECT_PROMPT_INJECTION_STANDARD.md';
const WR_DOC = 'wr/issues/issue-16425-usenixsecurity25-pape-prompt-obfuscation.md';

test('PROMPT_OBFUSCATION_STANDARD.md exists and cites open-access USENIX PDF', () => {
  assert.ok(fs.existsSync(path.join(ROOT, STANDARD)), `${STANDARD} must exist`);
  const body = read(STANDARD);
  assert.match(body, /WR-16425/);
  assert.match(
    body,
    /https:\/\/www\.usenix\.org\/system\/files\/usenixsecurity25-pape\.pdf/,
  );
  assert.match(body, /Prompt Obfuscation for Large Language Models/);
  assert.match(body, /Pape/);
  assert.match(body, /soft-prompt|soft prompt/i);
  assert.match(body, /hard-prompt|hard prompt/i);
  assert.match(body, /product-ip/);
  assert.match(body, /Marketing\/SEO keywords/i);
  assert.match(body, /Monetization path/i);
  assert.match(body, /BOM/i);
});

test('standard answers membership/access without circumvention advice', () => {
  const body = read(STANDARD);
  assert.match(body, /no membership required/i);
  assert.match(body, /open access/i);
  // Must explicitly forbid jerryrig / paywall bypass patterns
  assert.match(body, /never advise or implement paywall\s+circumvention/i);
  assert.doesNotMatch(body, /shared password|crack.?wall|pirate membership/i);
});

test('SECURITY.md indexes the prompt obfuscation standard', () => {
  const body = read(SECURITY);
  assert.match(body, /PROMPT_OBFUSCATION_STANDARD\.md/);
  assert.match(body, /System-prompt IP|Prompt Obfuscation/i);
});

test('IPI standard cross-links prompt obfuscation as complementary', () => {
  const body = read(IPI);
  assert.match(body, /PROMPT_OBFUSCATION_STANDARD\.md/);
  assert.match(body, /WR-16425/);
});

test('WR research doc for #16425 is present and complete enough', () => {
  assert.ok(fs.existsSync(path.join(ROOT, WR_DOC)), `${WR_DOC} must exist`);
  const body = read(WR_DOC);
  assert.match(body, /#16425|Issue:\*\* #16425/);
  assert.match(body, /usenixsecurity25-pape\.pdf/);
  assert.match(body, /Deep market research/);
  assert.match(body, /Monetization/);
  assert.match(body, /BOM/);
  assert.match(body, /Closes #16425|closes #16425/i);
});
