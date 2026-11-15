import test from 'node:test';
import assert from 'node:assert/strict';
import { LagoClient } from './lago.mjs';

function fixture(status = 200) {
  const calls = [];
  const client = new LagoClient({ baseUrl: 'https://billing.example/api/v1/', apiKey: 'private-key', fetchImpl: async (url, options) => {
    calls.push({ url, ...options, body: options.body && JSON.parse(options.body) });
    return new Response(JSON.stringify({ ok: true }), { status });
  } });
  return { client, calls };
}

test('configuration fails closed and prevents plaintext credential transport', () => {
  assert.throws(() => new LagoClient({ baseUrl: '', apiKey: '' }), /required/);
  assert.throws(() => new LagoClient({ baseUrl: 'http://billing.example/api/v1', apiKey: 'x' }), /HTTPS/);
  assert.throws(() => new LagoClient({ baseUrl: 'https://user:secret@billing.example/api/v1', apiKey: 'x' }), /credentials/);
});

test('customer is synchronized through configured Stripe provider', async () => {
  const { client, calls } = fixture();
  await client.createCustomer({ externalId: 'customer-1', email: 'buyer@example.com', stripeProviderCode: 'stripe-test' });
  assert.equal(calls[0].url, 'https://billing.example/api/v1/customers');
  assert.equal(calls[0].headers.Authorization, 'Bearer private-key');
  assert.equal(calls[0].redirect, 'error');
  assert.deepEqual(calls[0].body.customer.billing_configuration, { payment_provider: 'stripe', payment_provider_code: 'stripe-test', sync_with_provider: true });
});

test('subscription and usage preserve caller-owned stable IDs', async () => {
  const { client, calls } = fixture();
  await client.assignPlan({ externalCustomerId: 'buyer', externalSubscriptionId: 'affiliate:buyer:pro', planCode: 'pro' });
  await client.recordUsage({ transactionId: 'wr-18330', externalSubscriptionId: 'affiliate:buyer:pro', code: 'work_requests' });
  assert.equal(calls[0].body.subscription.external_id, 'affiliate:buyer:pro');
  assert.equal(calls[1].body.event.transaction_id, 'wr-18330');
  assert.throws(() => client.assignPlan({ externalCustomerId: 'buyer', planCode: 'pro' }), /externalSubscriptionId/);
});

test('customer path is encoded for checkout and portal', async () => {
  const { client, calls } = fixture();
  await client.checkout('a/b ?'); await client.portal('a/b ?');
  assert.equal(calls[0].url, 'https://billing.example/api/v1/customers/a%2Fb%20%3F/checkout_url');
  assert.equal(calls[1].method, 'GET');
});

test('provider failures propagate without retrying or exposing bodies', async () => {
  const { client, calls } = fixture(422);
  await assert.rejects(client.checkout('buyer'), /HTTP 422/);
  assert.equal(calls.length, 1);
});

test('plan currency amounts are integer cents', async () => {
  const { client, calls } = fixture();
  await client.createPlan({ code: 'pro', name: 'Pro', amountCents: 9900 });
  assert.equal(calls[0].body.plan.amount_cents, 9900);
  assert.throws(() => client.createPlan({ code: 'pro', name: 'Pro', amountCents: -1 }), /nonnegative/);
});

test('invoice and subscription reads reconcile documented encoded resource paths', async () => {
  const { client, calls } = fixture();
  await client.invoice('invoice/a ?');
  await client.subscription('subscription/a ?');
  await client.invoicePaymentUrl('invoice/a ?');
  assert.equal(calls[0].url, 'https://billing.example/api/v1/invoices/invoice%2Fa%20%3F');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[1].url, 'https://billing.example/api/v1/subscriptions/subscription%2Fa%20%3F');
  assert.equal(calls[1].method, 'GET');
  assert.equal(calls[2].url, 'https://billing.example/api/v1/invoices/invoice%2Fa%20%3F/payment_url');
  assert.equal(calls[2].method, 'POST');
  assert.throws(() => client.invoice(''), /lagoId/);
});

test('oversized provider JSON is refused without buffering an unbounded response', async () => {
  const client = new LagoClient({ baseUrl: 'https://billing.example/api/v1', apiKey: 'test', fetchImpl: async () => new Response('x'.repeat(1048577)) });
  await assert.rejects(client.invoice('invoice-1'), /1 MiB/);
});
