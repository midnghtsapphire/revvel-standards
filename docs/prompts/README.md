# Prompts

Canonical operating prompts for Revvel, organized **by type, then kebab-case name**.

The big conversation hoard (13,286 prompts, 15 types) stays in the private repo [AI-Conversation-Archive](https://github.com/midnghtsapphire/AI-Conversation-Archive) under `prompts_by_category/`. Do not paste that dump here.

Promhoeador collects; Promptinator files.

## Layout

```text
docs/prompts/
  <type>/
    <prompt-name>.md          # reusable prompt
    <prompt-name>/
      SYSTEM_PROMPT.md        # drop-in system prompt
```text

## Types in use

| Type            | What goes here                                               |
| --------------- | ------------------------------------------------------------ |
| `LLM/`          | System / persona prompts (credentialgate, vspr-smos, malama) |
| `architecture/` | System design and attention / SCALE templates                |
| `research/`     | R&D and evaluation prompts                                   |
| `code/`         | Review and coding-agent prompts                              |
| `agents/`       | AGENTS.md-style operating instructions                       |
| `automation/`   | Workflow prompts (private copies only if they name accounts) |
| `compliance/`   | Audit / compliance playbooks                                 |

## Already filed here

- `LLM/credentialgate/SYSTEM_PROMPT.md`
- `architecture/scale-system-design.md`
- `architecture/attention-mechanism.md`
- `research/rnd-master.md`
- `LLM/malama/SYSTEM_PROMPT.md`

## Sister libraries

- Private hoard: <https://github.com/midnghtsapphire/AI-Conversation-Archive>
- Typed starter: <https://github.com/midnghtsapphire/oz-prompt-library>
- Empty 16k stub: <https://github.com/midnghtsapphire/prompt-library>
- PM templates: <https://github.com/midnghtsapphire/product-manager-prompts>

## Rule

Never delete a local copy until the GitHub file is in place. Keep legal, tax, family, and email-account prompts out of this public repo.
