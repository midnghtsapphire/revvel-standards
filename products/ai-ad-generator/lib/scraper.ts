/**
 * Product URL scraper using undici + cheerio.
 *
 * Extracts: title, description, price, images, brand from any product page.
 * Prioritises Open Graph / structured data before falling back to heuristics.
 *
 * NOTE: This scraper is intended for legitimate competitive research and
 * your own product pages. Respect each site's robots.txt and ToS.
 */

import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { ProductData, ProductReview } from '../types';

const USER_AGENT =
  'Mozilla/5.0 (compatible; RevvelBot/1.0; +https://revvel.ai/bot)';

const TIMEOUT_MS = 15_000;

export async function scrapeProduct(url: string): Promise<ProductData> {
  let html: string;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    html = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Scrape failed for ${url}: ${msg}`);
  }

  const $ = cheerio.load(html);

  // ── Open Graph ──────────────────────────────────────────────────────────────
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDesc = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';

  // ── Twitter card ────────────────────────────────────────────────────────────
  const twitterTitle =
    $('meta[name="twitter:title"]').attr('content') || '';
  const twitterDesc =
    $('meta[name="twitter:description"]').attr('content') || '';
  const twitterImage =
    $('meta[name="twitter:image"]').attr('content') || '';

  // ── <title> + meta description ───────────────────────────────────────────
  const pageTitle =
    $('title').first().text().trim() || '';
  const metaDesc =
    $('meta[name="description"]').attr('content') || '';

  // ── JSON-LD structured data (Product schema) ─────────────────────────────
  let jsonLdTitle = '';
  let jsonLdDesc = '';
  let jsonLdPrice = '';
  let jsonLdCurrency = '';
  let jsonLdBrand = '';
  let jsonLdImages: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || '';
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = item['@type'] || '';
        if (type === 'Product' || type === 'ItemPage') {
          jsonLdTitle = jsonLdTitle || item.name || '';
          jsonLdDesc = jsonLdDesc || item.description || '';
          jsonLdBrand =
            jsonLdBrand ||
            (typeof item.brand === 'string'
              ? item.brand
              : item.brand?.name || '');

          const offers = item.offers;
          if (offers) {
            const offer = Array.isArray(offers) ? offers[0] : offers;
            jsonLdPrice = jsonLdPrice || String(offer.price || '');
            jsonLdCurrency = jsonLdCurrency || offer.priceCurrency || '';
          }

          if (item.image) {
            const imgs = Array.isArray(item.image)
              ? item.image
              : [item.image];
            jsonLdImages = [
              ...jsonLdImages,
              ...imgs.map((i: string | { url: string }) =>
                typeof i === 'string' ? i : i.url
              ),
            ];
          }
        }
      }
    } catch {
      // malformed JSON-LD — skip silently
    }
  });

  // ── Price heuristics ─────────────────────────────────────────────────────
  const priceSelectors = [
    '[itemprop="price"]',
    '.price',
    '#price',
    '.product-price',
    '[data-price]',
    '.a-price .a-offscreen', // Amazon
  ];
  let heuristicPrice = '';
  for (const sel of priceSelectors) {
    const el = $(sel).first();
    const candidate = el.attr('content') || el.attr('data-price') || el.text().trim();
    if (candidate && /[\d.,]+/.test(candidate)) {
      heuristicPrice = candidate;
      break;
    }
  }

  // ── Product images heuristics ────────────────────────────────────────────
  const imgSet = new Set<string>(jsonLdImages);
  if (ogImage) imgSet.add(ogImage);
  if (twitterImage) imgSet.add(twitterImage);

  // gather <img> tags with reasonable dimensions
  $('img').each((_, el) => {
    const src =
      $(el).attr('src') ||
      $(el).attr('data-src') ||
      $(el).attr('data-lazy-src') ||
      '';
    const w = parseInt($(el).attr('width') || '0', 10);
    const h = parseInt($(el).attr('height') || '0', 10);
    if (src && src.startsWith('http') && (w === 0 || w >= 200) && (h === 0 || h >= 200)) {
      imgSet.add(src);
    }
  });

  // ── Reviews heuristics ───────────────────────────────────────────────────
  const reviews: ProductReview[] = [];
  $('[itemprop="reviewBody"], .review-body, .review-text').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) {
      reviews.push({ text: text.slice(0, 200) });
    }
  });

  // ── Compose final result ─────────────────────────────────────────────────
  const title =
    jsonLdTitle ||
    ogTitle ||
    twitterTitle ||
    pageTitle.split('|')[0].split(' – ')[0].trim();

  const description =
    jsonLdDesc ||
    ogDesc ||
    twitterDesc ||
    metaDesc;

  const price = jsonLdPrice || heuristicPrice;
  const currency = jsonLdCurrency || (price.includes('$') ? 'USD' : '');
  const brand = jsonLdBrand || ogSiteName;
  const images = [...imgSet].slice(0, 6);

  return {
    url,
    title: title || 'Unknown Product',
    description: description || '',
    price: price || undefined,
    currency: currency || undefined,
    images,
    ogImage: ogImage || undefined,
    brand: brand || undefined,
    reviews: reviews.slice(0, 5),
    scrapedAt: new Date().toISOString(),
  };
}
