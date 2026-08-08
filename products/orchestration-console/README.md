# Orchestration Console

SaaS console for Revvel multi-persona orchestration:

- **Structural heal** — MD003 / MD025 / MD056 Markdown repairs (same logic as `scripts/heal-markdown.js`)
- **File registry** — validate an inventory of orchestration assets against a virtual filesystem
- **n8n OAuth** — copy-ready OAuth 2.0 parameters for Gmail, Outlook, and Yahoo

## Live Deployment

Deploy this app on Vercel from `products/orchestration-console`.

After the first deploy, paste the production URL here:

`https://orchestration-console.vercel.app` (replace with the verified project URL from your Vercel dashboard)

## Local Development

```bash
cd products/orchestration-console
npm install
npm run dev
```

Default port: **3012**

## Validation

```bash
npm test
npm run lint
npm run build
```

## Related repo wiring

| Asset | Path |
| --- | --- |
| File registry CLI | `scripts/orchestration/file-registry.js` |
| Structural heal CLI | `scripts/orchestration/structural-heal.js` |
| Auto-heal workflow | `.github/workflows/structural-auto-heal.yml` |
| OAuth docs | `docs/n8n/OAUTH_PROVIDERS.md` |
| Secrets map (names only) | `docs/SECRETS_MAP.md` |
| Registry manifest | `config/orchestration/file-registry.yml` |

## Monetization path

Positioned as a SaaS ops console for teams running agent fleets: paid tier can add
private registry hosting, heal audit history, and managed n8n credential checklists.
