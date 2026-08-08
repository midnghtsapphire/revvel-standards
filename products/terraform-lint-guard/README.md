# Terraform Lint Guard

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/terraform-lint-guard/)**

## What It Is

Terraform Lint Guard is a **Next.js web app** plus the monorepo CI workflow
that runs
[`ShubhamTatvamasi/terraform-lint-action@v1`](https://github.com/ShubhamTatvamasi/terraform-lint-action)
against every Terraform change.

- **Live checker** — paste HCL, get fmt-style findings (tabs, trailing space,
  `=` spacing, block alignment)
- **Report export** — Markdown + CSV downloads for review packets
- **REST API** — `POST /api/lint` for automations
- **CI snippet** — copy-ready GitHub Actions workflow that installs Terraform
  then runs the lint action
- **Repo gate** — `.github/workflows/terraform-lint.yml` fails PRs when
  `terraform fmt -check` fails

**Market context:** Terraform remains the default IaC tool for cloud teams.
Fmt drift is a low-signal but high-noise review tax. Packaging the gate with a
clickable playground lowers adoption friction for small teams that will not
stand up full TFC/Atlantis stacks on day one.

## Quick Start

```bash
cd products/terraform-lint-guard
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

## CI integration (this monorepo)

Workflow: `.github/workflows/terraform-lint.yml`

1. Triggers on `pull_request` / `push` to `main` when `*.tf`, `*.tfvars`,
   `*.hcl`, or the workflow changes
2. Installs Terraform `1.9.8` via `hashicorp/setup-terraform` (the lint action
   does not install the CLI)
3. Runs `ShubhamTatvamasi/terraform-lint-action` **SHA-pinned** to tag `v1`
4. Fails the job when formatting is dirty (`continue-on-error` is intentionally
   absent)

Sample clean Terraform lives at `infrastructure/terraform/`.

```bash
# Local equivalent of the CI gate
terraform fmt -check -recursive
# Auto-fix
terraform fmt -recursive
```

## API

### `GET /api/lint`

Returns endpoint schema and rule ids.

### `POST /api/lint`

```json
{
  "source": "variable \"x\" {\n  type = string\n}\n",
  "filename": "main.tf",
  "format": "json"
}
```

- `format`: `json` (default), `markdown`, or `csv`
- HTTP `200` when heuristic check passes, `422` when errors are present

## Tests

```bash
npm test
```

Covers clean/dirty samples, tabs, trailing whitespace, equals alignment,
exporters.

## Monetization

- Free public checker (lead magnet / SEO: "terraform fmt online",
  "terraform lint github action")
- Paid Polar.sh plan: multi-repo badge + private report history for agencies

## Deploy path

- Product source: `products/terraform-lint-guard`
- Static hub page (Vercel monorepo site):
  `docs/terraform-lint-guard/index.html`
- After merge to `main`, the root `vercel.json` `build-static.sh` publishes
  `/docs/terraform-lint-guard/`
