/**
 * vine-marketplace — Main Server
 *
 * Provides:
 *   1. REST API for the dashboard UI
 *   2. Scheduled automation (fetch emails → parse → list on Facebook)
 *   3. CLI mode: `node index.js fetch|post|repost|summary`
 *
 * Dashboard: http://localhost:PORT (default 3030)
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cron = require('node-cron');
const path = require('path');

const { fetchEmails, filterAmazonEmails } = require('./lib/gmail-reader');
const { parseAmazonEmail, attachProductLink } = require('./lib/amazon-parser');
const { calculateListingPrice, formatUSD } = require('./lib/price-calculator');
const { postProduct, repostProduct } = require('./lib/facebook-poster');
const { importOrderCsv } = require('./lib/csv-import');
const { enrichProduct, buildListingPack } = require('./lib/product-link');
const packStore = require('./lib/pack-store');
const { startPipeline, getJob } = require('./lib/lifestyle-pipeline');
const inventory = require('./lib/inventory');
const rfy = require('./lib/rfy-tracker');

const PORT = parseInt(process.env.PORT || '3030', 10);
const AUTO_POST = process.env.ENABLE_AUTO_POSTING === 'true';
const REPOST_STALE_DAYS = parseInt(process.env.REPOST_STALE_DAYS || '7', 10);
const FETCH_CRON = process.env.FETCH_CRON || '0 8,14,20 * * *'; // 3x daily
const REPOST_CRON = process.env.REPOST_CRON || '0 10 * * 1'; // Monday 10am

// ─────────────────────────────────────────────
//  Core pipeline functions
// ─────────────────────────────────────────────

/**
 * Fetch Amazon emails, parse them, and upsert into inventory.
 * Returns the array of newly upserted product records.
 *
 * @param {object} opts
 * @param {Date|null} opts.since
 * @param {Date|null} opts.before
 */
async function fetchAndIngest({ since = null, before = null } = {}) {
  console.log('[fetch] Connecting to Gmail…');
  const allMails = await fetchEmails({ since, before });
  const amazonMails = filterAmazonEmails(allMails);
  console.log(`[fetch] Found ${allMails.length} emails, ${amazonMails.length} from Amazon`);

  const products = [];
  for (const mail of amazonMails) {
    const product = parseAmazonEmail(mail);
    if (!product) continue;
    // Only ingest delivered/Vine items (those ready to list)
    if (!['delivered', 'vine'].includes(product.emailType)) continue;
    inventory.upsert(product);
    products.push(product);
    console.log(`[fetch] Ingested: ${product.productTitle.substring(0, 60)} [${product.emailType}]`);
  }

  return products;
}

/**
 * Calculate price and post one product to Facebook Marketplace.
 *
 * @param {object} product  — inventory record
 * @param {boolean} dryRun  — log but don't actually post
 */
async function listProduct(product, dryRun = false) {
  const pricing = calculateListingPrice(product);
  console.log(
    `[post] ${product.productTitle.substring(0, 60)} → ${formatUSD(pricing.listingPrice)} ` +
    `(cost basis: ${formatUSD(pricing.costBasis)}, -${Math.round(pricing.discountRate * 100)}%)`
  );

  if (dryRun) {
    console.log('[post] DRY RUN — skipping Facebook API call');
    return { dryRun: true, pricing };
  }

  const result = await postProduct(product, pricing.listingPrice);
  inventory.markListed(product.orderId, result.id, pricing.listingPrice);
  console.log(`[post] ✅ Listed — ${result.method}: ${result.id}`);
  return { ...result, pricing };
}

/**
 * Post all unlisted products in inventory that have been delivered.
 * Respects ENABLE_AUTO_POSTING flag.
 */
async function postUnlisted({ dryRun = false, limit = 50 } = {}) {
  const unlisted = inventory.getUnlisted().slice(0, limit);
  console.log(`[post] ${unlisted.length} unlisted products to process`);
  const results = [];
  for (const product of unlisted) {
    try {
      const r = await listProduct(product, dryRun);
      results.push({ orderId: product.orderId, status: 'listed', ...r });
    } catch (err) {
      console.error(`[post] ❌ Failed for ${product.orderId}: ${err.message}`);
      results.push({ orderId: product.orderId, status: 'error', error: err.message });
    }
  }
  return results;
}

/**
 * Re-post stale (unsold, old) listings to refresh them in the feed.
 */
async function repostStale({ dryRun = false } = {}) {
  const stale = inventory.getStaleListings(REPOST_STALE_DAYS);
  console.log(`[repost] ${stale.length} stale listings to refresh`);
  const results = [];
  for (const product of stale) {
    try {
      const pricing = calculateListingPrice(product);
      if (!dryRun) {
        const r = await repostProduct(product, pricing.listingPrice);
        inventory.recordRepost(product.orderId);
        results.push({ orderId: product.orderId, status: 'reposted', id: r.id });
      } else {
        results.push({ orderId: product.orderId, status: 'dry_run' });
      }
      console.log(`[repost] Refreshed: ${product.productTitle.substring(0, 60)}`);
    } catch (err) {
      console.error(`[repost] ❌ ${product.orderId}: ${err.message}`);
      results.push({ orderId: product.orderId, status: 'error', error: err.message });
    }
  }
  return results;
}

// ─────────────────────────────────────────────
//  Express REST API
// ─────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Dashboard summary
app.get('/api/summary', (_req, res) => {
  res.json(inventory.getSummary());
});

// List all products (with optional date range)
app.get('/api/products', (req, res) => {
  const { since, before, status } = req.query;
  let products = since || before
    ? inventory.getByDateRange(since || null, before || null)
    : inventory.getAll();

  if (status === 'unlisted') products = products.filter((p) => !p.listed && !p.sold);
  else if (status === 'listed') products = products.filter((p) => p.listed && !p.sold);
  else if (status === 'sold') products = products.filter((p) => p.sold);
  else if (status === 'stale') products = inventory.getStaleListings(REPOST_STALE_DAYS);

  res.json({ products, count: products.length });
});

// Get a single product
app.get('/api/products/:orderId', (req, res) => {
  const product = inventory.getByOrderId(req.params.orderId);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

// Mark a product as sold
app.post('/api/products/:orderId/sold', (req, res) => {
  const { soldPrice } = req.body;
  try {
    const updated = inventory.markSold(req.params.orderId, soldPrice);
    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Manually trigger email fetch (for UI "Refresh" button)
app.post('/api/fetch', async (req, res) => {
  const { since, before } = req.body;
  try {
    const products = await fetchAndIngest({
      since: since ? new Date(since) : null,
      before: before ? new Date(before) : null,
    });
    res.json({ ingested: products.length, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CSV import (Amazon order history) → same product shape as vine parse ──
// Body: raw CSV text (Content-Type: text/csv) OR JSON { csv: "..." }
app.post('/api/import/csv', (req, res) => {
  try {
    const csvText =
      typeof req.body === 'string'
        ? req.body
        : req.body && req.body.csv != null
          ? req.body.csv
          : '';
    if (!csvText || !String(csvText).trim()) {
      return res.status(400).json({ error: 'Provide CSV as text body or JSON { csv: "..." }' });
    }
    const result = importOrderCsv(csvText);
    const stored = [];
    for (const p of result.products) {
      inventory.upsert(p);
      stored.push(p);
    }
    res.json({
      ingested: stored.length,
      skipped: result.skipped,
      errors: result.errors,
      headers: result.headers,
      products: stored,
      note: 'ASIN → productUrl attached. Run enrich for product-page images. No personal photos required.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One-at-a-time queue: next unlisted product (optional enrich)
app.get('/api/queue/next', async (req, res) => {
  try {
    const doEnrich = req.query.enrich === '1' || req.query.enrich === 'true';
    const unlisted = inventory.getUnlisted();
    if (unlisted.length === 0) {
      return res.json({ product: null, remaining: 0 });
    }
    let product = attachProductLink(unlisted[0]);
    let enrichMeta = null;
    if (doEnrich) {
      const r = await enrichProduct(product, { fetchImages: true });
      product = r.product;
      inventory.upsert(product);
      enrichMeta = { reason: r.reason, fetchError: r.fetchError || null, imageCount: (r.imageUrls || []).length };
    }
    res.json({
      product,
      remaining: unlisted.length,
      enrich: enrichMeta,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enrich one product: productUrl + images from Amazon product page (when fetchable)
app.post('/api/products/:orderId/enrich', async (req, res) => {
  try {
    const existing = inventory.getByOrderId(req.params.orderId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const r = await enrichProduct(existing, {
      fetchImages: req.body?.fetchImages !== false,
    });
    inventory.upsert(r.product);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listing pack for marketplace copy-paste (human posts)
app.get('/api/products/:orderId/listing-pack', (req, res) => {
  try {
    const existing = inventory.getByOrderId(req.params.orderId);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const product = attachProductLink(existing);
    const pricing = calculateListingPrice(product);
    const pack = buildListingPack(product, pricing);
    res.json(pack);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Path A: local Marketplace packs (progress + disk storage) ─────────────

app.get('/api/packs/config', (_req, res) => {
  res.json({
    ...packStore.openHint(),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    imageModel: process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview',
    port: PORT,
  });
});

/** Start lifestyle pack job for one inventory product (one-at-a-time). */
app.post('/api/packs/generate', (req, res) => {
  try {
    const { orderId, count } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'orderId required' });
    const product = inventory.getByOrderId(orderId);
    if (!product) return res.status(404).json({ error: 'Product not in inventory — import CSV first' });
    const job = startPipeline(product, { count: count || 3 });
    res.status(202).json({
      jobId: job.id,
      status: job.status,
      packDir: job.packDir,
      steps: job.steps,
      hasOpenRouter: job.hasOpenRouter,
      poll: `/api/packs/jobs/${job.id}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/packs/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.get('/api/packs/:key', (req, res) => {
  try {
    const key = req.params.key;
    // Prefer inventory lookup by orderId, else treat as ASIN folder name
    let product = inventory.getByOrderId(key);
    if (!product) product = { asin: key, orderId: key };
    const listed = packStore.listPack(product);
    res.json(listed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve saved pack files so the dashboard can show thumbnails
app.use(
  '/pack-files',
  express.static(packStore.packsRoot(), {
    fallthrough: true,
    index: false,
    maxAge: '1h',
  })
);

// Post selected (or all unlisted) products
app.post('/api/post', async (req, res) => {
  const { orderIds, dryRun = false, limit } = req.body;
  try {
    let results;
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Post specific orders
      results = [];
      for (const orderId of orderIds) {
        const product = inventory.getByOrderId(orderId);
        if (!product) {
          results.push({ orderId, status: 'not_found' });
          continue;
        }
        if (product.listed) {
          results.push({ orderId, status: 'already_listed' });
          continue;
        }
        try {
          const r = await listProduct(product, dryRun);
          results.push({ orderId, status: 'listed', ...r });
        } catch (err) {
          results.push({ orderId, status: 'error', error: err.message });
        }
      }
    } else {
      results = await postUnlisted({ dryRun, limit: limit || 50 });
    }
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Repost stale listings (or specific orders)
app.post('/api/repost', async (req, res) => {
  const { dryRun = false, orderIds } = req.body;
  try {
    let results;
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Targeted repost of specific products
      results = [];
      for (const orderId of orderIds) {
        const product = inventory.getByOrderId(orderId);
        if (!product) { results.push({ orderId, status: 'not_found' }); continue; }
        if (product.sold) { results.push({ orderId, status: 'already_sold' }); continue; }
        try {
          const pricing = calculateListingPrice(product);
          if (!dryRun) {
            const r = await repostProduct(product, pricing.listingPrice);
            inventory.recordRepost(orderId);
            results.push({ orderId, status: 'reposted', id: r.id });
          } else {
            results.push({ orderId, status: 'dry_run' });
          }
        } catch (err) {
          results.push({ orderId, status: 'error', error: err.message });
        }
      }
    } else {
      results = await repostStale({ dryRun });
    }
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  RFY Watchlist API
// ─────────────────────────────────────────────

// RFY summary stats
app.get('/api/rfy/summary', (_req, res) => {
  res.json(rfy.getSummary());
});

// List RFY entries (optionally filter by status)
app.get('/api/rfy', (req, res) => {
  const { status } = req.query;
  const entries = rfy.getAll(status || null);
  res.json({ entries, count: entries.length });
});

// Get a single RFY entry
app.get('/api/rfy/:rfyId', (req, res) => {
  const entry = rfy.getById(req.params.rfyId);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// Add a new RFY entry
app.post('/api/rfy', (req, res) => {
  const { productTitle, asin, estPrice, category, notes } = req.body;
  try {
    const entry = rfy.add({ productTitle, asin, estPrice, category, notes });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update status of an RFY entry
app.patch('/api/rfy/:rfyId/status', (req, res) => {
  const { status, orderId } = req.body;
  try {
    const entry = rfy.updateStatus(req.params.rfyId, status, orderId || null);
    res.json(entry);
  } catch (err) {
    const code = err.message.includes('not found') ? 404 : 400;
    res.status(code).json({ error: err.message });
  }
});

// Update notes on an RFY entry
app.patch('/api/rfy/:rfyId/notes', (req, res) => {
  const { notes } = req.body;
  try {
    const entry = rfy.updateNotes(req.params.rfyId, notes || '');
    res.json(entry);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Delete an RFY entry
app.delete('/api/rfy/:rfyId', (req, res) => {
  try {
    rfy.remove(req.params.rfyId);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  Scheduled jobs
// ─────────────────────────────────────────────

function startScheduler() {
  // Fetch emails on schedule
  cron.schedule(FETCH_CRON, async () => {
    console.log('[cron] Running email fetch…');
    try {
      await fetchAndIngest();
      if (AUTO_POST) await postUnlisted();
    } catch (err) {
      console.error('[cron] Fetch error:', err.message);
    }
  });

  // Repost stale listings on schedule
  cron.schedule(REPOST_CRON, async () => {
    console.log('[cron] Running stale repost…');
    try {
      await repostStale();
    } catch (err) {
      console.error('[cron] Repost error:', err.message);
    }
  });

  console.log(`[cron] Fetch schedule: ${FETCH_CRON}`);
  console.log(`[cron] Repost schedule: ${REPOST_CRON}`);
  console.log(`[cron] Auto-post: ${AUTO_POST}`);
}

// ─────────────────────────────────────────────
//  CLI / local server entry (not when required by Vercel)
// ─────────────────────────────────────────────

function main() {
  const CLI_COMMAND = process.argv[2];

  if (CLI_COMMAND === 'fetch') {
    return fetchAndIngest()
      .then((p) => { console.log(`Ingested ${p.length} products.`); process.exit(0); })
      .catch((err) => { console.error(err.message); process.exit(1); });
  }
  if (CLI_COMMAND === 'post') {
    return postUnlisted({ dryRun: process.argv[3] === '--dry-run' })
      .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
      .catch((err) => { console.error(err.message); process.exit(1); });
  }
  if (CLI_COMMAND === 'repost') {
    return repostStale({ dryRun: process.argv[3] === '--dry-run' })
      .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
      .catch((err) => { console.error(err.message); process.exit(1); });
  }
  if (CLI_COMMAND === 'summary') {
    console.log(JSON.stringify(inventory.getSummary(), null, 2));
    process.exit(0);
    return;
  }
  if (CLI_COMMAND === 'rfy') {
    console.log(JSON.stringify(rfy.getSummary(), null, 2));
    process.exit(0);
    return;
  }
  if (CLI_COMMAND === 'import-csv') {
    const fs = require('fs');
    const file = process.argv[3];
    if (!file) {
      console.error('Usage: node index.js import-csv <path-to-orders.csv>');
      process.exit(1);
      return;
    }
    const { importOrderCsv: imp } = require('./lib/csv-import');
    const result = imp(fs.readFileSync(file, 'utf8'));
    result.products.forEach((p) => inventory.upsert(p));
    console.log(JSON.stringify({ ingested: result.products.length, skipped: result.skipped, errors: result.errors }, null, 2));
    process.exit(0);
    return;
  }

  // Local server mode
  app.listen(PORT, () => {
    const packs = packStore.openHint();
    console.log(`\n🛒  Vine → Marketplace Dashboard (Path A — personal packs)`);
    console.log(`   Open:  http://localhost:${PORT}`);
    console.log(`   Packs: ${packs.packsRoot}`);
    console.log(`   OpenRouter image key: ${process.env.OPENROUTER_API_KEY ? 'yes' : 'NO — set OPENROUTER_API_KEY in .env'}`);
    console.log(`   CSV import → select product → Generate 3 lifestyle images → files on disk\n`);
    startScheduler();
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  app,
  fetchAndIngest,
  listProduct,
  postUnlisted,
  repostStale,
};
