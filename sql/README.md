# SQL fixtures (GoSQLX-gated)

SQL under this directory is validated on every PR/push that touches it by the
**GoSQLX Lint** workflow (`.github/workflows/gosqlx-lint.yml`).

## Why a curated tree?

GoSQLX v1.14 is a high-performance multi-dialect parser, not a full PL/pgSQL
compiler. Repository DDL that uses `CREATE FUNCTION`, triggers, or vendor
extensions under `schemas/` and `skills/` is **out of scope** for this gate
(see WR #15862 exclusions and `standards/SQL_CODE_STANDARDS.md`).

## Layout

| Path | Dialect focus | Purpose |
| --- | --- | --- |
| `fixtures/postgresql/` | PostgreSQL | Canonical app queries (CTEs, window functions) |
| `fixtures/mysql/` | MySQL / MariaDB | Portable DML samples |
| `fixtures/sqlite/` | SQLite | Embedded / edge samples |
| `fixtures/multi/` | Cross-dialect | Constructs shared across engines |

## Local check

```bash
go install github.com/ajitpratap0/GoSQLX/cmd/gosqlx@v1.14.0
gosqlx validate -r sql/ --dialect postgresql
gosqlx lint -r sql/
```

## Adding SQL

1. Prefer uppercase keywords (`SELECT`, `FROM`, `WHERE`).
2. Avoid `SELECT *` in production queries (L006).
3. Alias every joined table (L009).
4. Keep lines ≤ 120 characters.
5. Run `gosqlx validate` before opening a PR.
