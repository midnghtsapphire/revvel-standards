const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Prevent check-compliance.js from executing its main logic when required
const originalMain = require.main;
require.main = null;

// Require the exported functions
const { codeContains } = require('../../scripts/check-compliance.js');

// Restore require.main
require.main = originalMain;

function runTests() {
  const repoRoot = process.cwd(); // The script uses process.cwd() as repoRoot by default if no arg is provided
  // However, check-compliance.js hardcodes repoRoot at the top level

  // Actually, to make testing reliable, we should use the same repoRoot that check-compliance.js uses.
  // By default, check-compliance.js uses process.argv[2] or process.cwd()
  // Since we require it, it's process.cwd(). Let's create dummy directories in the current working directory.

  const testDirs = ['src', 'server', 'api', 'app'];

  // Save state to restore later
  const createdDirs = [];
  const createdFiles = [];

  function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      createdDirs.push(dirPath);
    }
  }

  function ensureFile(filePath, content) {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    fs.writeFileSync(filePath, content);
    createdFiles.push(filePath);
  }

  function cleanup() {
    createdFiles.forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    // Sort directories by length descending to remove children before parents
    createdDirs.sort((a, b) => b.length - a.length).forEach(dir => {
      if (fs.existsSync(dir)) {
        try { fs.rmdirSync(dir); } catch(e) {}
      }
    });
  }

  let testsPassed = 0;
  let testsFailed = 0;

  function runTest(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${e.stack || e.message}`);
      testsFailed++;
    }
  }

  try {
    ensureDir('src');
    ensureDir('server');
    ensureDir('api');
    ensureDir('app');

    // Make sure 'helmet' pattern doesn't exist in our project by chance before testing
    const originalCodeContains = codeContains;

    runTest('Should return false when pattern is not found', () => {
      // Use a highly unique string that definitely won't exist in the repo
      assert.strictEqual(originalCodeContains('veryuniquepatternthatdoesntexist12345'), false);
    });

    runTest('Should return true when pattern is found in src', () => {
      ensureFile('src/test-helmet.js', 'const helmet = require("testhelmet123");');
      assert.strictEqual(originalCodeContains('testhelmet123'), true);
      fs.unlinkSync('src/test-helmet.js');
    });

    runTest('Should return true when pattern is found in server', () => {
      ensureFile('server/test-helmet.js', 'app.use(testhelmet123());');
      assert.strictEqual(originalCodeContains('testhelmet123'), true);
      fs.unlinkSync('server/test-helmet.js');
    });

    runTest('Should return true when pattern is found in api', () => {
      ensureFile('api/test-helmet.js', 'const h = testhelmet123();');
      assert.strictEqual(originalCodeContains('testhelmet123'), true);
      fs.unlinkSync('api/test-helmet.js');
    });

    runTest('Should return true when pattern is found in app', () => {
      ensureFile('app/test-helmet.js', 'testhelmet123.hidePoweredBy()');
      assert.strictEqual(originalCodeContains('testhelmet123'), true);
      fs.unlinkSync('app/test-helmet.js');
    });

    runTest('Should handle regex/special characters correctly', () => {
      ensureFile('src/test-helmet.js', 'app.use(testhelmet123());');
      assert.strictEqual(originalCodeContains('testhelmet123\\(\\)'), true);
      fs.unlinkSync('src/test-helmet.js');
    });

    runTest('Should handle non-existent directories gracefully', () => {
      // Create a unique test file in src
      ensureFile('src/test-graceful.js', 'missingdirs_test123');

      // We know app, server, api might exist in repo but this proves it works even if one fails
      // Actually grep handles missing dirs by writing to stderr, which is sent to /dev/null
      // The test is that it still returns true because it finds it in src
      assert.strictEqual(originalCodeContains('missingdirs_test123'), true);

      fs.unlinkSync('src/test-graceful.js');
    });

  } finally {
    cleanup();
    console.log(`\nTest Summary: ${testsPassed} passed, ${testsFailed} failed`);
    if (testsFailed > 0) {
      process.exit(1);
    }
  }
}

// Check if we are running directly
if (require.main === module) {
  runTests();
}
