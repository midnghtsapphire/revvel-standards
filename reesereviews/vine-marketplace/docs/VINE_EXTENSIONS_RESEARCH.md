# Vine Extensions, Apps & Use-Data Research

**Status:** Research Complete  
**Issue:** [WR] research vine stats and extensions and apps and combine use data  
**Date:** 2026-05-01

---

## Summary

This document captures findings on Amazon Vine browser extensions, companion apps, and
data-combination strategies to inform enhancements to the `vine-marketplace` tool.

---

## 1. Browser Extensions (Chrome / Firefox)

### 1.1 Vine Helper
- **URL:** <https://vinehelper.ovh> / <https://chromewebstore.google.com> (search "Vine Helper")
- **Maintainer:** Community open-source
- **Key features:**
  - Hides ETV-zero ("free-free") items from the RFY/AFA/AI queues
  - Keyword filters (hide or highlight by title keywords)
  - Infinite scroll in the Vine queue
  - Last-seen timestamps per item (stored in `chrome.storage.local`)
  - Export inventory as CSV
  - Item "hide" list and "pinned" list persisted locally
- **Data exposed for import:**
  - CSV export contains: ASIN, title, ETV, queue (RFY/AFA/AI), date-first-seen
  - LocalStorage key `vinehelper_queue` (JSON array)
- **Compatibility note:** Works on the Amazon Vine web portal at `amazon.com/vine/`

### 1.2 VineVin / Vine Companion (Tampermonkey scripts)
- Various community Tampermonkey user-scripts circulate on Reddit r/AmazonVine
- Typical features: ETV calculator, RFY sort by ETV, color-coded tier badges
- Data format: no standardised export; inline DOM data only

### 1.3 Vine Crawler (unofficial)
- Python-based local script — reads cookies from browser to poll Vine API endpoints
- Stores results in SQLite; exports to CSV
- **Status:** Unofficial / fragile — Amazon's internal API endpoints change without notice

---

## 2. Companion Apps

| App / Tool | Platform | Notes |
|---|---|---|
| **steel-white** (this org) | Node.js server | Tracks Vine ETV, affiliate links, inventory |
| **vine-marketplace** (this repo) | Node.js server | Email-ingestion pipeline → FB Marketplace |
| **Grapevine** (third-party) | iOS / Android | Unofficial; scrapes Vine portal via WebView |
| **Vine Notifier** (community) | Web / Telegram bot | Pushes new RFY items to Telegram |

---

## 3. Combining Use Data — Strategy

### 3.1 What data exists per Vine item

| Source | ASIN | Title | ETV | Queue | Seen-date | Ordered | Status |
|---|---|---|---|---|---|---|---|
| Vine email (current) | ✅ | ✅ | ✅ | ✗ | ✅ (via email date) | ✅ | delivered/vine |
| RFY watchlist (new) | opt. | ✅ | opt. | opt. | ✅ | link to order | watching/ordered/missed/passed |
| Vine Helper CSV | ✅ | ✅ | ✅ | ✅ | ✅ | ✗ | hid/pinned |

### 3.2 Join strategy
- Primary key: **ASIN** — present in both email-ingested products and Vine Helper export
- Secondary key: title fuzzy match (for items without ASIN in RFY tracker)
- A `JOIN` on ASIN produces a unified record with: queue origin, ETV, email-ingested product data, listing/sold status

### 3.3 Implemented: RFY Watchlist + Inventory
The `rfy-tracker` module (added in this PR) provides the watchlist side of the join:
- `rfyId`, `asin`, `productTitle`, `estPrice`, `status` (watching / ordered / missed / passed)
- `inventory.getSummary()` now merges RFY stats so the dashboard shows combined metrics:
  - `totalRFY`, `rfyOrdered`, `rfyMissed`, `rfyPassed`, `rfyConversionRate`

### 3.4 Future: Vine Helper CSV import
To import Vine Helper CSV into the RFY watchlist, add an endpoint:
```text
POST /api/rfy/import-csv
Body: multipart/form-data with CSV file
```
CSV columns expected: `asin`, `title`, `etv`, `queue`, `date_seen`

---

## 4. Key Metrics to Track

| Metric | Definition | Where |
|---|---|---|
| **RFY Conversion Rate** | `ordered / (ordered + missed + passed)` | `rfyConversionRate` in summary |
| **Miss Rate** | `missed / (ordered + missed + passed)` | derived from summary |
| **ETV-to-Listing Ratio** | `listingPrice / vineTaxValue` | `price-calculator.js` |
| **Sell-Through Rate** | `sold / listed` | `totalSold / totalListed` |
| **Stale Rate** | `staleListings / totalListed` | `staleListings / totalListed` |

---

## 5. RFY Algorithm Observations (Qualitative)

Based on community reports and the issue description:

- RFY is personalised by purchase history and browsing behaviour
- Items in RFY have a **short availability window** (hours to ~2 days for popular items)
- Category affinity (e.g., gardening, science equipment) improves after ordering several items
  in that category
- ETV and demand both affect queue depth — high-ETV items disappear faster
- **Recommendation:** Add a "seenAt" + status workflow (now implemented via RFY watchlist)
  so Vine reviewers can quantify how many items they miss per category

---

## 6. Note on Scraping Chrome Extensions

Direct scraping of Chrome extensions is not feasible without:
1. A live authenticated browser session on `amazon.com/vine/`
2. Chrome extension permissions to read extension storage

The `vine-marketplace` server runs headlessly — it reads Gmail instead of the Vine portal.
To bridge this gap, the recommended path is **Vine Helper's CSV export** (manual trigger
from the browser extension), then upload to `/api/rfy/import-csv` (future endpoint).

---

## References

- Amazon Vine program: <https://www.amazon.com/vine/about>
- Vine Helper extension: <https://vinehelper.ovh>
- r/AmazonVine subreddit: <https://reddit.com/r/AmazonVine>
- steel-white repo: <https://github.com/MIDNGHTSAPPHIRE/steel-white>
