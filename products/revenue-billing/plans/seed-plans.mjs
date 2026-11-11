#!/usr/bin/env node
/** Idempotently create the REVVEL billing catalog in Lago (WR #18333).
 *
 *   node seed-plans.mjs --validate   check plans.json only; no network, no env
 *   node seed-plans.mjs              dry run: read Lago, report what --apply would do
 *   node seed-plans.mjs --apply      create what is missing
 *
 * Reads LAGO_API_URL (with /api/v1) and LAGO_API_KEY from the environment.
 * Safe to re-run: existing metrics/plans are never modified. If a live plan
 * differs from plans.json (price drift) the script reports it and exits 2
 * rather than silently changing what customers are charged.
 * Exit codes: 0 ok, 1 error, 2 drift found.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LagoCatalogClient } from './lago-catalog.mjs';

const CODE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const INTERVALS = ['monthly', 'yearly'];

export function validateConfig(config) {
  const problems = [];
  const fail = message => problems.push(message);
  if (config?.version !== 1) fail('version must be 1');
  if (!/^[A-Z]{3}$/.test(config?.currency ?? '')) fail('currency must be a 3-letter code');
  const metrics = new Set();
  for (const m of config?.billable_metrics ?? []) {
    if (!CODE.test(m.code ?? '')) fail(`metric code invalid: ${m.code}`);
    if (metrics.has(m.code)) fail(`duplicate metric ${m.code}`);
    metrics.add(m.code);
    if (m.aggregation_type !== 'count_agg') fail(`metric ${m.code}: only count_agg is supported here`);
    if (!m.name) fail(`metric ${m.code}: name required`);
  }
  const seen = new Set();
  for (const p of config?.plans ?? []) {
    if (!CODE.test(p.code ?? '')) fail(`plan code invalid: ${p.code}`);
    if (seen.has(p.code)) fail(`duplicate plan ${p.code}`);
    seen.add(p.code);
    if (!p.name) fail(`plan ${p.code}: name required`);
    if (!INTERVALS.includes(p.interval)) fail(`plan ${p.code}: interval must be one of ${INTERVALS}`);
    if (!Number.isSafeInteger(p.amount_cents) || p.amount_cents < 0) fail(`plan ${p.code}: amount_cents must be a nonnegative integer`);
    if (typeof p.pay_in_advance !== 'boolean') fail(`plan ${p.code}: pay_in_advance must be boolean`);
    if (p.work_requests_included !== null && !(Number.isSafeInteger(p.work_requests_included) && p.work_requests_included >= 0)) fail(`plan ${p.code}: work_requests_included must be null or a nonnegative integer`);
    for (const metric of p.metered_charges ?? []) if (!metrics.has(metric)) fail(`plan ${p.code}: unknown metric ${metric}`);
    const range = p.contract_price_range_cents;
    if (range !== undefined && !(Array.isArray(range) && range.length === 2 && range.every(Number.isSafeInteger) && range[0] <= range[1] && p.amount_cents === range[0])) fail(`plan ${p.code}: contract_price_range_cents must be [min,max] with amount_cents equal to min`);
  }
  return problems;
}

/** Charge body for a plan: metered, priced at 0 (usage is tracked; the plan fee is the price). */
export function chargesFor(plan, metricIds) {
  return (plan.metered_charges ?? []).map(metric => ({
    billable_metric_id: metricIds[metric], charge_model: 'standard', invoiceable: true, pay_in_advance: false,
    properties: { amount: '0' },
  }));
}

const MANAGED = [['name', 'name'], ['interval', 'interval'], ['amount_cents', 'amount_cents'], ['pay_in_advance', 'pay_in_advance']];
export function driftOf(plan, currency, live) {
  const diffs = MANAGED.filter(([want, have]) => live[have] !== plan[want]).map(([want, have]) => `${want}: config=${plan[want]} live=${live[have]}`);
  if (live.amount_currency !== currency) diffs.push(`currency: config=${currency} live=${live.amount_currency}`);
  return diffs;
}

export async function run({ config, client, apply, log = console.log }) {
  const problems = validateConfig(config);
  if (problems.length) throw new Error(`plans.json invalid:\n - ${problems.join('\n - ')}`);
  const metricIds = {};
  let drift = false;
  for (const metric of config.billable_metrics) {
    let live = await client.getBillableMetric(metric.code);
    if (live) log(`metric ${metric.code}: exists`);
    else if (apply) { live = (await client.createBillableMetric(metric)).billable_metric; log(`metric ${metric.code}: CREATED`); }
    else log(`metric ${metric.code}: would create`);
    metricIds[metric.code] = live?.lago_id ?? '<lago_id assigned on create>';
  }
  for (const plan of config.plans) {
    const live = await client.getPlan(plan.code);
    if (live) {
      const diffs = driftOf(plan, config.currency, live);
      if (diffs.length) { drift = true; log(`plan ${plan.code}: DRIFT (not modified) ${diffs.join('; ')}`); } else log(`plan ${plan.code}: unchanged`);
    } else if (apply) {
      await client.createPlanWithCharges(plan, config.currency, chargesFor(plan, metricIds));
      log(`plan ${plan.code}: CREATED`);
    } else log(`plan ${plan.code}: would create (${plan.amount_cents} cents/${plan.interval})`);
  }
  return { drift };
}

async function main() {
  const args = process.argv.slice(2);
  const known = ['--validate', '--apply'];
  const unknown = args.filter(a => !known.includes(a));
  if (unknown.length) throw new Error(`unknown option ${unknown[0]}`);
  const config = JSON.parse(await readFile(new URL('./plans.json', import.meta.url), 'utf8'));
  if (args.includes('--validate')) {
    const problems = validateConfig(config);
    if (problems.length) throw new Error(`plans.json invalid:\n - ${problems.join('\n - ')}`);
    console.log(`plans.json ok: ${config.plans.length} plans, ${config.billable_metrics.length} metric(s); no network used.`);
    return;
  }
  const apply = args.includes('--apply');
  if (!apply) console.log('DRY RUN (reads only). Pass --apply to create missing items.');
  const { drift } = await run({ config, client: new LagoCatalogClient(), apply });
  if (drift) process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
