# Project dashboard hosting

**WR:** [#18379](https://github.com/midnghtsapphire/revvel-standards/issues/18379). The dashboard is the one from PR #549: `scripts/aggregate-project-dashboard.js` reads the inventory, BOM and project catalog and writes `dashboard.html` and `dashboard-data.json`. The page is plain static HTML.

## Why it 404s

`https://midnghtsapphire.github.io/revvel-standards/dashboard.html` returns 404 (checked 2026-11-11). GitHub Pages is off. The workflow that built and published it, `.github/workflows/update-project-dashboard.yml`, runs on GitHub-hosted Actions, which are billing-locked, and uses a marketplace action. It is kept as history and annotated.

## Options, cheapest first

| Option | Cost | Needs | Verdict |
| --- | --- | --- | --- |
| **Cloudflare Pages, Direct Upload from CircleCI** | Free plan. Direct Upload allows 20,000 files of up to 25 MiB each, and up to 100 custom domains per project. | A Cloudflare API token and account id as CircleCI env vars. A Pages project. One custom domain. | **Recommended.** Her DNS is already on Cloudflare, so `dashboard.oaudrey.com` is one click and Cloudflare adds the DNS record. No GitHub app, no Actions, no Vercel. |
| Cloudflare Pages with Git integration | Free. 500 builds a month. | Authorising the Cloudflare GitHub app on the repo. | Not chosen. It is a third-party app, and a Direct Upload project cannot be switched to Git integration later (or the reverse), so pick once. |
| GitHub Pages | Free, but the publish runs as an Actions workflow. | Billing unlocked. | Blocked while Actions are billing-locked. |
| Vercel | Free tier. | A Vercel project. | Out of scope for this WR. Not set up. |
| CircleCI artifact link only | Free. | Nothing. | Works today for reading the build, but the link needs a CircleCI session and expires. Not a site. |

## What is prepared in this repo

- CircleCI job `dashboard-build` generates the dashboard and stores `dashboard.html`, `index.html` and `dashboard-data.json` as artifacts under `dashboard/`. It runs only when a dashboard input changed (`triggers.dashboard` in `config/drop-folders.json`).
- On `main` only, and only when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist, it creates the Direct Upload project `revvel-dashboard` if needed and deploys `public/` with `wrangler@4.160.1` (pinned).
- Without those two variables it prints `SKIPPED` and exits 0. **A green skip is not a live site.**
- Nothing here enables Pages, creates a Cloudflare project, or sets a secret.

## One-time setup (needs Audrey's yes at each step)

1. In Cloudflare, create an API token limited to **Account, Cloudflare Pages, Edit**. Nothing else. Copy the account id.
2. In CircleCI, open the revvel-standards project, Project Settings, Environment Variables. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never put them in the repo or in chat.
3. Merge this PR. The next push to `main` that touches a dashboard input deploys to `revvel-dashboard.pages.dev`.
4. In Cloudflare, Workers & Pages, `revvel-dashboard`, Custom domains, add `dashboard.oaudrey.com`. Because the oaudrey.com zone is in the same Cloudflare account, Cloudflare creates the DNS record.
5. Decide public or private. The repo is public, so the dashboard data is already public. To make the page private, put Cloudflare Access (free for up to 50 users) in front of `dashboard.oaudrey.com`. That is a separate yes.

If step 4 cannot be done in the same account, the fallback is a proxied `CNAME dashboard` to `revvel-dashboard.pages.dev` in the oaudrey.com zone. That is a DNS change and needs her yes too.

## Rollback

Remove the two CircleCI env vars and the deploy step skips again. The Pages project and the domain can be removed in the Cloudflare dashboard. Nothing in the repo has to be reverted.

## Not verified here

- The Cloudflare account, token permissions and zone were not inspected. This repo has no access to them.
- The live site does not exist until the steps above are done. The `dashboard-build` job on the PR shows whether the generator runs in CircleCI.
- The dashboard page's text contrast against the 7:1 standard was not measured in this WR.
