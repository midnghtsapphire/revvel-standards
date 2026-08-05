# Revvel Skills Vault

**Version:** 1.0.0  
**Status:** Active  
**Scope:** All Revvel/MIDNGHTSAPPHIRE agents — OpenClaw, GitHub Copilot, Claude Code, Cursor, Windsurf, Cline

---

## What Is a Skill

A **skill** is a focused set of AI instructions that teaches an agent how to perform a specific task domain. Loading a skill is like handing an expert their playbook — the agent instantly knows the rules, workflow, and requirements for that domain.

Skills are stored in this directory. Every agent operating in any Revvel repository should read the relevant skill(s) before executing a task.

---

## Skill Folder Structure

Every skill lives in its own folder under `skills/`:

```text
skills/
├── README.md                    ← you are here
├── REGISTRY.md                  ← human-readable index of all skills
├── SKILLS_INDEX.yml             ← machine-readable index (for agents)
│
├── <skill-name>/
│   ├── SKILL.md                 ← human-readable spec & agent instructions (required)
│   ├── <skill-name>.skill.yml   ← machine-readable config (required)
│   ├── persona.yml              ← optional: ephemeral persona definition
│   ├── README.md                ← optional: 8-year-old-readable user guide
│   ├── tests/
│   │   └── promptfoo.yml        ← PromptFoo LLM assertion tests
│   └── install/
│       ├── windows/
│       │   └── install-<skill>.bat
│       └── mac/
│           └── install-<skill>.command
```

### Required Files (Every Skill Must Have)

| File | Purpose |
|---|---|
| `SKILL.md` | Human-readable spec: purpose, workflow, agent instructions, examples |
| `<skill-name>.skill.yml` | Machine-readable config: triggers, models, persona, dependencies |

### Optional Files

| File | Purpose |
|---|---|
| `persona.yml` | Ephemeral persona (name, voice, greeting, farewell) |
| `README.md` | Simple user guide — must pass the "8-year-old test" |
| `tests/promptfoo.yml` | PromptFoo LLM assertion tests for this skill |
| `install/windows/*.bat` | Windows one-click installer |
| `install/mac/*.command` | macOS one-click installer |

---

## Skills by Category

### Agent Operations
| Skill | Description |
|---|---|
| [`model-router`](model-router/) | Route tasks to Sonnet vs Opus based on complexity |
| [`context-management`](context-management/) | Manage token budgets and context handoffs |
| [`memory-pruning`](memory-pruning/) | Prune session logs with half-life retention |
| [`persona-engine`](persona-engine/) | Attach ephemeral personas to skill sessions |
| [`gbrain`](gbrain/) | Persistent AI memory via markdown brain repo + PGLite/pgvector |
| [`openrouter-swarms`](openrouter-swarms/) | OpenRouter model routing, MAS/swarm topology, agent naming |

### Developer Workflow
| Skill | Description |
|---|---|
| [`skill-forge`](skill-forge/) | Meta-skill: builds new skills from scratch |
| [`brainstorming`](brainstorming/) | Structured ideation and creative problem solving |
| [`todo-breakdown`](todo-breakdown/) | Break requirements into atomic implementable TODOs |
| [`parallel-development`](parallel-development/) | Coordinate multiple agents working simultaneously |
| [`using-git-worktrees`](using-git-worktrees/) | Manage parallel branches with git worktrees |
| [`wrap-up`](wrap-up/) | Four-phase session close: Ship, Remember, Review, Publish |
| [`code-review`](code-review/) | Enforce Revvel code review standards |
| [`testing`](testing/) | Apply Revvel testing standards (Vitest, Playwright, coverage) |
| [`mvi-contract`](mvi-contract/) | Fill the MVI Contract before every coding session |
| [`system-state`](system-state/) | Maintain SYSTEM_STATE.md as production source of truth |
| [`dare-log`](dare-log/) | Track decisions and risks with DARE framework |
| [`auto-documentation`](auto-documentation/) | Auto-generate docs, changelogs, and API references |
| [`concurrent-development`](concurrent-development/) | Coordinate concurrent branches with safe merging |
| [`shift-testing`](shift-testing/) | Evaluate AI agent quality with S.H.I.F.T. methodology |

### DevOps & Deployment
| Skill | Description |
|---|---|
| [`deployment`](deployment/) | Deploy to DigitalOcean with PM2, Nginx, and GitHub Actions |
| [`error-reporting`](error-reporting/) | Three-tier error reporting: console → email → GitHub Issue |
| [`ralph-loop`](ralph-loop/) | Self-healing CI: auto-trigger @copilot on failure, loop until fixed |
| [`recurse-ml`](recurse-ml/) | Autonomous PR review and bug detection via RecurseML |

### Security & Compliance
| Skill | Description |
|---|---|
| [`vault-agent`](vault-agent/) | Ephemeral gatekeeper for all secrets and credentials |
| [`security`](security/) | OWASP protections, secret management, input sanitization |

### Accessibility & Compliance
| Skill | Description |
|---|---|
| [`accessibility`](accessibility/) | WCAG 2.2 AA/AAA, TTY/TDD support, ADA compliance |

### Content & Marketing
| Skill | Description |
|---|---|
| [`seo-metadata`](seo-metadata/) | SEO metadata, Open Graph, JSON-LD, targeting Lighthouse 90+ |

### Tax & Legal
| Skill | Description |
|---|---|
| [`tax-legal-agent`](tax-legal-agent/) | Tax returns, IRS, legal research, court filings |

### Testing & Quality
| Skill | Description |
|---|---|
| [`testing-agent`](testing-agent/) | Ephemeral agent that generates and runs skill/unit/E2E tests |

---

## Mandatory Skills for Every Session

Load these at the **start** of every agent session:

1. **`system-state`** — Read `SYSTEM_STATE.md` before writing any code
2. **`mvi-contract`** — Fill the MVI Contract before starting work  
3. **`model-router`** — Route tasks to the correct model
4. **`context-management`** — Monitor token usage

Load these at the **end** of every session:

1. **`wrap-up`** — Ship, Remember, Review, Publish
2. **`memory-pruning`** — Prune session logs

---

## How to Load a Skill

1. Find the relevant skill using the trigger table in [`REGISTRY.md`](REGISTRY.md)
2. Read the skill's `SKILL.md` or `.skill.yml` at the path shown
3. Apply all rules and workflows defined in the skill
4. If multiple skills apply, load all of them

---

## How to Create a New Skill

**Fastest way:** Use the `skill-forge` skill — it interviews you and generates all files.

**Manual way:**

1. Create a new folder: `skills/<your-skill-name>/`
2. Copy files from [`../templates/skill-template/`](../templates/skill-template/)
3. Fill in `SKILL.md` and `<skill-name>.skill.yml`
4. Add PromptFoo tests in `tests/promptfoo.yml`
5. Register the skill in [`REGISTRY.md`](REGISTRY.md) and [`SKILLS_INDEX.yml`](SKILLS_INDEX.yml)
6. See [`../docs/SKILL_CREATION_GUIDE.md`](../docs/SKILL_CREATION_GUIDE.md) for the full guide

---

## Where Does Code Go Inside a Skill Folder

Skills are primarily **instruction files for AI agents** (markdown + YAML). However, some skills include supporting code:

| File Type | Location | Purpose |
|---|---|---|
| Agent instructions | `SKILL.md` | Primary skill spec (markdown) |
| Machine config | `<name>.skill.yml` | Triggers, models, metadata |
| Test configs | `tests/promptfoo.yml` | LLM assertion tests |
| Install scripts | `install/windows/*.bat` | Windows installer |
| Install scripts | `install/mac/*.command` | macOS installer |
| TypeScript utilities | `src/<name>.ts` | Only if skill has code helpers |
| Unit tests | `src/<name>.test.ts` | Tests for any TypeScript code |
| GitHub Actions | Reference only — place in `.github/workflows/` | CI/CD workflows |

> **Rule:** If a skill references a GitHub Actions workflow or TypeScript helper,
> the actual file lives in `.github/workflows/` or the project's `src/` directory.
> The skill folder contains only docs, config, and test configs.

---

## Running Skill Tests

```bash
# Install PromptFoo (one-time)
npm install -g promptfoo

# Test a specific skill
cd skills/<skill-name>/tests
promptfoo eval --config promptfoo.yml
promptfoo view

# Test all skills that have tests
for config in skills/*/tests/promptfoo.yml; do
  echo "Testing: $(dirname $(dirname $config))"
  promptfoo eval --config "$config"
done
```

---

*Maintained by Audrey Evans (MIDNGHTSAPPHIRE). See [`REGISTRY.md`](REGISTRY.md) for the full skill catalog.*
