# GoSQLX SQL Linter

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/gosqlx-sql-linter/)**

> Deploy path: Vercel project pointing at `products/gosqlx-sql-linter` (Next.js).
> Until the monorepo static publisher mirrors this app, run locally on port **3012**
> or attach the folder as its own Vercel project (`vercel.json` included).

## What It Is

Browser + API **multi-dialect SQL linter** aligned with
[GoSQLX](https://github.com/ajitpratap0/GoSQLX) public rules (L001–L010) and the
repo CI action `ajitpratap0/GoSQLX@v1.14.0`.

- Paste SQL, choose dialect (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle,
  SQLite, Snowflake, ClickHouse, or auto-detect)
- Instant lint + structural validation + keyword uppercase formatter
- Markdown report download
- `POST /api/lint` for integrations
- Companion to `.github/workflows/gosqlx-lint.yml` (authoritative parse in CI)

**Market context:** teams adopting SQL-in-repo workflows need a zero-setup
playground that matches their CI linter. GoSQLX is the fast Go parser; this app
is the human-facing SaaS surface and REST wrapper for the same rule IDs.

---

## Features

| Feature | Detail |
| --- | --- |
| Dialects | 8 engines + auto-detect hints |
| Rules | L001–L010 style + E1001–E1003 structure |
| API | `GET/POST /api/lint` |
| Export | Markdown lint report |
| CI twin | Official GoSQLX GitHub Action on `sql/**` |

---

## Quick Start

```bash
cd products/gosqlx-sql-linter
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

---

## API

### `GET /api/lint`

Returns dialects, rule catalog, and CI pointers.

### `POST /api/lint`

```json
{
  "sql": "SELECT id FROM users AS u WHERE active = TRUE;",
  "dialect": "postgresql",
  "format": "json"
}
```

- `format`: `json` (default) or `markdown`
- Non-OK structural results return **HTTP 422** with the full result body
- Payload limit: 200KB

---

## Relationship to CI GoSQLX

| Surface | Engine | Role |
| --- | --- | --- |
| This app | TypeScript rules in `app/data/linter.ts` | Instant UX / API |
| `.github/workflows/gosqlx-lint.yml` | `ajitpratap0/GoSQLX@v1.14.0` | Merge gate parse |
| `standards/SQL_CODE_STANDARDS.md` | — | Developer contract |
| `sql/fixtures/**` | Real GoSQLX validate | Golden corpus |

The playground does **not** embed the Go WASM binary; treat CI as source of
truth for exotic dialect parse edge cases.

---

## Deploy

```bash
cd products/gosqlx-sql-linter
npx vercel --prod
# or: monorepo ship-to-market / scripts/deploy-vercel.js --dir=products/gosqlx-sql-linter
```

Port assignment (local monorepo): **3012**

---

## License

Apache-2.0 alignment with upstream GoSQLX branding for rule IDs; this product
code is part of revvel-standards.
