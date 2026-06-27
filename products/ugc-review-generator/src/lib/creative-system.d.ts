export interface AmazonReviewPacket {
  useCase: 'amazon-ugc';
  visualPrompt: string;
  script: string;
  checklist: string[];
}

export interface CalendarEntry {
  day: number;
  format: string;
  angle: string;
  hook: string;
  cta: string;
}

export interface LocalLeadPacket {
  useCase: 'local-leads';
  brandName: string;
  overlayLines: string[];
  shortScript: string;
  hooks: string[];
  landingPage: {
    hero: string;
    subhead: string;
    bullets: string[];
    cta: string;
  };
  contentCalendar: CalendarEntry[];
  complianceNotes: string[];
}

export interface AmazonReviewInput {
  productName?: string;
  problem?: string;
  hookType?: string;
  affiliateLink?: string;
}

export interface LocalLeadInput {
  brandName?: string;
  businessType?: string;
  audience?: string;
  painPoint?: string;
  proofMetric?: string;
  offer?: string;
  freeTrialDays?: number | string;
  urgencyHours?: number | string;
}

declare const creativeSystem: {
  buildAmazonReviewPacket: (input: AmazonReviewInput) => AmazonReviewPacket;
  buildLocalLeadPacket: (input: LocalLeadInput) => LocalLeadPacket;
  buildThirtyDayCalendar: (input: LocalLeadInput) => CalendarEntry[];
  normalizeUrgencyHours: (input: number | string) => number;
  packetToMarkdown: (packet: AmazonReviewPacket | LocalLeadPacket) => string;
};

export default creativeSystem;
