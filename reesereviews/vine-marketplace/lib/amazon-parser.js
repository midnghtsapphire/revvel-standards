/**
 * vine-marketplace — Amazon Email Parser
 *
 * Parses Amazon order/shipment/delivery confirmation emails and
 * Amazon Vine notification emails into a normalised product object.
 *
 * Email types handled:
 *   1. "Your order has shipped"  — extracts ASIN, product name, tracking
 *   2. "Your order has been delivered" — marks item as received
 *   3. "Amazon Vine — Your product has arrived" — marks as Vine + captures FMV if present
 *   4. "Amazon Vine — Product Received" — alternate Vine confirmation template
 *
 * Shared product identity (also used by CSV import):
 *   ASIN → productUrl = https://www.amazon.com/dp/{ASIN}
 *   imageUrl from email/Amazon CDN when present (owner does not supply photos)
 */

'use strict';

/** Build the canonical Amazon product page URL from an ASIN. */
function productUrlFromAsin(asin, marketplace = 'www.amazon.com') {
  if (!asin || typeof asin !== 'string') return null;
  const clean = asin.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(clean)) return null;
  const host = marketplace.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'www.amazon.com';
  return `https://${host}/dp/${clean}`;
}

/** True when value looks like a 10-char ASIN. */
function isValidAsin(asin) {
  return typeof asin === 'string' && /^[A-Z0-9]{10}$/i.test(asin.trim());
}

/**
 * Fill productUrl (and keep imageUrl) on any product-shaped record.
 * Safe to call repeatedly — does not overwrite a non-empty productUrl.
 */
function attachProductLink(product, marketplace = 'www.amazon.com') {
  if (!product || typeof product !== 'object') return product;
  const asin = product.asin ? String(product.asin).trim().toUpperCase() : null;
  const url = productUrlFromAsin(asin, marketplace);
  return {
    ...product,
    asin: asin || product.asin || null,
    productUrl: product.productUrl || url,
  };
}

// Regex patterns for extracting data from Amazon email bodies
const PATTERNS = {
  // Order ID — 17-char alphanumeric (e.g. 112-3456789-0123456)
  orderId: /(\d{3}-\d{7}-\d{7})/,
  // ASIN — 10-char uppercase alphanumeric
  asin: /(?:ASIN|asin)[:\s]+([A-Z0-9]{10})/i,
  // Price paid — "$12.34" or "USD 12.34"
  price: /(?:Order Total|Item Price|Total|Subtotal)[:\s]*\$?([\d,]+\.\d{2})/i,
  // Product title — between "1 of:" or after "You ordered:" and before the next newline
  productTitle: /(?:You ordered:|Qty: \d+\s+)(.*?)(?:\n|ASIN|\$)/is,
  // Amazon image URL
  imageUrl: /https:\/\/[a-z0-9-]+\.amazon\.com\/images\/I\/[A-Za-z0-9%-]+\.(?:jpg|jpeg|png)/i,
  // Vine tax value — "Estimated tax value: $12.34"
  vineTaxValue: /(?:tax(?:able)?\s+value|estimated value)[:\s]*\$?([\d,]+\.\d{2})/i,
  // Tracking number
  tracking: /(?:tracking\s+(?:number|#|ID))[:\s]*([A-Z0-9]+)/i,
  // Delivery date
  deliveryDate: /(?:delivered|arrived|delivery\s+date)[:\s]*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})/i,
};

// Subject-line heuristics to detect email type
const VINE_SUBJECTS = [
  'vine',
  'product has arrived',
  'vine product',
];
const SHIPPED_SUBJECTS = ['has shipped', 'your shipment', 'order shipped'];
const DELIVERED_SUBJECTS = ['delivered', 'has been delivered', 'your package'];

/**
 * Detect email category from subject line.
 * @returns {'vine'|'shipped'|'delivered'|'unknown'}
 */
function detectEmailType(subject = '') {
  const s = subject.toLowerCase();
  if (VINE_SUBJECTS.some((k) => s.includes(k))) return 'vine';
  if (DELIVERED_SUBJECTS.some((k) => s.includes(k))) return 'delivered';
  if (SHIPPED_SUBJECTS.some((k) => s.includes(k))) return 'shipped';
  return 'unknown';
}

/**
 * Extract a field using a regex pattern against raw text.
 * Returns null when no match found.
 */
function extract(pattern, text) {
  const m = text.match(pattern);
  return m ? m[1].replace(/,/g, '').trim() : null;
}

/**
 * Return true only if the sender's domain is exactly amazon.com or *.amazon.com.
 * Prevents spoofed senders like attacker@amazon.com.evil.com from passing.
 */
function isAmazonSender(fromText = '') {
  const lower = fromText.toLowerCase();
  // Extract all email-like tokens (handles "Display Name <email@domain>" format)
  const emailTokens = lower.match(/[\w.+-]+@([\w.-]+)/g) || [];
  return emailTokens.some((token) => {
    const atIdx = token.lastIndexOf('@');
    const domain = atIdx !== -1 ? token.slice(atIdx + 1) : '';
    return domain === 'amazon.com' || domain.endsWith('.amazon.com');
  });
}

/**
 * Parse a single email (parsed by mailparser) into a product record.
 *
 * @param {object} mail  — mailparser ParsedMail object
 * @returns {object|null}  normalised product record, or null if not recognisable
 */
function parseAmazonEmail(mail) {
  const subject = mail.subject || '';
  const from = mail.from?.text || '';
  const text = mail.text || mail.html?.replace(/<[^>]+>/g, ' ') || '';

  // Only process emails from verified Amazon domains
  if (!isAmazonSender(from)) {
    return null;
  }

  const emailType = detectEmailType(subject);
  if (emailType === 'unknown') return null;

  const orderId = extract(PATTERNS.orderId, text) || extract(PATTERNS.orderId, subject);
  const asin = extract(PATTERNS.asin, text);
  const rawPrice = extract(PATTERNS.price, text);
  const paidPrice = rawPrice ? parseFloat(rawPrice) : 0;
  const titleMatch = text.match(PATTERNS.productTitle);
  const productTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : subject;
  const imageUrl = extract(PATTERNS.imageUrl, text);
  const rawTaxValue = extract(PATTERNS.vineTaxValue, text);
  const vineTaxValue = rawTaxValue ? parseFloat(rawTaxValue) : 0;
  const tracking = extract(PATTERNS.tracking, text);
  const deliveryDateStr = extract(PATTERNS.deliveryDate, text);
  const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr).toISOString() : null;

  const isVine = emailType === 'vine';
  const asinClean = asin ? asin.toUpperCase() : null;

  return attachProductLink({
    orderId: orderId || `UNKNOWN-${Date.now()}`,
    asin: asinClean,
    productTitle: productTitle.substring(0, 200),
    paidPrice,
    vineTaxValue,
    isVine,
    imageUrl: imageUrl || null,
    productUrl: productUrlFromAsin(asinClean),
    imageUrls: imageUrl ? [imageUrl] : [],
    trackingNumber: tracking || null,
    deliveryDate: deliveryDate || (emailType === 'delivered' ? new Date().toISOString() : null),
    emailType,
    source: 'email',
    receivedAt: new Date().toISOString(),
    subject,
    // Listing fields populated later
    listed: false,
    sold: false,
    listingId: null,
    listingPrice: null,
    listedAt: null,
    soldAt: null,
    soldPrice: null,
  });
}

module.exports = {
  parseAmazonEmail,
  detectEmailType,
  productUrlFromAsin,
  isValidAsin,
  attachProductLink,
  PATTERNS,
};
