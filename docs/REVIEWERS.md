# PR reviewers: auto and real-time

TriageChief, 2026-11-19. Work request: https://github.com/midnghtsapphire/revvel-standards/issues/18493.

Two words, as Audrey uses them:

- **Auto** = a bot reviews the PR by itself, no one asks.
- **Real-time** = a comment (or label) in the work request or PR that calls a review right now.

GitHub Actions is billing-locked, so the two reviewers this repo runs itself (PR-Agent and OpenHands) run on **CircleCI**. The other three are hosted apps with their own comment words. Every reviewer here is **advisory**: it comments, it never blocks a merge, and a bot's text is never Audrey's approval.

## At a glance

| Reviewer | Where it runs | Auto | Real-time |
|---|---|---|---|
| **Code Review Fleet** (PR-Agent, one run per persona, OpenRouter model) | CircleCI job `pr-agent-review` | CircleCI trigger "PR opened" | comment exactly `run-ci`, or add label `run-ci` |
| **OpenHands** (OpenRouter model) | CircleCI job `openhands-review` | CircleCI trigger "PR opened" | comment exactly `run-ci`, or add label `run-ci` |
| **Devin Review** | Hosted app | Devin web app, Settings > Review: rule "PR created" or "PR ready" | comment starting with `/devin review` |
| **cubic** | Hosted app | Automatic on every PR while under the line limit (`cubic.yaml` controls it) | `@cubic-dev-ai review this PR` (also `@cubic-dev-ai incremental review`) |
| **Gitar** | Hosted app | Automatic on PR open and new commits (paused until 2026-12-01) | comment starting with `gitar review` (works while auto is paused) |

On CircleCI there is only **one** real-time word, `run-ci`, and it calls **both** self-run reviewers. CircleCI's GitHub App only offers two on-demand presets: a PR comment that is exactly `run-ci`, and the label `run-ci`. Per-reviewer words would need GitHub Actions back on. Fork PRs never trigger CircleCI.

## How it is built: the reviewers cannot write to GitHub

Audrey's rule: review stages get no write access. So the work is split into three jobs, and only the last one holds a GitHub write token.

```
pr-agent-review ──┐
                  ├──> post-review-comments
openhands-review ─┘
```

| Job | CircleCI context | Env vars it can see (names only) | What it does |
|---|---|---|---|
| `pr-agent-review` (the Code Review Fleet) | `ai-review-llm` | `OPENROUTER_API_KEY`, `REVVEL_LLM_ALLOW_CLOUD`, `NOTION_TOKEN`, `NOTION_GATE_EXCEPTIONS_DB_ID` (the Notion pair is allowed but not used today) | Checks out the PR with CircleCI's checkout key, builds the diff with git, runs the Fleet (one offline PR-Agent run per persona), saves the findings to the workspace. Never posts. |
| `openhands-review` | `ai-review-llm` | same as above | Same, with an OpenHands agent that can read the checkout. Never posts. |
| `post-review-comments` | `ai-review-post` | `ADMIN_GITHUB_TOKEN` only | No checkout and no PR code. Attaches the workspace, reads the workspace, posts or updates one sticky comment per reviewer: "Code Review Fleet" and OpenHands. |

The CircleCI variables `CIRCLE_*` (PR URL, project, SHA) are always present in every job. An optional `GITHUB_READ_TOKEN` can be added to `ai-review-llm` to raise the public-API rate limit; it is read-only, never required, and never passed to a reviewer.

### Analysis jobs (no token)
1. `git` fetches the base branch over the project's checkout key. The base is taken from the public GitHub API when it answers; if it does not (rate limit, offline), the script picks the nearest of `main` and the five newest `daily/*` branches, or you can set `AI_REVIEW_BASE_BRANCH`.
2. `git diff base...HEAD` is the whole input. Lockfiles and minified files are left out. The size caps apply to this diff.
3. **The Code Review Fleet** (see the next section) runs PR-Agent in its plain-diff mode (`--diff-file`) once per persona. That mode needs no git provider and no GitHub token. Each run starts from an empty folder, so a `.pr_agent.toml` inside the PR cannot change its settings, and gets a minimal environment (only the OpenRouter key and model settings, passed as an explicit list, never a copy of the job environment).
4. **OpenHands** runs an OpenHands SDK agent (`openhands_review.py`) with the diff in the prompt and the checkout as its workspace, so it can read files. The upstream pr-review plugin cannot run here: it fetches the PR and posts reviews through the GitHub API, so it needs a token. This script keeps the same engine and a compact review standard in the plugin's spirit (material findings only, priority labels, never approve). The API key is removed from the process environment as soon as the model client has it, so the agent's terminal cannot read it.
5. Both save `<reviewer>.md` plus `<reviewer>.meta.json` to a workspace folder (`persist_to_workspace`); the Fleet also saves `pr-agent.fleet.json` (the findings). Diffs are scratch files and are not saved. Logs go through a redactor that masks token-like strings and the literal secret values.

### Posting job (the only one with the write token)
- Runs one small program that is written inline in `.circleci/ai-review.yml` (env var `AI_REVIEW_POSTER`). That is the only code it runs. It does not check out the repo, so PR code never runs next to `ADMIN_GITHUB_TOKEN`. (Same-repo PRs can still edit the config itself. See the limits below.)
- LLM output is treated as plain text: capped at 12,000 characters, token-like strings masked, images removed (no tracking pixels), `@mentions` defused, all HTML escaped except a short allow-list (tables, details, code and similar), and control characters dropped. The JSON from the analysis job is validated field by field.
- One sticky comment per reviewer ("Code Review Fleet" and "OpenHands"), found by a hidden marker **and** by author, so a forged marker from someone else is ignored. Each starts "**TriageChief:**" and ends "— TriageChief". Nothing is posted when the PR is closed, is from a fork, has the label `skip-ai-review`, or has `[skip-ai-review]` in its title.
- The Fleet comment is built only from validated fields (see "Code Review Fleet"), not from model markdown.
- A reviewer that skipped for a policy reason (spend gate closed, secret missing, fork) posts nothing, so there is no noise. A size skip or an error posts one short line.

### Logging rules
No `set -x`, no `env` or `printenv`, no echo of token or key variables. `tests/ai_review_test.py` greps the config and every script for these. Output is masked as above, and CircleCI also masks stored secrets.

### Forked PRs
CircleCI keeps secrets off for forks. The jobs also detect them (`CIRCLE_PR_USERNAME` / `CIRCLE_PR_REPONAME` differ from the project, or the public API shows a different head repo, or the secrets are missing) and skip with a clear log line and exit 0. They never fail the pipeline.

## Model and cost

- Model: `openrouter/deepseek/deepseek-v4.1-flash`, checked on OpenRouter 2026-11-19 at $0.0507 per million input tokens and $0.203 per million output tokens. Override with `AI_REVIEW_MODEL`.
- **Code Review Fleet:** one PR-Agent call per persona (default 4), each with the diff capped at 32,000 tokens (`AI_REVIEW_MAX_TOKENS`) plus about 1,000 tokens of persona instructions. A typical PR (a few thousand tokens of diff) costs about **0.05 cent per persona, so about 0.2 cent for the four**. A PR at the size limit (80,000 bytes) is about **0.2 cent per persona, so about 0.8 cent**. PR-Agent can split a very large diff into more than one call, so the honest range for the four is **0.2 to 2 cents**. Each run also reports its real token usage; the Fleet adds it up and shows "Estimated model cost" in the comment.
- **Per-PR cap on the Fleet (hard):** at most 4 persona runs (`AI_REVIEW_MAX_PERSONA_RUNS`; the Final Gate keeps its place and the rest are dropped with a line saying so), and a spend ceiling of 3 cents (`AI_REVIEW_MAX_FLEET_USD`) checked **before** each run against a projected cost; a run that would pass it is skipped. If you change `AI_REVIEW_MODEL`, also set `AI_REVIEW_PRICE_IN_PER_M` and `AI_REVIEW_PRICE_OUT_PER_M` (dollars per million tokens) so the ceiling stays honest. Time caps: 300 seconds per persona and 900 seconds for the whole Fleet. A PR over the size limit skips everything (Fleet and OpenHands) with one line.
- **Whole PR, default settings:** Fleet about 0.2 to 2 cents plus OpenHands about 1 to 5 cents, so **roughly 1 to 7 cents per PR**, with hard ceilings of 3 cents (Fleet, by the cap) and 5 cents (OpenHands, by its budget and step caps).
- **OpenHands:** capped at 40 steps (`AI_REVIEW_MAX_ITERATIONS`; upstream default is 500) and, when the SDK knows the model's price, at $0.05 (`AI_REVIEW_MAX_BUDGET_USD`). The prompt carries up to 40,000 characters of diff (`AI_REVIEW_PROMPT_DIFF_CHARS`). Each step re-sends the conversation. Estimate: **about 1 to 5 cents per review**, with the step cap as the hard ceiling. The budget cap only works if the SDK has a price for the model; the step cap always works.
- **Size skip:** a PR with more than 60 files (`AI_REVIEW_MAX_FILES`), 4,000 changed lines (`AI_REVIEW_MAX_CHANGED_LINES`) or an 80,000-byte diff (`AI_REVIEW_MAX_DIFF_BYTES`) is skipped, with one line in the PR. Skip a PR by hand with `[skip-ai-review]` in the head commit message or PR title, or the label `skip-ai-review`.
- These are estimates until real runs report usage. The Fleet comment prints its own estimate from the reported tokens.

## One-time setup (Secret fills the contexts; the CircleCI console steps need an admin)

**Contexts.** The workflow uses two CircleCI contexts. Secret creates and fills them:
- `ai-review-llm`: `OPENROUTER_API_KEY`, `REVVEL_LLM_ALLOW_CLOUD=1`, and (optional) `NOTION_TOKEN`, `NOTION_GATE_EXCEPTIONS_DB_ID`. Restrict the context to the `ai-review` pipeline.
- `ai-review-post`: `ADMIN_GITHUB_TOKEN`. Restrict the context to the `ai-review` pipeline.

The workflow names both contexts, so the pipeline needs them to exist before the first run. **Move the values out of the project-level environment variables.** A project variable is visible to every job in the project, including the analysis jobs; the scripts drop the GitHub variables as a second line of defense, but the contexts are what actually keep the write token away from the analysis jobs. A token with only Pull requests and Issues write on this repo is enough, ideally from a dedicated bot account.

**Pipeline and triggers** (CircleCI console; the CircleCI connector cannot add these):
1. Project Settings > Pipelines > Create pipeline. Name `ai-review`. Config source: the GitHub repo, file path `.circleci/ai-review.yml`.
2. Add triggers to that pipeline:
   - **Auto:** "PR opened" (drafts included).
   - **Real-time:** "PR comment is exactly `run-ci`" and "Label added: `run-ci`".
   Not recommended: "Pushes to open non-draft PRs". With no token the analysis job cannot see earlier comments, so it would re-review (and spend) on every push.
3. Open a small test PR. Within a few minutes there should be a "**TriageChief:** Code Review Fleet (RVS-REVIEW-001) advisory review" comment and an OpenHands one.

Until the contexts have their variables the jobs skip safely and never fail the pipeline. Until steps 1 and 2 are done nothing starts.

## Reviewers

### Code Review Fleet (PR-Agent personas, OpenRouter)
- **What:** Audrey's Code Review Fleet standard (RVS-REVIEW-001, `standards/REVVEL_CODE_REVIEW_FLEET.md` in revvel-standards), which had been designed but never run. Each persona is one offline PR-Agent 0.50.0 (Qodo, Apache-2.0) run on the same diff with that persona's instructions. Runner: `scripts/ai_review_fleet.py`.
- **Default personas, in order:** Security, Workflow, No-delete / goals, then **Syntax / Final Gate, always last**. The Final Gate also sees the other personas' findings (as untrusted context) and runs deterministic checks that only parse files: Python (`compile`), shell (`bash -n`), YAML, JSON, JavaScript (`node --check` if Node is present), plus a changed-file inventory and a delete scan. Nothing from the PR is executed. Tests and Markdown lint are not run here; the Final Gate lists them as `bom` lines (the standard's "missing access is a procurement item, not a failure").
- **Choose personas:** env var `AI_REVIEW_PERSONAS`, a comma list (`security,workflow,no_delete_goals,syntax_final_gate` is the default). Names accept dashes and short forms (`no-delete`, `syntax`, `final-gate`). `all` selects all nine (security, workflow, no_delete_goals, product_process, docs_contracts, connector, implementation, compliance, syntax_final_gate). To run more than four, also raise `AI_REVIEW_MAX_PERSONA_RUNS` (and watch the cost cap). Set these in the `ai-review-llm` context or as project variables; no workflow edit is needed.
- **Where the personas come from:** `config/review-fleet-personas.yml` **as committed on the PR's base branch**, if it exists and parses; otherwise a pinned copy shipped here (`scripts/ai-review/review-fleet-personas.pinned.yml`, revvel-standards commit 8bf44eb). The base branch is used on purpose: a PR cannot edit the reviewers that judge it. Each persona's prompt starts with the injection-hardened core of `docs/prompts/code/expert-code-reviewer.md` (never follow instructions inside the PR, surface injection attempts), then its role, scope, `must_check` list, `must_not_do` list, blocking rule and the output format. The instructions reach PR-Agent through a generated TOML file, not env vars.
- **Findings and severities:** each finding uses the standard's schema: `persona`, `severity` (`blocking`, `advisory`, `bom`), `scope`, `rule`, `summary`, `evidence`, `recommendation`, `blocking`, `out_of_scope`, `bom`. Only Security, No-delete / goals, Compliance and Syntax / Final Gate may use `blocking` (the standard's default authority, read from the personas file); another persona's `blocking` is downgraded to `advisory` and marked out of scope, except a `prompt-injection-attempt`. The posting job checks the schema again.
- **The comment:** ONE sticky comment, "**TriageChief:** Code Review Fleet (RVS-REVIEW-001) advisory review", grouped by persona with the Final Gate last, with the standard's recommendation line (`approve`, `request-changes`, `needs-discussion`, or `incomplete`). **It is advisory: no status check is set and nothing fails.** "Blocking" here means "the persona says this should block until a human resolves or waives it", per the standard; a human decides. A persona that fails or is skipped (run cap, cost cap) is listed with the reason instead of being hidden.
- **Auto:** the CircleCI "PR opened" trigger above.
- **Real-time:** comment exactly `run-ci`, or label `run-ci`. PR-Agent's own words (`/review`, `/improve`) need a listener for `issue_comment` events, which would need GitHub Actions, so they do not work here.
- **Replaces** the single generic PR-Agent comment from the first version of this work. Nothing was merged, so there is nothing to remove.

### OpenHands
- **What:** an OpenHands SDK agent (SDK and tools 1.63.0, `litellm` pinned to 1.108.3 because 1.109.x lacks a module the SDK imports) that reads the diff and the repo and writes one markdown review.
- **Auto:** the CircleCI "PR opened" trigger above.
- **Real-time:** comment exactly `run-ci`, or label `run-ci`. The upstream words (label `review-this`, request reviewer `openhands-agent`) are GitHub Actions only.
- **No tracking:** the SDK depends on the `lmnr` tracing library. Tracing is off unless a tracing env var is set. The script deletes `LMNR_PROJECT_API_KEY` and the `OTEL_*` variables before the SDK loads, and none is ever set.
- **Repo rules:** the agent is told to read `AGENTS.md` first. That is part of why it costs more than PR-Agent.

### Devin Review (hosted)
- **Auto:** in the Devin web app, Settings > Review, add a rule: "PR created" or "PR ready", cadence "Only once" (or "Every push" for more spend). A per-PR auto-review spend limit applies.
- **Real-time:** comment `/devin review` at the very start of a PR comment. Manual reviews are not blocked by the auto spend limit. (`@devin review` is not a documented command.)
- Per Audrey: a PR's Devin review should finish before merge, and real Devin findings block. "Bugfinder incomplete" with zero findings is a known false red (see Gate Exceptions).

### cubic (hosted)
- **Auto:** on every PR while under the plan's reviewed-line quota. The repo's `cubic.yaml` (ignore globs, `reviews.incremental_commits`) and cubic Settings control it.
- **Real-time:** `@cubic-dev-ai review this PR` (full), `@cubic-dev-ai incremental review`. It bypasses the per-repo line threshold but still uses quota, so it does nothing while quota is empty.
- **Status:** the line limit is reached until **2026-12-07**; new reviews show NEUTRAL "line limit reached". That is in the Gate Exceptions table. Auto-fix and `ultrareview` use extra paid capacity; do not turn them on without Audrey's yes.

### Gitar (hosted)
- **Auto:** on PR open and new commits. **Paused for this billing period; it resumes by 2026-12-01** (in the Gate Exceptions table).
- **Real-time:** a comment that starts with `gitar review` (or `gitar please review`). No slash. It works while auto is paused.
- A Gitar "auto-approved" review is not Audrey's approval and not a merge gate.

## What is in the repo

```
.circleci/ai-review.yml                   second pipeline: three jobs, two contexts, inline poster
scripts/ai_review.py                      analysis side: gates, git diff, size caps, redaction (stdlib only)
scripts/ai_review_fleet.py                the Code Review Fleet runner (personas, schema, caps), needs PyYAML
scripts/ai-review/run-pr-agent.sh         the PR-Agent lane: prepares the diff, starts the Fleet runner, no token
scripts/ai-review/review-fleet-personas.pinned.yml  pinned copy of the personas file (fallback)
scripts/ai-review/run-openhands.sh        OpenHands, offline, no token
scripts/ai-review/openhands_review.py     the agent program: diff in, markdown out
scripts/ai-review/bootstrap.sh            lets another repo run these at a pinned commit
scripts/ai-review/print-adopt-snippet.sh  prints the config another repo pastes in
tests/ai_review_test.py                   no-network tests, plus two optional offline end-to-end runs
tests/ai_review_fleet_test.py             persona config, ordering, schema, combined comment, caps, no token
```

`.circleci/config.yml` is not touched. No GitHub Actions workflow is added or edited. The poster program lives only in the workflow file; the tests extract it from there, so the tested code is the code that runs. Keep it free of `<<` and `>>` (CircleCI reads those as parameters).

## Use it in another repo

1. Merge this work, then take the merge commit SHA (a full 40-character SHA; a branch name is refused).
2. From a revvel-standards checkout run `bash scripts/ai-review/print-adopt-snippet.sh <SHA>` and save the output as `.circleci/ai-review.yml` in the other repo. The analysis jobs there fetch only `scripts/ai_review.py`, `scripts/ai_review_fleet.py` and `scripts/ai-review/` at that pinned SHA. (That repo's base branch copy of `config/review-fleet-personas.yml` is used if it has one, else the pinned copy.)
3. Do the one-time setup in that repo's CircleCI project (contexts, pipeline, triggers). linear-a has no `.circleci/` directory yet, so it needs a CircleCI project and config first.

## Known limits

- **Same-repo branches can edit the config.** CircleCI runs the config from the PR branch. Forks never run, but a same-repo branch that edits `.circleci/ai-review.yml` could change what the posting job does with `ADMIN_GITHUB_TOKEN`. Keep the write token's scope small (Pull requests and Issues on this repo), restrict the contexts to the `ai-review` pipeline, and review changes to this file closely.
- **Prompt injection.** A PR can contain text aimed at the reviewer. The instructions tell both to ignore it and the posting job treats output as text only, but a model can still be fooled. Treat findings as hints, not facts.
- **The analysis jobs run PR content** (the agent reads files and can run read-only shell commands) but hold only the OpenRouter key, removed from the agent's environment. Put a credit limit on that key.
- **Without a token the analysis job cannot see PR comments, labels or the title unless the public API answers.** The skip label and title token are also honored by the posting job (it posts nothing), but the analysis spend already happened. Use `[skip-ai-review]` in the head commit message to skip before any spend.
- **The Fleet is only as good as the model and the diff.** Each persona sees the diff, not the whole repo, and cannot run tests. Persona output depends on the model following the output format; a header that does not follow it becomes an `advisory` finding with the rule `unclassified`. The Final Gate's file checks are mechanical, but its model run is as fallible as the others.
- **Fleet blocking is advisory here.** The standard lets a human owner waive a blocking finding; no CircleCI or GitHub gate reads these comments, and none should until Audrey asks for one.
- **The Fleet needs PyYAML**, which PR-Agent installs. If the personas file cannot be read, the pinned copy is used; if even that fails, the PR-Agent lane records an error and nothing else is affected.
- **Real-time is one word.** `run-ci` runs both reviewers.
- **Comment trigger event.** I could not confirm which PR variables CircleCI sets for comment-triggered runs; the scripts need `CIRCLE_PULL_REQUEST`. If it is missing the jobs skip with "not a PR pipeline".
- **Dependencies** are pinned for PR-Agent, the OpenHands SDK and tools, litellm, and uv. Their transitive Python packages are not hash-locked.
- **Cost numbers are estimates** until real runs report usage.
