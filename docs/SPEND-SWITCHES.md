# Spend switches

Each paid job in `.github/workflows/` has a job-level `if:` gate:

```yaml
if: vars.REVVEL_LLM_ALLOW_CLOUD == '1' && vars.REVVEL_SWITCH_<GROUP> != '0'
```

If a job already had an `if:`, the original condition is kept and the gate is added with `&&`. No other workflow logic changed.

- **Master switch:** `REVVEL_LLM_ALLOW_CLOUD`. `1` = paid jobs may run. Anything else, including unset, = every paid job is skipped.
- **Group switches:** default on. Set one to `0` to turn off just that group while the master stays `1`.
- Every command below takes `-R midnghtsapphire/revvel-standards`.

```bash
gh variable set REVVEL_LLM_ALLOW_CLOUD --body 0 -R midnghtsapphire/revvel-standards   # everything off
gh variable set REVVEL_LLM_ALLOW_CLOUD --body 1 -R midnghtsapphire/revvel-standards   # master on
gh variable set REVVEL_SWITCH_REVIEW   --body 0 -R midnghtsapphire/revvel-standards   # e.g. review bots off
gh variable list -R midnghtsapphire/revvel-standards
```

| Switch | # | Workflows covered | What it bills | Toggle (`-R midnghtsapphire/revvel-standards`) |
|---|---|---|---|---|
| `REVVEL_SWITCH_RESEARCH` | 5 | `deep-search-research.yml`, `perplexity-research-agent.yml`, `research-engine.yml`, `research-module.yml`, `weekly-research.yml` | OpenRouter (sonar-pro / deep research), Perplexity API | `gh variable set REVVEL_SWITCH_RESEARCH --body 0` (off) / `--body 1` (on) |
| `REVVEL_SWITCH_REVIEW` | 14 | `ai-pr-review-openrouter.yml`, `bito-ai.yml`, `claude-renovate-review.yml`, `mabl.yml`, `octopus-cli.yml`, `octopus-review-fallback.yml`, `panda-ops.yml`, `pr-auto-review.yml`, `pr-review-request-handler.yml`, `recurse-ml.yml`, `ship-quality.yml`, `test-bito-integration.yml`, `xai-code-review.yml`, `xai-review-oleg-fork.yml` | OpenRouter, xAI, Anthropic (renovate review), OpenAI (panda-ops), Bito, Recurse ML, Octopus, Mabl | `gh variable set REVVEL_SWITCH_REVIEW --body 0` (off) / `--body 1` (on) |
| `REVVEL_SWITCH_CODING_AGENTS` | 21 | `agent-dispatcher.yml`, `agent-fallback.yml`, `ai-ci-failure-helper.yml`, `bernstein-orchestrator.yml`, `dependafix.yml`, `devin-code-review.yml`, `dragnet-ci-autofix.yml`, `goap-assignment-router.yml`, `jules-feedback.yml`, `jules-invoke.yml`, `jules-pr-comment.yml`, `jules-pr-reviewer.yml`, `openhands-resolver.yml`, `openrouter-agent.yml`, `openrouter-coder.yml`, `ralph-loop.yml`, `self-heal-pr.yml`, `stuck-wr-detector.yml`, `swe-agent.yml`, `ui-creation-engine.yml`, `wr-pr-creation.yml` | Jules, Devin, Cursor, OpenHands, SWE-agent, OpenRouter coding models, Gemini (dependafix), Bernstein multi-provider; routers that hand work to agents | `gh variable set REVVEL_SWITCH_CODING_AGENTS --body 0` (off) / `--body 1` (on) |
| `REVVEL_SWITCH_ROUTERS` | 11 | `brain-dump-intake.yml`, `free-llm-router.yml`, `needs-action-router.yml`, `openrouter-assignee.yml`, `openrouter-auto-route.yml`, `openrouter-triage.yml`, `pdf-work-request-router.yml`, `priority-router.yml`, `wr-auto-classify.yml`, `wr-field-filler.yml`, `wr-rewrite.yml` | OpenRouter calls for triage, priority, assignee and WR classification | `gh variable set REVVEL_SWITCH_ROUTERS --body 0` (off) / `--body 1` (on) |
| `REVVEL_SWITCH_PERSONAS` | 3 | `dragnet-team-assignment.yml`, `persona-comment-trigger.yml`, `update-agent-creator-data.yml` | OpenRouter / Perplexity persona runs (/handle comments, DRAGNET team) | `gh variable set REVVEL_SWITCH_PERSONAS --body 0` (off) / `--body 1` (on) |
| `REVVEL_SWITCH_MELODY` | 0 | (none yet) | melody-intel (no workflow in this repo today; reserved) | `gh variable set REVVEL_SWITCH_MELODY --body 0` (off) / `--body 1` (on) |
| `REVVEL_SWITCH_INFRA` | 3 | `devinci-debug.yml`, `markdown-image-alt-text-checker.yml`, `neon-branch.yml` | Neon branch databases, Azure Computer Vision, ASD devinci tunnels | `gh variable set REVVEL_SWITCH_INFRA --body 0` (off) / `--body 1` (on) |
| `REVVEL_LLM_ALLOW_CLOUD only` | 13 | `agent-audit-logger.yml`, `agent-monitor.yml`, `agent-scorecard.yml`, `ai-weekly-changelog.yml`, `biome-homeostat.yml`, `content-automation.yml`, `daily-diagnostic-audit.yml`, `gumloop-pdf-pipeline.yml`, `noimosai.yml`, `openrouter-instantiation-check.yml`, `openrouter-key-reset.yml`, `proof-of-life.yml`, `run-human-testing-api.yml` | Misc OpenRouter / Jules / Noimosai monitors and content jobs | — |

## Not gated by these switches
- `ship-to-market.yml`: holds `OPENROUTER_API_KEY` at the top level, but it has a known parse error that GitHub Actions reports (PyYAML loads it), so it was left untouched. Fix that error, then add the gate.
- `neon-branch.yml` → `delete_neon_branch`: left ungated on purpose, so cleanup still runs when the switch is off.
- **Dashboard-only services.** GitHub vars can't stop these; turn them off in each vendor's dashboard or app settings:
  - GitHub Copilot coding agent and Copilot code review (billing settings / repo Copilot settings)
  - Cursor Bugbot / background agents, Devin app, Jules app, and cubic / CodeRabbit-style review apps installed as GitHub Apps
  - OpenRouter key credit limit (openrouter.ai → Keys)
  - Neon and Azure billing caps
  - Vercel / Netlify / Railway / Fly deploys
- `.github/workflows/fleet-dispatch.yml`: checks the master switch for fleets marked `cloud: true`. Each fleet it starts is also gated by that fleet's own group switch.
