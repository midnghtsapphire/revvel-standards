'use strict';

/**
 * Regression tests for the GoSQLX Lint Action integration (WR #15862).
 *
 * Guards:
 *   - workflow file exists, parses, and wires ajitpratap0/GoSQLX@v1.14.0
 *   - .gosqlx.yml exists with dialect + include paths
 *   - curated sql/fixtures corpus is present and non-empty
 *   - standards/SQL_CODE_STANDARDS.md documents the gate
 *   - product playground ships with linter module + API route
 */

const fs = require('fs');
const path = require('path');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'gosqlx-lint.yml');
const CONFIG = path.join(ROOT, '.gosqlx.yml');
const STANDARDS = path.join(ROOT, 'standards', 'SQL_CODE_STANDARDS.md');
const SQL_DIR = path.join(ROOT, 'sql', 'fixtures');
const PRODUCT = path.join(ROOT, 'products', 'gosqlx-sql-linter');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

describe('GoSQLX lint workflow', () => {
  test('workflow file exists and declares required triggers', () => {
    assert.ok(fs.existsSync(WORKFLOW), 'gosqlx-lint.yml must exist');
    const yml = read(WORKFLOW);
    assert.match(yml, /^name:\s*GoSQLX Lint\s*$/m);
    assert.match(yml, /^on:\s*$/m);
    assert.match(yml, /pull_request:/);
    assert.match(yml, /push:/);
    assert.match(yml, /workflow_dispatch:/);
    assert.match(yml, /permissions:\s*\n\s*contents:\s*read/);
  });

  test('workflow uses GoSQLX action at v1.14.0', () => {
    const yml = read(WORKFLOW);
    assert.match(
      yml,
      /uses:\s*ajitpratap0\/GoSQLX@v1\.14\.0/,
      'must pin ajitpratap0/GoSQLX@v1.14.0 as required by WR #15862'
    );
    assert.match(yml, /name:\s*GoSQLX Lint Action/);
    assert.match(yml, /validate:\s*["']true["']/);
    assert.match(yml, /fail-on-error:\s*["']true["']/);
    assert.match(yml, /gosqlx-version:\s*["']v1\.14\.0["']/);
    // Must not lint the whole monorepo (PL/pgSQL schemas fail E2002).
    assert.match(yml, /files:\s*["']sql\/fixtures\/\*\*\/\*\.sql["']/);
    assert.match(
      yml,
      /files:\s*["']products\/gosqlx-sql-linter\/fixtures\/\*\*\/\*\.sql["']/
    );
  });

  test('.gosqlx.yml configures postgresql and include paths', () => {
    assert.ok(fs.existsSync(CONFIG), '.gosqlx.yml must exist');
    const cfg = read(CONFIG);
    assert.match(cfg, /dialect:\s*postgresql/);
    assert.match(cfg, /sql\/\*\*\/\*\.sql/);
    assert.match(cfg, /products\/gosqlx-sql-linter\/\*\*\/\*\.sql/);
    assert.match(cfg, /schemas\/\*\*/);
  });

  test('SQL fixtures corpus has multi-dialect samples', () => {
    assert.ok(fs.existsSync(SQL_DIR), 'sql/fixtures must exist');
    const required = [
      'postgresql/users_orders.sql',
      'postgresql/cte_window.sql',
      'mysql/catalog.sql',
      'sqlite/sessions.sql',
      'multi/set_operations.sql',
      'multi/merge_style_upsert.sql',
    ];
    for (const rel of required) {
      const full = path.join(SQL_DIR, rel);
      assert.ok(fs.existsSync(full), `missing fixture ${rel}`);
      const body = read(full).trim();
      assert.ok(body.length > 20, `${rel} must not be empty`);
      assert.match(body, /\b(SELECT|INSERT|WITH)\b/i);
    }
  });

  test('SQL code standards doc exists and references the action', () => {
    assert.ok(fs.existsSync(STANDARDS));
    const md = read(STANDARDS);
    assert.match(md, /GoSQLX/);
    assert.match(md, /v1\.14\.0/);
    assert.match(md, /gosqlx-lint\.yml/);
    assert.match(md, /L007/);
  });

  test('gosqlx-sql-linter product ships complete surface', () => {
    const files = [
      'package.json',
      'README.md',
      'app/data/linter.ts',
      'app/api/lint/route.ts',
      'app/page.tsx',
      'tests/linter.test.ts',
      'fixtures/sample_clean.sql',
      'vercel.json',
    ];
    for (const rel of files) {
      assert.ok(
        fs.existsSync(path.join(PRODUCT, rel)),
        `product missing ${rel}`
      );
    }
    const pkg = JSON.parse(read(path.join(PRODUCT, 'package.json')));
    assert.equal(pkg.name, 'gosqlx-sql-linter');
    assert.match(pkg.scripts.dev, /3012/);
    assert.ok(pkg.scripts.test, 'product must define test script');

    const readme = read(path.join(PRODUCT, 'README.md'));
    assert.match(readme, /## Live Deployment/);
    assert.match(readme, /ajitpratap0\/GoSQLX@v1\.14\.0/);

    const linter = read(path.join(PRODUCT, 'app/data/linter.ts'));
    assert.match(linter, /export function lintSql/);
    assert.match(linter, /L001/);
    assert.match(linter, /clickhouse/i);
  });
});
