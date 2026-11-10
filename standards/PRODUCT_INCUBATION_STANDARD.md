# Product Incubation Standard

**Rule:** New products incubate inside `revvel-standards` under `products/<name>/` until they are tested. A product graduates to its own repo only after testing, and only if it needs to.

## Incubation

1. Create the product at `products/<name>/`. It owns its dependencies, build, and run commands (see `AGENTS.md`).
2. Keep incubating products off the public docs site. Do not link, index, or publish them from `docs/` until they graduate.
3. Run the app from `products/<name>/` while it incubates.
4. Graduate only when the product passes its tests and a separate repo is needed (for example, separate access control, release cadence, or licensing). Record the graduation decision in `wr/memory/decisions.jsonl` and in the product's LEDGER.

## Hosting

1. Products run under a subdomain or path of `oaudrey.com` or `freedomangelcorps.com` (for example `<name>.oaudrey.com` or `oaudrey.com/<name>`).
2. Do not register a new domain for each product. One parent domain limits the access permissions to manage and the domain costs to pay.
3. A product that needs its own domain records the reason in its LEDGER and gets approval from Audrey first.
