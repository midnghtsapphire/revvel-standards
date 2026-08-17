# Vine → Marketplace

Automated pipeline that reads **Amazon Vine** and paid order emails (or **order history CSV**), extracts product data using **`lib/amazon-parser.js`**, builds **Amazon product links from ASIN** (no personal photos required), and prepares listing packs / optional Facebook Marketplace posts at **20% below your cost basis**.

**Spine:** vine parse shape — every item is `{ orderId, asin, productTitle, imageUrl, productUrl, … }` whether it came from email or CSV.

## Features

| Feature | Detail |
|---|---|
| 📬 Email ingestion | IMAP reader pulls Amazon shipped/delivered/Vine emails |
| 📄 CSV import | Amazon order history CSV → same product records as email parse |
| 🔗 Product links | ASIN → `https://www.amazon.com/dp/{ASIN}` (owner does not upload photos) |
| 🖼 Image enrich | Prefer email CDN image; optional fetch of product-page gallery |
| ▶ One-at-a-time | `GET /api/queue/next` for sequential review |
| 📋 Listing pack | Title, description, 3–5 images, price — human posts to Marketplace |
| 🔍 Smart parsing | Extracts product name, ASIN, price paid, Vine FMV, images |
| 💲 Auto-pricing | 20% off cost basis; Vine items use 1099 FMV as cost |
| 🚀 FB Marketplace | Optional Meta Graph API (Page Post or Commerce Catalog) |
| 📦 Inventory tracking | JSON file tracks all products, listing status, sold status |
| 🔄 Repost scheduler | Auto-refreshes stale listings after N days |
| 📊 Dashboard UI | Glassmorphism dark UI — CSV upload, queue, date range, mark sold |
| ⏰ Cron automation | Runs silently 3× daily; repost check every Monday |

---

## Quick Start

### 1. Install dependencies

```bash
cd reesereviews/vine-marketplace
npm install
```

### 2. Configure secrets

```bash
cp .env.example .env
# Edit .env with your Gmail App Password and Facebook credentials
```

See [.env.example](.env.example) for step-by-step instructions on getting each key.

### 3. Start the dashboard

```bash
npm start
# Open http://localhost:3030
```

### 4. CLI usage

```bash
# Fetch and ingest Amazon emails
node index.js fetch

# Import Amazon order history CSV (Account → order reports — human download)
node index.js import-csv ./orders.csv

# Post all unlisted products to Facebook (add --dry-run to preview)
node index.js post
node index.js post --dry-run

# Repost stale listings
node index.js repost

# Print inventory summary
node index.js summary
```

### 5. CSV / queue API (no personal photos)

```bash
# Import CSV (JSON body)
curl -s -X POST http://localhost:3030/api/import/csv \
  -H "Content-Type: application/json" \
  -d "{\"csv\": \"$(cat orders.csv | sed 's/\"/\\\"/g')\"}"

# Next unlisted item + try to pull product images from Amazon page
curl -s "http://localhost:3030/api/queue/next?enrich=1" | jq .

# Listing pack for copy-paste to Marketplace
curl -s "http://localhost:3030/api/products/ORDER-ID/listing-pack" | jq .
```

### 6. Path A — personal launch (YOU run this on your PC)

This is the real app for generating **lifestyle (non-stock) images** and saving packs to **your drive**.

```bash
cd reesereviews/vine-marketplace
cp .env.example .env
# Edit .env → set OPENROUTER_API_KEY=...  (required for lifestyle images)
npm install
npm start
```

Open **<http://localhost:3030>**

1. **Import CSV** (your Order History.csv)  
2. **Next product**  
3. **Generate 3 lifestyle images → save pack**  
4. Watch the **step list** (parse → link → reference → lifestyle 1/3… → save)  
5. Files appear under:

```text
Documents\MarketplacePacks\{ASIN}\
  listing.txt
  meta.json
  00-product-reference.jpg   (if Amazon fetch worked)
  01-lifestyle.jpg
  02-lifestyle.jpg
  03-lifestyle.jpg
```

Override folder: `MARKETPLACE_PACKS_DIR=C:\path\to\folder` in `.env`.

Without `OPENROUTER_API_KEY`, the job still saves **listing.txt** and shows the process; lifestyle step will error clearly.

### 7. Vercel (static / API only — not the main personal path)

Root directory for deploy: `reesereviews/vine-marketplace`  
Entry: `api/index.js` + `vercel.json`. Inventory on serverless uses `/tmp` (ephemeral).  
**Lifestyle packs need a long-running local server** (Path A above) so images write to your Documents folder.

---

## Gmail Setup (App Password)

1. Sign in to your Google Account (<angelreporters@gmail.com>)
2. Go to **Security → 2-Step Verification** → ensure it's ON
3. Go to **Security → App passwords**
4. Create: App = **Mail**, Device = **Other** → name = `vine-marketplace`
5. Copy the 16-character password → paste into `GMAIL_APP_PASSWORD` in `.env`

> **Note:** IMAP must be enabled in Gmail Settings → Forwarding and POP/IMAP → Enable IMAP

---

## Facebook Setup

### Option A — Page Post only (simplest, no catalog needed)

1. Create a Facebook Page for your sales (or use existing)
2. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Consumer
3. Add **Facebook Login** and **Pages** products
4. In **Graph API Explorer**: select your Page, request permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
5. Generate a **Page Access Token** and save to `META_PAGE_ACCESS_TOKEN`
6. Find your Page ID at: facebook.com/YOUR_PAGE → About → Page ID → save to `META_PAGE_ID`

### Option B — Commerce Catalog (proper Marketplace listings)

1. Complete Option A steps
2. Go to [business.facebook.com/commerce](https://business.facebook.com/commerce)
3. Create a **Catalog** → enable **Marketplace** channel
4. Copy the Catalog ID → save to `META_CATALOG_ID`

---

## Pricing Logic

| Order type | Cost basis | Listing price |
|---|---|---|
| Paid order | `paidPrice` | `paidPrice × (1 − 0.20)` |
| Vine (free) | `vineTaxValue` (IRS 1099 FMV) | `vineTaxValue × (1 − 0.20)` |
| Vine (FMV not yet set) | `$0` | `$1.00` (minimum) |

The discount rate (default 20%) is configurable via `LISTING_DISCOUNT_RATE` in `.env`.

---

## Inventory Tracking

All product data is stored in `data/inventory.json`. Fields tracked per product:

- Order ID, ASIN, product title, images
- Cost basis (paid price or Vine FMV)
- Listed: yes/no, listing price, date listed, Facebook listing ID
- Sold: yes/no, sale price, date sold
- Repost count and last repost date

---

## GitHub Actions (Automated)

The workflow `.github/workflows/vine-to-marketplace.yml` runs:
- **Daily at 8am UTC** — fetch emails and post new products
- **Monday 10am UTC** — repost stale listings

Required repository secrets (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `GMAIL_APP_PASSWORD` | 16-char Gmail App Password |
| `META_PAGE_ACCESS_TOKEN` | Facebook Page Access Token |
| `META_PAGE_ID` | Facebook Page numeric ID |
| `META_CATALOG_ID` | (optional) Commerce catalog ID |

---

## Architecture

```text
angelreporters@gmail.com (IMAP)
    │
    ▼
lib/gmail-reader.js  ← fetch unread Amazon emails
    │
    ▼
lib/amazon-parser.js ← extract orderId, ASIN, price, images
    │
    ▼
lib/price-calculator.js ← cost basis × (1 - 20%)
    │
    ▼
lib/facebook-poster.js  ← Meta Graph API post / catalog item
    │
    ▼
lib/inventory.js        ← data/inventory.json (persist all state)
    │
    ▼
public/index.html       ← Dashboard UI (http://localhost:3030)
```
