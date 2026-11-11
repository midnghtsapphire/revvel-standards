# Docs skills

Skills in this folder are the playbooks Audrey asked agents to load from `docs/skills/`. The skills vault under `skills/` still indexes them. Append new rows. Do not remove a row.

| Skill | Path | What it covers |
| --- | --- | --- |
| GitHub read / write / admin | [`github-read-write-admin/SKILL.md`](github-read-write-admin/SKILL.md) | In-repo `git` and `gh` for read, write, and admin. Identity, merge gates, never-delete. Self-check: [`github-read-write-admin/self-check.sh`](github-read-write-admin/self-check.sh). |
| GitHub issue triage | [`gh-issue-triage/SKILL.md`](gh-issue-triage/SKILL.md) | Map an issue onto config/labels-allowlist.yml. Add labels. Do not remove labels. |
| Resolve merge conflicts | [`resolve-conflicts/SKILL.md`](resolve-conflicts/SKILL.md) | Union-merge append-only files. Comment retired lines out. Do not drop a side. |
| Git advanced workflows | [`git-advanced-workflows/SKILL.md`](git-advanced-workflows/SKILL.md) | Rebase, bisect, worktree, and reflog only for commits that are not on a remote. |
| Changelog orchestrator | [`changelog-orchestrator/SKILL.md`](changelog-orchestrator/SKILL.md) | Append bullets to CHANGELOG.md from git log. Do not rewrite older bullets. |
| Pull request review reply | [`pr-review-reply/SKILL.md`](pr-review-reply/SKILL.md) | Signed replies. Resolve a thread only after the reply. Do not delete the comment. |
| Multi-pass pull request review | [`multi-pr-review/SKILL.md`](multi-pr-review/SKILL.md) | Correctness, code health, and UX passes. Signed summary. Verdict does not merge. |
| Pull request review with proof | [`octocode-pr-review/SKILL.md`](octocode-pr-review/SKILL.md) | Scope, proof, and a signed recommendation. Falls back to git and gh when the Octocode CLI is absent. |
| Create a pull request from a body file | [`pr-create-from-body/SKILL.md`](pr-create-from-body/SKILL.md) | Read a body file, sign it, push the branch, open the pull request. Do not unset the job token. |
| Deployment pipeline design | [`deployment-pipeline-design/SKILL.md`](deployment-pipeline-design/SKILL.md) | Build, test, staging, human gate, production, deep health check, forward rollback. CircleCI is the runner that starts. |
| SAST configuration | [`sast-configuration/SKILL.md`](sast-configuration/SKILL.md) | Semgrep on the paths you changed. Suppression names the rule id on the adjacent line. |
| Lint and validate | [`lint-and-validate/SKILL.md`](lint-and-validate/SKILL.md) | node --test, markdownlint on changed files, flake8 baseline for Python you touched. |
| Test-first workflow | [`tdd-workflow/SKILL.md`](tdd-workflow/SKILL.md) | Failing test, then the smallest code that passes, using node:test in this repo. |
| Karpathy guidelines | [`karpathy-guidelines/SKILL.md`](karpathy-guidelines/SKILL.md) | Assumptions in the file, small new code, surgical edits, a command that proves the change. |
| Agentic evaluation | [`agentic-eval/SKILL.md`](agentic-eval/SKILL.md) | Three-pass loop. Model calls go through scripts/local_llm.py. Code is judged by the test command. |

## License record (2026-11-11)

Append rows. Do not remove a row. SPDX is the license of the text that was adapted. The catalog URL is the one from the request. The read column is the tree that was fetched when that path had moved or returned 404.

| Skill | SPDX | Copyright | Catalog URL | Text that was read |
| --- | --- | --- | --- | --- |
| `gh-issue-triage` | MIT | Copyright (c) 2025 Joe Seymour | <https://github.com/poindexter12/waypoint/tree/main/workflows/skills/gh-issue-triage> | same path on main |
| `resolve-conflicts` | Apache-2.0 | Copyright 2025 Tailcall | <https://github.com/antinomyhq/forge/tree/main/.forge/skills/resolve-conflicts> | same path on main |
| `git-advanced-workflows` | MIT | Copyright (c) 2024 Seth Hobson | <https://github.com/wshobson/agents/tree/main/plugins/developer-essentials/skills/git-advanced-workflows> | same path on main |
| `changelog-orchestrator` | MIT | Copyright (c) 2025 Jeremy Longshore | <https://github.com/jeremylongshore/claude-code-plugins-plus-skills/tree/main/plugins/automation/mattyp-changelog/skills/changelog-orchestrator> | plugins/devops/mattyp-changelog/skills/changelog-orchestrator on main (catalog path 404) |
| `pr-review-reply` | Apache-2.0 | Copyright 2025 Stacklok, Inc. | <https://github.com/stacklok/toolhive/tree/main/.claude/skills/pr-review-reply> | commit 324878c901be3c348ae9fe5b1c13c543c7ca0512 (removed on main in a684b55) |
| `multi-pr-review` | Apache-2.0 | Copyright (c) Dyad contributors | <https://github.com/dyad-sh/dyad/tree/main/.claude/skills/multi-pr-review> | same path on main. Skill path is outside src/pro/, so Apache-2.0 applies. GitHub SPDX id is NOASSERTION because LICENSE also points src/pro/ at another license. |
| `octocode-pr-review` | MIT | Copyright (c) 2026 Guy Bary | <https://github.com/bgauryy/octocode-mcp/tree/main/packages/octocode-cli/skills/octocode-pr-review> | 404 on main. Adapted from skills/octocode-research/references/workflow-pr-review.md and the analysis and report notes beside it. |
| `pr-create-from-body` | MIT | Copyright (c) 2023 Bytedance, Inc. and its affiliates. | <https://github.com/VisActor/VChart/tree/develop/.trae/skills/pr-create-from-body> | commit 3e5663868080d9d5b09ba13a27e06a8545ce69a5 (removed on develop in b78c8ce) |
| `deployment-pipeline-design` | MIT | Copyright (c) 2024 Seth Hobson | <https://github.com/wshobson/agents/tree/main/plugins/cicd-automation/skills/deployment-pipeline-design> | same path on main |
| `sast-configuration` | MIT | Copyright (c) 2024 Seth Hobson | <https://github.com/wshobson/agents/tree/main/plugins/security-scanning/skills/sast-configuration> | same path on main |
| `lint-and-validate` | MIT | Copyright (c) 2026 VUDOVN | <https://github.com/vudovn/antigravity-kit/tree/main/.agent/skills/lint-and-validate> | .agents/skills/lint-and-validate on main (catalog path .agent/ 404) |
| `tdd-workflow` | MIT | Copyright (c) 2025 cfrs2005 | <https://github.com/cfrs2005/claude-init/tree/main/templates/.claude/skills/tdd-workflow> | same path on main |
| `karpathy-guidelines` | MIT | Copyright (c) 2026 forrestchang and SwarmClaw AI contributors | <https://github.com/swarmclawai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines> | same path on main |
| `agentic-eval` | MIT | Copyright GitHub, Inc. | <https://github.com/github/awesome-copilot/tree/main/skills/agentic-eval> | same path on main |
