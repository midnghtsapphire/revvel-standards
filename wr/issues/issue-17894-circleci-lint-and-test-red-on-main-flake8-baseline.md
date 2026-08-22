# WR: [WR] CircleCI lint-and-test red on main: flake8 baseline lists excluded inject_cookies path

**Issue:** #17894  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-22  
**Research Date:** 2026-08-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Acceptance Criteria

- [ ] Change delivers the described behavior
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable

## Learnings — What & Why

The `scripts/flake8-baseline-gate.js` gate strictly enforces that `config/flake8-baseline.txt` does not contain any violations belonging to paths listed in `FLAKE8_EXCLUDE`.

Recently, `mcp-servers/gemini-notebook-mcp-cli` was vendored into the repository. Because it brings its own upstream configuration (like a `tool.ruff` section in a `pyproject.toml` or similar), it was correctly added to the repository's `FLAKE8_EXCLUDE` to avoid conflicting standards or modifying upstream vendor code (which is forbidden per memory).

However, during that addition, existing flake8 errors for the vendored files (such as `mcp-servers/gemini-notebook-mcp-cli/scripts/inject_cookies_and_inspect.py::E501`) were not pruned from the `flake8-baseline.txt` file.

Additionally, `scripts/flake8-baseline-gate.js` had a malformed syntax structure where `FLAKE8_EXCLUDE` was assigned a string but immediately followed by a floating string literal expression continuing the previous exclusion list, creating a double-declaration edge-case.

### Actionable Fixes Applied

1. Fixed the syntax format inside `scripts/flake8-baseline-gate.js` to define the `FLAKE8_EXCLUDE` const as a single correctly concatenated string.
2. Filtered out all orphaned `mcp-servers/gemini-notebook-mcp-cli` violations from `config/flake8-baseline.txt` using grep, removing them from the tracked debt.
3. Successfully passed `node scripts/flake8-baseline-gate.js` which verifies both changes.
