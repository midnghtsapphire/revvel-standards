# Vine → Marketplace

Automated pipeline that reads **Amazon Vine** and paid order emails from `angelreporters@gmail.com`, extracts product data, and posts listings to **Facebook Marketplace** (via Meta Graph API) at **20% below your cost basis**.

## Features

| Feature | Detail |
|---|---|
| 📬 Email ingestion | IMAP reader pulls Amazon shipped/delivered/Vine emails |
| 🔍 Smart parsing | Extracts product name, ASIN, price paid, Vine FMV, images |
| 💲 Auto-pricing | 20% off cost basis; Vine items use 1099 FMV as cost |
| 🚀 FB Marketplace | Posts via Meta Graph API (Page Post or Commerce Catalog) |
| 📦 Inventory tracking | JSON file tracks all products, listing status, sold status |
| 🔄 Repost scheduler | Auto-refreshes stale listings after N days |
| 📊 Dashboard UI | Glassmorphism dark UI — date range, queue review, mark sold |
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

# Post all unlisted products to Facebook (add --dry-run to preview)
node index.js post
node index.js post --dry-run

# Repost stale listings
node index.js repost

# Print inventory summary
node index.js summary
```

---

## Gmail Setup (App Password)

1. Sign in to your Google Account (angelreporters@gmail.com)
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

```
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
