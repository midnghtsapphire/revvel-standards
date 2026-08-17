/**
 * Browser-safe WR title helpers.
 *
 * Mirrors the deterministic rules in scripts/wr-autotitle.js so the studio UI
 * works without a server or API key. Keep behavior in sync when changing either
 * file — root tests cover the Node engine; products/wr-title-studio/tests cover
 * this module.
 */

export type TitleTemplate = {
  key: string;
  title: string;
  usage: string;
  keywords: string[];
  example?: string;
};

export type TitleStarter = {
  key: string;
  title: string;
  body: string;
};

export const DEFAULT_PREFIX = '[WR]';
export const DEFAULT_MAX_LENGTH = 100;

export const NOISE_TOKENS = [
  '/dragnet',
  '/scaffold',
  '/builder',
  '/product-build',
  '/professor',
  '/oaudrey',
  '/mindmappr',
  '/openrouter',
  '/orbit',
  '/circleci',
  '/octo',
  '/octopus',
  '/mabl',
  '/persona',
  '/wr-title',
  '/title',
];

export const TEMPLATES: TitleTemplate[] = [
  {
    key: 'fleet-maintenance',
    title: 'Fleet maintenance — {subject}',
    usage: 'Recurring org/repo maintenance WRs',
    keywords: ['fleet maintenance', 'fleet-maintenance', 'fleet maint'],
    example: 'Fleet maintenance — midnghtsapphire/ocean2-v2-research',
  },
  {
    key: 'wire-in',
    title: 'Wire in {subject}',
    usage: 'Integrate an external tool, action, MCP, or service',
    keywords: ['wire in', 'wire-in', 'integrate', 'hook up'],
    example: 'Wire in chrome-devtools-mcp',
  },
  {
    key: 'ship-to-market',
    title: 'Ship to market — {subject}',
    usage: 'Launch / store deploy / go-to-market packaging',
    keywords: ['ship to market', 'ship-to-market', 'go to market', 'launch'],
    example: 'Ship to market — openmythos',
  },
  {
    key: 'deep-research',
    title: 'Deep research — {subject}',
    usage: 'Research-first WRs (tools, repos, markets)',
    keywords: ['deep research', 'research this', 'investigate', 'evaluate'],
    example: 'Deep research — caspian-sdk',
  },
  {
    key: 'fix-ci',
    title: 'Fix CI — {subject}',
    usage: 'Broken checks, workflows, secrets, gates',
    keywords: ['fix ci', 'ci failure', 'workflow fail', 'broken ci', 'asap'],
    example: 'Fix CI — OPENROUTER_API_KEY header character',
  },
  {
    key: 'add-feature',
    title: 'Add {subject}',
    usage: 'New capability inside an existing system',
    keywords: ['add ', 'need ability', 'need a', 'we need'],
    example: 'Add WR title autocreate',
  },
  {
    key: 'create-product',
    title: 'Create {subject}',
    usage: 'Greenfield product / app / engine',
    keywords: ['create a', 'create product', 'build a', 'new app', 'greenfield'],
    example: 'Create prompt generation website',
  },
  {
    key: 'implement',
    title: 'Implement {subject}',
    usage: 'Spec already exists; build it',
    keywords: ['implement', 'implementation', 'blue team'],
    example: 'Implement blue-team review lane',
  },
  {
    key: 'update',
    title: 'Update {subject}',
    usage: 'Refresh existing docs, templates, engines',
    keywords: ['update ', 'refresh ', 'fine tune', 'fine-tune'],
    example: 'Update research engine prompt stack',
  },
  {
    key: 'formal-audit',
    title: 'Formal audit — {subject}',
    usage: 'Formal / structural / duplicate-risk audit tickets',
    keywords: ['formal:', 'duplicate_risk', 'structural_conflict', 'weekly audit'],
    example: 'Formal audit — npm_and_yarn group bump',
  },
  {
    key: 'dragnet-scaffold',
    title: 'DRAGNET scaffold — {subject}',
    usage: 'Product scaffold / error triage via DRAGNET',
    keywords: ['dragnet', 'scaffold'],
    example: 'DRAGNET scaffold — self-optimizing star magnet',
  },
  {
    key: 'generic',
    title: '{subject}',
    usage: 'Fallback when no specialty template matches',
    keywords: [],
    example: 'Organize chat into correct deployment',
  },
];

export const STARTERS: TitleStarter[] = [
  { key: 'wr-title-fleet', title: 'WR title: Fleet maintenance', body: '[WR] Fleet maintenance — <org/repo>' },
  { key: 'wr-title-wire-in', title: 'WR title: Wire in', body: '[WR] Wire in <tool-or-service>' },
  { key: 'wr-title-ship', title: 'WR title: Ship to market', body: '[WR] Ship to market — <product>' },
  { key: 'wr-title-research', title: 'WR title: Deep research', body: '[WR] Deep research — <topic-or-url>' },
  { key: 'wr-title-fix-ci', title: 'WR title: Fix CI', body: '[WR] Fix CI — <failing check>' },
  { key: 'wr-title-add', title: 'WR title: Add feature', body: '[WR] Add <capability>' },
  { key: 'wr-title-create', title: 'WR title: Create product', body: '[WR] Create <product-or-engine>' },
  { key: 'wr-title-implement', title: 'WR title: Implement', body: '[WR] Implement <spec-or-feature>' },
];

const URL_RE = /https?:\/\/[^\s)]+/gi;
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const MULTI_SPACE_RE = /\s+/g;
const TRAILING_PUNCT_RE = /[\s.,;:!?/_-]+$/g;
const LEADING_PUNCT_RE = /^[\s.,;:!?/_-]+/g;
const WR_PREFIX_RE = /^\[WR\]\s*/i;

function softCapitalize(subject: string): string {
  const s = subject.trim();
  if (!s) return s;
  if (s.includes('/') || s.startsWith('@')) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (/[A-Z]{2,}/.test(s) || /[a-z][A-Z]/.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function stripNoise(text: string): string {
  let out = String(text || '');
  out = out.replace(MARKDOWN_LINK_RE, (_m, label: string, url: string) => {
    const labelText = String(label || '').trim();
    if (labelText && !/^https?:/i.test(labelText)) return labelText;
    try {
      const u = new URL(url);
      return u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    } catch {
      return '';
    }
  });
  out = out.replace(URL_RE, (url) => {
    try {
      const u = new URL(url);
      return u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    } catch {
      return '';
    }
  });
  for (const token of NOISE_TOKENS) {
    out = out.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  out = out.replace(/\[WR\]/gi, ' ');
  return out;
}

export function normalizeSubject(text: string): string {
  let out = stripNoise(text);
  out = out.replace(WR_PREFIX_RE, '');
  out = out.replace(MULTI_SPACE_RE, ' ').trim();
  out = out.replace(TRAILING_PUNCT_RE, '').replace(LEADING_PUNCT_RE, '').trim();
  out = out
    .replace(/^(?:need ability to|need to|i need to|i need|we need to|we need|please|pls)\s+/i, '')
    .replace(/^(?:to\s+)/i, '')
    .trim();
  if (out.length > 140) {
    const cut = out.search(/[.;](?:\s|$)/);
    if (cut > 20 && cut < 120) out = out.slice(0, cut).trim();
  }
  return out;
}

export function formatTitle(bodyWithoutPrefix: string, maxLength = DEFAULT_MAX_LENGTH): string {
  let body = String(bodyWithoutPrefix || '')
    .replace(WR_PREFIX_RE, '')
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
  body = softCapitalize(body);
  let full = `${DEFAULT_PREFIX} ${body}`.replace(MULTI_SPACE_RE, ' ').trim();
  if (full.length > maxLength) {
    const budget = maxLength - DEFAULT_PREFIX.length - 2;
    let clipped = body.slice(0, Math.max(8, budget)).trim();
    clipped = clipped.replace(/[,:;.\-_/]+$/g, '').trim();
    full = `${DEFAULT_PREFIX} ${clipped}…`;
    if (full.length > maxLength) full = `${full.slice(0, maxLength - 1)}…`;
  }
  return full;
}

export function matchTemplate(text: string): { template: TitleTemplate; subject: string } | null {
  // Match keywords before filler-phrase stripping ("need ability to …").
  let matchHay = stripNoise(text);
  matchHay = matchHay.replace(WR_PREFIX_RE, '').replace(MULTI_SPACE_RE, ' ').trim();
  const hay = matchHay.toLowerCase();
  const normalized = normalizeSubject(text);
  for (const template of TEMPLATES) {
    if (template.key === 'generic') continue;
    const hit = template.keywords.find((k) => k && hay.includes(k.toLowerCase()));
    if (!hit) continue;
    let subject = normalized;
    const hitRe = new RegExp(`^${hit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:—]?\\s*`, 'i');
    subject = subject.replace(hitRe, '').trim();
    subject = subject
      .replace(/^(?:a|an|the|to|for|of)\s+/i, '')
      .replace(/^(?:feature|ability|capability)\s+(?:to\s+)?/i, '')
      .replace(/^(?:to\s+)/i, '')
      .trim();
    if (!subject) subject = normalized;
    return { template, subject: softCapitalize(subject) };
  }
  const generic = TEMPLATES.find((t) => t.key === 'generic');
  if (generic && normalized) {
    return { template: generic, subject: softCapitalize(normalized) };
  }
  return null;
}

export function suggestTitle(input: {
  title?: string;
  summary?: string;
  force?: boolean;
}): { title: string; templateKey: string | null; reason: string } {
  const rawTitle = String(input.title || '');
  const summary = String(input.summary || '');
  const substance = normalizeSubject(rawTitle);
  // Keep filler phrases ("need ability to") for keyword matching.
  const seed = [rawTitle, summary].filter(Boolean).join('\n');
  const matched = matchTemplate(seed || rawTitle);
  if (matched) {
    const filled = matched.template.title.replace(/\{subject\}/g, matched.subject || 'untitled work');
    return {
      title: formatTitle(filled),
      templateKey: matched.template.key,
      reason: `template:${matched.template.key}`,
    };
  }
  return {
    title: formatTitle(substance || 'Untitled work request'),
    templateKey: null,
    reason: substance ? 'normalized' : 'empty-after-clean',
  };
}
