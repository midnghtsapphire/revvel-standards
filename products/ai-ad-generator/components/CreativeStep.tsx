'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AdCopy, AdTemplateId, GenerateCreativeResponse, ProductData, StaticCreative } from '../types';
import { ALL_TEMPLATES } from '../lib/ad-templates';

interface CreativeStepProps {
  product: ProductData;
  adCopy: AdCopy;
  onComplete: (creative: StaticCreative) => void;
  onBack: () => void;
}

export default function CreativeStep({ product, adCopy, onComplete, onBack }: CreativeStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplateId>('bold');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creative, setCreative] = useState<StaticCreative | null>(null);

  const variant = adCopy.variants[selectedVariantIdx];

  async function handleGenerate() {
    setError('');
    setLoading(true);
    setCreative(null);

    try {
      const res = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          productTitle: product.title,
          headline: variant?.headline || adCopy.primaryHeadline,
          cta: variant?.cta || 'Shop Now',
          imageUrl: product.ogImage || product.images[0],
        }),
      });
      const data: GenerateCreativeResponse = await res.json();

      if (!data.success || !data.data) {
        setError(data.error || 'Render failed. Try again.');
        return;
      }

      setCreative(data.data);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!creative) return;
    const ext = creative.mimeType === 'image/svg+xml' ? 'svg' : 'png';
    const a = document.createElement('a');
    a.href = creative.imageData;
    a.download = `ad-creative-${creative.templateId}-${Date.now()}.${ext}`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Static Ad Creative</h2>
          <p className="text-gray-500 text-sm">Choose a template and generate your ad image</p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          {/* Template picker */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ad Template</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedTemplate === tpl.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div
                    className="w-full h-10 rounded-lg mb-2"
                    style={{ background: tpl.bgColor }}
                  />
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Copy variant picker */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ad Copy Variant</p>
            <div className="space-y-2">
              {adCopy.variants.map((v, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedVariantIdx === i
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    checked={selectedVariantIdx === i}
                    onChange={() => setSelectedVariantIdx(i)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.headline}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.framework} · CTA: {v.cta}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-xl text-red-700 dark:text-red-300 text-sm">
              ⚠ {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Rendering…' : '🎨 Render Creative'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview</p>

          {creative ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <Image
                  src={creative.imageData}
                  alt="Ad creative preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                {creative.width}×{creative.height}px · {creative.templateId}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  ⬇ Download {creative.mimeType === 'image/svg+xml' ? 'SVG' : 'PNG'}
                </button>
                <button
                  onClick={() => onComplete(creative)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Save to Campaign →
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-3">🖼</div>
                <p className="text-sm">Your creative will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
