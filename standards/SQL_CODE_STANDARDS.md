# SQL Code Standards

**Status:** active
**Enforced by:** `.github/workflows/gosqlx-lint.yml` (GoSQLX v1.14.0)
**Config:** `.gosqlx.yml`
**Playground:** `products/gosqlx-sql-linter`

## Purpose

Keep SQL in this monorepo parseable, dialect-aware, and free of the most common
style defects before merge. CI uses
[GoSQLX](https://github.com/ajitpratap0/GoSQLX) — a zero-copy multi-dialect SQL
parser (not an ORM) with CLI, GitHub Action, and lint rules L001–L010.

## Scope of the CI gate

| Included | Excluded |
| --- | --- |
| `sql/**/*.sql` | `schemas/**` (PL/pgSQL / `CREATE FUNCTION`) |
| `products/gosqlx-sql-linter/**/*.sql` | `skills/**` template DDL |
| | `**/node_modules/**`, `**/.next/**` |

Existing schema DDL is intentionally out of scope (WR #15862 explicit
exclusion: no schema/ORM/migration rewrites). Broaden the workflow glob only
after `gosqlx validate` passes on the new paths.

## Supported dialects

PostgreSQL · MySQL · MariaDB · SQL Server · Oracle · SQLite · Snowflake ·
ClickHouse

Default CI dialect: **postgresql** (matches most app SQL here).

## Style rules (developer checklist)

1. **Uppercase keywords** — `SELECT`, `FROM`, `WHERE`, `TRUE`/`FALSE` (L007).
2. **No trailing whitespace** (L001).
3. **Spaces only for indentation** — no tabs mixed with spaces (L002).
4. **One blank line max** between clauses/statements (L003).
5. **Lines ≤ 120 characters** (L005 / config `max-line-length`).
6. **Prefer explicit columns** over `SELECT *` in production queries (L006).
7. **Alias joined tables** and qualify columns (L009).
8. Prefer `AS` for column aliases for readability across dialects.
9. Parameterize user input — never concatenate untrusted strings into SQL.
10. Put new gated queries under `sql/fixtures/<dialect>/`.

## Local workflow

```bash
# Install CLI (requires Go ≥ 1.26 for v1.14.0)
go install github.com/ajitpratap0/GoSQLX/cmd/gosqlx@v1.14.0

# Validate curated fixtures (same gate as CI)
gosqlx validate -r sql/ --dialect postgresql --stats

# Optional style lint
gosqlx lint -r sql/

# Format a file
gosqlx format path/to/query.sql
```

## CI behavior

- Triggers on changes to `sql/**`, `.gosqlx.yml`, the workflow file, or product
  SQL under `products/gosqlx-sql-linter/`.
- Runs `ajitpratap0/GoSQLX@v1.14.0` with `validate: true`, `fail-on-error: true`.
- Lint is off in CI by default (validate is the merge gate); enable locally or
  flip `lint: "true"` in the workflow once the fixture corpus is style-clean.

## Playground SaaS

The companion app at `products/gosqlx-sql-linter` provides a browser playground
and `POST /api/lint` for multi-dialect checks without installing Go. Use it for
interactive review; trust CI GoSQLX for the authoritative parse.

## References

- GoSQLX docs: <https://gosqlx.dev>
- Lint rules: upstream `docs/LINTING_RULES.md` in the GoSQLX repo
- WR: midnghtsapphire/revvel-standards#15862
