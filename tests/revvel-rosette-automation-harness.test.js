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
  assertDirExists('revvel-rosette-automation');
  assertFileExists('revvel-rosette-automation/README.md');

  assertDirExists('revvel-rosette-automation/projects');
  assertDirExists('revvel-rosette-automation/configs');
  assertDirExists('revvel-rosette-automation/scripts');
  assertDirExists('revvel-rosette-automation/docs');

  console.log('✅ PASS: revvel-rosette-automation harness directory structure is present');
} catch (error) {
  console.error('❌ FAIL: revvel-rosette-automation harness directory structure check failed');
  console.error(error);
  process.exit(1);
}

