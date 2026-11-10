/** Server-side Lago adapter. Never import into a browser bundle.
 * API contract: https://github.com/getlago/lago-openapi/blob/main/openapi.yaml
 * Lago owns invoices/subscriptions; Stripe is its configured payment provider.
 */
export class LagoClient {
  constructor({ baseUrl = process.env.LAGO_API_URL, apiKey = process.env.LAGO_API_KEY, fetchImpl = fetch } = {}) {
    if (!baseUrl || !apiKey) throw new Error('LAGO_API_URL and LAGO_API_KEY are required');
    const url = new URL(baseUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('Lago requires HTTPS outside loopback');
    if (url.username || url.password || url.search || url.hash) throw new Error('Lago URL must not contain credentials, query or fragment');
    this.baseUrl = url.href.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.fetch = fetchImpl;
  }

  async request(method, path, body) {
    // Refuse redirects so bearer keys cannot travel to an unintended host.
    // Do not automatically retry mutations: reconcile external IDs before retrying.
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      // Provider error bodies can contain customer data; expose only HTTP status.
      const error = new Error(`Lago ${method} request failed (HTTP ${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  createCustomer({ externalId, email, name, stripeProviderCode }) {
    required(externalId, 'externalId'); required(email, 'email'); required(stripeProviderCode, 'stripeProviderCode');
    return this.request('POST', '/customers', { customer: {
      external_id: externalId, email, name, currency: 'USD',
      billing_configuration: { payment_provider: 'stripe', payment_provider_code: stripeProviderCode, sync_with_provider: true },
    } });
  }

  assignPlan({ externalCustomerId, externalSubscriptionId, planCode }) {
    required(externalCustomerId, 'externalCustomerId'); required(externalSubscriptionId, 'externalSubscriptionId'); required(planCode, 'planCode');
    return this.request('POST', '/subscriptions', { subscription: {
      external_customer_id: externalCustomerId, external_id: externalSubscriptionId, plan_code: planCode,
    } });
  }

  // Lago's checkout URL collects a payment method. It is NOT proof of payment.
  checkout(externalCustomerId) {
    return this.request('POST', `/customers/${encoded(externalCustomerId)}/checkout_url`);
  }

  portal(externalCustomerId) {
    return this.request('GET', `/customers/${encoded(externalCustomerId)}/portal_url`);
  }

  recordUsage({ transactionId, externalSubscriptionId, code, properties = {} }) {
    required(transactionId, 'transactionId'); required(externalSubscriptionId, 'externalSubscriptionId'); required(code, 'code');
    // Stable transaction IDs let Lago deduplicate delivery retries.
    return this.request('POST', '/events', { event: {
      transaction_id: transactionId, external_subscription_id: externalSubscriptionId, code, properties,
    } });
  }

  createPlan({ code, name, amountCents }) {
    required(code, 'code'); required(name, 'name');
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error('amountCents must be a nonnegative integer');
    return this.request('POST', '/plans', { plan: { code, name, interval: 'monthly', amount_cents: amountCents, amount_currency: 'USD', pay_in_advance: true } });
  }
}

function required(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 255) throw new Error(`${label} must be a nonempty string of at most 255 characters`);
}
function encoded(value) { required(value, 'externalCustomerId'); return encodeURIComponent(value); }
