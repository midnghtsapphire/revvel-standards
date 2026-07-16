# MeiliSearch Quick Reference

**Status:** ✅ Production Ready  
**Priority:** HIGH — Revenue blocker

---

## 🚀 Quick Setup (< 5 minutes)

### 1. Install MeiliSearch

```bash
# Option A: Local (Development)
curl -L https://install.meilisearch.com | sh
./meilisearch --master-key="yourMasterKey"

# Option B: MeiliCloud (Production) - https://cloud.meilisearch.com
```

### 2. Configure Environment

Add to `.env`:
```bash
MEILI_HOST=http://localhost:7700
MEILI_KEY=yourMasterKey
```

### 3. Install MCP Server

```bash
cd mcp-servers/meilisearch-mcp
pip install -e .
```

### 4. Enable in `.mcp.json`

Remove `"disabled": true` from the `meilisearch` entry.

---

## 🔧 8 MCP Tools Available

| Tool | Purpose | Example |
|------|---------|---------|
| `meili_index_create` | Create index | `{ "index_uid": "products", "primary_key": "id" }` |
| `meili_index_list` | List indexes | `{}` |
| `meili_index_delete` | Delete index | `{ "index_uid": "products" }` |
| `meili_documents_add` | Add documents | `{ "index_uid": "products", "documents": "[...]" }` |
| `meili_documents_search` | Search | `{ "index_uid": "products", "query": "bowl", "limit": 20 }` |
| `meili_documents_get` | Get by ID | `{ "index_uid": "products", "document_id": "123" }` |
| `meili_settings_update` | Configure | `{ "index_uid": "products", "settings": {...} }` |
| `meili_health` | Health check | `{}` |

---

## 💡 Common Use Cases

### Index Products

```python
import meilisearch
client = meilisearch.Client('http://localhost:7700', 'masterKey')
index = client.index('products')

products = [
  {'id': 1, 'name': 'Soul Bowl', 'price': 1295, 'category': 'entree'},
  {'id': 2, 'name': 'Fried Rice', 'price': 595, 'category': 'side'},
]
index.add_documents(products)
```

### Configure Search

```python
index.update_settings({
    'searchableAttributes': ['name', 'category', 'description'],
    'filterableAttributes': ['category', 'price'],
    'sortableAttributes': ['price', 'name'],
})
```

### Search API (Next.js)

```typescript
// pages/api/search.ts
import MeiliSearch from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILI_HOST!,
  apiKey: process.env.MEILI_KEY!,
});

export default async function handler(req, res) {
  const { q, category, limit = 20 } = req.query;
  const index = client.index('products');
  
  const results = await index.search(q || '', {
    limit: Number(limit),
    filter: category ? [`category = "${category}"`] : [],
  });

  res.json(results);
}
```

### Instant Search UI (React)

```tsx
import { useState, useEffect } from 'react';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) return;
    
    const search = async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.hits);
    };
    
    const timer = setTimeout(search, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      {results.map((p) => (
        <div key={p.id}>{p.name} - ${(p.price / 100).toFixed(2)}</div>
      ))}
    </div>
  );
}
```

---

## 📊 Features

### Typo Tolerance (Built-in)
- ✅ "soul bowls" → finds "Soul Bowl"
- ✅ "freid rice" → finds "Fried Rice"

### Filters
```typescript
// Price range
filter: ['price >= 500 AND price <= 1500']

// Category
filter: ['category = "entree"']

// Multiple values (OR)
filter: ['category IN [entree, side]']
```

### Sorting
```typescript
sort: ['price:asc']     // Low to high
sort: ['price:desc']    // High to low
sort: ['name:asc']      // A-Z
```

### Facets (Counts)
```typescript
const results = await index.search('', {
  facets: ['category', 'inStock'],
});
// Returns: { category: { entree: 12, side: 8 }, ... }
```

---

## 🏥 Health Check

```typescript
// pages/api/health/meili.ts
import MeiliSearch from 'meilisearch';

export default async function handler(req, res) {
  const client = new MeiliSearch({
    host: process.env.MEILI_HOST!,
    apiKey: process.env.MEILI_KEY!,
  });
  
  const health = await client.health();
  res.json(health);
}
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Slow search (>100ms) | Reduce `searchableAttributes`, add filters |
| Out of memory | Increase RAM (needs ~10x document size) |
| Too many typos | Increase `minWordSizeForTypos` settings |
| Index not updating | Check `task.wait()` after add/update |

---

## 📚 Full Documentation

- **Integration Guide:** `docs/MEILISEARCH_INTEGRATION_GUIDE.md`
- **MCP Standard:** `docs/Master_Inventory/MCP_STANDARD.md`
- **Server README:** `mcp-servers/meilisearch-mcp/README.md`
- **Official Docs:** <https://www.meilisearch.com/docs>

---

## 🎯 Priority

**HIGH** — Search is a revenue blocker. Implement early in every customer-facing project.

**Performance Target:** <50ms search response time

**Conversion Impact:** Good search can increase conversions by 20-30%
