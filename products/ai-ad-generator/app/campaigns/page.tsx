'use client';
// description: Campaign manager — view, filter, and manage all active ad campaigns and their metrics.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CampaignCard from '../../components/CampaignCard';
import { Campaign } from '../../types';
import { listCampaigns, seedDemoCampaigns } from '../../lib/campaign-store';

const PLATFORM_FILTER_OPTIONS = ['All', 'meta', 'tiktok', 'google', 'twitter'] as const;
const STATUS_FILTER_OPTIONS = ['All', 'draft', 'active', 'paused', 'completed'] as const;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [platform, setPlatform] = useState<string>('All');
  const [status, setStatus] = useState<string>('All');

  function refresh() {
    seedDemoCampaigns();
    setCampaigns(listCampaigns());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = campaigns.filter((c) => {
    const matchPlatform = platform === 'All' || c.platform === platform;
    const matchStatus = status === 'All' || c.status === status;
    return matchPlatform && matchStatus;
  });

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-500 text-sm mt-1">{campaigns.length} total campaigns</p>
        </div>
        <Link
          href="/create"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          + New Campaign
        </Link>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatBox label="Total Spend" value={`$${totalSpend.toLocaleString()}`} />
        <StatBox label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatBox
          label="Overall ROAS"
          value={overallRoas > 0 ? `${overallRoas.toFixed(2)}x` : '—'}
          highlight={overallRoas >= 2}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Platform:</span>
          {PLATFORM_FILTER_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                platform === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Status:</span>
          {STATUS_FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg font-medium">No campaigns yet</p>
          <p className="text-sm mt-2">
            <a href="/create" className="text-blue-500 hover:underline">Create your first ad</a> to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} onUpdated={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-center">
      <p className={`text-3xl font-extrabold mb-1 ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
