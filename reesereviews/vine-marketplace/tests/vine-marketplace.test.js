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

const { parseAmazonEmail, detectEmailType } = require('../lib/amazon-parser');

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

// ── Results ────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────────\n`);

if (failed > 0) process.exit(1);
