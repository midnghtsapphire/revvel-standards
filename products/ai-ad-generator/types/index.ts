// Core domain types for AI Ad Generator

export interface ProductData {
  url: string;
  title: string;
  description: string;
  price?: string;
  currency?: string;
  images: string[];
  ogImage?: string;
  brand?: string;
  reviews?: ProductReview[];
  scrapedAt: string;
}

export interface ProductReview {
  text: string;
  rating?: number;
  author?: string;
}

export interface AdCopyVariant {
  headline: string;
  body: string;
  cta: string;
  hook?: string;       // attention-grabbing opener for video ads
  framework: 'AIDA' | 'PAS' | 'BAB' | 'Direct';
}

export interface AdCopy {
  productTitle: string;
  primaryHeadline: string;
  script: string;       // full UGC-style video script
  variants: AdCopyVariant[];   // 3 static ad copy variants
  hashtags: string[];
  generatedAt: string;
  model: string;        // which AI model produced this
}

export type AdTemplateId = 'bold' | 'minimal' | 'ugc' | 'sale' | 'story';

export interface AdTemplateConfig {
  id: AdTemplateId;
  name: string;
  description: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  layout: 'image-top' | 'image-left' | 'image-bg' | 'split';
}

export interface StaticCreative {
  templateId: AdTemplateId;
  productTitle: string;
  headline: string;
  cta: string;
  imageUrl?: string;
  /** Base64 data URI. Check `mimeType` to determine if it's PNG or SVG fallback. */
  imageData: string;
  mimeType: 'image/png' | 'image/svg+xml';
  width: number;
  height: number;
  generatedAt: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignPlatform = 'meta' | 'tiktok' | 'google' | 'twitter';

export interface Campaign {
  id: string;
  name: string;
  productData: ProductData;
  adCopy?: AdCopy;
  creatives: StaticCreative[];
  platform: CampaignPlatform;
  status: CampaignStatus;
  budget?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsData {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;   // clicks/impressions * 100
  roas: number;  // revenue/spend
}

// API response shapes

export interface ScrapeProductResponse {
  success: boolean;
  data?: ProductData;
  error?: string;
}

export interface GenerateAdResponse {
  success: boolean;
  data?: AdCopy;
  error?: string;
}

export interface GenerateCreativeResponse {
  success: boolean;
  data?: StaticCreative;
  error?: string;
}
