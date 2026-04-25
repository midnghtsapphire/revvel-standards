#!/usr/bin/env node
'use strict';

/**
 * Validates that all GitHub Actions workflow YAML files parse correctly
 * and have required top-level keys.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// Dynamically test every .yml file in .github/workflows/
const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));

for (const file of files) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  test(`${file} — parses as valid YAML`, () => {
    yaml.parse(content);
  });

  test(`${file} — has 'name' key`, () => {
    const doc = yaml.parse(content);
    if (!doc.name) throw new Error(`Missing 'name' key`);
  });

  test(`${file} — has 'on' trigger`, () => {
    const doc = yaml.parse(content);
    if (!doc.on && !doc.true) throw new Error(`Missing 'on' trigger`);
  });
}

test('At least 20 workflow files exist', () => {
  if (files.length < 20) {
    throw new Error(`Expected 20+ workflows, found ${files.length}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
