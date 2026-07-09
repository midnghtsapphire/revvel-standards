/**
 * One-product pipeline: parse identity → product ref image → 3–5 lifestyle shots → local pack.
 *
 * Progress is recorded on a job object the UI can poll.
 * Image generation uses OpenRouter when OPENROUTER_API_KEY is set.
 * Without a key, the pack still gets listing.txt + product reference (if fetchable).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { attachProductLink, productUrlFromAsin } = require('./amazon-parser');
const { enrichProduct, buildListingPack } = require('./product-link');
const { calculateListingPrice } = require('./price-calculator');
const packStore = require('./pack-store');

const fetchFn =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : (...args) => require('node-fetch')(...args);

/** @type {Map<string, object>} */
const jobs = new Map();

function newJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getJob(id) {
  return jobs.get(id) || null;
}

function setStep(job, id, status, detail = '') {
  const step = job.steps.find((s) => s.id === id);
  if (step) {
    step.status = status; // pending | running | done | error | skipped
    step.detail = detail;
    step.updatedAt = new Date().toISOString();
  }
  job.updatedAt = new Date().toISOString();
}

function createJob(product, opts = {}) {
  const count = Math.min(5, Math.max(3, parseInt(opts.count || '3', 10) || 3));
  const job = {
    id: newJobId(),
    status: 'queued', // queued | running | done | error
    product: attachProductLink({ ...product }),
    count,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    packDir: null,
    images: [],
    error: null,
    hasOpenRouter: Boolean(process.env.OPENROUTER_API_KEY),
    steps: [
      { id: 'parse', label: 'Parse product from order', status: 'pending', detail: '' },
      { id: 'link', label: 'Build Amazon product link (ASIN)', status: 'pending', detail: '' },
      { id: 'ref', label: 'Fetch product reference image', status: 'pending', detail: '' },
      { id: 'lifestyle', label: `Generate ${count} lifestyle / in-use images`, status: 'pending', detail: '' },
      { id: 'save', label: 'Save pack to your Documents folder', status: 'pending', detail: '' },
    ],
  };
  jobs.set(job.id, job);
  return job;
}

const LIFESTYLE_PROMPTS = [
  (title) =>
    `Amateur smartphone photo of this product in real home use: ${title}. Lived-in kitchen or living space, natural light, slight phone grain, show the product being used for its purpose, not a white-background stock catalog shot. No readable faces.`,
  (title) =>
    `Casual close-up phone photo showing a key feature of: ${title}. Hands only (no face) demonstrating how it works in a real house. Realistic lighting, not studio stock photography.`,
  (title) =>
    `Realistic amateur photo of: ${title} in another everyday room (laundry, bathroom, hallway, or desk) with ordinary clutter, product clearly visible and in use. Phone-camera quality, not polished stock.`,
  (title) =>
    `Wide casual phone photo of: ${title} stored or used in a narrow real-home space, demonstrating why someone bought it. Natural window light, authentic home, not e-commerce studio.`,
  (title) =>
    `Detail shot of: ${title} highlighting materials/features (wheels, buttons, texture, fit) as a normal person would photograph for a resale listing. Amateur, honest, not stock.`,
];

async function downloadToFile(url, destPath) {
  const res = await fetchFn(url, {
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'image/*,*/*',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading image`);
  const buf = Buffer.from(await res.arrayBuffer());
  packStore.writeBinary(destPath, buf);
  return destPath;
}

/**
 * Call OpenRouter for an image. Supports a few response shapes used by image models.
 */
async function openRouterImage(prompt, { refPath = null, model = null } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');

  const modelId =
    model ||
    process.env.OPENROUTER_IMAGE_MODEL ||
    'google/gemini-2.5-flash-image-preview';

  const content = [{ type: 'text', text: prompt }];
  if (refPath && fs.existsSync(refPath)) {
    const b64 = fs.readFileSync(refPath).toString('base64');
    const ext = path.extname(refPath).toLowerCase().replace('.', '') || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${b64}` },
    });
  }

  const res = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'vine-marketplace-lifestyle-packs',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.message || JSON.stringify(data).slice(0, 200);
    throw new Error(`OpenRouter ${res.status}: ${msg}`);
  }

  // Try message images array (some models)
  const msg = data.choices?.[0]?.message;
  if (msg?.images?.[0]?.image_url?.url) {
    return bufferFromDataUrl(msg.images[0].image_url.url);
  }
  // content parts
  const parts = Array.isArray(msg?.content) ? msg.content : null;
  if (parts) {
    for (const p of parts) {
      if (p.type === 'image_url' && p.image_url?.url) return bufferFromDataUrl(p.image_url.url);
      if (p.inline_data?.data) {
        return Buffer.from(p.inline_data.data, 'base64');
      }
    }
  }
  // string content with data URL
  if (typeof msg?.content === 'string') {
    const m = msg.content.match(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/);
    if (m) return bufferFromDataUrl(m[0]);
    // markdown image with http
    const http = msg.content.match(/https?:\/\/\S+\.(?:jpg|jpeg|png|webp)/i);
    if (http) {
      const r2 = await fetchFn(http[0]);
      if (r2.ok) return Buffer.from(await r2.arrayBuffer());
    }
  }

  throw new Error('OpenRouter returned no image bytes (check OPENROUTER_IMAGE_MODEL supports images)');
}

function bufferFromDataUrl(url) {
  if (url.startsWith('data:')) {
    const b64 = url.split(',')[1];
    return Buffer.from(b64, 'base64');
  }
  throw new Error('Expected data URL for image');
}

/**
 * Run full pipeline for one product. Updates job in place.
 */
async function runPipeline(job) {
  job.status = 'running';
  const product = attachProductLink({ ...job.product });
  const dir = packStore.packDir(product);
  job.packDir = dir;

  try {
    // 1 parse
    setStep(job, 'parse', 'running', 'Reading title, ASIN, price…');
    if (!product.productTitle && !product.asin) {
      throw new Error('Product missing title and ASIN');
    }
    setStep(
      job,
      'parse',
      'done',
      `${(product.productTitle || '').slice(0, 80)} · ASIN ${product.asin || 'none'}`
    );

    // 2 link
    setStep(job, 'link', 'running');
    product.productUrl = product.productUrl || productUrlFromAsin(product.asin);
    if (!product.productUrl) {
      setStep(job, 'link', 'error', 'No ASIN — cannot build product URL');
    } else {
      setStep(job, 'link', 'done', product.productUrl);
    }

    // 3 reference image
    setStep(job, 'ref', 'running', 'Enriching from product page…');
    let refPath = path.join(dir, '00-product-reference.jpg');
    try {
      const enriched = await enrichProduct(product, { fetchImages: true });
      Object.assign(product, enriched.product);
      const urls = enriched.imageUrls || [];
      if (urls[0]) {
        await downloadToFile(urls[0], refPath);
        setStep(job, 'ref', 'done', `Saved reference · ${urls.length} candidate URL(s)`);
      } else {
        refPath = null;
        setStep(job, 'ref', 'skipped', enriched.fetchError || 'No product image URL (Amazon may block bots)');
      }
    } catch (err) {
      refPath = null;
      setStep(job, 'ref', 'skipped', err.message);
    }

    // 4 lifestyle
    setStep(job, 'lifestyle', 'running', 'Starting…');
    const images = [];
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      setStep(
        job,
        'lifestyle',
        'error',
        'Set OPENROUTER_API_KEY in .env to generate lifestyle images. Pack will still save listing + reference.'
      );
    } else {
      for (let i = 0; i < job.count; i++) {
        const n = i + 1;
        setStep(job, 'lifestyle', 'running', `Generating lifestyle image ${n} of ${job.count}…`);
        const prompt = LIFESTYLE_PROMPTS[i % LIFESTYLE_PROMPTS.length](product.productTitle || product.asin);
        try {
          const buf = await openRouterImage(prompt, { refPath });
          const name = `${String(n).padStart(2, '0')}-lifestyle.jpg`;
          const full = path.join(dir, name);
          packStore.writeBinary(full, buf);
          images.push({ name, path: full, kind: 'lifestyle' });
        } catch (err) {
          setStep(job, 'lifestyle', 'error', `Image ${n} failed: ${err.message}`);
          // continue others
        }
      }
      if (images.length) {
        setStep(job, 'lifestyle', 'done', `${images.length} lifestyle file(s) written`);
      } else if (job.steps.find((s) => s.id === 'lifestyle').status !== 'error') {
        setStep(job, 'lifestyle', 'error', 'No lifestyle images produced');
      }
    }
    job.images = images;

    // 5 save pack metadata
    setStep(job, 'save', 'running');
    const pricing = calculateListingPrice(product);
    const listing = buildListingPack(product, pricing);
    packStore.writeText(path.join(dir, 'listing.txt'), [
      listing.title,
      '',
      `Asking: $${listing.suggestedPrice ?? '?'}`,
      '',
      listing.description,
      '',
      'Images in this folder:',
      ...images.map((im) => ` - ${im.name}`),
      refPath && fs.existsSync(refPath) ? ' - 00-product-reference.jpg' : null,
      '',
      `Product URL: ${product.productUrl || ''}`,
      `Pack folder: ${dir}`,
    ].filter(Boolean).join('\n'));

    packStore.writeJson(path.join(dir, 'meta.json'), {
      product,
      pricing,
      listing,
      images: images.map((im) => im.name),
      packDir: dir,
      generatedAt: new Date().toISOString(),
      jobId: job.id,
    });

    job.product = product;
    setStep(job, 'save', 'done', dir);
    job.status = images.length || fs.existsSync(path.join(dir, 'listing.txt')) ? 'done' : 'error';
    if (job.status === 'error' && !job.error) job.error = 'Pack incomplete';
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
    const running = job.steps.find((s) => s.status === 'running');
    if (running) setStep(job, running.id, 'error', err.message);
  }

  job.updatedAt = new Date().toISOString();
  return job;
}

function startPipeline(product, opts = {}) {
  const job = createJob(product, opts);
  // fire and forget
  setImmediate(() => {
    runPipeline(job).catch((err) => {
      job.status = 'error';
      job.error = err.message;
    });
  });
  return job;
}

module.exports = {
  startPipeline,
  runPipeline,
  getJob,
  createJob,
  jobs,
};
