# Stripe Monetization Playbook — Projects Template

A reusable, ship-ready project scaffold for **turning payments into a revenue
stream** in any revvel product. It follows the canonical
[agent-generated product layout](../../../templates/agent-generated-product/README.md)
and is the build-side companion to the deep-research WR:
[`wr/issues/issue-14931-what-is-monetizing-stripe-all-about-deep-research.md`](../../../wr/issues/issue-14931-what-is-monetizing-stripe-all-about-deep-research.md).

## What this template is for

Stripe markets four ways for a platform to *earn* on payments instead of only
*paying* for them. Copy this folder, pick a model, fill `monetize/links.json`, and
wire the snippet — no re-research required.

| Model | Stripe product | Revenue source | Pick when… |
| --- | --- | --- | --- |
| Marketplace fee | Connect | `application_fee_amount` on each charge | money moves between two+ parties |
| Subscription / usage | Billing | markup on recurring or metered plans | you sell a SaaS/API tool |
| Interchange share | Issuing | share of card interchange | you issue branded cards (phase 2) |
| In-person upcharge | Terminal | per-transaction upcharge | you sell card-present POS (phase 2) |

## How to use

1. Copy this folder to `projects/agent-generated/<your-product-slug>/`.
2. Edit `state.json` — set `product_slug`, `revenue_target_monthly_usd`, and the
   chosen `monetization_model`.
3. Run the decision worksheet in `decision/fee-worksheet.md` to sanity-check margin.
4. Fill `monetize/links.json` with your take rate and the Stripe objects to create.
5. Implement using `monetize/connect-application-fee.md` (Connect) or
   `monetize/billing-usage.md` (Billing).
6. Record who chose the model and why in `decision/roi.json` (provenance).

## Folder map

```text
stripe-monetization-playbook/
  state.json                     # pipeline state + chosen monetization model
  BOM.md                         # bill of materials
  research/brief.md              # condensed research (full doc = WR-14931)
  decision/roi.json              # ROI gate + provenance
  decision/fee-worksheet.md      # margin sanity-check
  monetize/links.json            # chosen model, take rate, Stripe objects
  monetize/connect-application-fee.md  # Connect snippet + steps
  monetize/billing-usage.md      # Billing usage/subscription snippet
  build/ certify/ deploy/ market/ sales/   # standard pipeline stages
```

Every empty stage keeps a `.gitkeep` so the layout survives a copy.
