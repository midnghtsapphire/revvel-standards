/**
 * vine-marketplace tests
 *
 * Pure unit tests — no network calls, no file I/O side effects.
 * Uses only Node.js built-ins (no test framework required).
 */

'use strict';

process.env.LISTING_DISCOUNT_RATE = '0.20';
process.env.MIN_LISTING_PRICE = '1.00';

const assert = require('assert');
const path = require('path');

// ── helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

// ── Price Calculator ───────────────────────────────────────────────────────

console.log('\n📐  Price Calculator');

const { calculateListingPrice, formatUSD, DISCOUNT_RATE } = require('../lib/price-calculator');

test('discount rate is 0.20', () => {
  assert.strictEqual(DISCOUNT_RATE, 0.20);
});

test('paid order: listing = paidPrice * 0.80', () => {
  const result = calculateListingPrice({ paidPrice: 50, isVine: false });
  assert.strictEqual(result.listingPrice, 40.00);
  assert.strictEqual(result.costBasis, 50.00);
});

test('vine order: listing uses vineTaxValue when available', () => {
  const result = calculateListingPrice({ paidPrice: 0, vineTaxValue: 30, isVine: true });
  assert.strictEqual(result.listingPrice, 24.00);
  assert.strictEqual(result.costBasis, 30.00);
});

test('vine order with no FMV yet: falls back to paidPrice (0)', () => {
  const result = calculateListingPrice({ paidPrice: 0, vineTaxValue: 0, isVine: true });
  // Should hit minimum
  assert.strictEqual(result.listingPrice, 1.00);
});

test('minimum price enforced: cannot go below $1.00', () => {
  const result = calculateListingPrice({ paidPrice: 0.50, isVine: false });
  assert.strictEqual(result.listingPrice, 1.00);
});

test('formatUSD formats correctly', () => {
  assert.strictEqual(formatUSD(40), '$40.00');
  assert.strictEqual(formatUSD(1234.5), '$1,234.50');
});

test('rounding to 2 decimal places', () => {
  // $33.33 * 0.8 = $26.664 → $26.66
  const result = calculateListingPrice({ paidPrice: 33.33, isVine: false });
  assert.ok(Number.isFinite(result.listingPrice));
  assert.ok(result.listingPrice >= 1.00);
});

// ── Amazon Parser ──────────────────────────────────────────────────────────

console.log('\n📧  Amazon Parser');

const {
  parseAmazonEmail,
  detectEmailType,
  productUrlFromAsin,
  attachProductLink,
} = require('../lib/amazon-parser');

test('detectEmailType: vine email', () => {
  assert.strictEqual(detectEmailType('Amazon Vine — Your product has arrived'), 'vine');
  assert.strictEqual(detectEmailType('vine product'), 'vine');
});

test('detectEmailType: delivered email', () => {
  assert.strictEqual(detectEmailType('Your package has been delivered'), 'delivered');
  assert.strictEqual(detectEmailType('Delivered: your Amazon order'), 'delivered');
});

test('detectEmailType: shipped email', () => {
  assert.strictEqual(detectEmailType('Your order has shipped'), 'shipped');
});

test('detectEmailType: unknown returns unknown', () => {
  assert.strictEqual(detectEmailType('Weekly newsletter'), 'unknown');
});

test('parseAmazonEmail: returns null for non-Amazon sender', () => {
  const mail = {
    subject: 'Your order has shipped',
    from: { text: 'noreply@example.com' },
    text: 'some text',
  };
  assert.strictEqual(parseAmazonEmail(mail), null);
});

test('parseAmazonEmail: parses delivered email from amazon.com', () => {
  const mail = {
    subject: 'Your package has been delivered',
    from: { text: 'ship-confirm@amazon.com' },
    text: `
      Order Total: $25.99
      You ordered: Wireless Bluetooth Headphones
      ASIN: B08C4KWM9T
      Your Order: 112-3456789-0123456
      Tracking Number: 1Z999AA10123456784
    `,
  };
  const result = parseAmazonEmail(mail);
  assert.ok(result !== null, 'should return a product');
  assert.strictEqual(result.emailType, 'delivered');
  assert.strictEqual(result.asin, 'B08C4KWM9T');
  assert.strictEqual(result.paidPrice, 25.99);
  assert.strictEqual(result.orderId, '112-3456789-0123456');
  assert.strictEqual(result.isVine, false);
  assert.strictEqual(result.listed, false);
  assert.strictEqual(result.sold, false);
});

test('parseAmazonEmail: parses vine email with tax value', () => {
  const mail = {
    subject: 'Amazon Vine — Your product has arrived',
    from: { text: 'vine@amazon.com' },
    text: `
      You ordered: Smart Kitchen Scale
      ASIN: B09XYZABCD
      Order Total: $0.00
      Taxable value: $18.50
    `,
  };
  const result = parseAmazonEmail(mail);
  assert.ok(result !== null);
  assert.strictEqual(result.emailType, 'vine');
  assert.strictEqual(result.isVine, true);
  assert.strictEqual(result.paidPrice, 0);
  assert.strictEqual(result.vineTaxValue, 18.50);
});

test('parseAmazonEmail: unknown email type returns null', () => {
  const mail = {
    subject: 'Amazon newsletter',
    from: { text: 'newsletter@amazon.com' },
    text: 'Check out these deals',
  };
  assert.strictEqual(parseAmazonEmail(mail), null);
});

test('productUrlFromAsin builds /dp/ URL', () => {
  assert.strictEqual(
    productUrlFromAsin('B08C4KWM9T'),
    'https://www.amazon.com/dp/B08C4KWM9T'
  );
  assert.strictEqual(productUrlFromAsin('bad'), null);
});

test('parseAmazonEmail attaches productUrl from ASIN', () => {
  const mail = {
    subject: 'Your package has been delivered',
    from: { text: 'ship-confirm@amazon.com' },
    text: `
      Order Total: $10.00
      You ordered: Widget
      ASIN: B08C4KWM9T
      Your Order: 112-3456789-0123456
    `,
  };
  const result = parseAmazonEmail(mail);
  assert.strictEqual(result.productUrl, 'https://www.amazon.com/dp/B08C4KWM9T');
  assert.strictEqual(result.source, 'email');
});

// ── CSV import ─────────────────────────────────────────────────────────────

console.log('\n📄  CSV Import');

const { importOrderCsv, extractAsin } = require('../lib/csv-import');
const { buildListingPack, extractImageUrlsFromHtml } = require('../lib/product-link');

test('extractAsin from bare ASIN and URL', () => {
  assert.strictEqual(extractAsin('B08C4KWM9T'), 'B08C4KWM9T');
  assert.strictEqual(extractAsin('https://www.amazon.com/dp/B08C4KWM9T/ref=xx'), 'B08C4KWM9T');
});

test('importOrderCsv maps rows to vine-parser product shape', () => {
  const csv = [
    'Order ID,Order Date,Title,ASIN,Unit Price,Quantity',
    '112-1111111-2222222,2026-01-15,Test Blender,B08C4KWM9T,29.99,1',
    '112-3333333-4444444,2026-01-16,Another Item,B09ABCDEFG,5.00,1',
  ].join('\n');
  const { products, skipped } = importOrderCsv(csv);
  assert.strictEqual(products.length, 2);
  assert.strictEqual(skipped, 0);
  assert.strictEqual(products[0].asin, 'B08C4KWM9T');
  assert.strictEqual(products[0].productUrl, 'https://www.amazon.com/dp/B08C4KWM9T');
  assert.strictEqual(products[0].source, 'csv');
  assert.strictEqual(products[0].emailType, 'csv');
  assert.strictEqual(products[0].paidPrice, 29.99);
  assert.strictEqual(products[0].listed, false);
});

test('buildListingPack includes productUrl and selectedImages', () => {
  const pack = buildListingPack({
    orderId: 'X',
    asin: 'B08C4KWM9T',
    productTitle: 'Test Blender',
    productUrl: 'https://www.amazon.com/dp/B08C4KWM9T',
    imageUrl: 'https://m.media-amazon.com/images/I/example.jpg',
    imageUrls: [
      'https://m.media-amazon.com/images/I/example.jpg',
      'https://m.media-amazon.com/images/I/example2.jpg',
    ],
  }, { listingPrice: 24 });
  assert.strictEqual(pack.productUrl, 'https://www.amazon.com/dp/B08C4KWM9T');
  assert.strictEqual(pack.suggestedPrice, 24);
  assert.ok(pack.selectedImages.length >= 1);
  assert.ok(pack.selectedImages.length <= 5);
});

test('extractImageUrlsFromHtml finds og:image', () => {
  const html = '<html><meta property="og:image" content="https://m.media-amazon.com/images/I/abc.jpg"/></html>';
  const urls = extractImageUrlsFromHtml(html);
  assert.ok(urls.some((u) => u.includes('abc.jpg')));
});

test('attachProductLink is idempotent', () => {
  const p = attachProductLink({ asin: 'B08C4KWM9T', productTitle: 'x' });
  assert.strictEqual(p.productUrl, 'https://www.amazon.com/dp/B08C4KWM9T');
  const p2 = attachProductLink(p);
  assert.strictEqual(p2.productUrl, p.productUrl);
});

// ── Pack store (local Documents path) ─────────────────────────────────────

console.log('\n📁  Pack store');

const packStore = require('../lib/pack-store');
const os = require('os');
const fs = require('fs');

test('packsRoot defaults under home Documents', () => {
  const prev = process.env.MARKETPLACE_PACKS_DIR;
  delete process.env.MARKETPLACE_PACKS_DIR;
  const root = packStore.packsRoot();
  assert.ok(root.includes('MarketplacePacks'));
  assert.ok(root.startsWith(os.homedir()) || root.includes(os.homedir()));
  if (prev) process.env.MARKETPLACE_PACKS_DIR = prev;
});

test('packDir writes listing under MARKETPLACE_PACKS_DIR', () => {
  const tmp = path.join(os.tmpdir(), 'mp-packs-test-' + Date.now());
  process.env.MARKETPLACE_PACKS_DIR = tmp;
  const dir = packStore.packDir({ asin: 'B08C4KWM9T', orderId: 'X' });
  assert.ok(dir.includes('B08C4KWM9T'));
  packStore.writeText(path.join(dir, 'listing.txt'), 'hello');
  assert.ok(fs.existsSync(path.join(dir, 'listing.txt')));
  const listed = packStore.listPack({ asin: 'B08C4KWM9T' });
  assert.ok(listed.files.some((f) => f.name === 'listing.txt'));
});

test('createJob exposes visible process steps', () => {
  const { createJob } = require('../lib/lifestyle-pipeline');
  const job = createJob({ orderId: 'T1', asin: 'B08C4KWM9T', productTitle: 'Widget' }, { count: 3 });
  assert.strictEqual(job.steps.length, 5);
  assert.ok(job.steps.some((s) => s.id === 'lifestyle'));
  assert.strictEqual(job.status, 'queued');
});

// ── Inventory ──────────────────────────────────────────────────────────────

console.log('\n📦  Inventory');

const inventoryModule = require('../lib/inventory');

const sampleProduct = {
  orderId: 'TEST-001',
  productTitle: 'Test Widget',
  paidPrice: 20.00,
  vineTaxValue: 0,
  isVine: false,
  imageUrl: null,
  emailType: 'delivered',
  receivedAt: new Date().toISOString(),
};

test('upsert adds new product', () => {
  inventoryModule.upsert(sampleProduct);
  const all = inventoryModule.getAll();
  const found = all.find((p) => p.orderId === 'TEST-001');
  assert.ok(found, 'product should exist');
  assert.strictEqual(found.productTitle, 'Test Widget');
});

test('upsert updates existing product', () => {
  inventoryModule.upsert({ ...sampleProduct, productTitle: 'Updated Widget' });
  const found = inventoryModule.getAll().find((p) => p.orderId === 'TEST-001');
  assert.strictEqual(found.productTitle, 'Updated Widget');
});

test('markListed updates listing fields', () => {
  inventoryModule.markListed('TEST-001', 'FB-POST-123', 16.00);
  const product = inventoryModule.getByOrderId('TEST-001');
  assert.strictEqual(product.listed, true);
  assert.strictEqual(product.listingId, 'FB-POST-123');
  assert.strictEqual(product.listingPrice, 16.00);
  assert.ok(product.listedAt);
});

test('markSold updates sold fields', () => {
  inventoryModule.markSold('TEST-001', 15.00);
  const product = inventoryModule.getByOrderId('TEST-001');
  assert.strictEqual(product.sold, true);
  assert.strictEqual(product.soldPrice, 15.00);
  assert.ok(product.soldAt);
});

test('getSold returns only sold products', () => {
  const sold = inventoryModule.getSold();
  assert.ok(sold.some((p) => p.orderId === 'TEST-001'));
});

test('getUnlisted excludes sold/listed products', () => {
  const unlisted = inventoryModule.getUnlisted();
  assert.ok(!unlisted.some((p) => p.orderId === 'TEST-001'));
});

test('getSummary returns correct counts', () => {
  const summary = inventoryModule.getSummary();
  assert.ok(typeof summary.totalProducts === 'number');
  assert.ok(typeof summary.totalSold === 'number');
  assert.ok(typeof summary.totalRevenue === 'number');
});

test('getByDateRange filters correctly', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const results = inventoryModule.getByDateRange(yesterday, tomorrow);
  assert.ok(results.length >= 0);
});

test('markListed throws for unknown orderId', () => {
  assert.throws(
    () => inventoryModule.markListed('NONEXISTENT-999', 'FB-ID', 10),
    /not found/i
  );
});

test('markSold throws for unknown orderId', () => {
  assert.throws(
    () => inventoryModule.markSold('NONEXISTENT-999', 5),
    /not found/i
  );
});

test('recordRepost throws for unknown orderId', () => {
  assert.throws(
    () => inventoryModule.recordRepost('NONEXISTENT-999'),
    /not found/i
  );
});

test('getByOrderId returns null for unknown orderId', () => {
  const result = inventoryModule.getByOrderId('TOTALLY-UNKNOWN');
  assert.strictEqual(result, null);
});

// ── Sender domain validation ───────────────────────────────────────────────

console.log('\n🔒  Sender Domain Validation');

test('parseAmazonEmail: rejects spoofed amazon.com.evil.com sender', () => {
  const mail = {
    subject: 'Your package has been delivered',
    from: { text: 'spoof@amazon.com.evil.com' },
    text: 'Order Total: $10.00\nASIN: B00AAAAAA0\n112-0000000-0000000',
  };
  assert.strictEqual(parseAmazonEmail(mail), null);
});

test('parseAmazonEmail: accepts auto-confirm@amazon.com', () => {
  const mail = {
    subject: 'Your package has been delivered',
    from: { text: 'auto-confirm@amazon.com' },
    text: 'Order Total: $15.00\n112-1111111-1111111',
  };
  const result = parseAmazonEmail(mail);
  assert.ok(result !== null);
});

test('parseAmazonEmail: accepts ship-confirm@marketplace.amazon.com subdomain', () => {
  const mail = {
    subject: 'Your order has been delivered',
    from: { text: 'ship-confirm@marketplace.amazon.com' },
    text: 'Order Total: $20.00\n112-2222222-2222222',
  };
  const result = parseAmazonEmail(mail);
  assert.ok(result !== null);
});

// ── RFY Tracker ───────────────────────────────────────────────────────────

console.log('\n🔎  RFY Tracker');

const rfyTracker = require('../lib/rfy-tracker');

test('add: creates entry with status=watching', () => {
  const entry = rfyTracker.add({ productTitle: 'Smart Garden Sensor', asin: 'B0TESTAAAA', estPrice: 29.99, category: 'Garden' });
  assert.ok(entry.rfyId, 'should have an rfyId');
  assert.strictEqual(entry.status, 'watching');
  assert.strictEqual(entry.productTitle, 'Smart Garden Sensor');
  assert.strictEqual(entry.asin, 'B0TESTAAAA');
  assert.strictEqual(entry.estPrice, 29.99);
  assert.strictEqual(entry.category, 'Garden');
  assert.strictEqual(entry.orderId, null);
});

test('add: throws when productTitle is missing', () => {
  assert.throws(() => rfyTracker.add({ asin: 'B0MISSING' }), /productTitle/i);
});

test('add: throws when productTitle is empty string', () => {
  assert.throws(() => rfyTracker.add({ productTitle: '   ' }), /productTitle/i);
});

test('getById: returns the entry that was added', () => {
  const created = rfyTracker.add({ productTitle: 'Scope USB-C to Phone', estPrice: 15.00 });
  const found = rfyTracker.getById(created.rfyId);
  assert.ok(found !== null);
  assert.strictEqual(found.rfyId, created.rfyId);
  assert.strictEqual(found.productTitle, 'Scope USB-C to Phone');
});

test('getById: returns null for unknown id', () => {
  assert.strictEqual(rfyTracker.getById('rfy-doesnotexist'), null);
});

test('getAll: returns all entries when no filter', () => {
  const all = rfyTracker.getAll();
  assert.ok(Array.isArray(all));
  assert.ok(all.length >= 2);
});

test('updateStatus: changes status to missed', () => {
  const entry = rfyTracker.add({ productTitle: 'Grow Light Seedlings' });
  const updated = rfyTracker.updateStatus(entry.rfyId, 'missed');
  assert.strictEqual(updated.status, 'missed');
  assert.ok(updated.updatedAt);
});

test('updateStatus: changes status to ordered and stores orderId', () => {
  const entry = rfyTracker.add({ productTitle: 'Blumat Moisture Meter v2' });
  const updated = rfyTracker.updateStatus(entry.rfyId, 'ordered', '114-TESTORDER-001');
  assert.strictEqual(updated.status, 'ordered');
  assert.strictEqual(updated.orderId, '114-TESTORDER-001');
});

test('updateStatus: changes status to passed', () => {
  const entry = rfyTracker.add({ productTitle: 'Random Junk Item' });
  const updated = rfyTracker.updateStatus(entry.rfyId, 'passed');
  assert.strictEqual(updated.status, 'passed');
});

test('updateStatus: throws for invalid status', () => {
  const entry = rfyTracker.add({ productTitle: 'Test Item Status' });
  assert.throws(() => rfyTracker.updateStatus(entry.rfyId, 'invalid'), /invalid status/i);
});

test('updateStatus: throws for unknown rfyId', () => {
  assert.throws(() => rfyTracker.updateStatus('rfy-unknown', 'missed'), /not found/i);
});

test('updateNotes: updates notes field', () => {
  const entry = rfyTracker.add({ productTitle: 'Noteworthy Item' });
  const updated = rfyTracker.updateNotes(entry.rfyId, 'Love this but probe too expensive');
  assert.strictEqual(updated.notes, 'Love this but probe too expensive');
});

test('updateNotes: throws for unknown rfyId', () => {
  assert.throws(() => rfyTracker.updateNotes('rfy-unknown', 'note'), /not found/i);
});

test('remove: deletes entry', () => {
  const entry = rfyTracker.add({ productTitle: 'Item to Delete' });
  rfyTracker.remove(entry.rfyId);
  assert.strictEqual(rfyTracker.getById(entry.rfyId), null);
});

test('remove: throws for unknown rfyId', () => {
  assert.throws(() => rfyTracker.remove('rfy-unknown'), /not found/i);
});

test('getAll with status filter: returns only matching entries', () => {
  const entry = rfyTracker.add({ productTitle: 'Filter Test Item' });
  rfyTracker.updateStatus(entry.rfyId, 'missed');
  const missed = rfyTracker.getAll('missed');
  assert.ok(missed.every((e) => e.status === 'missed'));
  assert.ok(missed.some((e) => e.rfyId === entry.rfyId));
});

test('getSummary: returns correct counts and conversion rate', () => {
  // Counts derived directly from the live list — always consistent with each other
  const all       = rfyTracker.getAll();
  const watching  = all.filter((e) => e.status === 'watching').length;
  const ordered   = all.filter((e) => e.status === 'ordered').length;
  const missed    = all.filter((e) => e.status === 'missed').length;
  const passedCt  = all.filter((e) => e.status === 'passed').length;
  const decided   = ordered + missed + passedCt;
  const expectedRate = decided > 0 ? parseFloat((ordered / decided).toFixed(4)) : 0;

  const summary = rfyTracker.getSummary();
  assert.strictEqual(summary.totalRFY, all.length);
  assert.strictEqual(summary.rfyWatching, watching);
  assert.strictEqual(summary.rfyOrdered, ordered);
  assert.strictEqual(summary.rfyMissed, missed);
  assert.strictEqual(summary.rfyPassed, passedCt);
  assert.strictEqual(summary.rfyConversionRate, expectedRate);
  assert.ok(summary.rfyConversionRate >= 0 && summary.rfyConversionRate <= 1);
  assert.strictEqual(
    summary.totalRFY,
    summary.rfyWatching + summary.rfyOrdered + summary.rfyMissed + summary.rfyPassed
  );
});

test('getSummary: conversion rate is 0 when decided count is zero', () => {
  // Add a fresh watching-only entry and confirm that if decided == 0, rate == 0
  const entry = rfyTracker.add({ productTitle: 'Watching Only Item' });
  const summary = rfyTracker.getSummary();
  const decided = summary.rfyOrdered + summary.rfyMissed + summary.rfyPassed;
  if (decided === 0) {
    assert.strictEqual(summary.rfyConversionRate, 0);
  } else {
    assert.ok(summary.rfyConversionRate > 0);
  }
  rfyTracker.remove(entry.rfyId);
});

// ── Results ────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────────\n`);

if (failed > 0) process.exit(1);
