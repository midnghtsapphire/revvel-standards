/**
 * Product URL scraper using undici + cheerio.
 *
 * Extracts: title, description, price, images, brand from any product page.
 * Prioritises Open Graph / structured data before falling back to heuristics.
 *
 * NOTE: This scraper is intended for legitimate competitive research and
 * your own product pages. Respect each site's robots.txt and ToS.
 *
 * SSRF defence: private / loopback / link-local addresses are blocked.
 * Response body is capped at 5 MB to prevent memory exhaustion.
 */

import { fetch } from "undici";
import * as cheerio from "cheerio";
import { ProductData, ProductReview } from "../types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; RevvelBot/1.0; +https://revvel.ai/bot)";

const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

// Private / loopback ranges that must not be fetched server-side (SSRF defence).
// Covers IPv4 loopback, RFC-1918 private ranges, link-local, metadata endpoints,
// IPv6 ULA (fc00::/7 = fc + fd prefixes), and IPv4-mapped IPv6 (::ffff:).
const BLOCKED_HOSTNAME_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.\d+\.\d+\.\d+|\[?::1\]?|\[?::ffff:|\[?f[cd][0-9a-f]{2}:|\[?fe80:)/i;

/** Typed error for bad-URL inputs that should be surfaced to the caller as 4xx. */
export class ScraperClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraperClientError";
  }
}

function isBlockedUrl(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr);
    if (protocol !== "http:" && protocol !== "https:") return true;
    if (BLOCKED_HOSTNAME_RE.test(hostname)) return true;
    // Block numeric IPs that look like private ranges not caught above
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const parts = hostname.split(".").map(Number);
      // Block RFC 6598 CGNAT (100.64.0.0/10 = second octet 64–127), 169.254, 240-255
      if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
      if (parts[0] >= 240) return true;
    }
    return false;
  } catch {
    return true; // Unparseable URL → block
  }
}

function extractMetadata($: cheerio.CheerioAPI) {
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const ogSiteName = $('meta[property="og:site_name"]').attr("content") || "";
  const twitterTitle = $('meta[name="twitter:title"]').attr("content") || "";
  const twitterDesc =
    $('meta[name="twitter:description"]').attr("content") || "";
  const twitterImage = $('meta[name="twitter:image"]').attr("content") || "";
  const pageTitle = $("title").first().text().trim() || "";
  const metaDesc = $('meta[name="description"]').attr("content") || "";

  return {
    ogTitle,
    ogDesc,
    ogImage,
    ogSiteName,
    twitterTitle,
    twitterDesc,
    twitterImage,
    pageTitle,
    metaDesc,
  };
}

function extractJsonLd($: cheerio.CheerioAPI) {
  let jsonLdTitle = "";
  let jsonLdDesc = "";
  let jsonLdPrice = "";
  let jsonLdCurrency = "";
  let jsonLdBrand = "";
  let jsonLdImages: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || "";
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = item["@type"] || "";
        if (type === "Product" || type === "ItemPage") {
          jsonLdTitle = jsonLdTitle || item.name || "";
          jsonLdDesc = jsonLdDesc || item.description || "";
          jsonLdBrand =
            jsonLdBrand ||
            (typeof item.brand === "string"
              ? item.brand
              : item.brand?.name || "");

          const offers = item.offers;
          if (offers) {
            const offer = Array.isArray(offers) ? offers[0] : offers;
            jsonLdPrice = jsonLdPrice || String(offer.price || "");
            jsonLdCurrency = jsonLdCurrency || offer.priceCurrency || "";
          }

          if (item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            jsonLdImages = [
              ...jsonLdImages,
              ...imgs.map((i: any) => (typeof i === "string" ? i : i.url)),
            ];
          }
        }
      }
    } catch {
      // malformed JSON-LD — skip silently
    }
  });

  return {
    jsonLdTitle,
    jsonLdDesc,
    jsonLdPrice,
    jsonLdCurrency,
    jsonLdBrand,
    jsonLdImages,
  };
}

function extractHeuristicPrice($: cheerio.CheerioAPI): string {
  const priceSelectors = [
    '[itemprop="price"]',
    ".price",
    "#price",
    ".product-price",
    "[data-price]",
    ".a-price .a-offscreen",
  ];
  for (const sel of priceSelectors) {
    const el = $(sel).first();
    const candidate =
      el.attr("content") || el.attr("data-price") || el.text().trim();
    if (candidate && /[\d.,]+/.test(candidate)) {
      return candidate;
    }
  }
  return "";
}

function extractImages(
  $: cheerio.CheerioAPI,
  initialImages: string[],
): string[] {
  const imgSet = new Set<string>(initialImages);
  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      "";
    const w = parseInt($(el).attr("width") || "0", 10);
    const h = parseInt($(el).attr("height") || "0", 10);
    if (
      src &&
      src.startsWith("http") &&
      (w === 0 || w >= 200) &&
      (h === 0 || h >= 200)
    ) {
      imgSet.add(src);
    }
  });
  return [...imgSet];
}

function extractReviews($: cheerio.CheerioAPI): ProductReview[] {
  const reviews: ProductReview[] = [];
  $('[itemprop="reviewBody"], .review-body, .review-text').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) {
      reviews.push({ text: text.slice(0, 200) });
    }
  });
  return reviews;
}

export async function scrapeProduct(url: string): Promise<ProductData> {
  if (isBlockedUrl(url)) {
    throw new ScraperClientError(
      "URL points to a disallowed destination (private/loopback address)",
    );
  }

  let html: string;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      // Do not silently follow redirects to private addresses; re-check final URL
      redirect: "follow",
    });

    // Re-validate the resolved URL after any redirect hops
    if (isBlockedUrl(res.url)) {
      throw new ScraperClientError(
        "URL redirected to a disallowed destination",
      );
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    // Guard against huge responses — fast-path via Content-Length header
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error(`Response too large (${contentLength} bytes)`);
    }

    // Stream the body with a byte counter so we never buffer more than MAX_RESPONSE_BYTES
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            throw new Error(
              `Response too large (>${MAX_RESPONSE_BYTES} bytes)`,
            );
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    html = new TextDecoder().decode(merged);
  } catch (err: unknown) {
    // Preserve typed client errors so route.ts can return 4xx without string-matching
    if (err instanceof ScraperClientError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Scrape failed for ${url}: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  const {
    ogTitle,
    ogDesc,
    ogImage,
    ogSiteName,
    twitterTitle,
    twitterDesc,
    twitterImage,
    pageTitle,
    metaDesc,
  } = extractMetadata($);

  const {
    jsonLdTitle,
    jsonLdDesc,
    jsonLdPrice,
    jsonLdCurrency,
    jsonLdBrand,
    jsonLdImages,
  } = extractJsonLd($);

  const heuristicPrice = extractHeuristicPrice($);

  // Combine initial images from JSON-LD and meta tags
  const initialImages: string[] = [...jsonLdImages];
  if (ogImage) initialImages.push(ogImage);
  if (twitterImage) initialImages.push(twitterImage);

  const images = extractImages($, initialImages).slice(0, 6);
  const reviews = extractReviews($).slice(0, 5);

  // ── Compose final result ─────────────────────────────────────────────────
  const title =
    jsonLdTitle ||
    ogTitle ||
    twitterTitle ||
    pageTitle.split("|")[0].split(" – ")[0].trim();

  const description = jsonLdDesc || ogDesc || twitterDesc || metaDesc;

  const price = jsonLdPrice || heuristicPrice;
  const currency = jsonLdCurrency || (price.includes("$") ? "USD" : "");
  const brand = jsonLdBrand || ogSiteName;

  return {
    url,
    title: title || "Unknown Product",
    description: description || "",
    price: price || undefined,
    currency: currency || undefined,
    images,
    ogImage: ogImage || undefined,
    brand: brand || undefined,
    reviews,
    scrapedAt: new Date().toISOString(),
  };
}
