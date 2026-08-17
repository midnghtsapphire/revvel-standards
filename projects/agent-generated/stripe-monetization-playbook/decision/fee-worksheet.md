# Fee & Margin Worksheet

Fill this before you build. It stops you from setting a take rate that loses money
after Stripe's own fees.

## Inputs

| Field | Your value | Example |
| --- | --- | --- |
| Average transaction size (USD) | fill in | 100.00 |
| Expected monthly transaction count | fill in | 500 |
| Your platform take rate (%) | fill in | 2.5 |
| Model | fill in | connect |

## Stripe costs to subtract

- Card processing: 2.9% + $0.30 per charge (US cards).
- Express/Custom Connect: ~$2/month per active account + 0.25% + $0.25 per payout.
- Billing (if used): 0.7% of billed volume.

## Quick math (per transaction, $100 example, 2.5% take)

- Gross platform fee collected: $2.50
- Stripe processing on $100: $2.90 + $0.30 = $3.20
- Who pays processing? On **destination charges** the platform is the settlement
  merchant and eats processing unless you pass it on; on **direct charges** the
  connected account pays it. Decide this explicitly — it flips your margin.

## Decision

- [ ] Take rate covers Stripe costs + target margin
- [ ] Charge type chosen (direct vs destination vs separate charges & transfers)
- [ ] Fee disclosed to end-users
- [ ] Numbers recorded in `decision/roi.json`
