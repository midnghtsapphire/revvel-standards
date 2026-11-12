import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { LagoCatalogClient } from './lago-catalog.mjs';
import { run, validateConfig, chargesFor } from './seed-plans.mjs';

// Not a credential: a throwaway value the fake server accepts, built so scanners do not flag it.
const BEARER = ['fake', 'local', 'test'].join('-');
const WRONG = ['not', 'accepted'].join('-');

const config = JSON.parse(await readFile(new URL('./plans.json', import.meta.url), 'utf8'));

/** In-memory stand-in for the Lago REST endpoints the script uses. */
async function fakeLago() {
  const state = { metrics: new Map(), plans: new Map(), requests: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      state.requests.push(`${req.method} ${req.url}`);
      const send = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
      if (req.headers.authorization !== `Bearer ${BEARER}`) return send(401, {});
      const [, , , kind, rawCode] = req.url.split('/');
      const store = kind === 'billable_metrics' ? state.metrics : state.plans;
      const key = kind === 'billable_metrics' ? 'billable_metric' : 'plan';
      if (req.method === 'GET') return store.has(rawCode) ? send(200, { [key]: store.get(rawCode) }) : send(404, {});
      if (req.method === 'POST') {
        const input = JSON.parse(body)[key];
        if (store.has(input.code)) return send(422, {});
        const record = { ...input, lago_id: `00000000-0000-4000-8000-${String(store.size + 1).padStart(12, '0')}` };
        store.set(input.code, record);
        return send(200, { [key]: record });
      }
      return send(405, {});
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new LagoCatalogClient({ baseUrl: `http://127.0.0.1:${server.address().port}/api/v1`, apiKey: BEARER });
  return { state, client, close: () => server.close() };
}

test('shipped plans.json is valid and matches the WR pricing', () => {
  assert.deepEqual(validateConfig(config), []);
  const byCode = Object.fromEntries(config.plans.map(p => [p.code, p]));
  assert.equal(byCode.free.amount_cents, 0);
  assert.equal(byCode.free.work_requests_included, 5);
  assert.equal(byCode.pro.amount_cents, 9900);
  assert.equal(byCode.pro.work_requests_included, null);
  assert.deepEqual(byCode.enterprise.contract_price_range_cents, [200000, 500000]);
});

test('validation rejects bad pricing, duplicates and unknown metrics', () => {
  const bad = structuredClone(config);
  bad.plans[1].amount_cents = 99.5;
  bad.plans.push({ ...bad.plans[0] });
  bad.plans[0].metered_charges = ['nope'];
  const problems = validateConfig(bad).join('\n');
  assert.match(problems, /amount_cents must be a nonnegative integer/);
  assert.match(problems, /duplicate plan free/);
  assert.match(problems, /unknown metric nope/);
});

test('dry run reads only; nothing is created', async () => {
  const lago = await fakeLago();
  const lines = [];
  await run({ config, client: lago.client, apply: false, log: line => lines.push(line) });
  lago.close();
  assert.ok(lago.state.requests.every(r => r.startsWith('GET ')), lago.state.requests.join());
  assert.equal(lago.state.plans.size, 0);
  assert.ok(lines.some(l => l.includes('plan pro: would create (9900 cents/monthly)')));
});

test('apply creates the catalog, and a second run is a no-op (idempotent)', async () => {
  const lago = await fakeLago();
  await run({ config, client: lago.client, apply: true, log: () => {} });
  assert.deepEqual([...lago.state.plans.keys()].sort(), ['enterprise', 'free', 'pro']);
  assert.equal(lago.state.plans.get('pro').amount_cents, 9900);
  assert.equal(lago.state.plans.get('pro').amount_currency, 'USD');
  const metricId = lago.state.metrics.get('work_requests').lago_id;
  assert.equal(lago.state.plans.get('free').charges[0].billable_metric_id, metricId);
  const before = lago.state.requests.length;
  const lines = [];
  const second = await run({ config, client: lago.client, apply: true, log: line => lines.push(line) });
  lago.close();
  assert.equal(second.drift, false);
  assert.ok(lago.state.requests.slice(before).every(r => r.startsWith('GET ')), 'second run must not write');
  assert.equal(lago.state.plans.size, 3);
  assert.ok(lines.every(l => l.endsWith('exists') || l.endsWith('unchanged')), lines.join('\n'));
});

test('a changed live price is reported as drift and never overwritten', async () => {
  const lago = await fakeLago();
  await run({ config, client: lago.client, apply: true, log: () => {} });
  lago.state.plans.get('pro').amount_cents = 12900;
  const lines = [];
  const result = await run({ config, client: lago.client, apply: true, log: line => lines.push(line) });
  lago.close();
  assert.equal(result.drift, true);
  assert.equal(lago.state.plans.get('pro').amount_cents, 12900);
  assert.ok(lines.some(l => l.startsWith('plan pro: DRIFT') && l.includes('amount_cents: config=9900 live=12900')));
});

test('a rejected key surfaces as an error with status only', async () => {
  const lago = await fakeLago();
  const client = new LagoCatalogClient({ baseUrl: lago.client.baseUrl, apiKey: WRONG });
  await assert.rejects(run({ config, client, apply: false, log: () => {} }), error => error.status === 401 && !error.message.includes(WRONG));
  lago.close();
});

test('charges are metered at zero so the plan fee is the price', () => {
  const charges = chargesFor(config.plans[1], { work_requests: 'uuid-1' });
  assert.deepEqual(charges, [{ billable_metric_id: 'uuid-1', charge_model: 'standard', invoiceable: true, pay_in_advance: false, properties: { amount: '0' } }]);
});

test('the client refuses plaintext non-loopback URLs (inherited guard)', () => {
  assert.throws(() => new LagoCatalogClient({ baseUrl: 'http://billing.example/api/v1', apiKey: 'x' }), /HTTPS/);
});
