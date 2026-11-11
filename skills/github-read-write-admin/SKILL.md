---
name: github-read-write-admin
description: >-
  Loader for the GitHub read/write/admin playbook. The canonical text is
  docs/skills/github-read-write-admin/SKILL.md. Read that file before any
  git or gh write.
---

# GitHub read / write / admin

Canonical playbook: [`docs/skills/github-read-write-admin/SKILL.md`](../../docs/skills/github-read-write-admin/SKILL.md).

Read that file and follow it before any `git` or `gh` command. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The command list is not copied here. A second copy would drift from the file Audrey asked agents to load.

Use the lowest tier that does the job. Tier 3 needs Audrey Evans's explicit yes, a before read, and an after read. Do not delete. Do not force-push. Do not print a secret. Sign every issue, pull request, comment, review, and commit as `**BotName**` at the start and `— BotName` at the end.

Self-check: `bash docs/skills/github-read-write-admin/self-check.sh`.

Machine config: [`github-read-write-admin.skill.yml`](github-read-write-admin.skill.yml).
