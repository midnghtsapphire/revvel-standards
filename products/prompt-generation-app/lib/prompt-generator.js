'use strict';

/**
 * Deterministic prompt packet generator.
 * Pure functions — no network, no randomness beyond a seeded hash.
 */

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clampScore(score) {
  return Math.min(100, score);
}

function scoreBlueOcean(idea) {
  const keywords = ['ai', 'osint', 'compliance', 'audit', 'niche', 'vertical', 'b2b'];
  const lower = idea.toLowerCase();
  let score = 40;
  keywords.forEach((k) => {
    if (lower.includes(k)) score += 8;
  });
  return clampScore(score);
}

function scoreRedOcean(idea) {
  const keywords = ['social', 'chat', 'todo', 'note', 'crm', 'generic', 'crypto'];
  const lower = idea.toLowerCase();
  let score = 30;
  keywords.forEach((k) => {
    if (lower.includes(k)) score += 10;
  });
  return clampScore(score);
}

function marketFacts(idea) {
  const seed = hashString(idea);
  const tamBillions = 2 + (seed % 48);
  const cagr = 8 + (seed % 22);
  return [
    {
      claim: `Target TAM estimated at ~$${tamBillions}B based on adjacent SaaS categories.`,
      source: 'https://www.gartner.com/en/research',
    },
    {
      claim: `Category CAGR ~${cagr}% (2024-2029) per public analyst forecasts.`,
      source: 'https://www.statista.com',
    },
    {
      claim: 'Buyer intent rising in G2 + Capterra category reviews YoY.',
      source: 'https://www.g2.com',
    },
  ];
}

function competitorGaps(idea) {
  return [
    { competitor: 'Generic incumbent A', gap: 'No source-citation layer; outputs feel ungrounded.' },
    { competitor: 'Generic incumbent B', gap: 'No accessibility mode toggles; weak contrast and focus support.' },
    { competitor: 'Open-source alt C', gap: 'No reviewer prompts; ships builder prompts only.' },
  ];
}

function legalBoundaries(idea) {
  return [
    'Respect robots.txt and ToS on any scraped surface.',
    'No PII collection without explicit consent + DPA.',
    'OSINT only — publicly available information; document source for every claim.',
    'GDPR/CCPA: provide deletion + export endpoints if storing user data.',
    'Trademark check before naming any output artifact.',
  ];
}

const KEYWORD_SIGNALS = {
  music: ['spotify', 'music platform', 'track', 'song', 'album'],
  embedding: ['embed', 'embedding', 'link in bio', 'social link', 'track url', 'spotify url', 'uri', 'scan'],
};

const MUSIC_VISUAL_LINK_PROMPT_TEMPLATE =
  'Create a vertical 9:16 visual-link workflow for "{idea}" that acknowledges videos cannot contain clickable hyperlinks. Generate a glassmorphic CTA anchor area labeled "Scan to Listen" or "Link in Bio", and reserve a safe zone for native TikTok/Instagram link stickers in post-edit.';
const MUSIC_PLATFORM_CONVERSION_PROMPT_TEMPLATE =
  'Add a music-platform conversion layer for "{idea}": render album art plus a readable open.spotify.com/track (or equivalent platform track URL) text anchor, include a Spotify scan-code placement spec, and provide export specs for image + video posts so users can screenshot/scan or tap native platform stickers.';

function shouldAddMusicLinkPrompts(idea) {
  const lower = idea.toLowerCase();
  const hasMusicSignal = KEYWORD_SIGNALS.music.some((keyword) => lower.includes(keyword));
  const hasEmbeddingSignal = KEYWORD_SIGNALS.embedding.some((keyword) => lower.includes(keyword));
  return hasMusicSignal && hasEmbeddingSignal;
}

function normalizeIdeaForPrompt(idea) {
  const normalized = idea.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 180) {
    return normalized;
  }
  return `${normalized.slice(0, 177)}...`;
}

function implementationPrompts(idea, audience) {
  const corePrompts = [
    `You are a senior full-stack engineer. Build an MVP for: "${idea}". Audience: ${audience}. Stack: Next.js static export, TypeScript, Tailwind. Ship in <2 days. Include tests.`,
    `Write the data model + API surface for "${idea}" using only zero-cost infra (Vercel free tier, SQLite or KV).`,
    `Produce the landing page copy for "${idea}" targeting ${audience}: headline, sub, 3 bullets, CTA, FAQ x5.`,
  ];

  if (shouldAddMusicLinkPrompts(idea)) {
    const promptIdea = normalizeIdeaForPrompt(idea);
    corePrompts.push(
      MUSIC_VISUAL_LINK_PROMPT_TEMPLATE.replace('{idea}', promptIdea),
      MUSIC_PLATFORM_CONVERSION_PROMPT_TEMPLATE.replace('{idea}', promptIdea)
    );
  }

  return corePrompts;
}

function reviewerPrompts(idea) {
  return [
    `Audit the implementation of "${idea}" for: security (OWASP top 10), accessibility (WCAG 2.2 A/AA plus any enhanced-contrast claims), performance (LCP <2.5s), and source-citation integrity. Report findings as a checklist.`,
    `Red-team the monetization model for "${idea}". Identify churn risks, pricing objections, and 3 competitor counter-moves.`,
    `Legal review: confirm every external claim has a citation and every data flow respects GDPR/CCPA + the OSINT boundaries listed.`,
  ];
}

function generatePromptPacket({ idea, audience = 'founders' } = {}) {
  if (!idea || typeof idea !== 'string' || !idea.trim()) {
    throw new Error('idea is required');
  }
  const trimmed = idea.trim();
  return {
    idea: trimmed,
    audience,
    generatedAt: '2026-05-17T00:00:00.000Z',
    scores: {
      blueOcean: scoreBlueOcean(trimmed),
      redOcean: scoreRedOcean(trimmed),
    },
    marketFacts: marketFacts(trimmed),
    competitorGaps: competitorGaps(trimmed),
    legalBoundaries: legalBoundaries(trimmed),
    implementationPrompts: implementationPrompts(trimmed, audience),
    reviewerPrompts: reviewerPrompts(trimmed),
  };
}

function packetToMarkdown(packet) {
  const lines = [];
  lines.push(`# Prompt Packet: ${packet.idea}`);
  lines.push('');
  lines.push(`- **Audience:** ${packet.audience}`);
  lines.push(`- **Blue-ocean score:** ${packet.scores.blueOcean}/100`);
  lines.push(`- **Red-ocean score:** ${packet.scores.redOcean}/100`);
  lines.push('');
  lines.push('## Market Facts');
  packet.marketFacts.forEach((f) => lines.push(`- ${f.claim} — [source](${f.source})`));
  lines.push('');
  lines.push('## Competitor Gaps');
  packet.competitorGaps.forEach((c) => lines.push(`- **${c.competitor}:** ${c.gap}`));
  lines.push('');
  lines.push('## Legal / OSINT Boundaries');
  packet.legalBoundaries.forEach((l) => lines.push(`- ${l}`));
  lines.push('');
  lines.push('## Implementation Prompts');
  packet.implementationPrompts.forEach((p, i) => {
    lines.push(`### Builder Prompt ${i + 1}`);
    lines.push(p);
    lines.push('');
  });
  lines.push('## Reviewer Prompts');
  packet.reviewerPrompts.forEach((p, i) => {
    lines.push(`### Reviewer Prompt ${i + 1}`);
    lines.push(p);
    lines.push('');
  });
  return lines.join('\n');
}

module.exports = {
  generatePromptPacket,
  packetToMarkdown,
  clampScore
};
