# CircleCI Integration Standard

**Version:** 1.0.0
**Date:** 2026-07-07
**Status:** Active
**Owner:** MIDNGHTSAPPHIRE
**Scope:** All projects in the Revvel ecosystem
**Persona:** 🪐 ORBIT (`/orbit`, `/circleci`) — playbook at [`skills/circleci-expert/SKILL.md`](../skills/circleci-expert/SKILL.md)

---

## 1. Overview

CircleCI is the fleet's second CI lane alongside GitHub Actions. Division of labor:

- **GitHub Actions** owns repo automation: AI PR review, persona summons, labels,
  lifecycle, auto-merge.
- **CircleCI** owns the *build-and-test gate*: lint, tests, and (as adopted)
  parallelized suites, timing-based test splitting, and config policies.

ORBIT is the named persona responsible for every `.circleci/config.yml` in the
ecosystem. Any agent touching CircleCI config must load `skills/circleci-expert`
first.

## 2. Current wiring (this repo)

`.circleci/config.yml` runs two jobs on every PR and on `main`:

| Job | What it gates |
|---|---|
| `lint-and-test` | Changed-Markdown lint (merge-base scoped, so the legacy backlog doesn't drown new work) + real `node --test` and shell tests |
| `validate-registries` | Persona registry (`scripts/openrouter-personas.js`) parses and resolves; `skills/SKILLS_INDEX.yml` is valid YAML — a broken edit here silently kills every `/persona` summon |

## 3. House rules

1. **Validate before push.** `circleci config validate`, then read
   `circleci config process` output. YAML-debug-by-commit-spam is banned.
2. **Pin everything.** Orbs to exact versions (never `@volatile`); images to exact
   tags (never `:current`).
3. **Secrets** live in CircleCI **contexts** (group-restricted), never in config,
   never in project env vars when shared, never echoed. Prefer OIDC to static keys.
4. **CI equals local.** Jobs call the same `npm run` / script entry points a
   developer runs; no CI-only logic buried in YAML.
5. **Rightsize.** Start `small`/`medium`; upsize only on Insights utilization
   evidence.
6. **Gates are real.** No `|| echo` swallowing, no `-` soft-fail steps.

## 4. One-time human steps (ORBIT cannot do these)

1. Connect the repo: `app.circleci.com` → Projects → *Set Up Project* (org
   authorization required).
2. Create org contexts and restrict them to teams.
3. Confirm the connect with `circleci follow` / first `circleci run watch`.

A config merged before the connect exists is inert and costs nothing — but ORBIT
must say so in the PR rather than claim the lane is live.

## 5. CLI quick reference

Two generations coexist; ORBIT uses both (full detail in the skill):

- **Legacy v0.1.x (config-craft):** `setup`, `config validate|process|pack`,
  `local execute`, `orb init|pack|validate|publish`, `tests glob|split|run`,
  `policy decide|eval|push`, `runner`, `env subst`, `diagnostic`, `follow`,
  `open`, `telemetry`.
- **Preview v1.x (operations, agent-friendly):** `auth login`, `run` (trigger /
  **watch with scriptable exit codes**), `pipeline`, `workflow`, `envvar`,
  `deploy`, `dlc purge`, and **`mcp` — a built-in MCP server with a dedicated
  Claude enable command**, letting Claude-based agents manage pipelines natively.
  Every data command supports `--json`.

## 6. Sources

- Local CLI guide — <https://circleci.com/docs/guides/toolkit/how-to-use-the-circleci-local-cli/>
- CLI reference — <https://cli.circleci.com/reference/>
- v1.x preview CLI README — <https://github.com/CircleCI-Public/circleci-cli>
- Optimization reference — <https://circleci.com/docs/guides/optimize/optimizations/>
- Six optimization tips — <https://circleci.com/blog/six-optimization-tips-for-your-config/>
- DLC best practices — <https://circleci.com/blog/config-best-practices-docker-layer-caching/>
