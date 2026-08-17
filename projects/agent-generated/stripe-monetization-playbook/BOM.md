# Bill of Materials — Stripe Monetization Playbook

Everything needed to add a platform revenue stream on top of Stripe payments.

## Accounts & credentials

| Item | Purpose | Notes |
| --- | --- | --- |
| Stripe platform account | Owns Connect, collects application fees | Enable Connect in Dashboard |
| `STRIPE_SECRET_KEY` | Server-side API calls | Store in env / secrets manager, never commit |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures | Per endpoint |
| Connected accounts | Sellers / payees | Standard, Express, or Custom |

## Dependencies

| Package | Ecosystem | Purpose |
| --- | --- | --- |
| stripe (server SDK) | npm / pip / etc. | Create charges, set application fee |
| @stripe/stripe-js | npm | Client-side Elements / Checkout |

## Stripe objects to create

- Connect account(s) for payees (`account` + onboarding link).
- `PaymentIntent` (or Checkout Session) with `application_fee_amount` +
  `transfer_data.destination`.
- For Billing: `Product`, `Price` (recurring or metered), `Subscription`.

## Costs to budget

- Base processing: 2.9% + $0.30 per US card charge (paid by the account that is
  the charge's settlement merchant).
- Express/Custom Connect: ~$2/month per active account + 0.25% + $0.25 per payout.
- Stripe Billing: 0.7% of billed volume (if used).

See the WR for cited sources: `wr/issues/issue-14931-what-is-monetizing-stripe-all-about-deep-research.md`.
