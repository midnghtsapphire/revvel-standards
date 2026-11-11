---
name: resolve-conflicts
description: >-
  Loader for Resolve merge conflicts. The canonical text is
  docs/skills/resolve-conflicts/SKILL.md. Read that file before acting on this skill.
---

# Resolve merge conflicts

Canonical playbook: [`docs/skills/resolve-conflicts/SKILL.md`](../../docs/skills/resolve-conflicts/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign every GitHub write, do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the check that counts.

Machine config: [`resolve-conflicts.skill.yml`](resolve-conflicts.skill.yml).
