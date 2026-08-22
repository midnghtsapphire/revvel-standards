# OpenRouter-first + LM Studio fallback (Coder / Agent)

Date: 2026-08-22
Agent: cursor-cloud

## Investigation

Searched for a real path from GitHub Actions to Audrey's laptop LM Studio.

Self-hosted workflows in this repo:
- `.github/workflows/wr-rewrite.yml` — `runs-on: self-hosted`, `LMSTUDIO_ENDPOINT: http://127.0.0.1:1234/v1`. Different job (WR rewrite). Learnings: four recorded runs failed in ~23s because no self-hosted runner existed.
- `.github/workflows/naukri-resume.yml` — `runs-on: self-hosted`. Unrelated (Naukri.com region requirement).

Coder / Agent:
- `.github/workflows/openrouter-coder.yml` job `code`: `runs-on: ubuntu-latest`
- `.github/workflows/openrouter-agent.yml` job `openrouter-agent`: `runs-on: ubuntu-latest`
- No runner labels that would sit on her laptop
- No documented local CLI dedicated to Coder/Agent (the coder script can be invoked by hand)

Conclusion: **CANNOT**. GitHub-hosted ubuntu cannot see `http://127.0.0.1:1234` on her machine. Do not invent a tunnel. Do not wire a localhost fallback into those jobs.

## Decision

- Keep both Actions jobs on `ubuntu-latest`.
- Do not set `REVVEL_LLM_ALLOW_CLOUD=1` on those jobs (spend gate stays required until a runner that can see LM Studio exists).
- Implement OpenRouter-first → LM Studio fallback in the Python scripts, gated off `RUNNER_ENVIRONMENT=github-hosted` / `GITHUB_ACTIONS=true` without `self-hosted`.
- Local CLI / future self-hosted runner on the laptop: fallback is real.
- Stop defaulting Coder to `anthropic/claude-opus-4.7`. Use `moonshotai/kimi-k2`.
