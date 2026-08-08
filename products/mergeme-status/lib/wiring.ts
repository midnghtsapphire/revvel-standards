/**
 * Client-safe MergeMe wiring model for the status UI.
 *
 * The authoritative filesystem auditor lives at
 * `scripts/mergeme-wiring.js` (root `npm test`). This module mirrors the
 * surface catalog + pure classifiers so the product can render without
 * Node `fs` in the browser, and so product tests stay fast.
 */

export type SurfaceStatus = {
  id: string;
  label: string;
  path: string;
  ok: boolean;
  detail: string;
};

export type SetupStep = {
  id: string;
  title: string;
  href: string;
  detail: string;
};

export type WiringReport = {
  wired: boolean;
  score: string;
  passed: number;
  total: number;
  surfaces: SurfaceStatus[];
  summary: string;
  product: string;
  repo: string;
  docs: string;
  app: string;
  marketplace: string;
  site: string;
  checked_at: string;
};

/** Expected repo surfaces — keep ids aligned with scripts/mergeme-wiring.js. */
export const SURFACE_CATALOG: Omit<SurfaceStatus, 'ok' | 'detail'>[] = [
  {
    id: 'connections-registry',
    label: 'Connections registry entry',
    path: 'config/connections.yml',
  },
  {
    id: 'integration-doc',
    label: 'Integration documentation',
    path: 'docs/MERGEME_INTEGRATION.md',
  },
  {
    id: 'status-workflow',
    label: 'Status workflow',
    path: '.github/workflows/mergeme-status.yml',
  },
  {
    id: 'status-product',
    label: 'Status product app',
    path: 'products/mergeme-status',
  },
  {
    id: 'live-docs-page',
    label: 'Live docs test page',
    path: 'docs/mergeme-status/index.html',
  },
  {
    id: 'root-tests',
    label: 'Root regression tests',
    path: 'tests/mergeme-wiring.test.js',
  },
  {
    id: 'agents-port',
    label: 'AGENTS.md port assignment',
    path: 'AGENTS.md',
  },
  {
    id: 'app-registry',
    label: 'APP_REGISTRY catalog entry',
    path: 'docs/APP_REGISTRY.md',
  },
];

export const MERGEME_APP_SLUGS = ['mergeme-app', 'mergeme', 'merge-me'] as const;

export function isMergeMeInstallation(installation: {
  app_slug?: string;
  slug?: string;
  app_name?: string;
  name?: string;
} | null): boolean {
  if (!installation || typeof installation !== 'object') return false;
  const slug = String(installation.app_slug || installation.slug || '').toLowerCase();
  if ((MERGEME_APP_SLUGS as readonly string[]).includes(slug)) return true;
  const name = String(installation.app_name || installation.name || '').toLowerCase();
  return name.includes('mergeme') || name.includes('merge me') || name === 'merge-me';
}

export function isMergeMeBotLogin(login: string): boolean {
  if (!login) return false;
  const normalized = String(login).toLowerCase();
  if (
    normalized === 'mergeme-app[bot]' ||
    normalized === 'mergeme[bot]' ||
    normalized === 'merge-me[bot]'
  ) {
    return true;
  }
  return normalized.includes('mergeme') && normalized.includes('[bot]');
}

export function externalSetupSteps(): SetupStep[] {
  return [
    {
      id: 'install-github-app',
      title: 'Install MergeMe GitHub App on the org/repo',
      href: 'https://github.com/marketplace/mergeme-app',
      detail:
        'GitHub → marketplace → MergeMe App → Install → select midnghtsapphire/revvel-standards.',
    },
    {
      id: 'connect-slack',
      title: 'Connect Slack workspace at mergeme.dev',
      href: 'https://mergeme.dev',
      detail: 'Sign in at mergeme.dev, authorize Slack, pick the workspace for PR cards.',
    },
    {
      id: 'map-repo-channel',
      title: 'Map revvel-standards → Slack channel',
      href: 'https://mergeme.dev',
      detail: 'Map midnghtsapphire/revvel-standards to the target channel (e.g. #revvel-prs).',
    },
    {
      id: 'map-users',
      title: 'Map GitHub users → Slack users',
      href: 'https://mergeme.dev',
      detail: 'Pair handles so @mentions ping real Slack users.',
    },
    {
      id: 'verify-card',
      title: 'Open a test PR and confirm one updating Slack card',
      href: 'https://mergeme.dev',
      detail: 'One card per PR that edits in place — not a flood of messages.',
    },
  ];
}

/**
 * Build a report from an explicit ok-map (used by UI + tests).
 * Missing ids default to false (fail closed).
 */
export function buildReport(
  okById: Record<string, boolean>,
  details: Record<string, string> = {}
): WiringReport {
  const surfaces: SurfaceStatus[] = SURFACE_CATALOG.map((s) => ({
    ...s,
    ok: Boolean(okById[s.id]),
    detail: details[s.id] || (okById[s.id] ? `${s.path} present` : `${s.path} missing`),
  }));
  const passed = surfaces.filter((s) => s.ok).length;
  const total = surfaces.length;
  const wired = passed === total;
  return {
    wired,
    score: `${passed}/${total}`,
    passed,
    total,
    surfaces,
    summary: wired
      ? `MergeMe.dev IS wired into revvel-standards (${passed}/${total} surfaces).`
      : `MergeMe.dev is NOT fully wired into revvel-standards (${passed}/${total} surfaces).`,
    product: 'mergeme.dev',
    repo: 'midnghtsapphire/revvel-standards',
    docs: 'docs/MERGEME_INTEGRATION.md',
    app: 'products/mergeme-status',
    marketplace: 'https://github.com/marketplace/mergeme-app',
    site: 'https://mergeme.dev',
    checked_at: new Date().toISOString(),
  };
}

/** Default shipped state after WR #16824 — all repo surfaces present. */
export function shippedReport(): WiringReport {
  const okById: Record<string, boolean> = {};
  for (const s of SURFACE_CATALOG) okById[s.id] = true;
  return buildReport(okById);
}

export function answerLine(report: WiringReport): string {
  return report.wired
    ? 'YES — MergeMe.dev is wired into revvel-standards (repo-side).'
    : 'NO — MergeMe.dev is not fully wired into revvel-standards yet.';
}
