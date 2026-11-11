---
name: pr-review-reply
description: >-
  Loader for Pull request review reply. The canonical text is
  docs/skills/pr-review-reply/SKILL.md. Read that file before acting on this skill.
---

# Pull request review reply

Canonical playbook: [`docs/skills/pr-review-reply/SKILL.md`](../../docs/skills/pr-review-reply/SKILL.md).

Read that file and follow it. This loader exists so `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml`, and `tests/skills-vault-structure.test.js` resolve a vault folder. The procedure is not copied here. A second copy would drift from the file agents load under `docs/skills/`.

House rules in the canonical file win: sign every GitHub write, do not delete, do not force-push, and do not print a secret. CircleCI `lint-and-test` is the check that counts.

Machine config: [`pr-review-reply.skill.yml`](pr-review-reply.skill.yml).
