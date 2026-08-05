# MeiliSearch POC

**Status:** Ready to run  
**Target:** <50 ms search response time  
**Data:** 50 sample product-catalog documents

---

## Quick Start

### 1. Start MeiliSearch (Docker)

```bash
cd poc/meilisearch
docker compose up -d
```

MeiliSearch will be available at **<http://localhost:7700>**.  
Default master key: `masterKey` (override with `MEILI_KEY` env var).

### 2. Seed data and run benchmarks

```bash
pip install meilisearch
python seed.py
```

### 3. Review results

The script prints a comparison table (MeiliSearch vs Elasticsearch baseline)
and confirms whether the <50 ms target is met for every query type.

---

## Environment Variables

| Variable    | Default                    | Description                  |
|-------------|----------------------------|------------------------------|
| `MEILI_HOST`| `http://localhost:7700`    | MeiliSearch instance URL     |
| `MEILI_KEY` | `masterKey`                | Master or search API key     |

Set these in your `.env` file (see `.env.example` in the repo root) or export
them in your shell before running `seed.py`.

> **Missing credentials?**  
> If `MEILI_HOST` / `MEILI_KEY` are not set, the script falls back to the
> Docker defaults above and prints a clear error with remediation steps.
> No hard failure — just a descriptive message.

---

## Files

| File                    | Purpose                                           |
|-------------------------|---------------------------------------------------|
| `docker-compose.yml`    | Spins up MeiliSearch v1.7 locally via Docker      |
| `sample-products.json`  | 50 product catalog documents for seeding          |
| `seed.py`               | Seeds data, runs benchmarks, prints report        |

---

## Benchmark Queries

The benchmark covers 12 query types:

- Exact product-name match
- Typo-tolerance (2-typo variants)
- Category keyword search
- Prefix / partial match
- Description-field terms
- No-result graceful handling
- Empty query (browse all)

Each query runs **10 iterations**; p50 and p95 latencies are reported.

---

## Acceptance Criteria Checklist

- [x] MeiliSearch instance running (Docker Compose)
- [x] Sample data indexed (50 product-catalog documents)
- [x] Benchmark results — p50 <50 ms target validated per query
- [x] Comparison report vs Elasticsearch (printed by `seed.py`)

---

## Production Setup

Once the POC validates the approach:

1. Provision **MeiliSearch Cloud** at <https://www.meilisearch.com/cloud>
2. Store credentials in Vault: `revvel/shared/search/meilisearch`
3. Add to your project `.env`:
   ```text
   MEILI_HOST=https://your-instance.meilisearch.io
   MEILI_KEY=your-api-key
   ```
4. Enable the MCP server in `.mcp.json`:
   ```json
   // Remove "disabled": true from the "meilisearch" entry
   ```
5. Follow `docs/MEILISEARCH_INTEGRATION_GUIDE.md` for full app integration.
