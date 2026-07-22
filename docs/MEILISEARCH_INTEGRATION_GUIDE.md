# MeiliSearch Integration Guide

**Version:** 1.0.0  
**Date:** April 30, 2026  
**Priority:** HIGH — Revenue blocker (search affects conversions)

---

## Overview

This guide walks you through integrating MeiliSearch for product/user-facing search in Revvel applications. MeiliSearch provides instant search results with typo tolerance, relevance tuning, and powerful filtering capabilities.

## Why MeiliSearch

- **Instant search** — Results in <50ms
- **Typo tolerance** — "soul bowls" finds "Soul Bowl"
- **Relevance tuning** — Custom ranking rules per business needs
- **Developer-friendly** — Simple REST API + SDKs
- **Self-hostable** — Full control over data
- **Production-ready** — Powers search for thousands of sites

---

## Quick Start

### 1. Setup MeiliSearch

#### Option A: Self-Hosted (Recommended for Development)

```bash
# macOS/Linux
curl -L https://install.meilisearch.com | sh

# Start MeiliSearch
./meilisearch --master-key="yourMasterKey"
# Runs on http://localhost:7700
```

#### Option B: MeiliCloud (Recommended for Production)

1. Sign up at <https://www.meilisearch.com/cloud>
2. Create a new project
3. Copy your host URL and API key

### 2. Configure MCP Server

Add to your project's `.env`:

```bash
MEILI_HOST=http://localhost:7700  # or your MeiliCloud URL
MEILI_KEY=yourMasterKey
```

The MeiliSearch MCP server is already configured in `.mcp.json`. Enable it by:

1. Installing dependencies:
   ```bash
   cd mcp-servers/meilisearch-mcp
   pip install -e .
   ```

2. In your project's `.mcp.json`, remove the `"disabled": true` line from the `meilisearch` entry.

### 3. Create Search Index

```python
import meilisearch

# Initialize client
client = meilisearch.Client('http://localhost:7700', 'yourMasterKey')

# Create index
index = client.index('products')

# Configure search settings
index.update_settings({
    'searchableAttributes': ['name', 'category', 'description', 'tags'],
    'filterableAttributes': ['category', 'price', 'inStock'],
    'sortableAttributes': ['price', 'name', 'createdAt'],
    'rankingRules': [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness'
    ],
    'typoTolerance': {
        'enabled': True,
        'minWordSizeForTypos': {
            'oneTypo': 4,
            'twoTypos': 8
        }
    }
})
```

### 4. Sync Product Data

```python
# Example: Sync from database
products = [
    {
        'id': 1,
        'name': 'Soul Bowl',
        'category': 'entree',
        'description': 'Signature bowl with BBQ chicken, rice, and veggies',
        'price': 1295,  # in cents
        'inStock': True,
        'tags': ['popular', 'chicken', 'healthy']
    },
    {
        'id': 2,
        'name': 'Fried Rice',
        'category': 'side',
        'description': 'House special fried rice with egg and vegetables',
        'price': 595,
        'inStock': True,
        'tags': ['side', 'vegetarian']
    }
]

# Add documents (bulk operation)
task = index.add_documents(products)
task.wait()  # Wait for indexing to complete
print(f'Indexed {len(products)} products')
```

### 5. Implement Search API

#### Next.js API Route (`pages/api/search.ts`)

```typescript
import MeiliSearch from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILI_HOST!,
  apiKey: process.env.MEILI_KEY!,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, category, maxPrice, limit = 20 } = req.query;

  try {
    const index = client.index('products');
    
    const searchParams = {
      limit: Number(limit),
      filter: [],
    };

    // Add filters
    if (category) {
      searchParams.filter.push(`category = "${category}"`);
    }
    if (maxPrice) {
      searchParams.filter.push(`price <= ${maxPrice}`);
    }

    const results = await index.search(q || '', searchParams);

    res.status(200).json({
      hits: results.hits,
      query: q,
      processingTimeMs: results.processingTimeMs,
      estimatedTotalHits: results.estimatedTotalHits,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}
```

### 6. Frontend Integration

#### React Component with Instant Search

```tsx
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchProducts = debounce(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setResults(data.hits);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 200);

    searchProducts();
    return () => searchProducts.cancel();
  }, [query]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />
      
      {loading && <div className="search-loading">Searching...</div>}
      
      {results.length > 0 && (
        <div className="search-results">
          {results.map((product) => (
            <div key={product.id} className="search-result-item">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <span className="price">${(product.price / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Advanced Features

### Filtering and Sorting

```typescript
// Filter by category and price range
const results = await index.search('bowl', {
  filter: ['category = "entree"', 'price >= 1000 AND price <= 2000'],
  sort: ['price:asc'],
});

// Filter by multiple values (OR)
const results = await index.search('', {
  filter: ['category IN [entree, side]'],
});
```

### Faceted Search

```typescript
// Get facet counts
await index.updateSettings({
  filterableAttributes: ['category', 'tags', 'inStock'],
});

const results = await index.search('', {
  facets: ['category', 'tags', 'inStock'],
});

console.log(results.facetDistribution);
// {
//   category: { entree: 12, side: 8, drink: 5 },
//   inStock: { true: 20, false: 5 }
// }
```

### Geosearch (Location-based)

```typescript
// Enable geo search
await index.updateSettings({
  sortableAttributes: ['_geo'],
});

// Add location data to documents
const products = [
  {
    id: 1,
    name: 'Soul Bowl - Downtown',
    _geo: { lat: 38.6270, lng: -90.1994 }, // St. Louis
  },
];

// Search by proximity
const results = await index.search('soul bowl', {
  sort: ['_geo(38.6270, -90.1994):asc'],
});
```

### Synonyms

```typescript
// Configure synonyms
await index.updateSettings({
  synonyms: {
    'chicken': ['chkn', 'poultry'],
    'rice': ['fried rice', 'white rice'],
  },
});

// Now searching "chkn" will also match "chicken"
```

---

## Data Sync Patterns

### Real-time Sync (Webhooks)

```typescript
// After creating/updating a product in your database
async function syncProductToMeili(product) {
  const client = new MeiliSearch({
    host: process.env.MEILI_HOST!,
    apiKey: process.env.MEILI_KEY!,
  });
  
  const index = client.index('products');
  await index.addDocuments([product], { primaryKey: 'id' });
}

// In your API route
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const product = await db.products.create(req.body);
    
    // Sync to MeiliSearch (fire-and-forget)
    syncProductToMeili(product).catch(console.error);
    
    return res.status(201).json(product);
  }
}
```

### Batch Sync (Scheduled)

```bash
# Cron job: sync every hour
0 * * * * curl -X POST https://your-app.com/api/admin/sync-meili
```

```typescript
// pages/api/admin/sync-meili.ts
import { PrismaClient } from '@prisma/client';
import MeiliSearch from 'meilisearch';

const prisma = new PrismaClient();
const client = new MeiliSearch({
  host: process.env.MEILI_HOST!,
  apiKey: process.env.MEILI_KEY!,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const products = await prisma.product.findMany({
      where: { published: true },
    });

    const index = client.index('products');
    const task = await index.addDocuments(products, { primaryKey: 'id' });
    
    await task.wait();

    res.status(200).json({
      success: true,
      synced: products.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
}
```

---

## Production Deployment

### MeiliCloud Setup

1. **Create project** at <https://cloud.meilisearch.com>
2. **Choose region** closest to your users
3. **Select plan:**
   - Free tier: 100K searches/month
   - Starter: $29/mo for 1M searches
   - Pro: Custom pricing for high-volume

4. **Update environment variables:**
   ```bash
   MEILI_HOST=https://your-project.meilisearch.net
   MEILI_KEY=your-production-key
   ```

### Self-Hosted (DigitalOcean)

```bash
# Create Droplet (Ubuntu 22.04, 2GB RAM minimum)
# SSH into server

# Install MeiliSearch
curl -L https://install.meilisearch.com | sh

# Create systemd service
sudo tee /etc/systemd/system/meilisearch.service > /dev/null <<EOF
[Unit]
Description=MeiliSearch
After=network.target

[Service]
Type=simple
User=meilisearch
ExecStart=/usr/local/bin/meilisearch --master-key="${MEILI_MASTER_KEY}" --env=production
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Create dedicated user
sudo useradd -r -s /bin/false meilisearch

# Start service
sudo systemctl daemon-reload
sudo systemctl enable meilisearch
sudo systemctl start meilisearch

# Configure nginx reverse proxy
sudo tee /etc/nginx/sites-available/meilisearch > /dev/null <<EOF
server {
    listen 80;
    server_name search.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7700;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/meilisearch /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# Add SSL with certbot
sudo certbot --nginx -d search.yourdomain.com
```

---

## Testing

```typescript
// __tests__/search.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/search';

describe('/api/search', () => {
  it('searches products', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'soul bowl' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.hits).toBeDefined();
    expect(data.hits.length).toBeGreaterThan(0);
  });

  it('filters by category', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: '', category: 'entree' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.hits.every(h => h.category === 'entree')).toBe(true);
  });
});
```

---

## Monitoring

### Health Check

```typescript
// pages/api/health/meili.ts
import MeiliSearch from 'meilisearch';

export default async function handler(req, res) {
  try {
    const client = new MeiliSearch({
      host: process.env.MEILI_HOST!,
      apiKey: process.env.MEILI_KEY!,
    });

    const health = await client.health();
    
    res.status(200).json({
      status: health.status,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
}
```

### Metrics

```typescript
// Track search analytics
const results = await index.search(query);

// Log to analytics
await analytics.track({
  event: 'product_search',
  properties: {
    query,
    results: results.hits.length,
    processingTimeMs: results.processingTimeMs,
  },
});
```

---

## Troubleshooting

### Slow Search (>100ms)

1. Check index size: `index.getStats()` — should be <1M docs for instant results
2. Reduce `searchableAttributes` — fewer fields = faster search
3. Use filters — pre-filter before search when possible
4. Enable caching — add `Cache-Control` headers

### Out of Memory

1. Increase RAM — MeiliSearch uses ~10x document size in memory
2. Split indexes — separate by product type/category
3. Limit indexed fields — only index what you search

### Typo Tolerance Too Aggressive

```typescript
await index.updateSettings({
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 5,   // Default: 4
      twoTypos: 9,  // Default: 8
    },
    disableOnWords: ['id', 'sku', 'code'],  // Exact match only
  },
});
```

---

## MCP Tools Reference

Use these tools via your AI coding agent when MeiliSearch MCP is enabled:

| Tool | Description | Example |
|------|-------------|---------|
| `meili_index_create` | Create a new search index | `{ "index_uid": "products", "primary_key": "id" }` |
| `meili_index_list` | List all indexes | `{}` |
| `meili_index_delete` | Delete an index | `{ "index_uid": "products" }` |
| `meili_documents_add` | Bulk add/update documents | `{ "index_uid": "products", "documents": "[...]" }` |
| `meili_documents_search` | Search with filters | `{ "index_uid": "products", "query": "bowl", "limit": 20 }` |
| `meili_documents_get` | Get document by ID | `{ "index_uid": "products", "document_id": "123" }` |
| `meili_settings_update` | Configure search behavior | `{ "index_uid": "products", "settings": {...} }` |
| `meili_health` | Check MeiliSearch health | `{}` |

---

## References

- [MeiliSearch Documentation](https://www.meilisearch.com/docs)
- [MeiliSearch Cloud](https://www.meilisearch.com/cloud)
- [MeiliSearch GitHub](https://github.com/meilisearch/meilisearch)
- [revvel-standards MCP_STANDARD.md](./Master_Inventory/MCP_STANDARD.md)
- [MeiliSearch MCP Server README](../mcp-servers/meilisearch-mcp/README.md)

---

## Support

For MeiliSearch integration issues:
1. Check this guide
2. Review MeiliSearch docs
3. Ask in #revvel-dev Slack channel
4. Open issue in revvel-standards repo

**Priority:** HIGH — Search is a revenue blocker. Escalate production issues immediately.
