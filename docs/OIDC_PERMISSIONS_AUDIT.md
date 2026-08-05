# OIDC Permissions Audit

Audit of GitHub Actions OIDC (`id-token`) usage across the workflow fleet.

Triggered by the `Could not fetch an OIDC token. Did you remember to add
'id-token: write' to your workflow permissions?` error, which GitHub Actions
raises when a step requests a short-lived OIDC token but the job lacks the
`id-token: write` permission.

## What requires `id-token: write`

A job needs the `id-token: write` permission only when a step asks GitHub for an
OIDC token. The common triggers are:

- `actions/deploy-pages` — GitHub Pages deployments via the Pages API.
- `actions/attest-*` (build provenance, SBOM) and sigstore/cosign keyless signing.
- Keyless cloud auth: `aws-actions/configure-aws-credentials`,
  `google-github-actions/auth`, `azure/login`, `hashicorp/vault-action`.
- `npm publish --provenance` and any flow calling `core.getIDToken()`.

Setting any `permissions:` block resets every unlisted scope to `none`, so a job
that adds `id-token: write` must also re-declare the other scopes it uses (for
example `contents: read`, `pages: write`). Grant the scope at the job level when
only one job needs it.

## Scan scope

- 175 workflow files under `.github/workflows/`.
- No reusable workflow calls (`uses: ./.github/workflows/...`) and no composite
  actions under `.github/actions/`, so there is no OIDC passthrough to trace.

## Findings

| Workflow | OIDC-requiring step | `id-token: write` present | Status |
| --- | --- | --- | --- |
| `static.yml` | `actions/deploy-pages` | Yes (workflow level) | Correct |
| `ship-to-market.yml` | None (uses `peaceiris/actions-gh-pages`, token-based) | Was granted on `deliver-docs` | Over-grant removed |

No workflow was missing `id-token: write` where an OIDC token is actually
requested. The lone OIDC consumer, `actions/deploy-pages` in `static.yml`,
already declares the permission.

Steps reviewed and confirmed to NOT need OIDC:

- `ship-to-market.yml` `deliver-cli` / npm publish — uses `NODE_AUTH_TOKEN`, no
  `--provenance` flag.
- `ship-to-market.yml` `deliver-docker` — `docker/build-push-action` with no
  `provenance: true` / attestation step; BuildKit provenance is baked into the
  image and does not use the GitHub OIDC token.
- `ship-to-market.yml` `deliver-docs` — `peaceiris/actions-gh-pages` pushes to
  the `gh-pages` branch with `contents: write`; it never requests an OIDC token.

## Change applied

Removed the unused `id-token: write` from the `deliver-docs` job in
`ship-to-market.yml` to honor least-privilege (CLAUDE.md gotcha #3). The job
keeps `contents: write` (for the branch push) and `pages: write`.

## How to fix the error if it appears again

Add the scope to the job that runs the OIDC step (preferred) or to the whole
workflow, re-declaring any other scopes the job needs:

```yaml
permissions:
  contents: read
  id-token: write
```

Notes:

- `id-token` only supports `write` or `none` — there is no `read`.
- OIDC is unavailable for `pull_request` events from forks regardless of
  permissions.
- If it still fails after adding the scope, check
  Settings -> Actions -> Workflow permissions (and any org policy) is not
  forcing read-only tokens.
