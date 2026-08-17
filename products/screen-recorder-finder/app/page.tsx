'use client';

import { useState, useMemo } from 'react';

interface ScreenRecorder {
  name: string;
  pricing: string;
  pricePerMonth?: number;
  category: string;
  bestFor: string[];
  pros: string[];
  cons: string[];
  features: {
    editing: 'none' | 'basic' | 'advanced' | 'professional';
    webcam: boolean;
    systemAudio: boolean;
    cloudStorage: boolean;
    aiFeatures: boolean;
    multiClip: boolean;
  };
  url: string;
}

const recorders: ScreenRecorder[] = [
  {
    name: 'Tella',
    pricing: '$13-$26/mo',
    pricePerMonth: 19.5,
    category: 'Content Creators',
    bestFor: ['Content creators', 'Marketers', 'Course creators'],
    pros: [
      'Easy layout switching',
      'Beautiful backgrounds',
      'AI silence removal',
      'Auto captions',
      'Browser or app recording'
    ],
    cons: [
      'Subscription required',
      'Not for advanced editing'
    ],
    features: {
      editing: 'advanced',
      webcam: true,
      systemAudio: true,
      cloudStorage: true,
      aiFeatures: true,
      multiClip: true
    },
    url: '#'
  },
  {
    name: 'Screen Studio',
    pricing: '$9-$29/mo',
    pricePerMonth: 19,
    category: 'Product Demos',
    bestFor: ['Product demos', 'Marketing videos', 'Polished presentations'],
    pros: [
      'Automatic cursor zoom',
      'Cinematic effects',
      'Professional look',
      'Easy to use',
      'Mac-native app'
    ],
    cons: [
      'Mac only',
      'Cannot combine clips',
      'Single-take recording'
    ],
    features: {
      editing: 'basic',
      webcam: true,
      systemAudio: true,
      cloudStorage: false,
      aiFeatures: true,
      multiClip: false
    },
    url: '#'
  },
  {
    name: 'Loom',
    pricing: 'Free / $15/mo',
    pricePerMonth: 7.5,
    category: 'Team Communication',
    bestFor: ['Team communication', 'Quick updates', 'Async collaboration'],
    pros: [
      'Record in 2 clicks',
      'Instant sharing',
      'Time-stamped comments',
      'Emoji reactions',
      'Free tier available'
    ],
    cons: [
      'Minimal editing',
      'Basic features',
      'Not for professional content'
    ],
    features: {
      editing: 'basic',
      webcam: true,
      systemAudio: true,
      cloudStorage: true,
      aiFeatures: true,
      multiClip: false
    },
    url: '#'
  },
  {
    name: 'CleanShot X',
    pricing: '$29 lifetime / $8/mo',
    pricePerMonth: 8,
    category: 'Screenshots',
    bestFor: ['Screenshots', 'Quick captures', 'Productivity'],
    pros: [
      'Best screenshot tool',
      'Markup features',
      'GIF recording',
      'One-time payment option',
      'Lightweight'
    ],
    cons: [
      'Limited video editing',
      'Basic recorder',
      'Not for long recordings'
    ],
    features: {
      editing: 'basic',
      webcam: false,
      systemAudio: false,
      cloudStorage: true,
      aiFeatures: false,
      multiClip: false
    },
    url: '#'
  },
  {
    name: 'Camtasia',
    pricing: '~$40-$600/yr',
    pricePerMonth: 50,
    category: 'Professional',
    bestFor: ['E-learning', 'Training videos', 'Interactive content'],
    pros: [
      'Multi-track editing',
      'Interactive hotspots',
      'Quizzes',
      'Professional features',
      'Extensive effects'
    ],
    cons: [
      'Steep learning curve',
      'Expensive',
      'Overkill for simple tasks',
      'Heavy software'
    ],
    features: {
      editing: 'professional',
      webcam: true,
      systemAudio: true,
      cloudStorage: false,
      aiFeatures: false,
      multiClip: true
    },
    url: '#'
  },
  {
    name: 'ScreenFlow',
    pricing: '$169-$259',
    pricePerMonth: 22,
    category: 'Professional',
    bestFor: ['Long recordings', 'Professional editing', 'Podcasters'],
    pros: [
      'Handles hour-long recordings',
      'Multi-track editing',
      'Professional quality',
      'One-time payment',
      'Reliable'
    ],
    cons: [
      'Mac only',
      'Steep learning curve',
      'Expensive',
      'Old UI'
    ],
    features: {
      editing: 'professional',
      webcam: true,
      systemAudio: true,
      cloudStorage: false,
      aiFeatures: false,
      multiClip: true
    },
    url: '#'
  },
  {
    name: 'OBS',
    pricing: 'Free',
    pricePerMonth: 0,
    category: 'Streaming',
    bestFor: ['Live streaming', 'Advanced users', 'Custom setups'],
    pros: [
      'Completely free',
      'Infinite customization',
      'Virtual green screens',
      'Custom layouts',
      'Industry standard'
    ],
    cons: [
      'Intimidating for beginners',
      'No built-in editor',
      'Steep learning curve',
      'Requires technical knowledge'
    ],
    features: {
      editing: 'none',
      webcam: true,
      systemAudio: true,
      cloudStorage: false,
      aiFeatures: false,
      multiClip: true
    },
    url: '#'
  },
  {
    name: 'Supercut',
    pricing: '$15/mo',
    pricePerMonth: 15,
    category: 'Premium',
    bestFor: ['External videos', '4K recording', 'Professional quality'],
    pros: [
      'Lag-free 4K',
      'Layout editing',
      'AI features',
      'Native Mac app',
      'Professional output'
    ],
    cons: [
      'Subscription only',
      'Newer product',
      'Limited ecosystem'
    ],
    features: {
      editing: 'advanced',
      webcam: true,
      systemAudio: true,
      cloudStorage: true,
      aiFeatures: true,
      multiClip: true
    },
    url: '#'
  },
  {
    name: 'QuickTime Player',
    pricing: 'Free',
    pricePerMonth: 0,
    category: 'Basic',
    bestFor: ['Simple captures', 'Beginners', 'Basic needs'],
    pros: [
      'Built into Mac',
      'Completely free',
      'Simple to use',
      'Reliable',
      'No installation'
    ],
    cons: [
      'No simultaneous webcam/screen',
      'No system audio',
      'No sharing links',
      'Very basic features'
    ],
    features: {
      editing: 'none',
      webcam: false,
      systemAudio: false,
      cloudStorage: false,
      aiFeatures: false,
      multiClip: false
    },
    url: '#'
  },
  {
    name: 'Movavi',
    pricing: '~$30/mo or ~$230/yr',
    pricePerMonth: 30,
    category: 'Beginner Friendly',
    bestFor: ['Beginners', 'Scheduled recordings', 'Simple editing'],
    pros: [
      'Beginner-friendly',
      'Scheduled recordings',
      'AI noise removal',
      'Multiple formats',
      'Good for basics'
    ],
    cons: [
      'Aggressive upsells',
      'Interrupting pop-ups',
      'Poor trial experience',
      'Not professional grade'
    ],
    features: {
      editing: 'basic',
      webcam: true,
      systemAudio: true,
      cloudStorage: false,
      aiFeatures: true,
      multiClip: true
    },
    url: '#'
  }
];

const categories = ['All', 'Content Creators', 'Product Demos', 'Team Communication', 'Screenshots', 'Professional', 'Streaming', 'Premium', 'Basic', 'Beginner Friendly'];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxBudget, setMaxBudget] = useState(1000);
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price' | 'name'>('price');

  const filteredRecorders = useMemo(() => {
    let filtered = recorders.filter(recorder => {
      const matchesCategory = selectedCategory === 'All' || recorder.category === selectedCategory;
      const matchesBudget = (recorder.pricePerMonth || 0) <= maxBudget;
      const matchesFeatures = requiredFeatures.every(feature => {
        if (feature === 'editing') return recorder.features.editing !== 'none';
        return recorder.features[feature as keyof typeof recorder.features];
      });
      return matchesCategory && matchesBudget && matchesFeatures;
    });

    if (sortBy === 'price') {
      filtered.sort((a, b) => (a.pricePerMonth || 0) - (b.pricePerMonth || 0));
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [selectedCategory, maxBudget, requiredFeatures, sortBy]);

  const toggleFeature = (feature: string) => {
    setRequiredFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900 rounded-full text-green-800 dark:text-green-200 font-semibold text-sm mb-4">
            Mac Screen Recording
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Find Your Perfect Screen Recorder
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Compare the best Mac screen recording software. Whether you need quick team updates,
            polished product demos, or professional tutorials, find the perfect tool for your needs.
          </p>
        </header>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Use Case
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Budget: ${maxBudget}/mo
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'name')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="price">Price (Low to High)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Required Features:
            </label>
            <div className="flex flex-wrap gap-2">
              {['editing', 'webcam', 'systemAudio', 'cloudStorage', 'aiFeatures', 'multiClip'].map(feature => (
                <button
                  key={feature}
                  onClick={() => toggleFeature(feature)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    requiredFeatures.includes(feature)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              {recorders.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Tools Compared</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              2 Free
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">No Cost Options</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              $8-$29
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Mid-Range Price</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {filteredRecorders.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Match Criteria</div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {filteredRecorders.map((recorder) => (
            <div
              key={recorder.name}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {recorder.name}
                  </h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {recorder.category}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {recorder.pricing}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Best For:
                </div>
                <div className="flex flex-wrap gap-2">
                  {recorder.bestFor.map((use) => (
                    <span
                      key={use}
                      className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                    >
                      {use}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ✅ Pros:
                  </div>
                  <ul className="space-y-1">
                    {recorder.pros.slice(0, 3).map((pro, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="text-green-600 dark:text-green-400 mr-1">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ⚠️ Cons:
                  </div>
                  <ul className="space-y-1">
                    {recorder.cons.slice(0, 3).map((con, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="text-red-600 dark:text-red-400 mr-1">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className={`text-xs text-center py-1 px-2 rounded ${recorder.features.editing !== 'none' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {recorder.features.editing !== 'none' ? '✓' : '✗'} Editing
                  </div>
                  <div className={`text-xs text-center py-1 px-2 rounded ${recorder.features.webcam ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {recorder.features.webcam ? '✓' : '✗'} Webcam
                  </div>
                  <div className={`text-xs text-center py-1 px-2 rounded ${recorder.features.systemAudio ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {recorder.features.systemAudio ? '✓' : '✗'} Audio
                  </div>
                  <div className={`text-xs text-center py-1 px-2 rounded ${recorder.features.cloudStorage ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {recorder.features.cloudStorage ? '✓' : '✗'} Cloud
                  </div>
                  <div className={`text-xs text-center py-1 px-2 rounded ${recorder.features.aiFeatures ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {recorder.features.aiFeatures ? '✓' : '✗'} AI
                  </div>
                  <div className={`text-xs text-center py-1 px-2 rounded ${recorder.features.multiClip ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {recorder.features.multiClip ? '✓' : '✗'} Multi
                  </div>
                </div>
              </div>

              <a
                href={recorder.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                Learn More
              </a>
            </div>
          ))}
        </div>

        {filteredRecorders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              No tools match your criteria. Try adjusting your filters.
            </p>
          </div>
        )}

        {/* Recommendation Engine */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-6">🎯 Quick Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Best Overall</h3>
              <p className="text-green-100 mb-2">Tella ($13-$26/mo)</p>
              <p className="text-sm text-green-50">Perfect balance of features, ease of use, and AI capabilities</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Best Free</h3>
              <p className="text-green-100 mb-2">OBS (Free)</p>
              <p className="text-sm text-green-50">Infinite customization for advanced users willing to learn</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Best for Teams</h3>
              <p className="text-green-100 mb-2">Loom (Free/$15)</p>
              <p className="text-sm text-green-50">Fastest way to record and share with instant collaboration</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">
            Find the perfect Mac screen recorder for your workflow. All prices and features current as of 2026.
          </p>
          <p className="text-sm">
            © 2026 Mac Screen Recorder Finder. All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
