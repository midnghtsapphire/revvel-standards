/**
 * vine-marketplace — Facebook Marketplace Poster
 *
 * Posts products to Facebook using the Meta Graph API.
 *
 * Two pathways supported:
 *   1. Facebook Page Post — posts a photo + description to a Facebook Page
 *      (visible as a Marketplace-style sale post).
 *   2. Facebook Commerce Catalog — adds item to a Commerce Manager catalog
 *      for Marketplace listing via Product Sets (requires Commerce Manager setup).
 *
 * Required env vars:
 *   META_PAGE_ACCESS_TOKEN  — Page Access Token with pages_manage_posts scope
 *   META_PAGE_ID            — Your Facebook Page numeric ID
 *   META_CATALOG_ID         — (optional) Commerce Manager catalog ID
 *   META_API_VERSION        — defaults to v19.0
 *
 * All API calls respect the free tier. No paid ad spend is required for organic posts.
 */

'use strict';

const fetch = require('node-fetch');

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const PAGE_ID = process.env.META_PAGE_ID || '';
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const CATALOG_ID = process.env.META_CATALOG_ID || '';

/** Build the listing description from a product record + price. */
function buildDescription(product, listingPrice) {
  const { productTitle, isVine, vineTaxValue, paidPrice, asin, orderId } = product;
  const conditionNote = 'Condition: New / Like New — received and never used.';
  const vineNote = isVine
    ? `Originally received through Amazon Vine (FMV: $${vineTaxValue || paidPrice}).`
    : `Paid: $${paidPrice}.`;

  const lines = [
    `🛒 ${productTitle}`,
    '',
    `💲 Price: $${listingPrice} (firm)`,
    conditionNote,
    vineNote,
    '',
    '📦 Local pickup or shipping available.',
    'Message me to arrange!',
    '',
    asin ? `ASIN: ${asin}` : '',
    `Order: ${orderId}`,
  ].filter((l) => l !== undefined);

  return lines.join('\n').trim();
}

/**
 * Post a product to a Facebook Page as a photo post.
 * If no imageUrl, posts as a text-only status update.
 *
 * @param {object} product   — inventory product record
 * @param {number} listingPrice
 * @returns {Promise<{postId: string, url: string}>}
 */
async function postToPage(product, listingPrice) {
  if (!PAGE_ID || !PAGE_TOKEN) {
    throw new Error(
      'META_PAGE_ID and META_PAGE_ACCESS_TOKEN must be set. ' +
      'See .env.example for setup instructions.'
    );
  }

  const message = buildDescription(product, listingPrice);

  let endpoint, body;

  if (product.imageUrl) {
    // Photo post
    endpoint = `${META_BASE}/${PAGE_ID}/photos`;
    body = new URLSearchParams({
      url: product.imageUrl,
      caption: message,
      access_token: PAGE_TOKEN,
      published: 'true',
    });
  } else {
    // Text-only post
    endpoint = `${META_BASE}/${PAGE_ID}/feed`;
    body = new URLSearchParams({
      message,
      access_token: PAGE_TOKEN,
      published: 'true',
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const err = data.error?.message || `HTTP ${response.status}`;
    throw new Error(`Facebook API error: ${err}`);
  }

  const postId = data.id || data.post_id;
  const url = `https://www.facebook.com/${postId}`;

  return { postId, url };
}

/**
 * Add or update a product in a Facebook Commerce Manager catalog.
 *
 * This creates a proper Marketplace listing with price, availability, etc.
 * Requires Commerce Manager setup and a catalog with Marketplace channel enabled.
 *
 * @param {object} product
 * @param {number} listingPrice
 * @returns {Promise<{catalogItemId: string}>}
 */
async function addToCatalog(product, listingPrice) {
  if (!CATALOG_ID || !PAGE_TOKEN) {
    throw new Error(
      'META_CATALOG_ID and META_PAGE_ACCESS_TOKEN must be set for catalog listings.'
    );
  }

  const { productTitle, asin, orderId, imageUrl } = product;

  // Use ASIN or orderId as the retailer_id (unique per item)
  const retailerId = asin || orderId;

  const itemData = {
    retailer_id: retailerId,
    name: productTitle.substring(0, 200),
    description: buildDescription(product, listingPrice),
    price: Math.round(listingPrice * 100), // price in cents
    currency: 'USD',
    availability: 'in stock',
    condition: 'new',
    image_url: imageUrl || '',
    // Only include a URL if we have a valid ASIN; otherwise omit to avoid broken links
    ...(asin ? { url: `https://www.amazon.com/dp/${asin}` } : {}),
    access_token: PAGE_TOKEN,
  };

  const endpoint = `${META_BASE}/${CATALOG_ID}/items_batch`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: PAGE_TOKEN,
      allow_upsert: true,
      requests: [{ method: 'CREATE', data: itemData }],
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const err = data.error?.message || `HTTP ${response.status}`;
    throw new Error(`Facebook Catalog API error: ${err}`);
  }

  return { catalogItemId: retailerId, handles: data.handles };
}

/**
 * Post a product using whichever method is configured:
 *   - If META_CATALOG_ID is set → use catalog (proper Marketplace listing)
 *   - Otherwise → page post (visible on Page, shareable to Marketplace manually)
 *
 * @returns {Promise<{method: string, id: string, url?: string}>}
 */
async function postProduct(product, listingPrice) {
  if (CATALOG_ID) {
    const result = await addToCatalog(product, listingPrice);
    return { method: 'catalog', id: result.catalogItemId };
  }

  const result = await postToPage(product, listingPrice);
  return { method: 'page_post', id: result.postId, url: result.url };
}

/**
 * Build a "repost" message — used when refreshing a stale listing.
 * Slightly different copy to appear fresh in the feed.
 */
async function repostProduct(product, listingPrice) {
  if (!PAGE_ID || !PAGE_TOKEN) {
    throw new Error('META_PAGE_ID and META_PAGE_ACCESS_TOKEN must be set.');
  }

  const message =
    `🔄 Still available! ${product.productTitle}\n` +
    `💲 Price: $${listingPrice} — message me to buy!\n` +
    buildDescription(product, listingPrice);

  const endpoint = `${META_BASE}/${PAGE_ID}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: PAGE_TOKEN,
    published: 'true',
  });

  const response = await fetch(endpoint, { method: 'POST', body });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Facebook API error: ${data.error?.message || response.status}`);
  }

  return { method: 'repost', id: data.id };
}

module.exports = { postProduct, repostProduct, addToCatalog, postToPage };
