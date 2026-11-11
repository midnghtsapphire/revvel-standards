---
name: git-advanced-workflows
description: >-
  Loader for Git advanced workflows. The canonical text is
  docs/skills/git-advanced-workflows/SKILL.md. Read that file before acting on this skill.
---

# Git advanced workflows

Canonical playbook: [`docs/skills/git-advanced-workflows/SKILL.md`](../../docs/skills/git-advanced-workflows/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign issue bodies, pull request titles and bodies, reviews, comments, and commit messages. Do not sign a source file. Do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the real CI, and every required check on the same head SHA must be green.

Machine config: [`git-advanced-workflows.skill.yml`](git-advanced-workflows.skill.yml).
