/**
 * One product → N lifestyle images (called repeatedly by the batch runner).
 * Secrets stay on Vercel: OPENROUTER_API_KEY
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

const PROMPTS = [
  (t) =>
    `Amateur smartphone photo of this product in real home use: ${t}. Lived-in home, natural light, product clearly in use for its purpose, not a white-background stock catalog shot. No readable faces.`,
  (t) =>
    `Casual close-up phone photo showing a key feature of: ${t}. Hands only (no face) demonstrating use in a real house. Realistic lighting, not studio stock photography.`,
  (t) =>
    `Realistic amateur photo of: ${t} in another everyday home place (kitchen, laundry, bathroom, desk, or hallway) with ordinary clutter. Phone-camera quality, not polished stock.`,
  (t) =>
    `Wide casual phone photo of: ${t} stored or used in a narrow real-home space, authentic resale-listing style, not e-commerce studio.`,
  (t) =>
    `Detail shot of: ${t} highlighting materials or features as a normal person would photograph for Facebook Marketplace. Amateur, honest, not stock.`,
];

async function openRouterImage(prompt, apiKey, model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'family-marketplace-relister',
    },
    body: JSON.stringify({
      model,
      // modalities must include 'image' so that Gemini/image-capable models
      // return image content instead of text-only output.
      modalities: ['text', 'image'],
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
      if (p.inline_data?.data) return `data:image/jpeg;base64,${p.inline_data.data}`;
    }
  }
  if (typeof msg?.content === 'string') {
    const m = msg.content.match(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/);
    if (m) return m[0];
  }
  // Surface a preview in server logs (but don't send raw provider output back to clients)
  const preview = JSON.stringify(data).slice(0, 300);
  console.error('OpenRouter no-image response preview:', preview);
  throw new Error('No image in response — check OPENROUTER_IMAGE_MODEL is an image-capable model.');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const asin = body.asin ? String(body.asin).trim().toUpperCase() : '';
    const count = Math.min(5, Math.max(1, parseInt(body.count || '3', 10) || 3));
    if (!title && !asin) {
      return Response.json({ error: 'Need title or ASIN' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error:
            'Server missing OPENROUTER_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then Redeploy.',
          setup: true,
        },
        { status: 503 }
      );
    }

    // Use the GA model (not the -preview slug) — preview endpoints go offline
    // without notice and return "No endpoints found". The stable slug is always served.
    const model =
      process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
    const label = title || `Amazon product ${asin}`;
    const images = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const url = await openRouterImage(PROMPTS[i % PROMPTS.length](label), apiKey, model);
        images.push({ index: i + 1, url });
      } catch (err) {
        errors.push({ index: i + 1, message: err.message || String(err) });
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
        'From our orders. Message with questions. Local pickup / shipping as agreed.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
