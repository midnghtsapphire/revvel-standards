import { NextRequest, NextResponse } from 'next/server';
import { scrapeProduct } from '../../../lib/scraper';
import { ScrapeProductResponse } from '../../../types';

export async function POST(req: NextRequest): Promise<NextResponse<ScrapeProductResponse>> {
  let url: string;

  try {
    const body = await req.json();
    url = body?.url as string;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ success: false, error: 'url is required' }, { status: 400 });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const data = await scrapeProduct(url);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scrape failed';
    console.error('[/api/scrape-product]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
