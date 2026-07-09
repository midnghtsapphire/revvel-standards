/**
 * Generate 3 lifestyle images for one product.
 * Secret: OPENROUTER_API_KEY on Vercel (you set once — never in the browser).
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

const PROMPTS = [
  (t) =>
    `Amateur smartphone photo of this product in real home use: ${t}. Lived-in room, natural light, product in use, not a white-background stock shot. No readable faces.`,
  (t) =>
    `Casual close-up phone photo showing a key feature of: ${t}. Hands only (no face) in a real house. Not studio stock photography.`,
  (t) =>
    `Realistic amateur photo of: ${t} in another everyday home spot (kitchen, laundry, desk, or hallway). Phone-camera quality, ordinary clutter, not catalog stock.`,
];

async function openRouterImage(prompt, apiKey, model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'marketplace-relister',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.message || `OpenRouter ${res.status}`);
  }
  const msg = data.choices?.[0]?.message;
  if (msg?.images?.[0]?.image_url?.url) return msg.images[0].image_url.url;
  if (Array.isArray(msg?.content)) {
    for (const p of msg.content) {
      if (p.type === 'image_url' && p.image_url?.url) return p.image_url.url;
      if (p.inline_data?.data) {
        return `data:image/jpeg;base64,${p.inline_data.data}`;
      }
    }
  }
  if (typeof msg?.content === 'string') {
    const m = msg.content.match(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/);
    if (m) return m[0];
  }
  throw new Error('No image in model response — check OPENROUTER_IMAGE_MODEL supports images');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const asin = body.asin ? String(body.asin).trim().toUpperCase() : '';
    const count = Math.min(5, Math.max(1, parseInt(body.count || '3', 10) || 3));

    if (!title && !asin) {
      return Response.json({ error: 'Need product title or ASIN' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error:
            'OPENROUTER_API_KEY is not set on this Vercel project. Add it once under Project → Settings → Environment Variables, then redeploy.',
          setup: true,
        },
        { status: 503 }
      );
    }

    const model =
      process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview';
    const label = title || `Amazon product ${asin}`;
    const images = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const url = await openRouterImage(PROMPTS[i % PROMPTS.length](label), apiKey, model);
        images.push({ index: i + 1, url });
      } catch (err) {
        errors.push({ index: i + 1, message: err.message });
      }
    }

    return Response.json({
      ok: images.length > 0,
      asin: asin || null,
      title: label,
      productUrl: asin ? `https://www.amazon.com/dp/${asin}` : null,
      images,
      errors,
      listing: [
        label,
        '',
        asin ? `ASIN: ${asin}` : '',
        asin ? `https://www.amazon.com/dp/${asin}` : '',
        '',
        'From my orders. Message with questions. Local pickup / shipping as agreed.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
