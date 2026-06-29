import Link from 'next/link';

const FEATURES = [
  {
    icon: '🔗',
    title: 'Product URL Scraper',
    description:
      'Paste any product link — Shopify, WooCommerce, Amazon, or custom store. We extract title, images, price, description, and reviews automatically.',
  },
  {
    icon: '✍️',
    title: 'AI Ad Copy Generator',
    description:
      'Get 3 ad copy variants using AIDA, PAS, and BAB frameworks, plus a 30-second UGC video script — all from a single click.',
  },
  {
    icon: '🎨',
    title: 'Static Creative Builder',
    description:
      '5 high-converting ad templates. Pick your style, preview instantly, and download a production-ready PNG for Meta or TikTok.',
  },
  {
    icon: '🎬',
    title: 'UGC Video Ad Scaffold',
    description:
      'Ready-to-send scripts for HeyGen, D-ID, Synthesia, or Runway ML. Plug in your API key to render talking-avatar video ads.',
  },
  {
    icon: '📊',
    title: 'Campaign Manager',
    description:
      'Save, track and manage all your ad campaigns. Update status, monitor budget spend, and see ROAS at a glance.',
  },
  {
    icon: '📈',
    title: 'Analytics Dashboard',
    description:
      'CTR, ROAS, spend vs. revenue, and conversion charts across all campaigns — always up to date.',
  },
];

const STATS = [
  { label: 'Faster than manual', value: '97%' },
  { label: 'Higher CTR avg', value: '3×' },
  { label: 'Ad copy variants', value: '3' },
  { label: 'Templates', value: '5' },
];

export default function LandingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="text-center py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full mb-6">
          🚀 Zeely AI-inspired · open-source & self-hosted
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
          Turn Any Product URL Into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            High-Converting Ads
          </span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Scrape product data → AI generates copy → render static creatives → export
          video scripts. The complete ad automation pipeline in one tool.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/create"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900"
          >
            🎯 Create Your First Ad — Free
          </Link>
          <Link
            href="/campaigns"
            className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-lg border border-gray-200 dark:border-gray-700 transition-colors"
          >
            View Demo Campaign →
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-20">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">
              {stat.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '1', icon: '🔗', title: 'Paste URL', desc: 'Enter any product page link' },
            { step: '2', icon: '🤖', title: 'AI Generates', desc: 'Copy, script & 3 variants' },
            { step: '3', icon: '🖼', title: 'Render Creative', desc: 'Pick template, preview PNG' },
            { step: '4', icon: '🚀', title: 'Launch Campaign', desc: 'Save, track, optimize' },
          ].map((item) => (
            <div key={item.step} className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {item.step}
              </div>
              <div className="text-4xl mb-3 mt-1">{item.icon}</div>
              <p className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</p>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Everything You Need to Run Ads at Scale
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mb-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-10 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Scale Your Ads?</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
          No design skills, no copywriting skills needed. Add your product URL and let AI
          do the heavy lifting — just like Zeely AI, but open-source and self-hosted.
        </p>
        <Link
          href="/create"
          className="inline-block px-10 py-4 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl text-lg transition-colors shadow-lg"
        >
          Start Creating — It's Free →
        </Link>
      </section>
    </div>
  );
}
