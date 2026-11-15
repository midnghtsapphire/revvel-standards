# Revenue product release receipts — 10 November 2026

Scope: existing Affiliate Hub, AI Video Toolkit and Screen Recorder Finder;
work requests #18330–#18333. These receipts describe the tested working tree
before its coordinated commit. They do not establish production billing.

## Independent public artifacts

The existing local deployment pattern in `templates/cicd/deploy.sh` is extended
by `templates/cicd/deploy-static.mjs`. Build the selected product, then package
its `out/` into a new single-file Node/Bun server. No GitHub Actions, repository
source integration, container registry or model provider is required to serve
that artifact. The generated server honors `PORT` and listens on all interfaces.

| Product | Artifact filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Affiliate Hub | affiliate-hub-release-20261110c.mjs | 548507 | c3ab33fe38e89e68568d8df36be4e9149b9d0fdef8f9dc9ef684a4c2bfcf6d9c |
| AI Video Toolkit | ai-video-toolkit-release-20261110b.mjs | 550902 | 4e5226c86575a6177814f2e7634d9efa208cb2f58ddbabb4987e117ae9f98f93 |
| Screen Recorder Finder | screen-recorder-finder-release-20261110b.mjs | 550360 | f262e56f1423e1ff66b5bac43bbff3b77a19852b20ab218ee9dc08626310a0f6 |

Each artifact embeds 26 public export files. Packaging sorts paths and embeds
only supported public asset extensions. Hidden files and symlinks cannot enter
the public manifest; required home, pricing and health files must exist. Raw
assets are limited to 10 MiB and final source to 5 MiB. A generated filename
cannot overwrite an earlier release. Identical export bytes produce identical
source hashes; a fresh Next build can produce different build IDs and hashes.

## Validation evidence

- All three `npm run build` executions exited zero, with static home, pricing
  and health routes generated and TypeScript checks active.
- Affiliate Hub's Tailwind v4/PostCSS mismatch was fixed with the older
  configuration retained in comments. Its direct ESLint check exited zero.
- Shared ESLint configuration resolves peers from the consuming product;
  isolated two-consumer fixture coverage passes.
- Thirteen focused tests pass: six Lago adapter checks, three Stripe URL
  allowlist checks, two packaging checks, HTTP runtime and peer resolution.
- Actual generated servers were launched locally. For every product, home,
  pricing, health and an exported JavaScript asset returned 200; an unknown
  route returned 404. Health bodies reported `status: ok`.
- Runtime tests also cover HEAD, conditional ETag requests, immutable assets,
  malformed paths and method rejection. Package fixture tests cover private
  file exclusion, symlink refusal and deterministic manifest ordering.

## Preserved configuration and remaining evidence

Earlier container, Compose and DigitalOcean/GitHub-source configurations are
retained entirely as dated comments. They are historical material rather than
active deployment instructions. Existing application source remains in place;
the pricing navigation and routes are additions.

The pricing page accepts a public, HTTPS Stripe-hosted Payment Link configured
at build time. No such link was present during these builds, so paid checkout
correctly displays unavailable while the free directories continue working.
No Stripe secret is embedded in these artifacts.

Lago integration supports Stripe-synced customers, monthly plans, subscriptions,
usage events, payment-method setup and customer portals. Its tests use an
injected HTTP transport. Lago account hosting, a successful paid test invoice,
verified webhooks and durable product entitlements still require integration
evidence. A checkout payment-method URL alone does not prove payment.

Local SSH authentication to the documented droplet was rejected. Railway CLI
authentication was unavailable locally. A connected Railway deployment can
consume the same tested artifact source; its deployment ID, domain and live
HTTP receipts must be recorded by the deploying orchestrator. GitHub secret
names are configured for several providers, but their values and validity
were not established by local environment checks.

## GOAP sales export using the same adapter

Work request #18334 also uses this packaging/runtime path. Its normal Next
server configuration retains the existing `/api/plan` source. Setting
`REVVEL_STATIC_SALES_EXPORT=1` during a build exports TSX pages and public
assets for independent sales-site hosting; it does not claim a live dynamic
planning API. The new `/health` handler applies to normal builds, while the
sales export serves its public health JSON through the same static runtime.

- Artifact: `goap-swarm-console-release-20261110a.mjs`.
- Source size: 460189 bytes; 37 public files; 794678 raw asset bytes.
- SHA-256: `832f9e0cd96ddb63952ebdb4929a53d827ad7249093e6fd53ec96e3a25a94ae4`.
- The opt-in static build exited zero. Packaging requires home, sales landing,
  HTML deck, the exact named public PDF and health assets. Other PDFs remain
  outside the manifest. The three catalog products retain their pricing-route
  requirement unchanged.
- Real generated server smoke checks: `/`, `/agent-as-fte`,
  `/agent-as-fte/deck`, `/goap-agent-sales-deck.pdf` and `/health` returned 200;
  `/missing` returned 404. The PDF returned `application/pdf`, its bytes began
  with `%PDF-`, and the health response was JSON with `status: ok`.
- Four packaging/runtime tests passed, including a new GOAP-specific asset
  requirement and exact-PDF allowlist test.
