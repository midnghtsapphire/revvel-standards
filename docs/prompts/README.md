# Prompts

Canonical operating prompts for Revvel, organized **by type, then kebab-case name**.

The big conversation hoard (13,286 prompts, 15 types) stays in the private repo [AI-Conversation-Archive](<https://github.com/midnghtsapphire/AI-Conversation-Archive)> under `prompts_by_category/`. Do not paste that dump here.

Promhoeador collects; Promptinator files.

## Layout

```text
```txt
docs/prompts/
  <type>/
    <prompt-name>.md          # reusable prompt
    <prompt-name>/
      SYSTEM_PROMPT.md        # drop-in system prompt
```txt

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
- `LLM/noseynoodle/SYSTEM_PROMPT.md` (dispatcher: routes work, never does it)
- `LLM/noseynoodle/GROK_SETUP.md` (running NoseyNoodle inside Grok: 4,000-char agent version, connectors, automations)
- `LLM/cartographer/SYSTEM_PROMPT.md` (read-only claims-vs-reality auditor, reports to NoseyNoodle)

### agents

- `agents/XP-SWARM-ORCHESTRATOR.md` — paste-ready XP Swarm Orchestrator system prompt (delegate, same-model XP pairs, one iteration). Always-Training replaces spoken "self-heal": good to-dos, bad to-dos, and went-raunchy.
- `agents/XP-SWARM-ORCHESTRATOR-OVERVIEW.md` — shorter companion and overview for the same orchestrator.
- Naming note: `standards/ALWAYS_TRAINING.md`. Aliases that stay valid: `standards/SELF_HEALING_STANDARDS.md`, `skills/self-healer`, `scripts/agent-self-heal.js`.

## Sister libraries

- Private hoard: <https://github.com/midnghtsapphire/AI-Conversation-Archive>
- Typed starter: <https://github.com/midnghtsapphire/oz-prompt-library>
- Empty 16k stub: <https://github.com/midnghtsapphire/prompt-library>
- PM templates: <https://github.com/midnghtsapphire/product-manager-prompts>

## Rule

Never delete a local copy until the GitHub file is in place. Keep legal, tax, family, and email-account prompts out of this public repo.
