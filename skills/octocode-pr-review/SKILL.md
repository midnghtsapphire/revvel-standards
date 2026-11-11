---
name: octocode-pr-review
description: >-
  Loader for Pull request review with proof. The canonical text is
  docs/skills/octocode-pr-review/SKILL.md. Read that file before acting on this skill.
---

# Pull request review with proof

Canonical playbook: [`docs/skills/octocode-pr-review/SKILL.md`](../../docs/skills/octocode-pr-review/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign every GitHub write, do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the check that counts.

Machine config: [`octocode-pr-review.skill.yml`](octocode-pr-review.skill.yml).
