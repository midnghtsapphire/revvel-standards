/**
 * Static ad template definitions and server-side canvas renderer.
 *
 * 5 templates: Bold, Minimal, UGC, Sale, Story.
 * Server rendering uses @napi-rs/canvas (native Node.js bindings — no DOM needed).
 *
 * Note: @napi-rs/canvas requires the native binary for your platform.
 * Run `npm install` in this product directory to pull the correct prebuilt binary.
 */

import { AdTemplateConfig, AdTemplateId, StaticCreative } from '../types';

export const AD_TEMPLATES: Record<AdTemplateId, AdTemplateConfig> = {
  bold: {
    id: 'bold',
    name: 'Bold Impact',
    description: 'High-contrast black/yellow — maximum attention',
    bgColor: '#1a1a1a',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    layout: 'image-top',
  },
  minimal: {
    id: 'minimal',
    name: 'Clean Minimal',
    description: 'White background, elegant typography',
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#2563eb',
    layout: 'split',
  },
  ugc: {
    id: 'ugc',
    name: 'UGC Style',
    description: 'Organic-looking, user-generated content feel',
    bgColor: '#faf7f2',
    textColor: '#1f2937',
    accentColor: '#dc2626',
    layout: 'image-bg',
  },
  sale: {
    id: 'sale',
    name: 'Flash Sale',
    description: 'Urgency-driven red design — drives conversions',
    bgColor: '#dc2626',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    layout: 'image-left',
  },
  story: {
    id: 'story',
    name: 'Story Format',
    description: 'Vertical 9:16 format optimised for Stories/Reels',
    bgColor: '#0f172a',
    textColor: '#f8fafc',
    accentColor: '#818cf8',
    layout: 'image-bg',
  },
};

export const ALL_TEMPLATES = Object.values(AD_TEMPLATES);

interface RenderOptions {
  templateId: AdTemplateId;
  productTitle: string;
  headline: string;
  cta: string;
  imageUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Server-side ad creative renderer.
 * Returns a base64-encoded PNG data URI.
 * Falls back to a CSS-gradient placeholder if @napi-rs/canvas is unavailable.
 */
export async function renderAdCreative(
  opts: RenderOptions
): Promise<{ base64Png: string; width: number; height: number }> {
  const {
    templateId,
    productTitle,
    headline,
    cta,
    width = 1080,
    height = templateId === 'story' ? 1920 : 1080,
  } = opts;

  const template = AD_TEMPLATES[templateId];

  try {
    // Dynamic import — prevents build failure if native binary is missing
    const { createCanvas, loadImage } = await import('@napi-rs/canvas');

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d') as unknown as Ctx;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = template.bgColor;
    ctx.fillRect(0, 0, width, height);

    // ── Gradient overlay ────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, height * 0.5, 0, height);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // ── Product image (if provided) ─────────────────────────────────────────
    if (opts.imageUrl) {
      try {
        const img = await loadImage(opts.imageUrl);
        if (template.layout === 'image-top') {
          // Top 55% of canvas
          ctx.drawImage(img, 0, 0, width, height * 0.55);
        } else if (template.layout === 'image-left') {
          // Left half
          ctx.drawImage(img, 0, 0, width * 0.5, height);
        } else {
          // Full background with overlay already applied
          ctx.drawImage(img, 0, 0, width, height);
          // Re-apply gradient so text is readable
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }
      } catch {
        // Image load failed — continue without it
      }
    }

    const padding = width * 0.06;
    const textAreaY =
      template.layout === 'image-top' ? height * 0.58 : height * 0.55;

    // ── Accent bar ──────────────────────────────────────────────────────────
    ctx.fillStyle = template.accentColor;
    ctx.fillRect(padding, textAreaY - 12, 6, Math.min(height * 0.3, 140));

    // ── Headline ────────────────────────────────────────────────────────────
    const headlineFontSize = Math.round(width * 0.045);
    ctx.font = `bold ${headlineFontSize}px sans-serif`;
    ctx.fillStyle = template.textColor;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;

    // Word-wrap headline
    const maxWidth = width - padding * 2 - 20;
    wrapText(ctx, headline, padding + 20, textAreaY + headlineFontSize, maxWidth, headlineFontSize * 1.3);

    // ── Product sub-label ───────────────────────────────────────────────────
    const subFontSize = Math.round(width * 0.025);
    ctx.font = `${subFontSize}px sans-serif`;
    ctx.fillStyle = template.accentColor;
    ctx.shadowBlur = 0;
    ctx.fillText(
      truncate(productTitle, 40),
      padding + 20,
      textAreaY - 24
    );

    // ── CTA button ──────────────────────────────────────────────────────────
    const btnY = height * 0.82;
    const btnH = Math.round(height * 0.07);
    const btnW = Math.round(width * 0.42);
    const btnX = padding + 20;
    const radius = btnH / 2;

    ctx.fillStyle = template.accentColor;
    roundRect(ctx, btnX, btnY, btnW, btnH, radius);
    ctx.fill();

    const ctaFontSize = Math.round(width * 0.03);
    ctx.font = `bold ${ctaFontSize}px sans-serif`;
    ctx.fillStyle = template.bgColor;
    ctx.textAlign = 'center';
    ctx.fillText(cta, btnX + btnW / 2, btnY + btnH * 0.65);
    ctx.textAlign = 'left';

    // ── Brand footer ────────────────────────────────────────────────────────
    ctx.font = `${Math.round(width * 0.018)}px sans-serif`;
    ctx.fillStyle = template.textColor;
    ctx.globalAlpha = 0.5;
    ctx.fillText('Powered by AI Ad Generator', padding + 20, height - padding);
    ctx.globalAlpha = 1;

    const buffer = canvas.toBuffer('image/png');
    const base64Png = `data:image/png;base64,${buffer.toString('base64')}`;
    return { base64Png, width, height };
  } catch (err: unknown) {
    // Canvas unavailable — return an SVG placeholder as base64
    console.warn('[ad-templates] canvas render failed, using SVG placeholder:', err);
    return svgPlaceholder(template, headline, cta, width, height);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Use a loose type compatible with both @napi-rs/canvas's SKRSContext2D and
// the browser CanvasRenderingContext2D (they share the same drawing API).
type Ctx = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: CanvasTextAlign;
  globalAlpha: number;
  shadowColor: string;
  shadowBlur: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  closePath(): void;
  fill(): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawImage(image: any, ...args: number[]): void;
};

function wrapText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 3) + '...';
}

function svgPlaceholder(
  template: AdTemplateConfig,
  headline: string,
  cta: string,
  width: number,
  height: number
): { base64Png: string; width: number; height: number } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${template.bgColor}"/>
    <text x="50%" y="42%" text-anchor="middle" font-size="48" font-weight="bold"
      fill="${template.textColor}" font-family="sans-serif">${truncate(headline, 50)}</text>
    <rect x="${width * 0.25}" y="${height * 0.55}" width="${width * 0.5}" height="70" rx="35"
      fill="${template.accentColor}"/>
    <text x="50%" y="${height * 0.55 + 45}" text-anchor="middle" font-size="32"
      fill="${template.bgColor}" font-family="sans-serif">${cta}</text>
  </svg>`;

  const base64Png = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return { base64Png, width, height };
}
