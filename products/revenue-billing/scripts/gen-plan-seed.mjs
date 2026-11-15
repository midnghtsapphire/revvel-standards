#!/usr/bin/env node
/** Generate db/seed/0002_billing_plan_seed.sql from plans/plans.json so the SQL
 * mirror and the Lago catalog cannot disagree (WR #18333).
 *   node scripts/gen-plan-seed.mjs          write the file
 *   node scripts/gen-plan-seed.mjs --check  exit 1 if the committed file is stale
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const target = fileURLToPath(new URL('db/seed/0002_billing_plan_seed.sql', root));
const config = JSON.parse(await readFile(new URL('plans/plans.json', root), 'utf8'));

const lit = value => (typeof value === 'string' ? `'${value.replaceAll("'", "''")}'` : value === null || value === undefined ? 'NULL' : String(value));
const rows = config.plans.map((p, i) => `  (${[
  lit(p.code), lit(p.name), lit(p.interval), p.amount_cents, lit(config.currency), p.pay_in_advance,
  lit(p.work_requests_included), lit(p.contract_price_range_cents?.[1] ?? null), (i + 1) * 10,
].join(', ')})`);

const sql = `-- 0002_billing_plan_seed.sql : GENERATED from plans/plans.json by
-- scripts/gen-plan-seed.mjs. Do not edit by hand; edit plans.json and regenerate.
-- Idempotent (upsert by code). WR #18333.
BEGIN;

INSERT INTO billing_plan(code, name, interval_code, amount_cents, currency, pay_in_advance, work_requests_included, contract_max_cents, sort_order) VALUES
${rows.join(',\n')}
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, interval_code = EXCLUDED.interval_code, amount_cents = EXCLUDED.amount_cents,
  currency = EXCLUDED.currency, pay_in_advance = EXCLUDED.pay_in_advance,
  work_requests_included = EXCLUDED.work_requests_included, contract_max_cents = EXCLUDED.contract_max_cents,
  sort_order = EXCLUDED.sort_order;

COMMIT;
`;

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8').catch(() => '');
  if (current !== sql) { console.error('db/seed/0002_billing_plan_seed.sql is stale: run node scripts/gen-plan-seed.mjs'); process.exit(1); }
  console.log('plan seed is up to date');
} else {
  await writeFile(target, sql);
  console.log(`wrote ${target}`);
}
