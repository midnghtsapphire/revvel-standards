# Blue-ocean research: green software for a GitHub-integrated agent fleet

Work request `eco-run-20261119`, researched 2026-11-19 by Decipherer. Every
claim carries a status: **verified** means the page was opened and the figure
read there; **unverified** means it came from a search summary or a single
non-peer-reviewed source and should be re-checked before it is quoted.

## The landscape in five lines

- The measurement standard exists: SCI, `SCI = ((E x I) + M) per R`, is
  ISO/IEC 21031:2024, published 2024-03-22. Verified
  ([ISO](https://www.iso.org/standard/86612.html),
  [IEC](https://webstore.iec.ch/en/publication/93436)).
- SCI for AI extends it to training and inference and distinguishes provider
  from consumer boundaries. Its own timeline lists publication in Q1 2026 and
  ISO submission in Q2 2026; whether that happened is unverified
  ([GSF](https://greensoftware.foundation/standards/sci-ai/)). A GSF
  reference implementation for LLM inference exists (verified,
  [repo](https://github.com/Green-Software-Foundation/reference-implementations/tree/main/specifications/sci-for-ai)).
- The Impact Framework (IF) turns an SCI claim into a re-executable YAML
  manifest. It is a GSF Graduated Project. Verified
  ([repo](https://github.com/green-software-foundation/if)). The manifest as a
  reporting protocol (IMP) is still a proposal in a GSF discussion; unverified
  as adopted ([discussion 386](https://github.com/Green-Software-Foundation/sci/discussions/386)).
- Measurement tools are alive: CodeCarbon v3.3.2 (2026-10-23), Kepler v0.12.0
  (2026-09-22, rewritten around `/proc` and `/sys`), Scaphandre (early stage,
  Linux and Windows). Verified from release pages and the
  [CNCF post](https://www.cncf.io/blog/2026/06/30/kepler-re-architected-improved-power-accuracy-and-a-community-call-to-action/).
- Carbon-aware CI already has tools: Capybara reschedules non-urgent runs and
  says CI/CD should not be delayed; carbon-aware-dispatcher adds a monthly
  gram budget. Verified from READMEs
  ([Capybara](https://github.com/CapybaraOrg/capybara-action),
  [dispatcher](https://github.com/peterklingelhofer/carbon-aware-dispatcher)).
  A PR-time energy-regression gate also exists in at least one small repo
  ([ecocompute-dynamic-eval](https://github.com/hongping-zh/ecocompute-dynamic-eval)):
  unverified, not opened. So "energy budget per PR" alone is not blue ocean.

## Five differentiators that fit the niche

Ranked by how little competition was found and how well each fits what this
repo already has (a hash-chained ledger habit, an LLM spend gate, a fleet of
agents that open PRs, an accessibility-first app standard).

### 1. Agent-fleet energy ledger: SCI per work request and per PR, cache-aware

Count the energy of the bots, not only the CI. A PR in this fleet costs far more
in model calls than in test runs, and nobody ships that number.

- Gap, verified: a 10-week study of real agent-assisted development found 94.8%
  of API-reported tokens are cached-context reads, an output-only estimator
  (EcoLogits) differs from a cache-aware one by about 25x (250 kWh vs 10 kWh for
  the workload), and parent-session logs undercount subagent tokens by about
  10x ([arXiv 2611.20873](https://arxiv.org/abs/2611.20873), preprint, authors
  say neither estimator is validated on long cached contexts).
- Per-task figures to calibrate against, verified as published (single-author
  database, not peer reviewed): 150 Wh for one task delegated to a coding agent,
  0.34 Wh for a short chat answer
  ([TokWatt, arXiv 2610.39846](https://arxiv.org/abs/2610.39846)). The two
  differ by orders of magnitude depending on what is counted; always state the
  boundary.
- Existing instrumentation is about cost, not energy: GitHub logs a
  `token-usage.jsonl` per workflow (input, output, cache read, cache write,
  model, provider) through an API proxy, verified
  ([GitHub blog, 2026-05-07](https://github.blog/ai-and-ml/github-copilot/improving-token-efficiency-in-github-agentic-workflows/)).
- EcoLogits (v0.11.3) estimates API-call energy but lists no OpenRouter
  provider, so OpenRouter-routed fleets are uncovered. Search summary only;
  unverified ([PyPI](https://pypi.org/project/ecologits/)).
- Fit: `scripts/llm-spend-gate` already meters spend per call. Add tokens x
  model-class Wh/token x grid, write one row per PR into an append-only hashed
  ledger with the boundary and method stated. Report E, I, M, R separately and
  never a single unqualified "kg saved". Preregister the model-to-Wh table
  before using it, the same way the research ledgers work.

### 2. A re-executable Impact Manifest on every PR

Emit a GSF Impact Framework manifest next to `eco-summary.json`, so anyone can
re-run the arithmetic behind a claim.

- Why it stands out, verified: SCI requires disclosing the boundary and method,
  and IF manifests record boundary, functional unit, data and coefficients in
  YAML that can be re-executed ([GSF article](https://greensoftware.foundation/articles/built-to-measure-sci-impact-framework-and-carmen/)).
  Competing CI energy actions print a number, not evidence. No GitHub-native PR
  tool emitting IF manifests was found in this search (absence of evidence, not
  proof).
- Fit: matches the "real data only, no inferred values" rule. The manifest
  would hold the measured CPU series, the curve version and the grid constant.

### 3. Model-versus-meter calibration on her own machine

Eco CI is a model, and on unknown CPUs a poor one by its own warning. Publish
how wrong it is.

- Run Scaphandre (Windows supported, verified) or CodeCarbon (reads RAPL where
  present) on the CARESSE runner or a plugged-in meter, run the same `npm ci`
  and `npm test` laps, and compare to the Eco CI estimate. Eco CI documents how
  to add a custom power curve for dedicated runners (its README section
  "Support for dedicated runners / non-standard machines", read 2026-11-19).
- Why it is open: almost every CI energy badge presents a modelled number
  without an error bar. A published calibration with the uncertainty is a
  credibility claim that is hard to copy without hardware. Needs hardware access
  Audrey would have to grant; nothing here assumes RAPL is available on a
  Windows laptop.

### 4. Carbon-aware routing for the agent fleet's non-urgent work only

Apply carbon-aware scheduling where delay is free: the nightly claim watcher,
batch WR runs, backfills. Do not delay PR checks (Capybara itself says CI/CD
should run immediately).

- Prior art exists for generic workflows (verified above), so the
  differentiator is the target (LLM-fleet jobs) plus a monthly gram budget tied
  to the ledger in idea 1, not the scheduler itself.
- Data caveat, partly verified: Electricity Maps lists a 14-day trial and no
  ongoing free tier; WattTime forecasts need a subscription (CAISO_NORTH only
  without one); the Carbon Aware SDK supports both
  ([SDK config](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/configuration),
  [WattTime](https://docs.watttime.org/)). The dispatcher claims 16 open-data
  sources and a 27 gCO2eq/kWh average saving per deferral in a 90-day backtest;
  that figure is the vendor's own and unverified. Marginal versus average
  signals differ; state which one is used.

### 5. ECO CODE mode with a per-PR byte and carbon delta

Her accessibility standard already requires an ECO CODE mode (minimal motion, no
shadows or filters, grayscale images, no video). Make it provable.

- CI renders each product in normal and ECO CODE mode, runs
  `scripts/eco/website-carbon.js` on both, and comments the bytes and gCO2e
  difference on the PR. The Website Carbon `/data` endpoint is public and takes
  bytes plus a green flag (verified in its API docs, 2026-11-19).
- Claim to check before using it in marketing: the repo's own research says "No
  ADHD app offers eco-mode"
  (`docs/neurooz/NEUROOZ_BLUE_OCEAN_RESEARCH.md`). That is her research note,
  not independently verified here. Also note the current script counts the
  initial HTML and linked assets only; a headless-browser version would be needed
  for the final bytes of a JavaScript app.
- Fit: eco as an accessibility feature (battery, low bandwidth, sensory load)
  rather than as a sustainability badge is the angle that most green-software
  tooling does not take. Status: positioning idea, unverified as unoccupied.

## What not to build

- A "carbon saved" claim that uses offsets: SCI excludes them (verified in the
  spec). 
- A single global Wh-per-prompt constant. Published figures span about two
  orders of magnitude depending on boundary (TokWatt above); pick a boundary
  and say it.
- A CI energy gate with a hard fail threshold before there is a baseline of at
  least a few weeks of `eco-summary.json` files from the same runner class.

## Suggested order

1. Let `eco-energy` collect two weeks of baseline on CircleCI (this PR).
2. Idea 5 (smallest build, reuses `website-carbon.js`).
3. Idea 1 (largest differentiation; needs the model-to-Wh table preregistered).
4. Idea 2 as the output format for 1.
5. Idea 3 when hardware is available; idea 4 after 1 exists.
