# Eco & Accessibility Marketplace Actions

This document captures the requested sustainability/accessibility GitHub
Marketplace bundle added to `revvel-standards` as reusable workflow templates.
These workflows are template-first additions for downstream repos: they are
designed to be copied into product repositories when the matching use case
exists, rather than enabled blindly in this standards repo.

## Inventory

| Action | Template | Upstream | Latest release used | GitHub stars* | Secrets / inputs | Best fit |
| --- | --- | --- | --- | ---: | --- | --- |
| Eco CI Energy Estimation | [`eco-ci-energy-estimation.yml`](../templates/cicd/eco-ci-energy-estimation.yml) | [`green-coding-solutions/eco-ci-energy-estimation`](https://github.com/green-coding-solutions/eco-ci-energy-estimation) | [`v5.3.0`](https://github.com/green-coding-solutions/eco-ci-energy-estimation/releases/tag/v5.3.0) | 110 | No required secrets; optional `GMT_API_TOKEN`, `CO2_GRID_INTENSITY_API_TOKEN` | Measure checkout / install / test energy on Linux GitHub runners |
| sustainable-npm | [`sustainable-npm.yml`](../templates/cicd/sustainable-npm.yml) | [`lowlydba/sustainable-npm`](https://github.com/lowlydba/sustainable-npm) | [`v3.0.0`](https://github.com/lowlydba/sustainable-npm/releases/tag/v3.0.0) | 13 | No secrets; npm-only workflow | Lower-noise, lower-overhead npm installs for Node repos |
| a11yGuard | [`a11yguard.yml`](../templates/cicd/a11yguard.yml) | [`a11ywatch/github-actions`](https://github.com/a11ywatch/github-actions) | [`v2.1.10`](https://github.com/a11ywatch/github-actions/releases/tag/v2.1.10) | 26 | URL input plus optional `A11YWATCH_TOKEN` / Computer Vision secrets | Accessibility scans against preview or production URLs on PRs |
| Eco Infra Action | [`eco-infra-action.yml`](../templates/cicd/eco-infra-action.yml) | [`eco-infra/ecoinfra-action`](https://github.com/eco-infra/ecoinfra-action) | [`v1.1.2`](https://github.com/eco-infra/ecoinfra-action/releases/tag/v1.1.2) | 5 | `ECOINFRA_TOKEN`, `project-name`, `plan-file` | Upload Terraform/infra plan JSON for emissions reporting |
| Naukri Resume Action | [`naukri-resume-action.yml`](../templates/cicd/naukri-resume-action.yml) | [`Prateek-Wayne/naukri-resume-action`](https://github.com/Prateek-Wayne/naukri-resume-action) | [`v1.0.1`](https://github.com/Prateek-Wayne/naukri-resume-action/releases/tag/v1.0.1) | 21 | `NAUKRI_USERNAME`, `NAUKRI_PASSWORD`, `NAUKRI_PROFILE_ID`, `resume_path` | Job-search automation repos with self-hosted runners in supported regions |

\* GitHub star counts captured from repository metadata on 2026-05-19.

## Adoption notes

- **Template-only by default.** These are not enabled in this repository's
  live workflows because each action has repo-specific prerequisites
  (preview URL, infra plan JSON, Naukri credentials, or a matching Node CI
  lane).
- **Eco CI + sustainable-npm pair well together.** Use
  `sustainable-npm.yml` to reduce npm overhead, then
  `eco-ci-energy-estimation.yml` to measure the effect.
- **a11yGuard upstream naming is slightly inconsistent.** The Marketplace
  request references `a11yGuard`; the currently maintained upstream repo is
  [`a11ywatch/github-actions`](https://github.com/a11ywatch/github-actions).
- **Eco Infra input naming required validation.** The upstream README example
  references `file`, but the shipped action code reads `plan-file`; the
  template follows the actual implementation.
- **Naukri is intentionally isolated.** It requires a self-hosted runner in a
  region where Naukri is reachable, so it is unsuitable for blanket rollout
  across standard app repos.

## Suggested rollout order

1. **Node repos:** start with `sustainable-npm.yml`, then add
   `eco-ci-energy-estimation.yml` to quantify the install/test savings.
2. **Web apps with preview URLs:** add `a11yguard.yml` after the preview URL is
   available through a repo variable, secret, or manual dispatch input.
3. **Infrastructure repos:** add `eco-infra-action.yml` only when the workflow
   already produces a plan JSON artifact.
4. **Automation/personal ops repos:** add `naukri-resume-action.yml` only where
   the self-hosted-runner and credential requirements are acceptable.
