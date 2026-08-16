# Secrets Map

Canonical list of **secret and config names** (never values) referenced by
shipped products and automation. Prefer Doppler / GitHub Actions secrets for
server-side keys. Public checkout URLs may be `NEXT_PUBLIC_*` build-time config.

| Name | Kind | Used by | Required | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | public config | `products/personal-assistant`, `products/creator-payout-tracker` | optional | Polar.sh checkout link for Pro upgrade CTAs. App falls back to mailto when unset. |
| `OPENROUTER_API_KEY` | secret | repo automation / future LLM enrichment on personal-assistant | optional for personal-assistant core path | Core `runPipeline()` is offline and does not call OpenRouter. |

## personal-assistant (WR-16432)

- **No OAuth secrets required** for the shipped playground (paste/export ingest).
- Do **not** store Gmail/Outlook/Yahoo/Drive tokens in this app until a dedicated
  connector worker lands; document new names here first.
- Product env template: `products/personal-assistant/.env.example`.
