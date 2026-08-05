/**
 * vine-marketplace — Amazon Order History CSV → product records
 *
 * Uses the SAME shape as amazon-parser.js so inventory / queue / listing packs
 * work whether the item came from email or CSV.
 *
 * Owner downloads CSV via Amazon Account → Request Your Information / Order History
 * reports (human step). No Amazon account scraping.
 *
 * Product images: not in most CSV exports. After import, use productUrl (ASIN →
 * /dp/{ASIN}) and enrich for gallery URLs. Owner does not upload personal photos.
 */

'use strict';

const { productUrlFromAsin, isValidAsin, attachProductLink } = require('./amazon-parser');

/** Normalize header keys: "Order ID" → "order id", "ASIN/ISBN" → "asin/isbn" */
function normalizeHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Minimal CSV line parser supporting quoted fields.
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Parse full CSV text into rows of objects keyed by normalized headers.
 */
function parseCsvText(csvText) {
  const text = String(csvText || '').replace(/^\uFEFF/, '').trim();
  if (!text) return { headers: [], rows: [] };

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] != null ? cells[idx].trim() : '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

/** Pick first non-empty value among candidate header names. */
function pick(row, names) {
  for (const n of names) {
    const key = normalizeHeader(n);
    if (row[key] != null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  // partial contains match
  for (const n of names) {
    const want = normalizeHeader(n);
    for (const [k, v] of Object.entries(row)) {
      if (k.includes(want) && v != null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
  }
  return '';
}

function parseMoney(raw) {
  if (raw == null || raw === '') return 0;
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function extractAsin(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Full URL → ASIN
  const fromUrl = s.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  if (isValidAsin(s)) return s.toUpperCase();
  // Sometimes "B0XXXXXXX " with trailing junk
  const m = s.match(/\b([A-Z0-9]{10})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Convert one CSV row into a vine-marketplace product record (parser shape).
 */
function rowToProduct(row, index = 0) {
  const orderId =
    pick(row, ['order id', 'orderid', 'order number', 'order #']) ||
    `CSV-${Date.now()}-${index}`;

  const asin = extractAsin(
    pick(row, ['asin', 'asin/isbn', 'asin isbn', 'product asin', 'isbn'])
  );

  const productTitle =
    pick(row, ['title', 'product name', 'product title', 'item name', 'description']) ||
    (asin ? `Amazon product ${asin}` : `CSV item ${index + 1}`);

  const paidPrice = parseMoney(
    pick(row, [
      'item total',
      'total owed',
      'unit price',
      'purchase price',
      'item subtotal',
      'shipment item subtotal',
      'price',
    ])
  );

  const website = pick(row, ['website', 'site', 'marketplace']) || 'www.amazon.com';
  const host = website.includes('amazon.')
    ? website.replace(/^https?:\/\//, '').split('/')[0]
    : 'www.amazon.com';

  const productUrl =
    pick(row, ['product url', 'url', 'link', 'product link']) ||
    productUrlFromAsin(asin, host);

  // CSV rarely includes image URLs; leave empty and enrich from product page later
  const imageRaw = pick(row, ['image', 'image url', 'imageurl', 'photo']);
  const imageUrl = imageRaw && /^https?:\/\//i.test(imageRaw) ? imageRaw : null;

  const qty = parseInt(pick(row, ['quantity', 'qty']) || '1', 10) || 1;
  const orderDate = pick(row, ['order date', 'date', 'purchase date']) || null;

  return attachProductLink({
    orderId: `${orderId}${qty > 1 && asin ? `-${asin}` : ''}`,
    asin,
    productTitle: productTitle.substring(0, 200),
    paidPrice,
    vineTaxValue: 0,
    isVine: false,
    imageUrl,
    productUrl: productUrl || productUrlFromAsin(asin, host),
    imageUrls: imageUrl ? [imageUrl] : [],
    trackingNumber: pick(row, ['carrier name & tracking number', 'tracking number', 'tracking']) || null,
    deliveryDate: null,
    emailType: 'csv',
    source: 'csv',
    orderDate,
    quantity: qty,
    receivedAt: new Date().toISOString(),
    subject: `CSV import: ${productTitle.substring(0, 80)}`,
    listed: false,
    sold: false,
    listingId: null,
    listingPrice: null,
    listedAt: null,
    soldAt: null,
    soldPrice: null,
  }, host);
}

/**
 * Parse Amazon order history CSV text → product records ready for inventory.upsert.
 *
 * @param {string} csvText
 * @returns {{ products: object[], skipped: number, headers: string[], errors: string[] }}
 */
function importOrderCsv(csvText) {
  const { headers, rows } = parseCsvText(csvText);
  const products = [];
  const errors = [];
  let skipped = 0;

  if (rows.length === 0) {
    return { products: [], skipped: 0, headers, errors: ['CSV has no data rows'] };
  }

  rows.forEach((row, i) => {
    try {
      const product = rowToProduct(row, i);
      // Skip empty junk rows with no ASIN and generic title
      if (!product.asin && (!product.productTitle || product.productTitle.startsWith('CSV item'))) {
        skipped++;
        return;
      }
      products.push(product);
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err.message}`);
      skipped++;
    }
  });

  return { products, skipped, headers, errors };
}

module.exports = {
  importOrderCsv,
  parseCsvText,
  rowToProduct,
  extractAsin,
  normalizeHeader,
};
