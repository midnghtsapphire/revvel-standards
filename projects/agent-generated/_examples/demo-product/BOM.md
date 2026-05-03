# BOM — `demo-product`

> Bill of materials for this agent-generated product. Each row must be resolved
> to `✅ on hand` before the build step runs. The BOM gatekeeper
> ([`.github/workflows/credential-gatekeeper.yml`](../../../.github/workflows/credential-gatekeeper.yml))
> reads this file and either auto-provisions (cheap/free items) or opens a
> `bom-block` issue for human action.

## Required (build cannot start until all rows are ✅)

| Item | Type | Provider | Est. Cost | Status | Notes |
|---|---|---|---|---|---|
| _example: Stripe account_ | account | Stripe | free | ✅ on hand | shared org account |
| _example: domain_ | infra | DigitalOcean | $12/yr | ⬜ needed | needs purchase |

## Optional (improves product but not blocking)

| Item | Type | Provider | Est. Cost | Status | Notes |
|---|---|---|---|---|---|

## Already-on-hand (informational)

See [`docs/_MASTER_BOM.md`](../../../docs/_MASTER_BOM.md) and
[`docs/_MASTER_INVENTORY.md`](../../../docs/_MASTER_INVENTORY.md) for org-wide
inventory. Do not duplicate; reference instead.
