/**
 * Unit tests for the GoSQLX-aligned SQL linter.
 * Run: npm test  (tsx tests/linter.test.ts)
 */

import assert from 'node:assert/strict';
import {
  DIALECTS,
  RULE_CATALOG,
  buildReportMarkdown,
  countStatements,
  detectDialect,
  extractTables,
  formatSql,
  lintSql,
} from '../app/data/linter';

// ── Catalog integrity ────────────────────────────────────────────────────────

assert.ok(DIALECTS.length >= 8, 'must list core dialects + auto');
assert.ok(
  DIALECTS.some((d) => d.id === 'postgresql'),
  'postgresql dialect required'
);
assert.ok(
  DIALECTS.some((d) => d.id === 'clickhouse'),
  'clickhouse dialect required'
);

const ruleIds = RULE_CATALOG.map((r) => r.id);
for (const id of [
  'L001',
  'L002',
  'L003',
  'L006',
  'L007',
  'L009',
  'E1001',
  'E1002',
  'E1003',
]) {
  assert.ok(ruleIds.includes(id), `rule catalog must include ${id}`);
}

// ── Empty input ──────────────────────────────────────────────────────────────

{
  const r = lintSql('   \n  ');
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.rule === 'E1001'));
}

// ── Clean sample ─────────────────────────────────────────────────────────────

const CLEAN = `SELECT
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users AS u
LEFT JOIN orders AS o
    ON u.id = o.user_id
WHERE u.active = TRUE
GROUP BY u.id, u.name;
`;

{
  const r = lintSql(CLEAN, { dialect: 'postgresql' });
  assert.equal(r.ok, true, 'clean query should have zero errors');
  assert.equal(r.dialect, 'postgresql');
  assert.ok(r.tables.includes('users'));
  assert.ok(r.tables.includes('orders'));
  assert.ok(r.statementCount >= 1);
  assert.equal(r.summary.errors, 0);
}

// ── L007 lowercase keywords ──────────────────────────────────────────────────

{
  const r = lintSql('select id from users where active = true;');
  assert.ok(
    r.violations.some((v) => v.rule === 'L007'),
    'lowercase keywords must trigger L007'
  );
}

// ── L006 SELECT * ────────────────────────────────────────────────────────────

{
  const r = lintSql('SELECT * FROM users AS u;');
  assert.ok(r.violations.some((v) => v.rule === 'L006'));
}

// ── L001 trailing whitespace ─────────────────────────────────────────────────

{
  const r = lintSql('SELECT id FROM users;   \n');
  assert.ok(r.violations.some((v) => v.rule === 'L001'));
}

// ── E1002 unbalanced parens ──────────────────────────────────────────────────

{
  const r = lintSql('SELECT id FROM users WHERE (active = TRUE;');
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.rule === 'E1002'));
}

// ── E1003 missing verb ───────────────────────────────────────────────────────

{
  const r = lintSql('id FROM users;');
  assert.ok(r.violations.some((v) => v.rule === 'E1003'));
}

// ── Dialect detection ────────────────────────────────────────────────────────

assert.equal(detectDialect("SELECT x FROM t WHERE name ILIKE 'a%'"), 'postgresql');
assert.equal(detectDialect('SELECT TOP 10 * FROM dbo.t'), 'sqlserver');

// ── extractTables / countStatements / format ─────────────────────────────────

{
  const tables = extractTables(
    'SELECT a.id FROM accounts AS a JOIN plans AS p ON a.plan_id = p.id'
  );
  assert.ok(tables.includes('accounts'));
  assert.ok(tables.includes('plans'));
  assert.equal(countStatements('SELECT 1; SELECT 2;'), 2);
  const formatted = formatSql('select id from users;');
  assert.match(formatted, /SELECT/);
  assert.match(formatted, /FROM/);
}

// ── Markdown report ──────────────────────────────────────────────────────────

{
  const r = lintSql(CLEAN);
  const md = buildReportMarkdown(r, 'unit-test');
  assert.match(md, /SQL Lint Report/);
  assert.match(md, /unit-test/);
  assert.match(md, /```sql/);
}

// ── CTE + window-style construct still ok structurally ────────────────────────

{
  const cte = `
WITH monthly AS (
    SELECT o.user_id, SUM(o.total_cents) AS month_total
    FROM orders AS o
    GROUP BY o.user_id
)
SELECT m.user_id, m.month_total
FROM monthly AS m;
`;
  const r = lintSql(cte, { dialect: 'postgresql' });
  assert.equal(r.summary.errors, 0, 'CTE sample must be error-free');
  assert.ok(r.tables.includes('orders') || r.tables.includes('monthly'));
}

console.log('gosqlx-sql-linter tests: all passed');
