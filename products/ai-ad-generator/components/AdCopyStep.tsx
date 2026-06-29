'use client';

import { useState } from 'react';
import { AdCopy, AdCopyVariant, GenerateAdResponse, ProductData } from '../types';

interface AdCopyStepProps {
  product: ProductData;
  onComplete: (adCopy: AdCopy) => void;
  onBack: () => void;
}

/**
 * Static Tailwind class maps for variant buttons.
 * Dynamic class interpolation (e.g. `bg-${color}-600`) is not supported by
 * Tailwind JIT — the full class strings must appear literally in source.
 */
const FRAMEWORK_BTN_ACTIVE: Record<string, string> = {
  AIDA: 'bg-blue-600 text-white',
  PAS: 'bg-purple-600 text-white',
  BAB: 'bg-green-600 text-white',
  Direct: 'bg-orange-600 text-white',
};
const FRAMEWORK_BTN_IDLE: Record<string, string> = {
  AIDA: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100',
  PAS: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100',
  BAB: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100',
  Direct: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100',
};

export default function AdCopyStep({ product, onComplete, onBack }: AdCopyStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);

  async function handleGenerate() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const data: GenerateAdResponse = await res.json();

      if (!data.success || !data.data) {
        setError(data.error || 'Generation failed. Try again.');
        return;
      }

      setAdCopy(data.data);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  const variant: AdCopyVariant | undefined = adCopy?.variants[selectedVariant];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">AI Ad Copy</h2>
          <p className="text-gray-500 text-sm">
            Generate high-converting copy for <span className="font-medium text-blue-600">{product.title}</span>
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1"
        >
          ← Back
        </button>
      </div>

      {!adCopy ? (
        <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div className="text-6xl mb-4">✍️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Ready to write your ads?
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Our AI will generate 3 ad copy variants using AIDA, PAS, and BAB frameworks,
            plus a UGC video script.
          </p>

          {error && (
            <div className="mb-4 mx-auto max-w-sm p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg text-red-700 dark:text-red-300 text-sm">
              ⚠ {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>✨ Generate Ad Copy</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary Headline */}
          <div className="p-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white">
            <p className="text-xs font-medium uppercase tracking-wide opacity-75 mb-1">Primary Headline</p>
            <p className="text-xl font-bold">{adCopy.primaryHeadline}</p>
          </div>

          {/* Variant selector */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              3 Ad Copy Variants
            </p>
            <div className="flex gap-2 mb-4">
              {adCopy.variants.map((v, i) => {
                const fw = v.framework || 'Direct';
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedVariant(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedVariant === i
                        ? (FRAMEWORK_BTN_ACTIVE[fw] || FRAMEWORK_BTN_ACTIVE.Direct)
                        : (FRAMEWORK_BTN_IDLE[fw] || FRAMEWORK_BTN_IDLE.Direct)
                    }`}
                  >
                    {v.framework}
                  </button>
                );
              })}
            </div>

            {variant && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4 bg-white dark:bg-gray-800">
                {variant.hook && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Hook (first 3 words)</p>
                    <p className="text-orange-600 dark:text-orange-400 font-semibold">"{variant.hook}"</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Headline</p>
                  <p className="text-gray-900 dark:text-white font-bold text-lg">{variant.headline}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Body Copy</p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{variant.body}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">CTA Button</p>
                  <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                    {variant.cta}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Video Script */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 bg-white dark:bg-gray-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              🎬 UGC Video Script (30 sec)
            </p>
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              {adCopy.script}
            </pre>
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-2">
            {adCopy.hashtags.map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold rounded-xl transition-colors"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={() => onComplete(adCopy)}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Create Static Creative →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
