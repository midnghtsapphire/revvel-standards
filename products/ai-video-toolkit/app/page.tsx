'use client';

import { useState } from 'react';

interface Tool {
  name: string;
  category: string;
  pricing: string;
  description: string;
  bestFor: string[];
  features: string[];
  url: string;
}

const tools: Tool[] = [
  {
    name: 'Katalist.ai',
    category: 'All-in-One',
    pricing: 'Subscription',
    description: 'Complete pipeline from script generation to final video export',
    bestFor: ['Beginners', 'One-stop solution seekers'],
    features: [
      'Script generation',
      'Storyboard creation',
      'AI voiceovers',
      'Animated video export',
      'Single interface workflow'
    ],
    url: '#'
  },
  {
    name: 'ChatGPT',
    category: 'Scriptwriting',
    pricing: 'Free / $20/mo',
    description: 'Industry standard for brainstorming and script generation',
    bestFor: ['Content creators', 'Researchers'],
    features: [
      'Brainstorming ideas',
      'Research assistance',
      'Structured scripts',
      'Content outlines',
      'SEO optimization'
    ],
    url: '#'
  },
  {
    name: 'Jasper',
    category: 'Scriptwriting',
    pricing: 'From $49/mo',
    description: 'Marketing-focused AI writing assistant',
    bestFor: ['Marketers', 'Professional creators'],
    features: [
      'Long-form content',
      'Marketing copy',
      'Video scripts',
      'Brand voice',
      'Templates'
    ],
    url: '#'
  },
  {
    name: 'Claude',
    category: 'Scriptwriting',
    pricing: 'Free / $20/mo',
    description: 'Advanced AI for research and detailed scripts',
    bestFor: ['Complex topics', 'Educational content'],
    features: [
      'Deep research',
      'Nuanced writing',
      'Long context',
      'Fact-checking',
      'Citations'
    ],
    url: '#'
  },
  {
    name: 'Perplexity',
    category: 'Scriptwriting',
    pricing: 'Free / $20/mo',
    description: 'AI-powered research engine with citations',
    bestFor: ['Research-heavy content', 'Fact-based videos'],
    features: [
      'Web research',
      'Source citations',
      'Current information',
      'Topic exploration',
      'Fact verification'
    ],
    url: '#'
  },
  {
    name: 'ElevenLabs',
    category: 'Voiceovers',
    pricing: 'From $5/mo',
    description: 'Industry leader for realistic AI voiceovers',
    bestFor: ['Professional narration', 'Multiple voices'],
    features: [
      'Ultra-realistic voices',
      'Voice cloning',
      'Multiple languages',
      'Emotion control',
      'Custom voices'
    ],
    url: '#'
  },
  {
    name: 'Murf.ai',
    category: 'Voiceovers',
    pricing: 'From $19/mo',
    description: 'Professional text-to-speech with studio features',
    bestFor: ['Business presentations', 'E-learning'],
    features: [
      'Studio-quality voices',
      'Pitch control',
      'Speed adjustment',
      'Emphasis options',
      'Multi-speaker'
    ],
    url: '#'
  },
  {
    name: 'Play.ht',
    category: 'Voiceovers',
    pricing: 'From $19/mo',
    description: 'Natural-sounding AI voices with emotion',
    bestFor: ['Storytelling', 'Audiobooks'],
    features: [
      'Natural prosody',
      'Emotional range',
      'Voice styles',
      'Long-form audio',
      'API access'
    ],
    url: '#'
  },
  {
    name: 'Pictory',
    category: 'Video Assembly',
    pricing: 'From $19/mo',
    description: 'Turn scripts into videos with stock footage',
    bestFor: ['Quick video creation', 'Social media'],
    features: [
      'Script to video',
      'Auto B-roll',
      'Auto captions',
      'Stock footage',
      'Music library'
    ],
    url: '#'
  },
  {
    name: 'Runway',
    category: 'Video Assembly',
    pricing: 'From $12/mo',
    description: 'AI video generation and editing suite',
    bestFor: ['Creative videos', 'AI effects'],
    features: [
      'AI video generation',
      'Green screen removal',
      'Motion tracking',
      'AI effects',
      'Professional editing'
    ],
    url: '#'
  },
  {
    name: 'Kling AI',
    category: 'Video Assembly',
    pricing: 'Subscription',
    description: 'AI-powered video creation platform',
    bestFor: ['Animated content', 'AI-generated visuals'],
    features: [
      'AI video generation',
      'Text to video',
      'Style transfer',
      'Animation tools',
      'Fast rendering'
    ],
    url: '#'
  },
  {
    name: 'Zebracat',
    category: 'Video Assembly',
    pricing: 'From $29/mo',
    description: 'AI video creator with marketing focus',
    bestFor: ['Marketing videos', 'Ads'],
    features: [
      'Marketing templates',
      'AI scenes',
      'Brand customization',
      'Multiple formats',
      'Fast export'
    ],
    url: '#'
  },
  {
    name: 'AutoShorts.ai',
    category: 'Video Assembly',
    pricing: 'From $19/mo',
    description: 'Automated short-form video creation',
    bestFor: ['YouTube Shorts', 'TikTok'],
    features: [
      'Auto video creation',
      'Viral templates',
      'Captions',
      'Music sync',
      'Batch creation'
    ],
    url: '#'
  },
  {
    name: 'Opus Clip',
    category: 'Short-Form',
    pricing: 'From $9/mo',
    description: 'AI-powered long-form to short-form converter',
    bestFor: ['Repurposing content', 'Social clips'],
    features: [
      'Auto clip detection',
      'Viral score',
      'Auto captions',
      'Multiple clips',
      'Scheduler'
    ],
    url: '#'
  },
  {
    name: 'Vizard.ai',
    category: 'Short-Form',
    pricing: 'From $15/mo',
    description: 'AI video repurposing for social media',
    bestFor: ['Podcasters', 'Webinars'],
    features: [
      'AI clipping',
      'Auto subtitles',
      'Layouts',
      'Brand templates',
      'Bulk export'
    ],
    url: '#'
  },
  {
    name: 'Submagic',
    category: 'Short-Form',
    pricing: 'From $20/mo',
    description: 'Auto captions and shorts optimization',
    bestFor: ['Caption creators', 'Engagement'],
    features: [
      'Animated captions',
      'Emoji injection',
      'B-roll suggestions',
      'Engagement hooks',
      'Viral templates'
    ],
    url: '#'
  },
  {
    name: 'Canva AI',
    category: 'Thumbnails',
    pricing: 'Free / $13/mo',
    description: 'Easy design tool with AI features',
    bestFor: ['Beginners', 'Quick designs'],
    features: [
      'Drag-and-drop',
      'AI image generation',
      'Templates',
      'Brand kits',
      'Stock photos'
    ],
    url: '#'
  },
  {
    name: 'Midjourney',
    category: 'Thumbnails',
    pricing: 'From $10/mo',
    description: 'Advanced AI image generation',
    bestFor: ['Custom art', 'Unique styles'],
    features: [
      'High-quality images',
      'Artistic styles',
      'Custom prompts',
      'Variations',
      'Upscaling'
    ],
    url: '#'
  },
  {
    name: 'Leonardo AI',
    category: 'Thumbnails',
    pricing: 'Free / $10/mo',
    description: 'AI art generator with control',
    bestFor: ['Consistent style', 'Game art'],
    features: [
      'Style consistency',
      'Character creation',
      'Fast generation',
      'Multiple styles',
      'Fine-tuning'
    ],
    url: '#'
  },
  {
    name: 'Freepik AI',
    category: 'Thumbnails',
    pricing: 'Free / $10/mo',
    description: 'Stock photos with AI generation',
    bestFor: ['Professional looks', 'Stock + AI'],
    features: [
      'Stock library',
      'AI generation',
      'Templates',
      'Commercial use',
      'Easy editing'
    ],
    url: '#'
  }
];

const categories = [
  'All Tools',
  'All-in-One',
  'Scriptwriting',
  'Voiceovers',
  'Video Assembly',
  'Short-Form',
  'Thumbnails'
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All Tools');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTools = tools.filter(tool => {
    const matchesCategory = selectedCategory === 'All Tools' || tool.category === selectedCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toolsByCategory = categories.slice(1).map(category => ({
    category,
    tools: tools.filter(t => t.category === category)
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-800 dark:text-purple-200 font-semibold text-sm mb-4">
            AI-Powered Video Creation
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            AI Video Toolkit
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Your complete automation stack for creating faceless YouTube videos. From scriptwriting
            to thumbnails, find the perfect AI tools for every step of your workflow.
          </p>
        </header>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Workflow Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {toolsByCategory.map(({ category, tools: categoryTools }) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {categoryTools.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{category}</div>
            </div>
          ))}
        </div>

        {/* Complete Workflow Guide */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-4">📹 Complete Workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-6xl mb-2">1️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Research & Script</h3>
              <p className="text-purple-100">
                Use ChatGPT, Claude, or Perplexity to research topics and generate structured video scripts
              </p>
            </div>
            <div>
              <div className="text-6xl mb-2">2️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Create Video</h3>
              <p className="text-purple-100">
                Turn scripts into videos with Pictory or Runway, add voiceovers with ElevenLabs
              </p>
            </div>
            <div>
              <div className="text-6xl mb-2">3️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Optimize & Publish</h3>
              <p className="text-purple-100">
                Create thumbnails with Midjourney, repurpose to Shorts with Opus Clip
              </p>
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {selectedCategory === 'All Tools' ? 'All Tools' : selectedCategory + ' Tools'}
            </h2>
            <div className="text-gray-600 dark:text-gray-400">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <div
                key={tool.name}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {tool.name}
                  </h3>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-semibold whitespace-nowrap">
                    {tool.category}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {tool.description}
                </p>

                <div className="mb-3">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Best For:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tool.bestFor.map((use) => (
                      <span
                        key={use}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                      >
                        {use}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Key Features:
                  </div>
                  <ul className="space-y-1">
                    {tool.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="text-purple-600 dark:text-purple-400 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tool.pricing}
                  </span>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-md transition-colors"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600 dark:text-gray-400">
                No tools found matching your criteria.
              </p>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Build Your Faceless Channel?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            Start with our complete toolkit and build a successful automated YouTube channel.
            All tools tested and recommended for 2026.
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg text-lg transition-all transform hover:scale-105">
            Get the Complete Guide
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">
            Build your automated video empire with the best AI tools of 2026.
          </p>
          <p className="text-sm">
            © 2026 AI Video Toolkit. All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
