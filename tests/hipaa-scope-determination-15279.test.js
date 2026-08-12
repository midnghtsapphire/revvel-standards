#!/usr/bin/env node
"use strict";

/**
 * Regression tests for issue #16111 / WR #15279 HIPAA scope determination pack.
 *
 * Guards:
 *  - compliance pack files exist and stay machine-readable
 *  - status.json never authorizes a HIPAA compliance claim while provisional
 *  - product privacy policy and UI copy do not claim HIPAA compliance
 *  - parent WR points at the compliance SSOT and uses corrected framing
 *  - re-evaluation triggers include clinic / HSA-FSA / telehealth style gates
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`FAIL: ${name}\n    ${err.stack || err.message}`);
    failed += 1;
  }
}

const REQUIRED_FILES = [
  "compliance/red-light-therapy/README.md",
  "compliance/red-light-therapy/entity-classification.md",
  "compliance/red-light-therapy/counsel-engagement-brief.md",
  "compliance/red-light-therapy/re-evaluation-triggers.md",
  "compliance/red-light-therapy/re-evaluation-triggers.json",
  "compliance/red-light-therapy/data-inventory.md",
  "compliance/red-light-therapy/status.json",
  "products/red-light-therapy-dosage-calculator/app/privacy/page.tsx",
  "products/red-light-therapy-dosage-calculator/app/page.tsx",
  "products/red-light-therapy-dosage-calculator/README.md",
  "wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md",
  "wr/issues/issue-15279-hipaa-compliance-addendum.md",
];

console.log("Running HIPAA scope determination (#16111) tests...\n");

test("all compliance pack and product privacy artifacts exist", () => {
  for (const rel of REQUIRED_FILES) {
    assert.ok(exists(rel), `missing required file: ${rel}`);
  }
});

test("status.json is valid and never allows HIPAA compliance claims", () => {
  const status = JSON.parse(read("compliance/red-light-therapy/status.json"));
  assert.strictEqual(status.issue, 16111);
  assert.strictEqual(status.parent_wr, 15279);
  assert.strictEqual(typeof status.status, "string");
  assert.ok(
    ["UNSIGNED", "COUNSEL_SIGNED_PATH_B", "COUNSEL_SIGNED_PATH_A", "REEVAL_REQUIRED"].includes(
      status.status
    ),
    `unexpected status: ${status.status}`
  );
  assert.strictEqual(status.allows_hipaa_compliance_claim, false);
  assert.ok(status.entity_classification_path.includes("entity-classification.md"));
  assert.ok(status.privacy_policy_path.includes("privacy/page.tsx"));
  // Agents must not fake counsel signatures.
  if (status.status.startsWith("COUNSEL_SIGNED")) {
    assert.ok(status.counsel_name, "signed status requires counsel_name");
    assert.ok(status.opinion_path, "signed status requires opinion_path");
    assert.ok(status.signed_on, "signed status requires signed_on");
  }
});

test("re-evaluation triggers JSON includes hard business-model gates", () => {
  const triggers = JSON.parse(read("compliance/red-light-therapy/re-evaluation-triggers.json"));
  assert.strictEqual(triggers.issue, 16111);
  assert.ok(Array.isArray(triggers.triggers));
  assert.ok(triggers.triggers.length >= 8);
  const keys = new Set(triggers.triggers.map((t) => t.key));
  for (const required of [
    "clinic_provider_partnership",
    "telehealth_or_clinician_workflow",
    "insurance_or_hipaa_transactions",
    "hsa_fsa_clinical_substantiation",
    "baa_requested_or_signed",
    "phi_from_covered_entity",
    "hipaa_compliant_marketing",
  ]) {
    assert.ok(keys.has(required), `missing trigger key: ${required}`);
  }
});

test("entity-classification memo documents Path B provisional posture and sign-off gate", () => {
  const memo = read("compliance/red-light-therapy/entity-classification.md");
  assert.match(memo, /PROVISIONAL_INTERNAL/);
  assert.match(memo, /Neither Covered Entity nor Business Associate/i);
  assert.match(memo, /do \*\*not\*\* claim HIPAA compliance/i);
  assert.match(memo, /Counsel sign-off block/i);
  assert.match(memo, /re-evaluation trigger/i);
  assert.doesNotMatch(
    memo,
    /we are HIPAA-compliant/i,
    "memo must not claim the product is HIPAA-compliant"
  );
});

test("counsel engagement brief asks for written Path A/B memo", () => {
  const brief = read("compliance/red-light-therapy/counsel-engagement-brief.md");
  assert.match(brief, /written legal memorandum/i);
  assert.match(brief, /Covered Entity/);
  assert.match(brief, /Business Associate/);
  assert.match(brief, /Human operator steps/i);
});

test("product privacy policy is honest and forbids HIPAA compliance claims", () => {
  const policy = read("products/red-light-therapy-dosage-calculator/app/privacy/page.tsx");
  assert.match(policy, /do not claim HIPAA compliance/i);
  assert.match(policy, /direct-to-consumer wellness/i);
  assert.match(policy, /browser/i);
  // Affirmative claims are banned; negated mentions ("do not claim ... HIPAA-certified") are required.
  assert.doesNotMatch(policy, /(?<!not claim that this Service is )(?<!not claim )we are HIPAA-compliant/i);
  assert.doesNotMatch(policy, /Service is HIPAA-compliant(?!, HIPAA-certified)/i);
  assert.match(policy, /do not claim that this Service is HIPAA-compliant, HIPAA-certified/i);
  assert.doesNotMatch(policy, /HIPAA-compliant architecture/i);
});

test("in-app calculator copy links privacy policy and rejects HIPAA claim", () => {
  const page = read("products/red-light-therapy-dosage-calculator/app/page.tsx");
  assert.match(page, /href="\/privacy"/);
  assert.match(page, /claim HIPAA compliance/i);
  assert.match(page, /<strong>not<\/strong> claim HIPAA compliance|do not claim HIPAA compliance/i);
  assert.doesNotMatch(page, /HIPAA-compliant architecture/i);
  assert.doesNotMatch(page, /we are HIPAA-compliant/i);
});

test("product README points at compliance pack and forbids HIPAA claim", () => {
  const readme = read("products/red-light-therapy-dosage-calculator/README.md");
  assert.match(readme, /compliance\/red-light-therapy/);
  assert.match(readme, /do not claim HIPAA compliance/i);
  assert.doesNotMatch(readme, /HIPAA-compliant architecture/i);
});

test("parent WR uses corrected regulatory posture and links SSOT", () => {
  const wr = read(
    "wr/issues/issue-15279-reclaiming-your-skin-how-contour-light-red-light-t.md"
  );
  assert.match(wr, /compliance\/red-light-therapy/);
  assert.match(wr, /do not claim HIPAA compliance/i);
  assert.match(wr, /#16111|issue #16111/i);
  assert.doesNotMatch(wr, /Client-side storage avoids HIPAA/i);
  assert.doesNotMatch(wr, /HIPAA-adjacent privacy \(no PHI collected; health data stored client-side or encrypted at rest\)/i);
});

test("addendum references entity pack and issue 16111", () => {
  const addendum = read("wr/issues/issue-15279-hipaa-compliance-addendum.md");
  assert.match(addendum, /#16111|issue #16111|16111/);
  assert.match(addendum, /compliance\/red-light-therapy/);
});

test("no product marketing file claims HIPAA-compliant for red light calculator", () => {
  const roots = [
    "products/red-light-therapy-dosage-calculator",
    "compliance/red-light-therapy",
  ];
  const banned = [/HIPAA-compliant/i, /HIPAA certified/i, /HIPAA-certified/i];
  /** @type {string[]} */
  const offenders = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(md|tsx|ts|js|jsx|json|html)$/i.test(entry.name)) continue;
      // status/triggers may mention the phrase as a forbidden trigger label — allow those files.
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      if (
        rel.endsWith("re-evaluation-triggers.json") ||
        rel.endsWith("re-evaluation-triggers.md") ||
        rel.endsWith("entity-classification.md") ||
        rel.endsWith("counsel-engagement-brief.md") ||
        rel.endsWith("README.md") && rel.startsWith("compliance/")
      ) {
        // Still ensure they don't claim *we are* compliant.
        const text = fs.readFileSync(full, "utf8");
        if (/we are HIPAA-compliant/i.test(text) || /Service is HIPAA-compliant/i.test(text)) {
          offenders.push(rel);
        }
        continue;
      }
      const text = fs.readFileSync(full, "utf8");
      for (const re of banned) {
        if (re.test(text) && !/must not|do not claim|forbidden|prohibits|never claim|not claim/i.test(text)) {
          offenders.push(`${rel} (~${re})`);
        }
      }
    }
  }

  for (const rel of roots) walk(path.join(ROOT, rel));
  assert.deepStrictEqual(offenders, [], `prohibited HIPAA marketing framing:\n${offenders.join("\n")}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
