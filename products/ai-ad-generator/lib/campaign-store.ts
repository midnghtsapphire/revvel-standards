/**
 * Campaign persistence via localStorage (client-side only).
 * All functions must be called from client components.
 */

import { Campaign, CampaignStatus, StaticCreative } from '../types';

const STORAGE_KEY = 'aig_campaigns';
const SEEDED_KEY = 'aig_seeded';

function load(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Campaign[]) : [];
  } catch {
    return [];
  }
}

function save(campaigns: Campaign[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  } catch (err: unknown) {
    // Storage full or access denied (private mode, security policy, etc.)
    console.warn('[campaign-store] localStorage write failed:', err instanceof Error ? err.message : err);
  }
}

export function listCampaigns(): Campaign[] {
  return load();
}

export function getCampaign(id: string): Campaign | undefined {
  return load().find((c) => c.id === id);
}

export function saveCampaign(campaign: Campaign): void {
  const campaigns = load();
  const idx = campaigns.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    campaigns[idx] = { ...campaign, updatedAt: new Date().toISOString() };
  } else {
    campaigns.unshift(campaign);
  }
  save(campaigns);
}

export function deleteCampaign(id: string): void {
  save(load().filter((c) => c.id !== id));
}

export function updateCampaignStatus(id: string, status: CampaignStatus): void {
  const campaigns = load();
  const campaign = campaigns.find((c) => c.id === id);
  if (campaign) {
    campaign.status = status;
    campaign.updatedAt = new Date().toISOString();
    save(campaigns);
  }
}

export function addCreativeToCampaign(
  campaignId: string,
  creative: StaticCreative
): void {
  const campaigns = load();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (campaign) {
    campaign.creatives = [...(campaign.creatives || []), creative];
    campaign.updatedAt = new Date().toISOString();
    save(campaigns);
  }
}

export function generateCampaignId(): string {
  return `cam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Seed demo campaigns for first-run experience.
 * Uses an `aig_seeded` localStorage flag so seeding only runs once,
 * not on every page load after the user deletes all campaigns.
 */
export function seedDemoCampaigns(): void {
  if (typeof window === 'undefined') return;
  try { if (localStorage.getItem(SEEDED_KEY)) return; } catch { return; }
  // Mark seeded immediately so concurrent/SSR double-calls are safe
  try { localStorage.setItem(SEEDED_KEY, '1'); } catch { return; }

  const demo: Campaign[] = [
    {
      id: 'cam_demo_001',
      name: 'Demo: Wireless Earbuds Launch',
      productData: {
        url: 'https://example.com/wireless-earbuds',
        title: 'ProAudio Wireless Earbuds X5',
        description: 'Crystal-clear sound, 30hr battery, ANC technology.',
        price: '$79.99',
        currency: 'USD',
        images: [],
        scrapedAt: new Date().toISOString(),
      },
      creatives: [],
      platform: 'meta',
      status: 'active',
      budget: 500,
      spend: 312,
      impressions: 48200,
      clicks: 1930,
      conversions: 87,
      revenue: 6961,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cam_demo_002',
      name: 'Demo: Skincare Bundle',
      productData: {
        url: 'https://example.com/skincare-bundle',
        title: 'GlowKit 3-Piece Skincare Bundle',
        description: 'Vitamin C serum, hyaluronic acid moisturiser, SPF 50 sunscreen.',
        price: '$49.99',
        currency: 'USD',
        images: [],
        scrapedAt: new Date().toISOString(),
      },
      creatives: [],
      platform: 'tiktok',
      status: 'paused',
      budget: 300,
      spend: 178,
      impressions: 92100,
      clicks: 4050,
      conversions: 203,
      revenue: 10150,
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  save(demo);
}
