---
name: tdd-workflow
description: >-
  Loader for Test-first workflow. The canonical text is
  docs/skills/tdd-workflow/SKILL.md. Read that file before acting on this skill.
---

# Test-first workflow

Canonical playbook: [`docs/skills/tdd-workflow/SKILL.md`](../../docs/skills/tdd-workflow/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign every GitHub write, do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the check that counts.

Machine config: [`tdd-workflow.skill.yml`](tdd-workflow.skill.yml).
