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
| `gh-issue-triage` | MIT | Copyright (c) 2025 Joe Seymour | <https://github.com/poindexter12/waypoint/tree/main/workflows/skills/gh-issue-triage> | <https://github.com/poindexter12/waypoint/blob/c8c7387fe2fb1fb904be1dec9a3c6db68feeb7f5/workflows/skills/gh-issue-triage/SKILL.md> |
| `resolve-conflicts` | Apache-2.0 | Copyright 2025 Tailcall | <https://github.com/antinomyhq/forge/tree/main/.forge/skills/resolve-conflicts> | <https://github.com/antinomyhq/forge/blob/a22b49288856d5b3f3ca57e8532683d54a662c8c/.forge/skills/resolve-conflicts/SKILL.md> |
| `git-advanced-workflows` | MIT | Copyright (c) 2024 Seth Hobson | <https://github.com/wshobson/agents/tree/main/plugins/developer-essentials/skills/git-advanced-workflows> | <https://github.com/wshobson/agents/blob/9c61ab243def98f72da12abd41cfcf5bcd91af9d/plugins/developer-essentials/skills/git-advanced-workflows/SKILL.md> |
| `changelog-orchestrator` | MIT | Copyright (c) 2025 Jeremy Longshore | <https://github.com/jeremylongshore/claude-code-plugins-plus-skills/tree/main/plugins/automation/mattyp-changelog/skills/changelog-orchestrator> | <https://github.com/jeremylongshore/claude-code-plugins-plus-skills/blob/0500b275e963c027f6b410e8c49c0446945c574e/plugins/devops/mattyp-changelog/skills/changelog-orchestrator/SKILL.md> (catalog path 404) |
| `pr-review-reply` | Apache-2.0 | Copyright 2025 Stacklok, Inc. | <https://github.com/stacklok/toolhive/tree/main/.claude/skills/pr-review-reply> | <https://github.com/stacklok/toolhive/blob/324878c901be3c348ae9fe5b1c13c543c7ca0512/.claude/skills/pr-review-reply/SKILL.md> (removed on main in a684b55) |
| `multi-pr-review` | Apache-2.0 | Copyright (c) Dyad contributors | <https://github.com/dyad-sh/dyad/tree/main/.claude/skills/multi-pr-review> | <https://github.com/dyad-sh/dyad/blob/6b61e74818432fa88515f9e35e3dce463dff8871/.claude/skills/multi-pr-review/SKILL.md> (outside src/pro/; repo SPDX is NOASSERTION) |
| `octocode-pr-review` | MIT | Copyright (c) 2026 Guy Bary | <https://github.com/bgauryy/octocode-mcp/tree/main/packages/octocode-cli/skills/octocode-pr-review> | catalog path 404. Read <https://github.com/bgauryy/octocode-mcp/blob/c265e3f9413161c900cbf4aa70d451b8e6b3920a/skills/octocode-research/references/workflow-pr-review.md> |
| `pr-create-from-body` | MIT | Copyright (c) 2023 Bytedance, Inc. and its affiliates. | <https://github.com/VisActor/VChart/tree/develop/.trae/skills/pr-create-from-body> | <https://github.com/VisActor/VChart/blob/3e5663868080d9d5b09ba13a27e06a8545ce69a5/.trae/skills/pr-create-from-body/SKILL.md> (removed on develop in b78c8ce) |
| `deployment-pipeline-design` | MIT | Copyright (c) 2024 Seth Hobson | <https://github.com/wshobson/agents/tree/main/plugins/cicd-automation/skills/deployment-pipeline-design> | <https://github.com/wshobson/agents/blob/9c61ab243def98f72da12abd41cfcf5bcd91af9d/plugins/cicd-automation/skills/deployment-pipeline-design/SKILL.md> |
| `sast-configuration` | MIT | Copyright (c) 2024 Seth Hobson | <https://github.com/wshobson/agents/tree/main/plugins/security-scanning/skills/sast-configuration> | <https://github.com/wshobson/agents/blob/9c61ab243def98f72da12abd41cfcf5bcd91af9d/plugins/security-scanning/skills/sast-configuration/SKILL.md> |
| `lint-and-validate` | MIT | Copyright (c) 2026 VUDOVN | <https://github.com/vudovn/antigravity-kit/tree/main/.agent/skills/lint-and-validate> | <https://github.com/vudovn/antigravity-kit/blob/549ba3dc2eb1d40fccb5b6d792eba4101c80cd69/.agents/skills/lint-and-validate/SKILL.md> (catalog path .agent/ 404) |
| `tdd-workflow` | MIT | Copyright (c) 2025 cfrs2005 | <https://github.com/cfrs2005/claude-init/tree/main/templates/.claude/skills/tdd-workflow> | <https://github.com/cfrs2005/claude-init/blob/cbc8c773290699caefa22d8765b58190475ce841/templates/.claude/skills/tdd-workflow/SKILL.md> |
| `karpathy-guidelines` | MIT | Copyright (c) 2026 forrestchang and SwarmClaw AI contributors | <https://github.com/swarmclawai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines> | <https://github.com/swarmclawai/andrej-karpathy-skills/blob/29b8bc1d0e1905d777b2983343abb058b13c2e54/skills/karpathy-guidelines/SKILL.md> |
| `agentic-eval` | MIT | Copyright GitHub, Inc. | <https://github.com/github/awesome-copilot/tree/main/skills/agentic-eval> | <https://github.com/github/awesome-copilot/blob/eaaffd5d020b756a2777a4b1b161d2bdc126d9a0/skills/agentic-eval/SKILL.md> |
