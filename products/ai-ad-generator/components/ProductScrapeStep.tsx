'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductData, ScrapeProductResponse } from '../types';

interface ProductScrapeStepProps {
  onComplete: (product: ProductData) => void;
}

export default function ProductScrapeStep({ onComplete }: ProductScrapeStepProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<ProductData | null>(null);

  async function handleScrape() {
    setError('');
    setProduct(null);
    setLoading(true);

    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data: ScrapeProductResponse = await res.json();

      if (!data.success || !data.data) {
        setError(data.error || 'Scrape failed. Check the URL and try again.');
        return;
      }

      setProduct(data.data);
    } catch {
      setError('Network error — make sure the dev server is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Enter Your Product URL
        </h2>
        <p className="text-gray-500 text-sm">
          Paste any product page link — Shopify, WooCommerce, Amazon, or custom store.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && url && !loading) handleScrape(); }}
          placeholder="https://yourstore.com/products/awesome-product"
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <button
          onClick={handleScrape}
          disabled={!url || loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scraping…
            </span>
          ) : (
            'Scrape Product →'
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {product && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Extracted Product Data</h3>
            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full font-medium">
              ✓ Scraped successfully
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Images */}
            {product.images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {product.images.slice(0, 3).map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={img}
                      alt={`Product image ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Title</p>
                <p className="text-gray-900 dark:text-white font-semibold">{product.title}</p>
              </div>
              {product.price && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Price</p>
                  <p className="text-gray-900 dark:text-white">
                    {product.price} {product.currency}
                  </p>
                </div>
              )}
              {product.brand && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Brand</p>
                  <p className="text-gray-900 dark:text-white">{product.brand}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Description</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">{product.description}</p>
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={() => onComplete(product)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Use This Product → Generate Ad Copy
            </button>
          </div>
        </div>
      )}

      {/* Manual entry fallback */}
      <details className="text-sm text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          Don't have a URL? Enter product details manually
        </summary>
        <ManualEntryForm onComplete={onComplete} />
      </details>
    </div>
  );
}

function ManualEntryForm({ onComplete }: { onComplete: (p: ProductData) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  function handleSubmit() {
    if (!title) return;
    onComplete({
      url: '',
      title,
      description,
      price: price || undefined,
      images: [],
      scrapedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <input
        placeholder="Product name *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      <textarea
        placeholder="Product description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
      />
      <input
        placeholder="Price (e.g. $29.99)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      <button
        onClick={handleSubmit}
        disabled={!title}
        className="w-full py-2 bg-gray-700 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        Continue with Manual Entry
      </button>
    </div>
  );
}
