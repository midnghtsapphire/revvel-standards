const fs = require('fs');
const path = require('path');

function assertDirExists(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Expected path to exist: ${relativePath}`);
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    throw new Error(`Expected directory but found file: ${relativePath}`);
  }
}

function assertFileExists(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Expected file to exist: ${relativePath}`);
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`Expected file but found directory: ${relativePath}`);
  }
}

try {
  // Validate the actual revvel-rosette-automation/ structure: config/ (singular),
  // src/, scripts/, docs/, tests/. The previous version of this test asserted
  // vestigial empty dirs (projects/, configs/) from an early scaffold that no
  // longer reflect the real layout.
  assertDirExists('revvel-rosette-automation');
  assertFileExists('revvel-rosette-automation/README.md');
  assertFileExists('revvel-rosette-automation/package.json');
  assertFileExists('revvel-rosette-automation/pyproject.toml');

  assertDirExists('revvel-rosette-automation/config');
  assertDirExists('revvel-rosette-automation/src');
  assertDirExists('revvel-rosette-automation/scripts');
  assertDirExists('revvel-rosette-automation/docs');
  assertDirExists('revvel-rosette-automation/tests');

  // src/ must be a real Python package so pyproject.toml's console scripts
  // resolve after `pip install -e .`.
  assertFileExists('revvel-rosette-automation/src/__init__.py');
  assertFileExists('revvel-rosette-automation/src/orchestrator.py');
  assertFileExists('revvel-rosette-automation/src/scheduler.py');
  assertFileExists('revvel-rosette-automation/src/gatekeeper.py');

  // Inner harness entry point invoked by `npm test` inside revvel-rosette-automation/.
  assertFileExists('revvel-rosette-automation/tests/harness.test.js');

  console.log('PASS: revvel-rosette-automation harness directory structure is present');
} catch (error) {
  console.error('FAIL: revvel-rosette-automation harness directory structure check failed');
  console.error(error);
  process.exit(1);
}
