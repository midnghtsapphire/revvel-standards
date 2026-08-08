# WR: [WR] add - name: Terraform Lint Action   uses: ShubhamTatvamasi/terraform-lint-action@v1

**Issue:** #15861  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Researcher:** Copilot  
**WR Status:** Complete

---

## Research Findings

### Executive decision

**IMPLEMENT as specified**, with hardening:

- Pin `ShubhamTatvamasi/terraform-lint-action` to full commit SHA for tag `v1` (`7f0d5124…`)
- Install Terraform first via `hashicorp/setup-terraform` — the action is a composite shell that only runs `terraform fmt -check -recursive` and does **not** install the CLI
- Path-filter to `*.tf` / `*.tfvars` / `*.hcl` so unrelated PRs are not slowed

### Tool metadata (factual)

| Field | Value | Citation |
| --- | --- | --- |
| Stars | 0 | GitHub API `repos/ShubhamTatvamasi/terraform-lint-action` |
| Last push | 2022-03-19 | same |
| Tag `v1` SHA | `7f0d5124b29cf2b76e2c87964e35329aa8900f67` | `git/ref/tags/v1` |
| Behavior | `terraform fmt -check -recursive` only | `action.yml` |
| Installs Terraform? | No | `action.yml` |

### Marketing / SEO keywords

- terraform lint github action
- terraform fmt check ci
- hcl formatting gate
- infrastructure as code quality

### Monetization path

Free interactive checker (lead magnet) → Polar.sh multi-repo Terraform quality dashboard seats for agencies.

### Bundle shipped

1. `.github/workflows/terraform-lint.yml` — CI gate
2. `infrastructure/terraform/` — fmt-clean sample module
3. `products/terraform-lint-guard` — Next.js app + API + tests
4. `docs/terraform-lint-guard/` — live hub page
5. `tests/terraform-lint-workflow.test.js` — regression coverage
