# Billing Usage / Subscription — copy-paste snippet

Use this when the product is a SaaS or metered API tool. Stripe Billing charges
0.7% of billed volume on top of processing; you set the customer-facing price.

## Steps

1. Create a `Product` and a recurring or metered `Price`.
2. Create a `Subscription` for the customer.
3. For usage-based pricing, report usage against the metered price.
4. Handle `invoice.paid` / `invoice.payment_failed` webhooks (dunning).

## Node example (metered subscription + usage report)

```js
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createMeteredSubscription({ customerId, priceId }) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }], // a metered recurring price
    payment_behavior: "default_incomplete",
  });
}

async function reportUsage({ subscriptionItemId, quantity }) {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: "now",
    action: "increment",
  });
}

module.exports = { createMeteredSubscription, reportUsage };
```

## When to self-host instead

If billed volume makes the 0.7% material, evaluate open-source metering:
[getlago/lago](https://github.com/getlago/lago) or
[openmeterio/openmeter](https://github.com/openmeterio/openmeter). Keep money
movement on Stripe Connect regardless — only the metering layer moves.
