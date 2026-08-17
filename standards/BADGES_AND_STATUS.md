# Badges & Status Surfaces — How We Actually Use Them

**Status:** ACTIVE · **Updated:** 2026-08-05

Badges are **at-a-glance health**, not decoration. Every badge must resolve to a live check, workflow, or Project metric. Dead badges are worse than none.

## Where badges live

| Surface | Purpose |
| --- | --- |
| Root `README.md` | Repo health row (CI, formal, privilege fleet, deploy) |
| Product `products/*/README.md` | Product-specific build/test/deploy |
| PR template | Dynamic status comments (not static badges) |
| Project status updates | Narrative weekly health |
| Commit status / check runs | Authoritative gate (not a badge) |

## Canonical badge row (root README)

```markdown
[![CI](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/pr-lifecycle.yml/badge.svg)](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/pr-lifecycle.yml)
[![Label allowlist](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/label-allowlist.yml/badge.svg)](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/label-allowlist.yml)
[![Formal verify](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/formal-auto-wr.yml/badge.svg)](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/formal-auto-wr.yml)
[![Agent scorecard](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/agent-scorecard.yml/badge.svg)](https://github.com/midnghtsapphire/revvel-standards/actions/workflows/agent-scorecard.yml)
[![Standards site](https://img.shields.io/badge/standards-revvel--standards.vercel.app-7C5CFF)](https://revvel-standards.vercel.app)
```

## Badge types we use

1. **GitHub Actions badge** — `…/actions/workflows/<file>.yml/badge.svg`  
   Source of truth for pass/fail of a named workflow.
2. **Shields.io static** — only for *stable* facts (license, site URL, phase).  
   Never use static green for CI health.
3. **Shields.io dynamic** (endpoint / GitHub) — optional for open issue count, last commit.
4. **Commit status / checks** — the real gate for merge; badges only *display* them.

## Rules

- Every new workflow that matters gets a badge **or** a Project status field — not both noise.  
- Prefer **check runs** for merge gates; badges for humans scanning the README.  
- Agents must refresh badge links when renaming workflows.  
- Do not invent custom emoji-status in issues when a badge/check exists.

## PR status comment (preferred over badge spam)

Workflows should post a single sticky comment:

```text
### Status board
| Check | Result |
| formal dual-path | pass / fail / reaudit |
| label allowlist | green |
| privilege tier | Associate |
| human gate | REQUIRED |
```

## Formal verification badges

After `formal-auto-wr` lands:

- `formal:pass` / `formal:fail` / `formal:reaudit` labels (allowlisted)  
- Project field **Formal Verdict**  
- Optional shields endpoint later from `artifacts/formal-report.json` published as a gist or Pages JSON
