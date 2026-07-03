# Connect Application Fee — copy-paste snippet

This is the core of "monetizing Stripe": collect a platform fee on top of a charge
that settles to a connected account. Take rate comes from `monetize/links.json`.

## Steps

1. Enable Connect in the Stripe Dashboard.
2. Onboard the payee as a connected account (Express recommended) and store its
   `acct_...` id.
3. Create the charge with `application_fee_amount` + `transfer_data.destination`.
4. Handle the `payment_intent.succeeded` and `account.updated` webhooks.

## Node example (destination charge with application fee)

```js
// npm i stripe
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // never hard-code the key

// amount and destination come from your app; feePercent from monetize/links.json
async function chargeWithPlatformFee({ amountCents, connectedAccountId, feePercent }) {
  const applicationFee = Math.round(amountCents * (feePercent / 100));

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    // Platform collects this fee; the rest settles to the connected account.
    application_fee_amount: applicationFee,
    transfer_data: { destination: connectedAccountId },
    automatic_payment_methods: { enabled: true },
  });
}

module.exports = { chargeWithPlatformFee };
```

## Gotchas

- On **destination** charges the platform is the settlement merchant and pays Stripe
  processing unless you add it to the fee — model this in `decision/fee-worksheet.md`.
- `application_fee_amount` is in the smallest currency unit (cents), not a percentage.
- Verify webhook signatures with `STRIPE_WEBHOOK_SECRET`; never trust unsigned events.
- Test with Stripe test keys + a test connected account before going live.

Reference: [stripe/stripe-node](https://github.com/stripe/stripe-node),
[Stripe Connect docs](https://docs.stripe.com/connect/charges).
