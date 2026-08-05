# CONTEXT_PRIMER.md — Claw Code (Revvel Standard for Claws & Contributors)

**Project**: claw-code — Rust Claude Agent Harness
**Goal**: Demonstrate high-velocity autonomous development where "humans direct, claws execute".

## Current State

- Canonical implementation in `rust/` workspace (9 crates)
- 40+ tools, permission system, session persistence, mock parity harness
- Actively developed via claws (oh-my-codex, clawhip, etc.)
- Strong alignment with Revvel EXRUP methodology

## Next Priorities

- Full plugin system + skills registry
- Enhanced TUI interface (ratatui)
- Complete Revvel artifact coverage

## Contribution Rules

1. **Artifact-first** — update docs with every code change
2. **One-iteration delivery** when possible
3. Run `cargo test --workspace` and the mock harness before pushing
4. Keep permission safety central — never weaken the `PolicyEngine` without review

## Quick-Start for Claws

1. Read `rust/README.md` for workspace layout and build instructions
2. Read `docs/claw-code/BLUEPRINT.md` for the full architecture and data flow
3. Check `CHANGELOG.md` for the latest changes and version history
4. Bootstrap your task with this primer to orient yourself before writing code

## See Also

- `docs/claw-code/BLUEPRINT.md`
- `PHILOSOPHY.md`
- Root `CHANGELOG.md`
