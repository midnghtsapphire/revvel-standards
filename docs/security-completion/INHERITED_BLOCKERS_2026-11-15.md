# Inherited root-suite blockers — 2026-11-15

The focused security suite passes. The full root suite is not green, and this draft does not claim otherwise.

1. `tests/llm-spend-gate-coverage.test.js`: `scripts/pot_research_engine.py` and `scripts/wr_dispatch.mjs` have ungated paid-provider call sites. No provider calls were made by this task; root tests ran with cloud spend disabled and inherited API-key environment stripped.
2. The same coverage file flags `.github/workflows/opencode.yml` passing a paid credential to `anomalyco/opencode/github@latest` without the cloud-spend condition.
3. `tests/python-flake8-workflow.test.js`: 250 path/code count pairs exceed the committed repository baseline. They are in unchanged existing source files. The initial run also found task-created helper formatting debt; that debt was fixed without adding lint exemptions or editing the baseline. `flake8 docs/security-completion/*.py` now exits 0.
4. `tests/visiting-agent-scan.test.js`: four affiliate-related hits in `products/oaudrey-home/public/index.html`, lines 220–222 and 265. Those lines and the visiting-agent pattern/baseline configuration are unchanged. They were not deleted or allowlisted to green the suite.

All remaining lint offender paths and the spend/affiliate/configuration paths above were compared against `e6b5a9965` using `git diff --quiet <baseline> -- <exact path>`; none was changed by this task. Production guard/fleet/archival changes have targeted tests and do not modify these unrelated product/workflow sources. The coordinator should assign the spend-policy and product/baseline work rather than suppressing the failures.

Remote blockers remain account-wide GitHub Actions failures/no steps and the coordinator-observed Checks API 403. Existing CircleCI integration is a separate owned lane; `.circleci/config.yml` was deliberately not modified here. Do not pay, change billing, migrate untrusted work to privileged self-hosted execution, or claim active enforcement before owner merge, successful trusted integration runs, and required-check activation.
