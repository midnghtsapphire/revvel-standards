import { NextRequest, NextResponse } from 'next/server';
import { scrapeProduct, ScraperClientError } from '../../../lib/scraper';
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

  // Validate URL format
  try {
    const parsed = new URL(url);
    // Only allow http/https — no file://, data://, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ success: false, error: 'Only http/https URLs are supported' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const data = await scrapeProduct(url);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    // Log internal detail server-side; return a generic client-safe message
    const detail = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/scrape-product]', detail);
    // Use typed ScraperClientError to distinguish 4xx (bad URL) from 5xx (infra)
    const isClientError = err instanceof ScraperClientError;
    return NextResponse.json(
      { success: false, error: isClientError ? detail : 'Scrape failed. Check the URL and try again.' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
