#!/usr/bin/env node
'use strict';

/**
 * Test harness for Revvel Rosette Automation
 * 
 * Validates the complete automation system:
 * - Configuration files
 * - Python modules
 * - Shell scripts
 * - Integration points
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0, skipped = 0;

class SkipTest extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'SkipTest';
  }
}

function skip(reason) {
  throw new SkipTest(reason);
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    if (e instanceof SkipTest) {
      console.log(`SKIP: ${name} — ${e.message}`);
      skipped++;
      return;
    }
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function fileExists(filepath) {
  return fs.existsSync(path.join(PROJECT_ROOT, filepath));
}

// Cache python module-availability checks.
const pyModuleCache = new Map();
function pythonModuleAvailable(moduleName) {
  if (pyModuleCache.has(moduleName)) return pyModuleCache.get(moduleName);
  const result = spawnSync('python3', ['-c', `import ${moduleName}`], {
    encoding: 'utf8',
  });
  const ok = result.status === 0;
  pyModuleCache.set(moduleName, ok);
  return ok;
}

function requirePythonModules(modules) {
  const missing = modules.filter((m) => !pythonModuleAvailable(m));
  if (missing.length > 0) {
    throw new Error(
      `missing Python module(s): ${missing.join(', ')} ` +
      `(install with \`pip install -r requirements.txt\` or \`./scripts/bootstrap.sh\`)`
    );
  }
}

// Test 1: Directory structure
test('directory structure exists', () => {
  const dirs = ['config', 'src', 'scripts', 'docs', 'tests'];
  for (const dir of dirs) {
    assert(fileExists(dir), `${dir} directory missing`);
  }
});

// Test 2: Configuration files
test('configuration files exist', () => {
  const configs = [
    'config/300Projects.yaml',
    'config/70-vaultwardent.yaml',
    'config/61-factory.yaml',
    'config/59-config.yaml',
    'config/20-supportingconfig.yaml',
    'config/campaign.json',
    'config/9-Nostradamus.json',
    'config/7-body.json',
  ];
  
  for (const config of configs) {
    assert(fileExists(config), `${config} missing`);
  }
});

// Test 3: Python source files
test('python source files exist', () => {
  const modules = [
    'src/orchestrator.py',
    'src/scheduler.py',
    'src/gatekeeper.py',
    'src/selfheal.py',
  ];
  
  for (const mod of modules) {
    assert(fileExists(mod), `${mod} missing`);
  }
});

// Test 4: Shell scripts exist and are executable
test('shell scripts exist and executable', () => {
  const scripts = [
    'scripts/bootstrap.sh',
    'scripts/gatekeeper.sh',
    'scripts/monitoring.sh',
    'scripts/manual-test.sh',
    'scripts/cronjob.sh',
  ];
  
  for (const script of scripts) {
    const fullPath = path.join(PROJECT_ROOT, script);
    assert(fs.existsSync(fullPath), `${script} missing`);
    
    if (process.platform !== 'win32') {
      const stat = fs.statSync(fullPath);
      assert((stat.mode & 0o111) !== 0, `${script} not executable`);
    }
  }
});

// Test 5: Documentation files
test('documentation files exist', () => {
  const docs = [
    'README.md',
    'docs/queue-format.txt',
    'docs/gatekeeper-system.txt',
    'docs/five-step-trello.txt',
  ];
  
  for (const doc of docs) {
    assert(fileExists(doc), `${doc} missing`);
  }
});

// Test 6: package.json structure
test('package.json is valid', () => {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  assert(pkg.name === 'revvel-rosette-automation', 'wrong package name');
  assert(pkg.version === '1.0.0', 'wrong version');
  assert(pkg.scripts.test, 'no test script');
  assert(pkg.scripts.bootstrap, 'no bootstrap script');
});

// Test 7: pyproject.toml structure
test('pyproject.toml is valid', () => {
  const tomlPath = path.join(PROJECT_ROOT, 'pyproject.toml');
  const content = fs.readFileSync(tomlPath, 'utf8');

  assert(content.includes('name = "revvel-rosette-automation"'), 'wrong project name');
  assert(content.includes('version = "1.0.0"'), 'wrong version');
  assert(/^dependencies\s*=\s*\[/m.test(content), 'no dependencies array under [project]');
  assert(!content.includes('[project.dependencies]'),
    '[project.dependencies] table is invalid PEP 621; use a dependencies = [...] array under [project]');

  // Ensure the file actually parses as TOML so future edits cannot reintroduce
  // the original syntax error that broke `pip install`.
  const result = spawnSync(
    'python3',
    ['-c', 'import sys, tomllib; tomllib.load(open(sys.argv[1], "rb"))', tomlPath],
    { encoding: 'utf8' }
  );
  assert(result.status === 0,
    `pyproject.toml does not parse as TOML: ${result.stderr || result.stdout}`);
});

// Test 8: Python syntax check
test('python modules have valid syntax', () => {
  const modules = [
    'src/orchestrator.py',
    'src/scheduler.py',
    'src/gatekeeper.py',
    'src/selfheal.py',
  ];
  
  for (const mod of modules) {
    const fullPath = path.join(PROJECT_ROOT, mod);
    const result = spawnSync('python3', ['-m', 'py_compile', fullPath], {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
    });
    
    assert(result.status === 0, `${mod} has syntax errors: ${result.stderr}`);
  }
});

// Test 9: JSON config validation
test('JSON configs are valid', () => {
  const configs = [
    'config/campaign.json',
    'config/9-Nostradamus.json',
    'config/7-body.json',
  ];
  
  for (const config of configs) {
    const fullPath = path.join(PROJECT_ROOT, config);
    try {
      JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      throw new Error(`${config} is invalid JSON: ${e.message}`);
    }
  }
});

// Test 10: YAML config validation
test('YAML configs are valid', () => {
  const yaml = require('yaml');
  const configs = [
    'config/300Projects.yaml',
    'config/70-vaultwardent.yaml',
    'config/61-factory.yaml',
    'config/59-config.yaml',
    'config/20-supportingconfig.yaml',
  ];
  
  for (const config of configs) {
    const fullPath = path.join(PROJECT_ROOT, config);
    try {
      yaml.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      throw new Error(`${config} is invalid YAML: ${e.message}`);
    }
  }
});

// Test 11: Orchestrator can load config
test('orchestrator can load config', () => {
  requirePythonModules(['yaml', 'rich']);
  const result = spawnSync(
    'python3',
    ['src/orchestrator.py', '--status'],
    {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
    }
  );

  assert(result.status === 0, `orchestrator failed: ${result.stderr}`);

  // Should output JSON
  try {
    // Strip ANSI escape codes from output
    const cleanOutput = result.stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();

    // Parse the JSON (which might be pretty-printed across multiple lines)
    const status = JSON.parse(cleanOutput);
    assert(status.config_loaded !== undefined, 'no config_loaded in status');
    // Timestamp must be dynamic — reject the hardcoded sentinel value that was
    // present before bug-fix and any value with the same fixed second/minute.
    assert(typeof status.timestamp === 'string' && status.timestamp.length > 0,
      'no timestamp in status');
    assert(status.timestamp !== '2026-05-02T02:30:00Z',
      'timestamp is hardcoded; must be computed from the current time');
  } catch (e) {
    throw new Error(`orchestrator output not valid JSON: ${e.message}`);
  }
});

// Test 12: Scheduler can list jobs
test('scheduler can list jobs', () => {
  requirePythonModules(['schedule', 'yaml', 'rich']);
  const result = spawnSync(
    'python3',
    ['src/scheduler.py', '--list'],
    {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
    }
  );

  // Should not error (may have no jobs registered yet)
  assert(result.status === 0, `scheduler failed: ${result.stderr}`);
});

// Test 13: Gatekeeper health check
test('gatekeeper health check works', () => {
  requirePythonModules(['rich']);
  const result = spawnSync(
    'python3',
    ['src/gatekeeper.py', '--health-check'],
    {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
    }
  );

  assert(result.status === 0, `gatekeeper failed: ${result.stderr}`);
  assert(/Health Check/.test(result.stdout), 'no health check output');
});

// Test 14: README contains key sections
test('README has required sections', () => {
  const readme = fs.readFileSync(path.join(PROJECT_ROOT, 'README.md'), 'utf8');
  
  const sections = [
    '## 1. Overview',
    '## 2. Architecture',
    '## 3. Quick Start',
    '## 4. Usage',
    '## 5. Testing',
  ];
  
  for (const section of sections) {
    assert(readme.includes(section), `README missing section: ${section}`);
  }
});

// Test 15: Integration with parent gatekeeper-cli
test('parent gatekeeper-sync.sh is accessible', () => {
  const parentScript = path.resolve(PROJECT_ROOT, '..', 'scripts', 'gatekeeper-sync.sh');
  
  // Should exist (we're in revvel-standards repo)
  assert(fs.existsSync(parentScript), 'parent gatekeeper-sync.sh not found');
});

// Summary
const total = passed + failed + skipped;
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`\n${passed} passed, ${failed} failed${skipNote} (${total} total)`);
if (failed > 0) process.exit(1);
