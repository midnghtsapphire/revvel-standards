# Database Architecture Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy — SINGLE SOURCE OF TRUTH  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Decision: PostgreSQL. Not MySQL

Every Revvel application uses **PostgreSQL** as its database engine. This is not a per-project decision — it is a platform-wide standard. MySQL is not used.

### Why PostgreSQL Over MySQL

| Capability | PostgreSQL | MySQL | Impact |
|---|---|---|---|
| JSONB columns (indexable JSON) | ✅ Native | ⚠️ Limited | Flexible metadata, AI outputs, EDI payloads |
| UUID primary keys | ✅ Built-in | ⚠️ Requires extension | Security — no sequential ID guessing |
| Array column type | ✅ Native | ❌ None | Tags, categories, multi-select fields |
| Full-text search | ✅ Strong | ⚠️ Basic | Product search, content search |
| Decimal precision | ✅ Exact | ⚠️ Float drift | Financial data, IRS/tax fields, prices |
| Drizzle ORM | ✅ First-class | ✅ Supported | Our ORM is optimized for Postgres |
| Supabase compatible | ✅ Supabase IS Postgres | ❌ Supabase = Postgres only | Visual DB editor, real-time |
| Row-level security | ✅ Native RLS | ❌ None | Multi-tenant data isolation |
| LISTEN/NOTIFY | ✅ Real-time events | ❌ None | Webhooks, live dashboard updates |
| `created_at` auto-trigger | ✅ Clean | ✅ Works | Audit fields |

---

## 2. Hosting Options

### Option A: DigitalOcean Managed PostgreSQL ⭐ Default for Production

Since all Revvel apps already run on DigitalOcean Droplets, the managed Postgres service is the natural fit.

| Property | Details |
|---|---|
| **Provider** | DigitalOcean |
| **Service Name** | Managed PostgreSQL |
| **Min Plan** | $15/month (1 GB RAM, 10 GB storage) |
| **Recommended Plan** | $50/month (2 GB RAM, 25 GB storage) for apps with >1000 users |
| **PostgreSQL Version** | 16 (latest) |
| **Backups** | Automatic daily backups, 7-day retention (included) |
| **Connection Type** | Private network to Droplet — no public internet exposure |
| **SSL** | Enforced (`sslmode=require` in connection string) |
| **Region** | Match your Droplet region (NYC3 default) |
| **Scaling** | Resize in control panel, no downtime |

**Setup steps:**
1. DigitalOcean Control Panel → Databases → Create Database Cluster
2. Choose PostgreSQL 16
3. Choose same region as your Droplet (NYC3)
4. Choose plan ($15 starter, $50 production)
5. After creation: Settings → Trusted Sources → add your Droplet
6. Copy the connection string → add to GitHub Secrets as `DATABASE_URL`

**Connection string format:**
```text
DATABASE_URL=******db-postgresql-nyc3-xxxxx-do-user-xxxxxxx-0.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

---

### Option B: Supabase ⭐ Add-on for Visual DB Access

Supabase is PostgreSQL under the hood. Use it **in addition to** or **instead of** DigitalOcean when you want a web-based UI to browse and edit database tables without writing code.

| Property | Details |
|---|---|
| **Provider** | Supabase |
| **Cost** | Free (500MB, 2 projects) / $25/month Pro |
| **PostgreSQL Version** | 15 |
| **Visual Table Editor** | ✅ Browse, filter, edit rows in a web browser — no code |
| **Auto-generated REST API** | ✅ Instant API from your schema |
| **Realtime** | ✅ WebSocket subscriptions on table changes |
| **Auth** | ✅ Built-in (optional alternative to Clerk) |
| **File Storage** | ✅ S3-compatible (photos, uploads) |
| **Drizzle compatible** | ✅ Connect via standard Postgres URL |

**When to use Supabase:**
- You want to visually browse database rows (especially useful for EDI/IRS mapped data)
- You want real-time features (live dashboard, notifications)
- You want file/image storage included
- Free tier is acceptable for early-stage apps

**Supabase connection string format:**
```text
DATABASE_URL=******db.abcdefghijklm.supabase.co:5432/postgres
```

---

### Option C: Self-Hosted on Droplet — Development Only

Running PostgreSQL directly on the same Droplet as the app is acceptable **only for local development or a personal sandbox**. Never in production.

**Why not in production:**
- App and DB compete for RAM/CPU — one crash takes both down
- No automatic backups
- Manual patching required
- No connection pooling by default
- Data loss risk on Droplet resize

---

## 3. Decision Matrix

| Your Situation | Use This |
|---|---|
| Production app, real users, real money | DigitalOcean Managed Postgres |
| Early stage / free tier needed | Supabase Free |
| Want visual DB table editor (no code) | Supabase (any tier) |
| Need real-time websocket features | Supabase |
| Need file/image storage | Supabase |
| Everything on one bill | DigitalOcean Managed Postgres |
| EDI/IRS data that needs visual verification | Supabase (table editor) |
| Local dev / sandbox | SQLite or local Postgres |

---

## 4. Standard Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    DigitalOcean                             │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │   App Droplet        │    │  Managed PostgreSQL 16   │   │
│  │                     │    │                          │   │
│  │  Next.js + PM2      │◄──►│  Private network (fast)  │   │
│  │  Nginx (port 443)   │    │  Auto daily backups      │   │
│  │  Node.js backend    │    │  SSL enforced            │   │
│  │  Drizzle ORM        │    │  Resizable on demand     │   │
│  └──────────┬──────────┘    └──────────────────────────┘   │
│             │                                               │
└─────────────┼───────────────────────────────────────────────┘
              │ HTTPS (Let's Encrypt)
        ┌─────▼──────┐
        │   Users    │  ← Browser / Mobile
        └────────────┘

OPTIONAL — Add Supabase for visual DB access:

┌──────────────────┐        ┌───────────────────────────┐
│  DO App Droplet  │        │       Supabase             │
│  (App + PM2)     │◄──────►│  Same Postgres data       │
│  Drizzle ORM     │        │  Table editor UI           │
└──────────────────┘        │  Real-time subscriptions  │
                            │  File storage              │
                            └───────────────────────────┘
```

---

## 5. Required Environment Variables

Every app must have these in `.env.example` and GitHub Secrets:

```bash
# Primary database connection (required)
DATABASE_URL=******host:5432/dbname?sslmode=require

# Optional: Supabase (if using for real-time or file storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Server-only, never expose to browser
```

---

## 6. Connection Pooling (Required for Production)

Raw Postgres connections are limited. Use PgBouncer (built into DigitalOcean Managed Postgres) or Supabase's pooler.

```bash
# DigitalOcean connection pooler URL (use this, not the direct URL)
DATABASE_URL=******db-postgresql-nyc3-xxxxx-do-user-0.b.db.ondigitalocean.com:25061/defaultdb?sslmode=require
#                                                                                    ^^^^^ port 25061 = pooler
```

```ts
// db/index.ts — Drizzle connection with pooling
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,          // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
```

---

## 7. Database-to-App Field Mapping

Every database table column must be mapped to its corresponding UI field. See:
- `docs/field-maps/DATABASE_TO_UI_MASTER_MAP.md` — master index of every table → every UI screen
- `docs/field-maps/AUTH_SCREENS_FIELD_MAP.md` — users table fields
- `docs/field-maps/ECOMMERCE_FIELD_MAP.md` — products, orders, cart fields
- `docs/field-maps/ADMIN_PANEL_FIELD_MAP.md` — admin management fields
- `docs/field-maps/AFFILIATE_FIELD_MAP.md` — affiliate tracking fields

### 7.1. UI Field Testing & Validation (DBA Process)

Once field maps are created, every field must be validated through a systematic CRUD testing process. This is a mandatory DBA step before any screen is considered production-ready.

**See:** `UI_FIELD_TESTING_DBA_STANDARD.md` — the complete DBA module for field-by-field UI-to-database testing, including:
- CRUD validation workflow (INSERT, SELECT, UPDATE, DELETE verification)
- Constraint testing (NOT NULL, UNIQUE, CHECK, FK)
- ACID property verification
- Trigger and stored procedure testing
- Playwright + PostgreSQL automated test patterns
- Test evidence log templates
- Compliance checks DBA-001 through DBA-006

**BOM:** `docs/Universal-BOM_List/UI_FIELD_TESTING_BOM.md` — all tools for UI field testing (free minimum stack: $0).

---

## 8. Backup and Recovery Policy

| Scenario | Action |
|---|---|
| Accidental data deletion | Restore from DigitalOcean daily backup (up to 7 days back) |
| Migration error | Run `drizzle-kit` rollback migration |
| Droplet lost | Restore database from backup to new Managed Postgres instance, redeploy app |
| Full data export | `pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql` |

**Manual backup command (run before any major migration):**
```bash
pg_dump $DATABASE_URL > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```
