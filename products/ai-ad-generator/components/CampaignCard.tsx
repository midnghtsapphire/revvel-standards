'use client';

import { Campaign, CampaignStatus } from '../types';
import { updateCampaignStatus, deleteCampaign } from '../lib/campaign-store';

interface CampaignCardProps {
  campaign: Campaign;
  onUpdated: () => void;
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const PLATFORM_ICONS: Record<string, string> = {
  meta: '📘',
  tiktok: '🎵',
  google: '🔍',
  twitter: '🐦',
};

export default function CampaignCard({ campaign, onUpdated }: CampaignCardProps) {
  // Use != null so zero-value metrics are shown, not hidden
  const roas =
    campaign.revenue != null && campaign.spend != null && campaign.spend > 0
      ? (campaign.revenue / campaign.spend).toFixed(2)
      : null;
  const ctr =
    campaign.clicks != null && campaign.impressions != null && campaign.impressions > 0
      ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
      : null;

  function handleStatusChange(status: CampaignStatus) {
    updateCampaignStatus(campaign.id, status);
    onUpdated();
  }

  function handleDelete() {
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      deleteCampaign(campaign.id);
      onUpdated();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{PLATFORM_ICONS[campaign.platform] || '📣'}</span>
            <h3 className="font-bold text-gray-900 dark:text-white truncate">{campaign.name}</h3>
          </div>
          <p className="text-xs text-gray-400 truncate">{campaign.productData.title}</p>
        </div>

        <select
          value={campaign.status}
          onChange={(e) => handleStatusChange(e.target.value as CampaignStatus)}
          className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${STATUS_STYLES[campaign.status]}`}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="Spend" value={campaign.spend != null ? `$${campaign.spend.toLocaleString()}` : '—'} />
        <Metric label="Impressions" value={campaign.impressions != null ? campaign.impressions.toLocaleString() : '—'} />
        <Metric label="CTR" value={ctr != null ? `${ctr}%` : '—'} highlight={Number(ctr) >= 2} />
        <Metric label="ROAS" value={roas != null ? `${roas}x` : '—'} highlight={Number(roas) >= 2} />
      </div>

      {/* Budget bar — only requires budget to be set; spend may be 0 */}
      {campaign.budget != null ? (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Budget used</span>
            <span>${campaign.spend ?? 0} / ${campaign.budget}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, ((campaign.spend ?? 0) / campaign.budget) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400">
          {new Date(campaign.createdAt).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
