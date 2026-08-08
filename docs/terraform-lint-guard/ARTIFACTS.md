# terraform-lint-guard — Delivery Artifacts

> Delivery packet for WR #15861.
> Code path: `products/terraform-lint-guard`
> Live: [https://revvel-standards.vercel.app/docs/terraform-lint-guard/](https://revvel-standards.vercel.app/docs/terraform-lint-guard/)

## Definition-of-Done requirements

| Requirement | Status | Notes |
| --- | :---: | --- |
| Live deployment URL | ✅ | <https://revvel-standards.vercel.app/docs/terraform-lint-guard/> |
| README `## Live Deployment` | ✅ | present |
| Live web test interface | ✅ | hub page + Next.js checker |
| .mcp.json at root | ❌ | not required for this product |
| Monetization wired | ✅ | Polar SaaS path in README |
| Tests | ✅ | `products/terraform-lint-guard/tests` + root workflow test |
| Listed in APP_REGISTRY.md | ✅ | listed |

_Legend: ✅ met · ❌ gap · ➖ not applicable._

## Required deliverable records

- [x] **Research** — action metadata: 0 stars, last push 2022-03-19, composite `terraform fmt -check` only; still required by WR
- [x] **Deploy** — static hub URL above; workflow on PR/push
- [x] **Monetize** — free checker lead magnet → Polar multi-repo plan
- [x] **Market / SEO** — keywords in product metadata (terraform lint, terraform fmt, github action)
- [x] **CI bundle** — `.github/workflows/terraform-lint.yml` + `infrastructure/terraform/` sample

## Factual citations

| Claim | Source |
| --- | --- |
| Action tag `v1` → commit `7f0d512…` | GitHub API `git/ref/tags/v1` on `ShubhamTatvamasi/terraform-lint-action` |
| Action runs `terraform fmt -check -recursive` only | `action.yml` in that repository |
| Action does not install Terraform | same `action.yml` (composite shell step only) |
| Stars / last update | GitHub API repository metadata (0 stars, updated 2022-03-19) |
