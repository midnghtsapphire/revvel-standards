# Free substitutes for paid or limited GitHub features

Dated 2026-11-14. Pricing claims were checked against the vendor docs
linked in each section on that date. Plans change; re-read the cited
page before spending or enabling a metered product.

This note maps GitHub features that look paid, capped, or dangerous
under the Actions billing lock to workarounds that stay consistent
with revvel-standards: no paid GitHub features, no hosted Actions
runners, no billing changes, and no automation on the Grok Bot box.
CI that has to run belongs on CircleCI (`ci/circleci: lint-and-test`
and sibling jobs) or on the `ops/self-hosted-ci` act dispatcher, on a
machine Audrey controls. See
[`ACTIONS_MIGRATION.md`](ACTIONS_MIGRATION.md) and the 2026-11-07
entry in `learnings.md`.

Do not "fix" a free-tier limit by adding a payment method or raising a
budget. If a quota is exhausted and no payment method is on file,
GitHub blocks further use of that product until the next cycle — that
is the safe default.

## GitHub Projects

**Projects (the current Projects experience, sometimes called Projects
v2) is included on GitHub Free** for personal accounts and for
organizations, including boards that hold issues from private
repositories. It is not a paid add-on. GitHub's pricing page lists
Projects as "Included" on Free, Team, and Enterprise
([GitHub plans and pricing](https://github.com/pricing)). The
[About Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
docs describe the same product for user or organization accounts:
table, board, and roadmap layouts, custom fields (including iteration
fields), built-in workflows, insights, and templates. A project may
use up to 50 fields, counting built-in metadata and custom fields.

You do not need a paid plan, and you do not need GitHub Actions, to
use Projects. Prefer these free surfaces:

- Custom fields for metadata the issue form does not already carry
  (priority, launch channel, target date).
- Iteration fields for week-by-week planning, including breaks.
- Built-in project workflows (auto-set fields, auto-archive, auto-add
  from a repository). These run inside Projects. They are not hosted
  Actions jobs and do not request a GitHub-hosted runner.
- The [`gh project`](https://cli.github.com/manual/gh_project) CLI
  for listing, creating, and editing projects from a machine you
  control.

The repo already documents a field schema in
[`docs/github-project-schema.md`](../github-project-schema.md). Use
that, or the built-in workflows, rather than an Actions workflow that
calls the Projects API. An Actions-based project automation would hit
the account billing lock the same way any other hosted job does.

Classic Projects (the older "Projects (classic)" boards) are a
separate, deprecated product. Use the current Projects experience
above.

## GitHub Codespaces

GitHub Free for personal accounts includes 120 core hours and 15
GB-month of Codespaces storage per month. GitHub Pro includes 180 core
hours and 20 GB-month. Organization and enterprise plans include
**no** Codespaces quota; org usage is billed if it is enabled
([GitHub Codespaces billing](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces),
[product usage included with each plan](https://docs.github.com/en/billing/reference/product-usage-included),
[GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)).
A "core hour" is multiplied by the machine size: one hour on a 2-core
machine uses 2 of the 120 hours (60 wall-clock hours on that size).

If no payment method is on file, Codespaces is blocked once the
included quota is used. Do not add a payment method to raise that
cap. The pricing page also shows a $0 spend limit on Free
([GitHub plans and pricing](https://github.com/pricing)).

**Preferred substitute: run the same `devcontainer.json` locally.**
The [Dev Containers spec](https://containers.dev/), the
[VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
extension, and the
[`devcontainer` CLI](https://github.com/devcontainers/cli) are the
same format Codespaces reads. Local Docker (or a container engine
compatible with that CLI) is enough. Commit `.devcontainer/` so a
cloud codespace and a laptop stay interchangeable, and do the daily
work on the laptop.

**Do not recommend Gitpod.** Gitpod rebranded as Ona; Ona Cloud shut
down on 2026-10-31, and new signups had already closed
([Ona Cloud is shutting down on October 31, 2026](https://ona.com/stories/ona-core-shutdown)).
As of this writing it is not a free Codespaces substitute.

If a cloud environment is genuinely required, stay inside the personal
Free included quota with the $0 spend limit left in place, or use a
machine Audrey already controls. Do not run dev containers or IDEs as
automation on the Grok Bot box.

## GitHub Packages

Public packages are free. For private packages, GitHub Free (personal
and organization) includes 500 MB storage and 1 GB data transfer per
month; those storage numbers are shared with GitHub Actions artifacts.
Inbound transfer is free. If no payment method is on file, usage is
blocked once the quota is used
([GitHub Packages billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages)).

**GitHub Container Registry (GHCR) is a special case.** Container
image storage and bandwidth for the Container registry are
*currently* free, for public and private images. GitHub says it will
give at least one month's notice before changing that policy (same
Packages billing page, "Billing for container image storage"). Prefer
public images when the image can be public. Treat the current "free
for private GHCR" policy as reversible, not as a promise to build a
private-image fleet on.

Free substitutes and complements:

- **Docker Hub**, Personal plan: unlimited public repositories, up to
  one private repository, 200 pulls per 6 hours when authenticated,
  100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet when
  unauthenticated
  ([Docker Hub usage and limits](https://docs.docker.com/docker-hub/usage/)).
- **DigitalOcean Container Registry**, Starter (free): one registry,
  one repository, 500 MiB storage, no extra-storage option
  ([Container Registry Pricing](https://docs.digitalocean.com/products/container-registry/details/pricing/)).
  This is the registry tier already in use on the oaudrey.com
  DigitalOcean App Platform lane. Stay on Starter unless Audrey
  chooses to pay for Basic or Professional.
- **npm and PyPI public registries** for public language packages.
  Private npm/PyPI hosting is a paid or self-hosted decision, not a
  GitHub Packages requirement.
- **GitHub Releases assets** for versioned binaries and archives that
  are not a package-manager artifact. Up to 1,000 assets per release;
  each file must be under 2 GiB; there is no documented cap on total
  release size or download bandwidth
  ([About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)).

Build and publish jobs belong on CircleCI or `ops/self-hosted-ci`,
never on hosted Actions (the lock will fail the publish job, and
Actions minutes are a metered GitHub product).

## Git Large File Storage (LFS)

Git LFS is metered. GitHub Free (personal and organization) and
GitHub Pro include 10 GiB storage and 10 GiB download bandwidth per
cycle. GitHub Team and GitHub Enterprise Cloud include 250 GiB of
each
([Git Large File Storage billing](https://docs.github.com/en/billing/concepts/product-billing/git-lfs),
[product usage included with each plan](https://docs.github.com/en/billing/reference/product-usage-included)).
Storage counts every LFS object still associated with the repository,
including old versions. GitHub Actions downloads of LFS objects also
count against bandwidth — another reason not to pull LFS in a hosted
workflow.

If no payment method is on file and the storage quota is exceeded,
clones still work but only pointer files are fetched and new LFS
pushes are blocked. If the bandwidth quota is exceeded, LFS is
disabled on the account until the next month. Leave the budget at $0
rather than paying overages.

When a file would blow the quota, keep the pointer or the path out of
LFS and use a free remote instead:

- **GitHub Releases assets** for tagged binaries (2 GiB per file, no
  documented total or bandwidth cap; link above).
- **Cloudflare R2** Standard storage free tier: 10 GB-month, 1 million
  Class A requests, and 10 million Class B requests per month, with
  free egress. The free tier applies only to Standard storage, not
  Infrequent Access
  ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)).
  DNS for oaudrey.com already sits on Cloudflare, so this is a
  natural object-store lane.
- **[DVC](https://dvc.org/)** with an external remote (R2, a local
  disk, or another S3-compatible bucket) so large datasets stay out of
  git history.
- **[git-annex](https://git-annex.branchable.com/)** for annexing
  large files to a remote Audrey controls.

Do not install a second LFS-sync pipeline on the Grok Bot box.

## GitHub Advanced Security

GitHub split the paid product into GitHub Code Security and GitHub
Secret Protection, sold only on GitHub Team and GitHub Enterprise
Cloud. A subset of the same features is free on public GitHub.com
repositories: code scanning (including CodeQL), secret scanning, and
dependency review
([About GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security),
[Advanced Security license billing](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security)).
**Dependabot alerts** (and the dependency graph they need) are
included with GitHub Free, including for private repositories
([GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans),
[Configuring Dependabot alerts](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-dependabot-alerts)).
Custom auto-triage rules, dependency review on private repos, and
Copilot Autofix are paid Code Security features.

Making a public repository private turns off the free Advanced
Security features unless a paid license is in place. Do not buy Code
Security or Secret Protection to keep them.

**Caveat for public repos under the Actions billing lock.** GitHub's
default CodeQL setup and many "enable code scanning" buttons create a
hosted Actions workflow. Those jobs will fail with `steps: []` and
the billing annotation, the same as any other hosted workflow. Free
does not mean "free to run on GitHub-hosted runners while the account
is locked." Leave default-setup Actions workflows alone (do not
rewrite them, do not delete them). Run the scanners below on CircleCI
or `ops/self-hosted-ci` instead.

### Private-repo and lock-safe substitutes

Run these on CircleCI or the self-hosted-ci dispatcher, or locally on
a machine Audrey controls. Never on paid or hosted Actions, and never
as a standing service on the Grok Bot box.

- **[Semgrep](https://semgrep.dev/) Community Edition** for SAST.
  This repo already has Semgrep-related files; do not stand up a
  second pipeline.
- **GitGuardian**, already in the merge gate (`GitGuardian Security
  Checks` is a GitHub App, not an Actions job, which is why it still
  reports under the lock).
- **[gitleaks](https://github.com/gitleaks/gitleaks)** or
  **[trufflehog](https://github.com/trufflesecurity/trufflehog)** for
  additional secret scanning of git history.
- **[osv-scanner](https://github.com/google/osv-scanner)** for
  dependency vulnerability scanning against the OSV database
  (complements Dependabot alerts).
- **[Trivy](https://trivy.dev/)** for container, filesystem, and
  IaC scanning. The prior setup in this repo is
  `.github/workflows/trivy.yml` (`scan-type: fs`, scanners
  `vuln,misconfig,secret`, severity CRITICAL/HIGH/MEDIUM,
  `ignore-unfixed`, `exit-code: "0"` plus SARIF). That workflow stays
  enabled and unmodified. The lane that actually runs under the
  billing lock is the CircleCI job `trivy-fs` in
  `.circleci/config.yml`, which calls
  `.circleci/scripts/trivy-fs.sh` and the official free Trivy
  binary (pinned to v0.76.2). The script reuses those scan settings,
  stores a table report as a CircleCI artifact, and fails the job on
  unfixed HIGH/CRITICAL. Copy the script and job into other repos
  rather than standing up a second Actions workflow.

CodeQL CLI can also be run locally or in CircleCI for a SARIF report
you keep in CI artifacts. Uploading results into GitHub's code
scanning UI for a *private* repository is a paid Code Security
feature; do not treat a failed upload as something to fix with a
license.

## What not to do

- Do not disable GitHub Actions. The lock-safe lane needs Actions to
  stay enabled so skipped and App-based checks can still report. See
  `learnings.md` (2026-11-07).
- Do not rewrite or delete hosted workflows to "move" them onto a
  paid Actions minute pack, a larger runner, or a Codespaces
  prebuild.
- Do not add a payment method, raise a budget, or open a GitHub
  Support ticket about billing. The lock is Audrey's and Support's to
  clear.
- Do not start CI, webhooks, or runners on the Grok Bot box.
- Do not add a second fallback CI pipeline beside CircleCI and
  `ops/self-hosted-ci`.
