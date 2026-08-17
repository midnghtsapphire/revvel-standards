import { NextRequest, NextResponse } from 'next/server';
import { generateAdCopy } from '../../../lib/openrouter';
import { GenerateAdResponse, ProductData } from '../../../types';

export async function POST(req: NextRequest): Promise<NextResponse<GenerateAdResponse>> {
  let product: ProductData;

  try {
    const body = await req.json();
    product = body?.product as ProductData;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required shape: product must be an object with a non-empty title string
  if (
    !product ||
    typeof product !== 'object' ||
    typeof product.title !== 'string' ||
    product.title.trim() === ''
  ) {
    return NextResponse.json(
      { success: false, error: 'product.title is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  try {
    const data = await generateAdCopy(product);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error('[/api/generate-ad]', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Ad generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
