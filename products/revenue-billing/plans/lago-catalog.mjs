/** Catalog helpers layered on the existing LagoClient (../lago.mjs) without
 * modifying it. Inherits the HTTPS-only rule, redirect refusal and 1 MiB
 * response bound. Server-side only. WR #18333.
 */
import { LagoClient } from '../lago.mjs';

const code = value => {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value)) throw new Error('code must match ^[a-z0-9][a-z0-9_-]{0,63}$');
  return encodeURIComponent(value);
};

export class LagoCatalogClient extends LagoClient {
  /** Returns the object, or null when Lago answers 404. Any other error throws. */
  async #getOrNull(path) {
    try { return await this.request('GET', path); } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }
  async getBillableMetric(metricCode) { return (await this.#getOrNull(`/billable_metrics/${code(metricCode)}`))?.billable_metric ?? null; }
  createBillableMetric(metric) {
    code(metric.code);
    return this.request('POST', '/billable_metrics', { billable_metric: {
      name: metric.name, code: metric.code, description: metric.description, aggregation_type: metric.aggregation_type, recurring: false,
    } });
  }
  async getPlan(planCode) { return (await this.#getOrNull(`/plans/${code(planCode)}`))?.plan ?? null; }
  /** `charges` is already resolved to Lago billable_metric UUIDs by the caller. */
  createPlanWithCharges(plan, currency, charges) {
    code(plan.code);
    return this.request('POST', '/plans', { plan: {
      name: plan.name, code: plan.code, interval: plan.interval,
      amount_cents: plan.amount_cents, amount_currency: currency, pay_in_advance: plan.pay_in_advance,
      charges,
    } });
  }
}
