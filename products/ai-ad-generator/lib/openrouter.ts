/**
 * OpenRouter AI client for ad copy generation.
 *
 * Uses OPENROUTER_API_KEY. Falls back to a deterministic mock when the key
 * is missing or the call fails, so the dev server always returns something
 * usable. Check https://openrouter.ai/credits if you see 402 errors.
 *
 * Model: configurable via OPENROUTER_MODEL env var.
 * Default: anthropic/claude-haiku-3 (cheap, fast, good for ad copy).
 */

import { ProductData, AdCopy, AdCopyVariant } from '../types';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'anthropic/claude-haiku-3';

function getModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

function buildPrompt(product: ProductData): string {
  const reviewSnippet =
    product.reviews && product.reviews.length > 0
      ? `\nCustomer reviews (use as social proof):\n${product.reviews
          .slice(0, 3)
          .map((r) => `- "${r.text}"`)
          .join('\n')}`
      : '';

  return `You are an elite performance marketing copywriter. Generate high-converting ad copy for the following product.

PRODUCT DETAILS:
- Name: ${product.title}
- Description: ${product.description}
- Price: ${product.price || 'Not specified'}
- Brand: ${product.brand || 'Not specified'}${reviewSnippet}

OUTPUT (respond with ONLY valid JSON, no markdown fences):
{
  "primaryHeadline": "A punchy 6-8 word headline",
  "script": "A 30-second UGC-style video script (hook + problem + solution + CTA, ~80 words)",
  "hashtags": ["array", "of", "5", "relevant", "hashtags"],
  "variants": [
    {
      "headline": "...",
      "body": "2-3 sentence ad body using AIDA framework",
      "cta": "Action-oriented CTA button text",
      "hook": "First 3 words that stop the scroll",
      "framework": "AIDA"
    },
    {
      "headline": "...",
      "body": "2-3 sentence ad body using PAS framework",
      "cta": "...",
      "hook": "...",
      "framework": "PAS"
    },
    {
      "headline": "...",
      "body": "2-3 sentence ad body using BAB framework",
      "cta": "...",
      "hook": "...",
      "framework": "BAB"
    }
  ]
}`;
}

function mockAdCopy(product: ProductData): AdCopy {
  // Deterministic fallback when OpenRouter is unavailable — always returns
  // plausible-looking copy so the UI stays functional for demos / dev.
  const name = product.title;
  const variants: AdCopyVariant[] = [
    {
      headline: `Transform Your Life with ${name}`,
      body: `Attention: tired of settling for less? ${name} delivers premium quality at a price that makes sense. Interest piqued? Desire it. Act now.`,
      cta: 'Shop Now',
      hook: 'Stop settling for',
      framework: 'AIDA',
    },
    {
      headline: `Stop Struggling — ${name} Fixes That`,
      body: `Problem: you've tried everything and nothing works. Agitate: every day without a solution costs you time and money. Solution: ${name} was built exactly for this.`,
      cta: 'Get Yours Today',
      hook: 'Stop struggling with',
      framework: 'PAS',
    },
    {
      headline: `Before & After: The ${name} Difference`,
      body: `Before ${name}: frustration, wasted time, zero results. After: confidence, results, and freedom. Bridge: one click is all it takes to get there.`,
      cta: 'Start Your Transformation',
      hook: 'Before you had',
      framework: 'BAB',
    },
  ];

  return {
    productTitle: name,
    primaryHeadline: `${name} — The Smart Choice`,
    script: `[HOOK] Wait — are you still doing it the hard way?\n[PROBLEM] Most people waste hours every week on this.\n[SOLUTION] ${name} changes everything. Here's why...\n[PROOF] Thousands of happy customers can't be wrong.\n[CTA] Click the link to get yours — limited stock!`,
    variants,
    hashtags: ['#ad', '#sponsored', '#musthave', '#review', '#shopping'],
    generatedAt: new Date().toISOString(),
    model: 'mock-fallback',
  };
}

export async function generateAdCopy(product: ProductData): Promise<AdCopy> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Use mock when key is absent — keeps local dev functional without credits
  if (!apiKey) {
    console.warn('[openrouter] OPENROUTER_API_KEY not set — using mock fallback');
    return mockAdCopy(product);
  }

  const model = getModel();
  const prompt = buildPrompt(product);

  let raw: string;
  try {
    // 30-second timeout so a stalled provider doesn't block the API route indefinitely
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let res: Response;
    try {
      res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Required headers for OpenRouter rankings
          'HTTP-Referer':
            process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3009',
          'X-Title': 'AI Ad Generator',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    raw = json.choices?.[0]?.message?.content || '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[openrouter] call failed, using mock:', msg);
    return mockAdCopy(product);
  }

  // Parse JSON — strip any accidental markdown fences, then validate shape
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    // Shape validation — fall back to mock if the model returned unexpected structure
    if (
      typeof parsed.primaryHeadline !== 'string' ||
      typeof parsed.script !== 'string' ||
      !Array.isArray(parsed.variants) ||
      parsed.variants.length === 0
    ) {
      console.warn('[openrouter] response failed shape validation, using mock');
      return mockAdCopy(product);
    }

    const variants = (parsed.variants as Array<Record<string, unknown>>).map((v) => ({
      headline:
        typeof v.headline === 'string' && v.headline.trim() !== ''
          ? v.headline.trim()
          : (parsed.primaryHeadline as string),
      body:
        typeof v.body === 'string' && v.body.trim() !== ''
          ? v.body.trim()
          : '',
      cta: typeof v.cta === 'string' ? v.cta : 'Shop Now',
      hook: typeof v.hook === 'string' ? v.hook : undefined,
      framework: (['AIDA', 'PAS', 'BAB', 'Direct'].includes(v.framework as string)
        ? v.framework
        : 'Direct') as AdCopyVariant['framework'],
    }));

    return {
      productTitle: product.title,
      primaryHeadline: parsed.primaryHeadline as string,
      script: parsed.script as string,
      variants,
      hashtags: Array.isArray(parsed.hashtags)
        ? (parsed.hashtags as unknown[]).filter((h): h is string => typeof h === 'string')
        : [],
      generatedAt: new Date().toISOString(),
      model,
    };
  } catch {
    console.warn('[openrouter] JSON parse failed, using mock');
    return mockAdCopy(product);
  }
}
