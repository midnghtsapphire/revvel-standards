'use client';
// description: Analytics dashboard showing ROAS, CTR, conversions, and spend trends across all campaigns.

import { useEffect, useMemo, useState } from 'react';
import AnalyticsChart from '../../components/AnalyticsChart';
import { AnalyticsData, Campaign } from '../../types';
import { listCampaigns, seedDemoCampaigns } from '../../lib/campaign-store';

// Generate deterministic daily analytics from campaign data
function buildAnalytics(campaigns: Campaign[]): AnalyticsData[] {
  const days = 14;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Spread campaign metrics across days with a slight ramp-up curve
    const factor = 0.6 + (i / (days - 1)) * 0.8;
    const impressions = Math.round(
      campaigns.reduce((s, c) => s + (c.impressions || 0), 0) * factor * (1 / days)
    );
    const clicks = Math.round(impressions * 0.038 * (1 + i * 0.005));
    const conversions = Math.round(clicks * 0.045);
    const spend = parseFloat(
      (campaigns.reduce((s, c) => s + (c.spend || 0), 0) * factor * (1 / days)).toFixed(2)
    );
    const revenue = parseFloat((spend * (2 + i * 0.05)).toFixed(2));
    const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
    const roas = spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0;

    return { date: label, impressions, clicks, conversions, spend, revenue, ctr, roas };
  });
}

type ChartType = 'roas' | 'ctr' | 'spend_revenue' | 'conversions';

const CHART_TABS: { id: ChartType; label: string }[] = [
  { id: 'roas', label: 'ROAS' },
  { id: 'ctr', label: 'CTR' },
  { id: 'spend_revenue', label: 'Spend vs Revenue' },
  { id: 'conversions', label: 'Conversions' },
];

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeChart, setActiveChart] = useState<ChartType>('roas');

  useEffect(() => {
    seedDemoCampaigns();
    setCampaigns(listCampaigns());
  }, []);

  const analyticsData = useMemo(() => buildAnalytics(campaigns), [campaigns]);

  const totalImpressions = analyticsData.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = analyticsData.reduce((s, d) => s + d.clicks, 0);
  const totalConversions = analyticsData.reduce((s, d) => s + d.conversions, 0);
  const totalSpend = analyticsData.reduce((s, d) => s + d.spend, 0);
  const totalRevenue = analyticsData.reduce((s, d) => s + d.revenue, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Last 14 days · All campaigns</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KPI label="Impressions" value={totalImpressions.toLocaleString()} />
        <KPI label="Clicks" value={totalClicks.toLocaleString()} />
        <KPI label="CTR" value={`${avgCtr.toFixed(2)}%`} highlight={avgCtr >= 2} />
        <KPI label="Conversions" value={totalConversions.toLocaleString()} />
        <KPI label="Spend" value={`$${totalSpend.toFixed(0)}`} />
        <KPI label="ROAS" value={`${avgRoas.toFixed(2)}x`} highlight={avgRoas >= 2} />
      </div>

      {/* Chart panel */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        {/* Tab selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CHART_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeChart === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnalyticsChart data={analyticsData} type={activeChart} />
      </div>

      {/* Per-campaign breakdown */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Campaign Breakdown
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-gray-400 text-sm">No campaigns yet. <a href="/create" className="text-blue-500 hover:underline">Create one →</a></p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <tr>
                  {['Campaign', 'Platform', 'Status', 'Spend', 'Revenue', 'ROAS', 'Impressions', 'Clicks', 'CTR'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {campaigns.map((c) => {
                  // Use != null / > 0 guards so zero values display correctly
                  const roas =
                    c.spend != null && c.spend > 0 && c.revenue != null
                      ? (c.revenue / c.spend).toFixed(2)
                      : '—';
                  const ctr =
                    c.impressions != null && c.impressions > 0 && c.clicks != null
                      ? ((c.clicks / c.impressions) * 100).toFixed(2)
                      : '—';

                  return (
                    <tr key={c.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{c.name}</td>
                      <td className="px-4 py-3 capitalize text-gray-500">{c.platform}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' :
                          c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.spend != null ? `$${c.spend}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.revenue != null ? `$${c.revenue}` : '—'}</td>
                      <td className={`px-4 py-3 font-semibold ${Number(roas) >= 2 ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>{roas !== '—' ? `${roas}x` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.impressions != null ? c.impressions.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.clicks != null ? c.clicks.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{ctr !== '—' ? `${ctr}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
      <p className={`text-2xl font-extrabold ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
