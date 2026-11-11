---
name: pr-create-from-body
description: >-
  Loader for Create a pull request from a body file. The canonical text is
  docs/skills/pr-create-from-body/SKILL.md. Read that file before acting on this skill.
---

# Create a pull request from a body file

Canonical playbook: [`docs/skills/pr-create-from-body/SKILL.md`](../../docs/skills/pr-create-from-body/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign every GitHub write, do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the check that counts.

Machine config: [`pr-create-from-body.skill.yml`](pr-create-from-body.skill.yml).
