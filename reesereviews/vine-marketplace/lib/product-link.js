/**
 * vine-marketplace — Product link + image enrichment from ASIN
 *
 * Owner does not take photos. We always have:
 *   productUrl = https://www.amazon.com/dp/{ASIN}
 *
 * imageUrl may already exist from vine email parse (Amazon CDN in the message).
 * Optional network enrich tries Open Graph / product page image tags.
 * If Amazon blocks bots, we still return productUrl so the human can open the page.
 */

'use strict';

// Prefer global fetch (Node 18+ / Vercel); fall back to node-fetch if present.
const fetchFn =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : (...args) => require('node-fetch')(...args);
const { productUrlFromAsin, isValidAsin, attachProductLink } = require('./amazon-parser');

/**
 * Collect candidate image URLs from HTML (og:image, product media).
 * Deterministic, no AI.
 */
function extractImageUrlsFromHtml(html, limit = 8) {
  if (!html || typeof html !== 'string') return [];
  const found = [];
  const push = (u) => {
    if (!u || typeof u !== 'string') return;
    let url = u.trim().replace(/&amp;/g, '&');
    if (url.startsWith('//')) url = `https:${url}`;
    if (!/^https?:\/\//i.test(url)) return;
    // Prefer Amazon media / product images
    if (!found.includes(url)) found.push(url);
  };

  // og:image
  const ogRe = /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;
  const ogRe2 = /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi;
  let m;
  while ((m = ogRe.exec(html)) !== null) push(m[1]);
  while ((m = ogRe2.exec(html)) !== null) push(m[1]);

  // Amazon image CDN patterns in page
  const cdnRe = /https?:\/\/[^"'\\s]*media-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|jpeg|png|webp)/gi;
  while ((m = cdnRe.exec(html)) !== null) push(m[0]);

  const sslRe = /https?:\/\/[^"'\\s]*ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|jpeg|png|webp)/gi;
  while ((m = sslRe.exec(html)) !== null) push(m[0]);

  return found.slice(0, limit);
}

/**
 * Enrich a product: ensure productUrl; optionally fetch gallery images.
 *
 * @param {object} product
 * @param {{ fetchImages?: boolean, timeoutMs?: number }} opts
 */
async function enrichProduct(product, opts = {}) {
  const fetchImages = opts.fetchImages !== false;
  const timeoutMs = opts.timeoutMs || 12000;

  let next = attachProductLink({ ...product });
  if (!next.asin || !isValidAsin(next.asin)) {
    return {
      product: next,
      enriched: false,
      reason: 'missing_or_invalid_asin',
      imageUrls: next.imageUrls || (next.imageUrl ? [next.imageUrl] : []),
    };
  }

  next.productUrl = next.productUrl || productUrlFromAsin(next.asin);
  const existing = [];
  if (next.imageUrl) existing.push(next.imageUrl);
  if (Array.isArray(next.imageUrls)) {
    next.imageUrls.forEach((u) => {
      if (u && !existing.includes(u)) existing.push(u);
    });
  }

  if (!fetchImages) {
    next.imageUrls = existing;
    return { product: next, enriched: true, reason: 'link_only', imageUrls: existing };
  }

  let fetched = [];
  let fetchError = null;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const res = await fetchFn(next.productUrl, {
      redirect: 'follow',
      signal: controller ? controller.signal : undefined,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (timer) clearTimeout(timer);
    if (!res.ok) {
      fetchError = `HTTP ${res.status}`;
    } else {
      const html = await res.text();
      fetched = extractImageUrlsFromHtml(html, 8);
    }
  } catch (err) {
    fetchError = err.message || String(err);
  }

  const merged = [...existing];
  fetched.forEach((u) => {
    if (!merged.includes(u)) merged.push(u);
  });

  next.imageUrls = merged.slice(0, 8);
  if (!next.imageUrl && merged[0]) next.imageUrl = merged[0];

  return {
    product: next,
    enriched: true,
    reason: fetchError ? `partial:${fetchError}` : 'ok',
    imageUrls: next.imageUrls,
    fetchError,
  };
}

/**
 * Build a marketplace listing pack for one product (human posts; no auto-FB required).
 */
function buildListingPack(product, pricing = null) {
  const p = attachProductLink({ ...product });
  const images = p.imageUrls && p.imageUrls.length
    ? p.imageUrls
    : p.imageUrl
      ? [p.imageUrl]
      : [];

  const title = (p.productTitle || 'Item for sale').substring(0, 100);
  const price = pricing && pricing.listingPrice != null
    ? pricing.listingPrice
    : p.listingPrice;

  const description = [
    p.productTitle || title,
    '',
    p.isVine ? 'Source: Amazon Vine (see condition notes).' : 'From my Amazon orders.',
    p.asin ? `Product reference ASIN: ${p.asin}` : null,
    p.productUrl ? `Product page: ${p.productUrl}` : null,
    '',
    'Condition: See photos / notes. Local pickup or shipping as agreed.',
    'Message me with questions — thanks for looking!',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    orderId: p.orderId,
    asin: p.asin,
    productUrl: p.productUrl,
    title,
    description,
    suggestedPrice: price,
    images,
    imageCount: images.length,
    // Pick up to 5 for marketplace UIs that want a small set
    selectedImages: images.slice(0, 5),
    product: p,
    builtAt: new Date().toISOString(),
    note: images.length
      ? 'Images from Amazon product/email — owner did not upload personal photos.'
      : 'No images yet — open productUrl and copy images, or re-run enrich.',
  };
}

module.exports = {
  enrichProduct,
  extractImageUrlsFromHtml,
  buildListingPack,
};
