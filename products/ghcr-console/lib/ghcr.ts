/**
 * Client-safe GHCR model for the status UI.
 *
 * The authoritative filesystem auditor lives at `scripts/ghcr-setup.js`
 * (root `npm test`). This module mirrors image-ref helpers + pure classifiers
 * so the product can render without Node `fs` in the browser.
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
  registry: string;
  image: string;
  packageUrl: string;
  blog: string;
  checked_at: string;
};

export type ImageRefs = {
  registry: string;
  owner: string;
  repo: string;
  packageName: string;
  image: string;
  tag: string;
  tagged: string;
  pull: string;
  run: string;
  packageUrl: string;
};

/** Expected repo surfaces — keep ids aligned with scripts/ghcr-setup.js. */
export const SURFACE_CATALOG: Omit<SurfaceStatus, 'ok' | 'detail'>[] = [
  {
    id: 'publish-workflow',
    label: 'GHCR publish workflow',
    path: '.github/workflows/ghcr-publish.yml',
  },
  {
    id: 'product-dockerfile',
    label: 'Product Dockerfile',
    path: 'products/ghcr-console/Dockerfile',
  },
  {
    id: 'root-dockerfile',
    label: 'Root Dockerfile (ship-to-market docker channel)',
    path: 'Dockerfile',
  },
  {
    id: 'status-product',
    label: 'GHCR console product app',
    path: 'products/ghcr-console',
  },
  {
    id: 'setup-doc',
    label: 'GHCR setup documentation',
    path: 'docs/GHCR_SETUP.md',
  },
  {
    id: 'live-docs-page',
    label: 'Live docs test page',
    path: 'docs/ghcr-console/index.html',
  },
  {
    id: 'root-tests',
    label: 'Root regression tests',
    path: 'tests/ghcr-setup.test.js',
  },
  {
    id: 'secrets-map',
    label: 'Secrets map documents GHCR names',
    path: 'docs/SECRETS_MAP.md',
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
  {
    id: 'app-deployments',
    label: 'app-deployments.yml entry',
    path: 'docs/app-deployments.yml',
  },
  {
    id: 'docker-standard',
    label: 'DOCKER.md documents GHCR',
    path: 'standards/DOCKER.md',
  },
];

export function toGhcrSlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '');
}

export function buildImageRefs(opts: {
  owner?: string;
  repo?: string;
  packageName?: string;
  tag?: string;
} = {}): ImageRefs {
  // Explicit empty strings must fail closed (do not silently fall back).
  if (Object.prototype.hasOwnProperty.call(opts, 'owner') && !String(opts.owner || '').trim()) {
    throw new Error('owner, repo, and packageName are required for GHCR image refs');
  }
  if (Object.prototype.hasOwnProperty.call(opts, 'repo') && !String(opts.repo || '').trim()) {
    throw new Error('owner, repo, and packageName are required for GHCR image refs');
  }
  if (
    Object.prototype.hasOwnProperty.call(opts, 'packageName') &&
    !String(opts.packageName || '').trim()
  ) {
    throw new Error('owner, repo, and packageName are required for GHCR image refs');
  }
  const owner = toGhcrSlug(opts.owner || 'midnghtsapphire');
  const repo = toGhcrSlug(opts.repo || 'revvel-standards');
  const packageName = toGhcrSlug(opts.packageName || 'ghcr-console');
  const tag = String(opts.tag || 'latest').replace(/^:/, '');
  if (!owner || !repo || !packageName) {
    throw new Error('owner, repo, and packageName are required for GHCR image refs');
  }
  if (!tag || /\s/.test(tag)) {
    throw new Error('tag must be a non-empty token without whitespace');
  }
  const image = `ghcr.io/${owner}/${repo}/${packageName}`;
  return {
    registry: 'ghcr.io',
    owner,
    repo,
    packageName,
    image,
    tag,
    tagged: `${image}:${tag}`,
    pull: `docker pull ${image}:${tag}`,
    run: `docker run --rm -p 3012:3012 ${image}:${tag}`,
    packageUrl: `https://github.com/${owner}/${repo}/pkgs/container/${packageName}`,
  };
}

export function externalSetupSteps(): SetupStep[] {
  return [
    {
      id: 'confirm-packages-write',
      title: 'Confirm Actions can write packages (repo default GITHUB_TOKEN)',
      href: 'https://github.com/midnghtsapphire/revvel-standards/settings/actions',
      detail:
        'GitHub → revvel-standards → Settings → Actions → General → Workflow permissions → Read and write permissions (or keep job-level packages: write). Save.',
    },
    {
      id: 'run-publish-workflow',
      title: 'Run workflow “GHCR publish” once on main (or merge this PR)',
      href: 'https://github.com/midnghtsapphire/revvel-standards/actions/workflows/ghcr-publish.yml',
      detail:
        'Actions → GHCR publish → Run workflow → branch main. Green job = image pushed.',
    },
    {
      id: 'set-package-visibility',
      title: 'Set package visibility (public or internal) in Packages UI',
      href: 'https://github.com/midnghtsapphire/revvel-standards/pkgs/container/ghcr-console',
      detail:
        'Packages → ghcr-console → Package settings → Change visibility. Public = anonymous pull; private needs read:packages.',
    },
    {
      id: 'link-package-to-repo',
      title: 'Link package to this repository (if not auto-linked)',
      href: 'https://github.com/midnghtsapphire/revvel-standards/pkgs/container/ghcr-console',
      detail:
        'Package settings → Repository source → Connect repository → midnghtsapphire/revvel-standards.',
    },
    {
      id: 'optional-read-token',
      title: 'Optional: create GHCR_READ_TOKEN for private pulls on other hosts',
      href: 'https://github.com/settings/tokens?type=beta',
      detail:
        'Fine-grained token → Packages Read. Store as GHCR_READ_TOKEN on deploy hosts only (name in docs/SECRETS_MAP.md).',
    },
    {
      id: 'verify-pull',
      title: 'Verify pull + run locally',
      href: 'https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry',
      detail:
        'docker pull ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest && docker run --rm -p 3012:3012 …',
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
  const refs = buildImageRefs();
  return {
    wired,
    score: `${passed}/${total}`,
    passed,
    total,
    surfaces,
    summary: wired
      ? `GitHub Container Registry IS wired into revvel-standards (${passed}/${total} surfaces).`
      : `GitHub Container Registry is NOT fully wired into revvel-standards (${passed}/${total} surfaces).`,
    product: 'GitHub Container Registry',
    repo: 'midnghtsapphire/revvel-standards',
    docs: 'docs/GHCR_SETUP.md',
    app: 'products/ghcr-console',
    registry: 'ghcr.io',
    image: refs.image,
    packageUrl: refs.packageUrl,
    blog: 'https://github.blog/news-insights/product-news/introducing-github-container-registry/',
    checked_at: new Date().toISOString(),
  };
}

/** Default shipped state after WR #17695 — all repo surfaces present. */
export function shippedReport(): WiringReport {
  const okById: Record<string, boolean> = {};
  for (const s of SURFACE_CATALOG) okById[s.id] = true;
  return buildReport(okById);
}

export function answerLine(report: WiringReport): string {
  return report.wired
    ? 'YES — GitHub Container Registry is wired into revvel-standards (repo-side).'
    : 'NO — GitHub Container Registry is not fully wired into revvel-standards yet.';
}
