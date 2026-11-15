'use client';

import { useState, useMemo } from 'react';

import { affiliatePrograms, filterAndSortPrograms } from './lib/programs.mjs';
import type { AffiliateProgram } from './lib/programs.mjs';

export type { AffiliateProgram };

// The catalogue and the filter/sort logic live in app/lib/programs.mjs (WR #18342),
// shared with the AG-UI demo kit at products/halo-demo-stream.

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recurring' | 'one-time' | 'hybrid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'ltv'>('ltv');

  const filteredAndSortedPrograms = useMemo(() => {
    return filterAndSortPrograms({ searchTerm, filterType, sortBy });
  }, [searchTerm, filterType, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            High-Ticket Affiliate Hub
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover the most lucrative affiliate programs for 2026. Compare commission structures,
            lifetime values, and find the perfect match for your audience.
          </p>
        </header>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search programs or audiences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commission Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'recurring' | 'one-time' | 'hybrid')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="recurring">Recurring</option>
                <option value="one-time">One-Time</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'ltv')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ltv">Lifetime Value</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {affiliatePrograms.length}
            </div>
            <div className="text-gray-600 dark:text-gray-300">Programs Listed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              $50K+
            </div>
            <div className="text-gray-600 dark:text-gray-300">Max Potential LTV</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              120 days
            </div>
            <div className="text-gray-600 dark:text-gray-300">Longest Cookie Window</div>
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedPrograms.map((program) => (
            <div
              key={program.name}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {program.name}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  program.type === 'recurring' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  program.type === 'one-time' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                }`}>
                  {program.type}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Commission:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{program.commission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lifetime Value:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{program.ltv}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cookie Window:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{program.cookieWindow}</span>
                </div>
                {program.minPayout && program.maxPayout && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payout Range:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {program.minPayout} - {program.maxPayout}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience:
                </div>
                <div className="flex flex-wrap gap-2">
                  {program.audience.map((aud) => (
                    <span
                      key={aud}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {aud}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Highlights:
                </div>
                <ul className="space-y-1">
                  {program.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                      <span className="text-indigo-600 dark:text-indigo-400 mr-2">✓</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={program.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                Learn More
              </a>
            </div>
          ))}
        </div>

        {filteredAndSortedPrograms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              No programs found matching your criteria.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">
            Start earning with high-ticket affiliate programs today. All data current as of 2026.
          </p>
          <p className="text-sm">
            © 2026 High-Ticket Affiliate Hub. All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
