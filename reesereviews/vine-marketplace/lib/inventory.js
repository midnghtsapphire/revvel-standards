/**
 * vine-marketplace — Inventory Tracker
 *
 * Manages a JSON-file inventory at data/inventory.json.
 * Each entry represents one product order from Amazon.
 *
 * Schema per product:
 *   orderId        string  — Amazon order ID (primary key)
 *   asin           string  — Amazon ASIN
 *   productTitle   string
 *   paidPrice      number  — what was paid ($0 for Vine)
 *   vineTaxValue   number  — IRS 1099 fair-market value (Vine items)
 *   isVine         boolean
 *   imageUrl       string|null
 *   trackingNumber string|null
 *   deliveryDate   string|null  — ISO 8601
 *   receivedAt     string       — ISO 8601 when email was ingested
 *   emailType      string       — 'vine'|'shipped'|'delivered'
 *   listed         boolean      — has been posted to FB Marketplace
 *   listingId      string|null  — FB post/listing ID
 *   listingPrice   number|null
 *   listedAt       string|null  — ISO 8601
 *   sold           boolean
 *   soldAt         string|null  — ISO 8601
 *   soldPrice      number|null
 *   repostCount    number       — times re-advertised
 *   lastRepostAt   string|null  — ISO 8601
 */

'use strict';

const fs = require('fs');
const path = require('path');

// rfy-tracker is in the same lib directory; loaded lazily-safe at module level.
// We guard against circular-require or missing module scenarios.
let rfyTracker = null;
try {
  rfyTracker = require('./rfy-tracker');
} catch {
  // rfy-tracker unavailable — RFY stats will be omitted from summary
}

// On Vercel/serverless, the app filesystem is read-only except /tmp.
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join('/tmp', 'vine-marketplace-data')
    : path.join(__dirname, '..', 'data'));
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Load inventory from disk. Returns empty array if file doesn't exist. */
function load() {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

/** Persist inventory to disk (pretty-printed for easy inspection). */
function save(inventory) {
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2), 'utf8');
}

/**
 * Upsert a product record by orderId.
 * - If an entry with the same orderId exists it is merged (new fields win).
 * - Otherwise the product is appended.
 */
function upsert(product) {
  const inventory = load();
  const idx = inventory.findIndex((p) => p.orderId === product.orderId);
  if (idx === -1) {
    inventory.push({ repostCount: 0, lastRepostAt: null, ...product });
  } else {
    inventory[idx] = { ...inventory[idx], ...product };
  }
  save(inventory);
  return product;
}

/** Get a single product by orderId. Returns null if not found. */
function getByOrderId(orderId) {
  return load().find((p) => p.orderId === orderId) || null;
}

/**
 * Mark a product as listed on Facebook Marketplace.
 */
function markListed(orderId, listingId, listingPrice) {
  const inventory = load();
  const idx = inventory.findIndex((p) => p.orderId === orderId);
  if (idx === -1) throw new Error(`Order ${orderId} not found in inventory`);
  inventory[idx] = {
    ...inventory[idx],
    listed: true,
    listingId,
    listingPrice,
    listedAt: new Date().toISOString(),
  };
  save(inventory);
  return inventory[idx];
}

/** Mark a product as sold. */
function markSold(orderId, soldPrice = null) {
  const inventory = load();
  const idx = inventory.findIndex((p) => p.orderId === orderId);
  if (idx === -1) throw new Error(`Order ${orderId} not found in inventory`);
  inventory[idx] = {
    ...inventory[idx],
    sold: true,
    soldAt: new Date().toISOString(),
    soldPrice: soldPrice ?? inventory[idx].listingPrice,
  };
  save(inventory);
  return inventory[idx];
}

/** Bump repost count and timestamp for a product. */
function recordRepost(orderId) {
  const inventory = load();
  const idx = inventory.findIndex((p) => p.orderId === orderId);
  if (idx === -1) throw new Error(`Order ${orderId} not found in inventory`);
  inventory[idx] = {
    ...inventory[idx],
    repostCount: (inventory[idx].repostCount || 0) + 1,
    lastRepostAt: new Date().toISOString(),
  };
  save(inventory);
  return inventory[idx];
}

/**
 * Query helpers
 */
function getAll() { return load(); }

function getUnlisted() {
  return load().filter((p) => !p.listed && !p.sold);
}

function getActive() {
  return load().filter((p) => p.listed && !p.sold);
}

function getSold() {
  return load().filter((p) => p.sold);
}

/**
 * Return items whose last listing (or repost) is older than staleAfterDays days
 * and that have not yet been sold — candidates for a refreshed ad.
 */
function getStaleListings(staleAfterDays = 7) {
  const cutoff = new Date(Date.now() - staleAfterDays * 24 * 60 * 60 * 1000);
  return load().filter((p) => {
    if (p.sold || !p.listed) return false;
    const lastActivity = p.lastRepostAt || p.listedAt;
    if (!lastActivity) return true;
    return new Date(lastActivity) < cutoff;
  });
}

/**
 * Filter by date range on receivedAt field.
 */
function getByDateRange(since = null, before = null) {
  return load().filter((p) => {
    const d = new Date(p.receivedAt);
    if (since && d < new Date(since)) return false;
    if (before && d > new Date(before)) return false;
    return true;
  });
}

/** Summary stats for the dashboard. Optionally merged with RFY stats. */
function getSummary() {
  const all = load();
  const totalProducts = all.length;
  const totalListed = all.filter((p) => p.listed).length;
  const totalSold = all.filter((p) => p.sold).length;
  const totalRevenue = all.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const totalVine = all.filter((p) => p.isVine).length;
  const pendingListing = all.filter((p) => !p.listed && !p.sold).length;
  const staleListings = getStaleListings().length;

  // Merge RFY stats if tracker loaded successfully at module init
  let rfyStats = {};
  try {
    if (rfyTracker) rfyStats = rfyTracker.getSummary();
  } catch {
    // non-critical — omit gracefully
  }

  return {
    totalProducts,
    totalListed,
    totalSold,
    pendingListing,
    staleListings,
    totalVine,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    ...rfyStats,
  };
}

module.exports = {
  upsert,
  getByOrderId,
  markListed,
  markSold,
  recordRepost,
  getAll,
  getUnlisted,
  getActive,
  getSold,
  getStaleListings,
  getByDateRange,
  getSummary,
};
