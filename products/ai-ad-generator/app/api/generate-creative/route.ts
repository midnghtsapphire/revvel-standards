import { NextRequest, NextResponse } from 'next/server';
import { renderAdCreative, AD_TEMPLATES } from '../../../lib/ad-templates';
import { GenerateCreativeResponse, AdTemplateId } from '../../../types';

const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 200;

export async function POST(req: NextRequest): Promise<NextResponse<GenerateCreativeResponse>> {
  let body: {
    templateId?: unknown;
    productTitle?: unknown;
    headline?: unknown;
    cta?: unknown;
    imageUrl?: unknown;
    width?: unknown;
    height?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { templateId = 'bold', productTitle, headline, cta, imageUrl, width, height } = body;

  // Type-validate required string fields
  if (!productTitle || typeof productTitle !== 'string' || productTitle.trim() === '') {
    return NextResponse.json({ success: false, error: 'productTitle is required and must be a non-empty string' }, { status: 400 });
  }
  if (!headline || typeof headline !== 'string' || headline.trim() === '') {
    return NextResponse.json({ success: false, error: 'headline is required and must be a non-empty string' }, { status: 400 });
  }
  if (!cta || typeof cta !== 'string' || cta.trim() === '') {
    return NextResponse.json({ success: false, error: 'cta is required and must be a non-empty string' }, { status: 400 });
  }

  if (typeof templateId !== 'string' || !AD_TEMPLATES[templateId as AdTemplateId]) {
    return NextResponse.json(
      { success: false, error: `Unknown templateId: ${templateId}` },
      { status: 400 }
    );
  }

  // Clamp width/height to safe bounds
  const clamp = (v: unknown, def: number) => {
    const n = typeof v === 'number' ? v : def;
    return Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, Math.round(n)));
  };
  const safeWidth = width !== undefined ? clamp(width, 1080) : undefined;
  const safeHeight = height !== undefined ? clamp(height, 1080) : undefined;

  // Validate imageUrl if provided
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'imageUrl must be a string' }, { status: 400 });
    }
    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ success: false, error: 'imageUrl must be an http/https URL' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ success: false, error: 'imageUrl must be a valid URL' }, { status: 400 });
    }
  }

  try {
    const { imageData, mimeType, width: w, height: h } = await renderAdCreative({
      templateId: templateId as AdTemplateId,
      productTitle: productTitle.trim(),
      headline: headline.trim(),
      cta: cta.trim(),
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
      width: safeWidth,
      height: safeHeight,
    });

    const creative = {
      templateId: templateId as AdTemplateId,
      productTitle: productTitle.trim(),
      headline: headline.trim(),
      cta: cta.trim(),
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
      imageData,
      mimeType,
      width: w,
      height: h,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: creative });
  } catch (err: unknown) {
    console.error('[/api/generate-creative]', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Creative render failed. Please try again.' }, { status: 500 });
  }
}
