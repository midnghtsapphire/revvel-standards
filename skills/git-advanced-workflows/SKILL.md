---
name: git-advanced-workflows
description: >-
  Loader for Git advanced workflows. The canonical text is
  docs/skills/git-advanced-workflows/SKILL.md. Read that file before acting on this skill.
---

# Git advanced workflows

Canonical playbook: [`docs/skills/git-advanced-workflows/SKILL.md`](../../docs/skills/git-advanced-workflows/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign every GitHub write, do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the check that counts.

Machine config: [`git-advanced-workflows.skill.yml`](git-advanced-workflows.skill.yml).
