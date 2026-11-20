# Eco run: what it is, why it was not running, how it runs now

Work request `eco-run-20261119`. Written by Decipherer. Audrey's ask on
2026-11-19: "i really need the eco portion to run it is my claim to fame".

## What "the eco portion" is

Four things in this repo carry the eco name. Only the first two are CI, and
they are what stopped running.

| Piece | Where | What it does |
| --- | --- | --- |
| Eco energy workflow | `.github/workflows/eco-github-extensions.yml` | Per PR: estimate CI energy with Eco CI, set low-overhead npm settings, run a WCAG check, upload an infra-emissions report. |
| Website green-o-meter | `.github/workflows/green-website.yml` | Fetch a website's carbon score and write a card into `README.md` at `<!-- CARBON-STATS -->`, plus a `carbon` JSON file. |
| ECO CODE accessibility mode | `README.md` (Accessibility Module Specifications), `docs/DEFAULT_APP_TEMPLATE.md` | Low-power mode for every app: minimal animation, no shadows or filters, grayscale images, no video. A spec, not CI. |
| Sustainable Coding | `README.md` section 6 (Strategic Blue Ocean Areas) | One line: "Eco-friendly, low-carbon code standards". |

Templates for the same actions are in `templates/cicd/` and the action
inventory is `docs/ECO_MARKETPLACE_ACTIONS.md`. Standards:
`standards/GREEN_WEBSITE_REPORTING_STANDARD.md`.

## Why it did not run (evidence)

1. **GitHub bills it out before step 1.** Run
   [44571488806](https://github.com/midnghtsapphire/revvel-standards/actions/runs/44571488806),
   every job: 0 steps, no runner, check-run annotation "The job was not started
   because your account is locked due to a billing issue." Every Eco Github
   Extensions run I listed (2026-11-16 to 2026-11-19) and every Website
   green-o-meter run I listed (2026-11-15) fails the same way. Nothing in the YAML is reached.
   The self-hosted runner CARESSE is registered and online
   (`gh api repos/midnghtsapphire/revvel-standards/actions/runners`), but it is
   Windows, and Eco CI supports Linux only (its README: "Windows is currently
   only supported with WSL2"). Neither workflow targets `self-hosted` anyway.
2. **CircleCI could not run anything either.** `main`'s `.circleci/config.yml`
   does not compile. Commit `88d862206` (#18436) inserted the `huge-delete-guard`
   job into the middle of `policy-check`, leaving `policy-check` with
   `steps: null` and attaching its real steps to `huge-delete-guard`. CircleCI
   rejects the whole file: the push pipelines I read (five of the last eight
   runs, every branch push since 2026-11-18) are `not_run` with
   `[#/jobs/policy-check] required key [steps] not found`, and `validate_config`
   on `main`'s file returns invalid. The other three of those eight are
   scheduled pipelines on `main` (`setup-workflow` then `chunk-task`), which do
   not use this file and succeed. Two repo tests were red for it
   (`circleci-config-structure`, `security-circleci-config`).
   This PR restores the steps with a pure move: `policy-check` is byte-identical
   to `555bfa53e`, no line removed.
3. **Two more defects that billing was hiding.**
   - `green-website.yml` calls `https://api.websitecarbon.com/site`. That
     endpoint has had no public access since 2025-07-14 (the API docs say so;
     checked 2026-11-19: HTTP 401 `Unauthorised`). Only `/data?bytes=&green=` is
     public. The workflow default URL
     (`https://midnghtsapphire.github.io/revvel-standards/`) is also a 404:
     GitHub Pages is not enabled on this repo. The README marker
     `<!-- CARBON-STATS -->` is still unreplaced, so the card has never been
     written.
   - `eco-github-extensions.yml`:
     - the "sustainable npm" step (`lowlydba/sustainable-npm`) only sets npm
       config and never installs, so the measurement after it measured nothing;
     - the `ecoinfra` job passes `file:` but the action reads `plan-file`
       (v1.4.0's `action.yml` also has a malformed `-file` key), and
       `./state.json` is a dashboard summary, not a Terraform plan. This repo
       has no Terraform plan to report;
     - Eco CI's `send-data` defaults to `true`, which posts repo name, branch,
       commit and CPU model to `metrics.green-coding.io`.

## How it runs now

| Job (CircleCI) | When | Output |
| --- | --- | --- |
| `eco-energy` | every PR branch and `main` | `eco-summary.json`, `eco-ci-output.txt`, `lap-data.json` in the build's Artifacts tab, under `eco/` |
| `eco-website-carbon` | `main` only | `carbon.json` under `eco/` |

- `scripts/eco/eco-ci-run.sh` drives Eco CI v5.3.0 (pinned by full commit
  `782dd4a31bc426a6ae26a7b08d89af454b10ffc0`, verified after fetch) around two
  laps: `npm ci` with the sustainable-npm settings, then the full `npm test`.
  It runs on a CircleCI `machine` executor because Eco CI samples `/proc/stat`;
  in a Docker executor that file describes the shared host.
- `scripts/eco/website-carbon.js` measures the page weight itself (HTML plus
  linked assets, wire bytes), asks the Green Web Foundation whether the host is
  green, and calls the public `/data` endpoint. It writes the same `cleanerThan`,
  `gco2e` and `rating` fields the README card code reads.
- No secret, no context, no data leaves the runner except the Green Web
  Foundation and Website Carbon lookups. Nothing is committed to `main` by CI.
- The two GitHub workflows stay in place, unchanged except for a header note
  (never delete). If the billing lock is lifted they run again with the defects
  above still in them; fix those first.

### Run it yourself

On any Linux box or WSL2 shell (needs `git curl jq awk`, GNU `date`, Node 22 or
24):

```bash
ECO_OUT_DIR=/tmp/eco-out ECO_MACHINE_LABEL=my-machine bash scripts/eco/eco-ci-run.sh
GREEN_WEBSITE_URL=https://example.org/ node scripts/eco/website-carbon.js --out /tmp/eco-out
```

## How to read the number

`eco-summary.json` says `estimate_kind: model-estimate from CPU utilisation`.
Eco CI does not read a power meter. It samples CPU utilisation each second and
maps it through a pre-computed power curve (Cloud Energy, trained on SPECpower
data). For a CPU it has no curve for, which is the case on CircleCI machine
images and on the bot box, it uses a generic `default.sh` curve that Eco CI's own
log warns "will likely produce very unaccurate results". So:

- compare runs on the same runner class over time; do not quote one run as an
  absolute energy claim;
- the carbon figure uses a constant grid intensity (472 gCO2e/kWh, Eco CI's
  world-average default), not the live grid where the runner is;
- the SCI figure Eco CI prints adds an embodied-carbon share from a generic
  server profile. Treat it as an assumption;
- laps shorter than one second get no figure; the summary lists them in
  `laps_too_short_to_sample`;
- `npm test` has 19 failures on `main` that are not from this change (Python
  tooling, workflow-validation tests); the job records the exit code in
  `workload_exit_code_npm_test` and does not fail on it, because `lint-and-test`
  is the gate.

## Verified locally (2026-11-19, bot box, not CI)

Eco CI v5.3.0 fetched at the pinned commit. One run on the bot box: `npm ci`
2.37 s, 387.7 J (model estimate); `npm test` 16.32 s, 3903.9 J (model
estimate); total 4291.6 J (1.19 Wh), 0.563 g CO2e at 472 g/kWh. The box CPU is
"Intel Xeon Processor" with no matching curve, so these are default-curve
numbers. `tests/eco-run.test.js` (9 tests) passes; `npm test` goes from 21
failures on clean `main` to 19, the two fixed being the CircleCI config tests.
Website carbon against a real live page,
`https://midnghtsapphire.github.io/eco-anchor-site/`: 1,288 bytes over 2
requests, green host, 0.000110 gCO2e per view, rating A+. Against this repo's
old default URL it exits 1 with "HTTP 404" and writes nothing.

## What still needs Audrey

1. **A URL to measure.** Set `GREEN_WEBSITE_URL` as a CircleCI project
   environment variable (a URL, not a secret). Until then `eco-website-carbon`
   prints SKIPPED and exits 0; that is a skip, not a report. Candidates checked:
   `https://oaudrey.com/` is a 106-byte JavaScript redirect stub (measuring it
   would give a meaningless A+); `audit.oaudrey.com` does not resolve;
   `https://midnghtsapphire.github.io/eco-anchor-site/` is live.
2. **Confirm CircleCI follows this repo** (it does: pipelines are created) and
   that machine executors are available on the Performance plan (they are in
   CircleCI's docs; not verified against her account until the first run).
3. **Decide the README card.** CI does not commit to `main`. Copy the numbers
   from `carbon.json` into the README by hand, or ask for a small PR job.
4. **CARESSE.** It is online but Windows. To use it for eco, install WSL2 and a
   CircleCI self-hosted runner there, or register a Linux runner. Not done.
5. **Billing lock** (A9 in the BOM) only matters for the two old workflows now.
