'use strict';

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function normalizeUrgencyHours(value) {
  const numeric = Number.parseInt(String(value ?? '').trim(), 10);
  if (Number.isNaN(numeric)) {
    return 3;
  }
  return Math.min(72, Math.max(1, numeric));
}

function toSingularAudience(audience) {
  const words = audience.split(' ');
  const last = words[words.length - 1];
  // Only strip the trailing 's' from the last word when it ends in a non-vowel,
  // non-'s' consonant followed by 's' (e.g. "agents" → "agent", "dentists" →
  // "dentist").  Words ending in 'ss', 'es', 'is', 'us', etc. are left
  // untouched to avoid broken copy like "busines" or "coache".
  if (last && /[bcdfghjklmnpqrtvwxyz]s$/i.test(last)) {
    words[words.length - 1] = last.slice(0, -1);
    return words.join(' ');
  }
  return audience;
}

function buildAmazonVisualPrompt({ productName, hookType }) {
  const safeProductName = cleanText(productName, 'Amazon tech gadget or lifestyle product');
  if (hookType === 'unboxing') {
    return `A vertical 9:16 cinematic shot mimicking a high-end smartphone camera style for a TikTok product review. A charismatic reviewer is sitting at a clean, modern wooden desk illuminated by soft, natural window light. In the center, a sleek, premium ${safeProductName} is being unboxed. The camera glides closer in a smooth, handheld tracking motion, capturing crisp, close-up details of the product's texture and glossy surfaces. As the reviewer interacts with the product, subtle atmospheric haze catches faint light leaks in the background, creating depth. The vibe is casual, authentic, and highly engaging, perfectly tailored for a viral UGC review. Photorealistic, 4k resolution, natural lighting, lifelike skin textures, seamless handheld movement.`;
  }
  return `A close-up, dynamic vertical 9:16 tracking shot of an Amazon viral product being used in a real-world scenario, like a moody, modern kitchen or a sleek home office. The camera follows a person's hands demonstrating a clever, satisfying product feature (e.g., using the ${safeProductName}). Brilliant rim lighting catches the crisp edges of the product, while a soft-focus background keeps total emphasis on the demonstration. The lighting shifts dynamically to emphasize the "before and after" effect of using the item. Hyper-realistic, 8k resolution, ray-traced reflections, high-energy pacing, premium commercial aesthetic.`;
}

function buildAmazonScript({ productName, problem, affiliateLink }) {
  const safeProblem = cleanText(problem, 'messy cables destroying your desk setup');
  const safeProductName = cleanText(productName, 'magnetic hub');
  const safeAffiliateLink = cleanText(affiliateLink);
  return `
🚀 Script for HeyGen (Viral TikTok Review Formula):

1. The 2-Second Anti-Ad Hook:
"I almost threw this Amazon find in the trash until I realized I was using it completely wrong..."

2. The Agitation:
"If you’re tired of ${safeProblem}, you need to see this."

3. The Payoff (The Product):
"This viral ${safeProductName} completely solves it. It literally took me 5 seconds to set up."

4. The Call to Action (CTA):
"I dropped the exact link in my bio if you want to grab it before it sells out again."
${safeAffiliateLink ? `\n(Link to use: ${safeAffiliateLink})` : ''}
  `.trim();
}

function buildAmazonReviewPacket({ productName, problem, hookType = 'unboxing', affiliateLink }) {
  return {
    useCase: 'amazon-ugc',
    visualPrompt: buildAmazonVisualPrompt({ productName, hookType }),
    script: buildAmazonScript({ productName, problem, affiliateLink }),
    checklist: [
      'Film the first two seconds as a pattern interrupt instead of a brand intro.',
      'Use one visual proof moment before showing the CTA.',
      'Keep the CTA native: bio link, pinned comment, or product shelf.',
    ],
  };
}

function buildOverlayLines({
  audience,
  painPoint,
  businessType,
  proofMetric,
  offer,
  freeTrialDays,
  urgencyHours,
  brandName,
}) {
  const safeAudience = cleanText(audience, 'Real estate agents');
  const singularAudience = toSingularAudience(safeAudience.toLowerCase());
  const safePainPoint = cleanText(painPoint, 'what to post on social media');
  const safeBusinessType = cleanText(businessType, 'real estate');
  const safeBrandName = cleanText(brandName, 'this system');
  const safeOffer = cleanText(offer, 'unlimited AI');
  const parsedTrial = Number.parseInt(String(freeTrialDays ?? '').trim(), 10);
  const normalizedTrial = Number.isNaN(parsedTrial) ? 7 : Math.min(30, Math.max(1, parsedTrial));
  const normalizedUrgency = normalizeUrgencyHours(urgencyHours);
  const safeProofMetric = cleanText(proofMetric);
  const proofLine = safeProofMetric
    ? `Then ${safeBrandName} generated an entire month of content that drove ${safeProofMetric}.`
    : `Then ${safeBrandName} generated an entire month of proof-led ${safeBusinessType} content for free.`;

  return [
    `${safeAudience},`,
    `I used to stress over ${safePainPoint}.`,
    proofLine,
    `And now every 2nd subscriber gets ${safeOffer} for ${normalizedTrial} days.`,
    `I'd tell every ${singularAudience} I know to jump on this right now.`,
    `Only ${normalizedUrgency} hours left.`,
    'Tap to try',
  ];
}

function buildLeadHooks({ audience, businessType, proofMetric, brandName }) {
  const safeAudience = cleanText(audience, 'Real estate agents');
  const safeBusinessType = cleanText(businessType, 'real estate');
  const safeProofMetric = cleanText(proofMetric, 'more qualified conversations');
  const safeBrandName = cleanText(brandName, 'this system');
  return [
    `If you're a ${safeAudience.toLowerCase()} still guessing what to post, ${safeBrandName} turns one listing into a full content sprint.`,
    `We used this ${safeBusinessType} content stack to generate ${safeProofMetric} without hiring a full creative team.`,
    `Stop posting generic market updates. Use this 3-part ${safeBusinessType} ad formula instead.`,
  ];
}

function buildLandingPage({ businessType, audience, offer, brandName }) {
  const safeBusinessType = cleanText(businessType, 'real estate');
  const safeAudience = cleanText(audience, 'Real estate agents');
  const safeOffer = cleanText(offer, 'Unlimited AI ad generation');
  const safeBrandName = cleanText(brandName, 'Lead Hook System');

  return {
    hero: `${safeOffer} for ${safeAudience}`,
    subhead: `${safeBrandName} turns one ${safeBusinessType} offer into testimonial ads, reels, story frames, and follow-up posts your team can publish this week.`,
    bullets: [
      'Generate a 30-day content plan anchored to one offer, one proof point, and one CTA.',
      'Rotate trust, urgency, before/after, objection handling, and FAQ angles automatically.',
      'Keep every ad platform-native: hook, proof, CTA, and landing copy in one packet.',
    ],
    cta: 'Start the 7-day test',
  };
}

function buildComplianceNotes({ proofMetric, brandName }) {
  const safeBrandName = cleanText(brandName, 'your system');
  const notes = [
    'Replace every numeric claim with a sourced metric, screenshot, or testimonial before publishing.',
    'Avoid guaranteed-results language; describe the system as a framework, not a promise.',
    'Match every CTA window to a real deadline in the offer stack or omit the countdown.',
  ];
  if (!cleanText(proofMetric)) {
    notes.unshift(`No proof metric was provided, so ${safeBrandName} defaults to qualitative social-proof language.`);
  }
  return notes;
}

function buildThirtyDayCalendar({ businessType, audience, offer }) {
  const safeBusinessType = cleanText(businessType, 'real estate');
  const safeAudience = cleanText(audience, 'real estate agents');
  const safeOffer = cleanText(offer, 'unlimited AI ad generation');
  const pillars = [
    {
      angle: 'Pain',
      hook: `Still manually writing ${safeBusinessType} posts every morning?`,
      cta: `DM "${safeOffer}" to get the template.`,
    },
    {
      angle: 'Proof',
      hook: `One ${safeBusinessType} offer can become 7 angles when the proof is clear.`,
      cta: 'Reply “proof” to get the swipe file.',
    },
    {
      angle: 'Objection',
      hook: `You do not need a film crew to launch trust-building ${safeBusinessType} ads.`,
      cta: 'Use the quick-start checklist before you buy another tool.',
    },
    {
      angle: 'Offer',
      hook: `What your ${safeAudience.toLowerCase()} really need is a frictionless first CTA.`,
      cta: 'Offer the free trial, audit, or walkthrough in the first 10 seconds.',
    },
    {
      angle: 'Urgency',
      hook: `Time-boxed ${safeBusinessType} offers convert better when the deadline is visible.`,
      cta: 'Add a real deadline and pin the CTA comment.',
    },
    {
      angle: 'FAQ',
      hook: `Answer the “does this work for my market?” question before they ask it.`,
      cta: 'Turn the reply into tomorrow’s reel.',
    },
  ];
  const formats = ['Reel', 'Story', 'Carousel', 'Email', 'Short'];

  return Array.from({ length: 30 }, (_, index) => {
    const pillar = pillars[index % pillars.length];
    return {
      day: index + 1,
      format: formats[index % formats.length],
      angle: pillar.angle,
      hook: pillar.hook,
      cta: pillar.cta,
    };
  });
}

function buildLocalLeadPacket({
  brandName,
  businessType,
  audience,
  painPoint,
  proofMetric,
  offer,
  freeTrialDays,
  urgencyHours,
}) {
  const safeBrandName = cleanText(brandName, 'Lead Hook System');
  const safeBusinessType = cleanText(businessType, 'real estate');
  const safeAudience = cleanText(audience, 'Real estate agents');
  const safeOffer = cleanText(offer, 'Unlimited AI ad generation');

  return {
    useCase: 'local-leads',
    brandName: safeBrandName,
    overlayLines: buildOverlayLines({
      audience: safeAudience,
      painPoint,
      businessType: safeBusinessType,
      proofMetric,
      offer: safeOffer,
      freeTrialDays,
      urgencyHours,
      brandName: safeBrandName,
    }),
    shortScript: [
      `${safeAudience}, if you're still guessing what to post, start with the pain your clients already admit out loud.`,
      `Then show the proof: one offer, one win, one next step.`,
      `Finally, make the CTA frictionless: ${safeOffer}.`,
    ].join(' '),
    hooks: buildLeadHooks({
      audience: safeAudience,
      businessType: safeBusinessType,
      proofMetric,
      brandName: safeBrandName,
    }),
    landingPage: buildLandingPage({
      businessType: safeBusinessType,
      audience: safeAudience,
      offer: safeOffer,
      brandName: safeBrandName,
    }),
    contentCalendar: buildThirtyDayCalendar({
      businessType: safeBusinessType,
      audience: safeAudience,
      offer: safeOffer,
    }),
    complianceNotes: buildComplianceNotes({
      proofMetric,
      brandName: safeBrandName,
    }),
  };
}

function packetToMarkdown(packet) {
  if (packet.useCase === 'amazon-ugc') {
    return [
      '# UGC Review Packet',
      '',
      '## Visual Prompt',
      packet.visualPrompt,
      '',
      '## Script',
      packet.script,
      '',
      '## Publish Checklist',
      ...packet.checklist.map((item) => `- ${item}`),
    ].join('\n');
  }

  return [
    `# ${packet.brandName} Campaign Packet`,
    '',
    '## Overlay Copy',
    ...packet.overlayLines.map((line) => `- ${line}`),
    '',
    '## Short Script',
    packet.shortScript,
    '',
    '## Hooks',
    ...packet.hooks.map((hook) => `- ${hook}`),
    '',
    '## Landing Page',
    `- **Hero:** ${packet.landingPage.hero}`,
    `- **Subhead:** ${packet.landingPage.subhead}`,
    ...packet.landingPage.bullets.map((bullet) => `- ${bullet}`),
    `- **CTA:** ${packet.landingPage.cta}`,
    '',
    '## 30-Day Content Plan',
    '| Day | Format | Angle | Hook | CTA |',
    '| --- | --- | --- | --- | --- |',
    ...packet.contentCalendar.map(
      (entry) => `| ${entry.day} | ${entry.format} | ${entry.angle} | ${entry.hook} | ${entry.cta} |`
    ),
    '',
    '## Compliance Notes',
    ...packet.complianceNotes.map((note) => `- ${note}`),
  ].join('\n');
}

module.exports = {
  buildAmazonReviewPacket,
  buildLocalLeadPacket,
  buildThirtyDayCalendar,
  normalizeUrgencyHours,
  packetToMarkdown,
};
