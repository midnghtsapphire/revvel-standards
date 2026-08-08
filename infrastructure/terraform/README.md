# infrastructure/terraform

Minimal, fmt-clean Terraform sample used by the **Terraform Lint** GitHub Actions
workflow (`.github/workflows/terraform-lint.yml`).

## Purpose

- Gives the CI gate real `*.tf` files to run `terraform fmt -check -recursive` against.
- Documents the expected layout for future infrastructure modules in this monorepo.
- Does **not** provision cloud resources. The only resource is a `null_resource`
  anchor so `terraform validate` (when run locally with providers installed) has
  a graph root without credentials.

## Local checks

```bash
# Format (auto-fix)
terraform fmt -recursive

# Format check (what CI runs via ShubhamTatvamasi/terraform-lint-action@v1)
terraform fmt -check -recursive

# Optional: init + validate (requires network to pull the null provider)
terraform init -backend=false
terraform validate
```

## CI

On every pull request and push to `main` that touches `*.tf`, `*.tfvars`, `*.hcl`,
or the workflow itself, GitHub Actions:

1. Installs Terraform `1.9.8` via `hashicorp/setup-terraform`
2. Runs `ShubhamTatvamasi/terraform-lint-action@v1` (SHA-pinned)
3. Fails the job if any file needs formatting

See the companion product UI: `products/terraform-lint-guard/`.
