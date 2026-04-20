# GitHub Copilot Instructions — revvel-standards

Full agent rules live in [`docs/AGENTS.md`](../docs/AGENTS.md). Read that file first.

## Default Issue Repository

**The default issue repository for this workspace is `midnghtsapphire/revvel-standards`.**

When creating, listing, commenting on, or reading issues without an explicit repository specified by the user, **always** target `midnghtsapphire/revvel-standards`. Always read `revvel-standards` first before picking any other target.

Do **not** rely on the `gh` CLI's auto-discovered default repo — it frequently resolves to `midnghtsapphire/mind-mappr` (sometimes misspelled `miind-mapper` / `mind-mapper`) because of alphabetic ordering, which routes standards-level issues to the wrong repo.

### Required behavior

- `gh` CLI: always pass `--repo midnghtsapphire/revvel-standards` for issue commands (`gh issue create|list|view|comment|edit`) unless the user names a different repo explicitly in the current request.
- GitHub REST/GraphQL API: default to `/repos/midnghtsapphire/revvel-standards/issues`.
- MCP / Copilot tools that accept `owner` / `repo` parameters for issue operations: default to `owner=midnghtsapphire`, `repo=revvel-standards`.
- If a one-time override is needed (e.g., filing a bug against `mind-mappr`), the user must name the target repo explicitly in the request. Never infer or guess another repository.

### Rationale

`mind-mappr` and `revvel-standards` sort adjacently in the MIDNGHTSAPPHIRE org and several tools auto-select `mind-mappr` as the default. Standards-level issues were being mis-routed there. Pinning the default to `revvel-standards` prevents accidental mis-targeting.
