'use client';
// description: Ad creation wizard — scrape a product URL, generate AI ad copy, build static creatives, and launch campaigns.

import { useState } from 'react';
import Link from 'next/link';
import WizardStepper from '../../components/WizardStepper';
import ProductScrapeStep from '../../components/ProductScrapeStep';
import AdCopyStep from '../../components/AdCopyStep';
import CreativeStep from '../../components/CreativeStep';
import VideoAdStep from '../../components/VideoAdStep';
import { AdCopy, Campaign, ProductData, StaticCreative } from '../../types';
import {
  generateCampaignId,
  saveCampaign,
  seedDemoCampaigns,
} from '../../lib/campaign-store';

type Step = 1 | 2 | 3 | 4;

export default function CreateAdPage() {
  const [step, setStep] = useState<Step>(1);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null);
  const [creative, setCreative] = useState<StaticCreative | null>(null);
  const [saved, setSaved] = useState(false);

  function handleProductComplete(p: ProductData) {
    setProduct(p);
    setStep(2);
  }

  function handleAdCopyComplete(copy: AdCopy) {
    setAdCopy(copy);
    setStep(3);
  }

  function handleCreativeComplete(c: StaticCreative) {
    setCreative(c);
    setStep(4);
  }

  function handleSaveCampaign() {
    if (!product) return;

    seedDemoCampaigns(); // ensure demo data exists for new users

    const campaign: Campaign = {
      id: generateCampaignId(),
      name: `${product.title} — ${new Date().toLocaleDateString()}`,
      productData: product,
      adCopy: adCopy || undefined,
      creatives: creative ? [creative] : [],
      platform: 'meta',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCampaign(campaign);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Campaign Saved!
        </h1>
        <p className="text-gray-500 mb-8">
          Your ad assets have been saved to the campaign manager. Ready to launch!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/campaigns"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            View Campaigns →
          </Link>
          <button
            onClick={() => {
              setStep(1);
              setProduct(null);
              setAdCopy(null);
              setCreative(null);
              setSaved(false);
            }}
            className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors"
          >
            Create Another Ad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <WizardStepper currentStep={step} />

      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
        {step === 1 && (
          <ProductScrapeStep onComplete={handleProductComplete} />
        )}

        {step === 2 && product && (
          <AdCopyStep
            product={product}
            onComplete={handleAdCopyComplete}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && product && adCopy && (
          <CreativeStep
            product={product}
            adCopy={adCopy}
            onComplete={handleCreativeComplete}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && product && adCopy && creative && (
          <VideoAdStep
            creative={creative}
            productTitle={product.title}
            script={adCopy.script}
            onBack={() => setStep(3)}
            onSaveCampaign={handleSaveCampaign}
          />
        )}
      </div>
    </div>
  );
}
