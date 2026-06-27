import { NextRequest, NextResponse } from 'next/server';
import { renderAdCreative, AD_TEMPLATES } from '../../../lib/ad-templates';
import { GenerateCreativeResponse, AdTemplateId } from '../../../types';

export async function POST(req: NextRequest): Promise<NextResponse<GenerateCreativeResponse>> {
  let body: {
    templateId?: AdTemplateId;
    productTitle?: string;
    headline?: string;
    cta?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { templateId = 'bold', productTitle, headline, cta, imageUrl, width, height } = body;

  if (!productTitle || !headline || !cta) {
    return NextResponse.json(
      { success: false, error: 'productTitle, headline and cta are required' },
      { status: 400 }
    );
  }

  if (!AD_TEMPLATES[templateId]) {
    return NextResponse.json(
      { success: false, error: `Unknown templateId: ${templateId}` },
      { status: 400 }
    );
  }

  try {
    const { base64Png, width: w, height: h } = await renderAdCreative({
      templateId,
      productTitle,
      headline,
      cta,
      imageUrl,
      width,
      height,
    });

    const creative = {
      templateId,
      productTitle,
      headline,
      cta,
      imageUrl,
      base64Png,
      width: w,
      height: h,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: creative });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Creative render failed';
    console.error('[/api/generate-creative]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
