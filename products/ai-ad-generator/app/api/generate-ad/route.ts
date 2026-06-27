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

  if (!product?.title) {
    return NextResponse.json(
      { success: false, error: 'product object with at least a title is required' },
      { status: 400 }
    );
  }

  try {
    const data = await generateAdCopy(product);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    console.error('[/api/generate-ad]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
