#!/usr/bin/env node
'use strict';

/**
 * GitHub Container Registry (GHCR) setup auditor for revvel-standards.
 *
 * Answer to WR #17695 ("setup github container registry"):
 * this module is the machine-checkable SSOT for "GHCR is wired". A registry
 * path is considered wired only when the repo-side surfaces below are present
 * and consistent — workflow packages:write, Dockerfile, product console, docs,
 * tests, and secret-name documentation (no secret values).
 *
 * Pure helpers are exported for tests and the product UI. The CLI
 * (`node scripts/ghcr-setup.js`) prints a JSON report and exits 0 only when
 * every required surface is present (exit 1 = not fully wired).
 *
 * Auth model (same-repo push):
 *   - Job GITHUB_TOKEN + permissions.packages: write — no extra secret.
 * Optional pull from external hosts:
 *   - GHCR_READ_TOKEN (read:packages) — name only in docs/SECRETS_MAP.md.
 *
 * Image naming: GHCR requires lowercase. Default package:
 *   ghcr.io/<owner-lower>/<repo-lower>/ghcr-console
 *
 * Reference: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const DEFAULT_OWNER = 'midnghtsapphire';
const DEFAULT_REPO = 'revvel-standards';
const DEFAULT_PACKAGE = 'ghcr-console';
const REGISTRY_HOST = 'ghcr.io';

/** Required repo surfaces that prove GHCR is wired into revvel-standards. */
const REQUIRED_SURFACES = [
  {
    id: 'publish-workflow',
    label: 'GHCR publish workflow',
    path: '.github/workflows/ghcr-publish.yml',
    check: (root) => {
      const rel = '.github/workflows/ghcr-publish.yml';
      const p = path.join(root, rel);
      if (!fs.existsSync(p)) return { ok: false, detail: `${rel} missing` };
      const text = fs.readFileSync(p, 'utf8');
      const hasRegistry = /ghcr\.io/i.test(text);
      const hasPackagesWrite = /packages:\s*write/i.test(text);
      const hasLogin = /docker\/login-action/i.test(text);
      const hasPush = /docker\/build-push-action/i.test(text) || /docker push/i.test(text);
      if (!hasRegistry) return { ok: false, detail: `${rel} missing ghcr.io registry` };
      if (!hasPackagesWrite) {
        return { ok: false, detail: `${rel} missing permissions.packages: write` };
      }
      if (!hasLogin) return { ok: false, detail: `${rel} missing docker/login-action` };
      if (!hasPush) return { ok: false, detail: `${rel} missing build/push step` };
      return { ok: true, detail: `${rel} publishes to ghcr.io with packages:write` };
    },
  },
  {
    id: 'product-dockerfile',
    label: 'Product Dockerfile',
    path: 'products/ghcr-console/Dockerfile',
    check: (root) => {
      const rel = 'products/ghcr-console/Dockerfile';
      const p = path.join(root, rel);
      if (!fs.existsSync(p)) return { ok: false, detail: `${rel} missing` };
      const text = fs.readFileSync(p, 'utf8');
      const hasFrom = /^\s*FROM\s+/im.test(text);
      const hasHealth = /HEALTHCHECK/i.test(text);
      if (!hasFrom) return { ok: false, detail: `${rel} missing FROM` };
      if (!hasHealth) return { ok: false, detail: `${rel} missing HEALTHCHECK` };
      return { ok: true, detail: `${rel} multi-stage image with HEALTHCHECK` };
    },
  },
  {
    id: 'root-dockerfile',
    label: 'Root Dockerfile (ship-to-market docker channel)',
    path: 'Dockerfile',
    check: (root) => {
      const rel = 'Dockerfile';
      const p = path.join(root, rel);
      if (!fs.existsSync(p)) return { ok: false, detail: `${rel} missing` };
      const text = fs.readFileSync(p, 'utf8');
      if (!/ghcr-console|HEALTHCHECK/i.test(text)) {
        return { ok: false, detail: `${rel} present but not GHCR-console oriented` };
      }
      return { ok: true, detail: `${rel} present for monorepo docker delivery` };
    },
  },
  {
    id: 'status-product',
    label: 'GHCR console product app',
    path: 'products/ghcr-console',
    check: (root) => {
      const pkg = path.join(root, 'products/ghcr-console/package.json');
      const page = path.join(root, 'products/ghcr-console/app/page.tsx');
      const lib = path.join(root, 'products/ghcr-console/lib/ghcr.ts');
      if (!fs.existsSync(pkg) || !fs.existsSync(page) || !fs.existsSync(lib)) {
        return { ok: false, detail: 'products/ghcr-console app files missing' };
      }
      return { ok: true, detail: 'products/ghcr-console package + page + lib present' };
    },
  },
  {
    id: 'setup-doc',
    label: 'GHCR setup documentation',
    path: 'docs/GHCR_SETUP.md',
    check: (root) => fileExists(root, 'docs/GHCR_SETUP.md', /ghcr\.io/i),
  },
  {
    id: 'live-docs-page',
    label: 'Live docs test page',
    path: 'docs/ghcr-console/index.html',
    check: (root) => fileExists(root, 'docs/ghcr-console/index.html', /ghcr/i),
  },
  {
    id: 'root-tests',
    label: 'Root regression tests',
    path: 'tests/ghcr-setup.test.js',
    check: (root) => fileExists(root, 'tests/ghcr-setup.test.js', /ghcr/i),
  },
  {
    id: 'secrets-map',
    label: 'Secrets map documents GHCR names',
    path: 'docs/SECRETS_MAP.md',
    check: (root) => {
      const rel = 'docs/SECRETS_MAP.md';
      const p = path.join(root, rel);
      if (!fs.existsSync(p)) return { ok: false, detail: `${rel} missing` };
      const text = fs.readFileSync(p, 'utf8');
      // GITHUB_TOKEN is automatic; document GHCR_READ_TOKEN for external pulls.
      const hasRead = /GHCR_READ_TOKEN/.test(text);
      const hasGhcr = /ghcr|container registry/i.test(text);
      if (!hasRead || !hasGhcr) {
        return {
          ok: false,
          detail: `${rel} must document GHCR_READ_TOKEN and GHCR usage`,
        };
      }
      return { ok: true, detail: `${rel} lists GHCR_READ_TOKEN (name only)` };
    },
  },
  {
    id: 'agents-port',
    label: 'AGENTS.md port assignment',
    path: 'AGENTS.md',
    check: (root) => {
      const p = path.join(root, 'AGENTS.md');
      if (!fs.existsSync(p)) return { ok: false, detail: 'AGENTS.md missing' };
      const text = fs.readFileSync(p, 'utf8');
      const ok = /ghcr-console/i.test(text) && /3012/.test(text);
      return ok
        ? { ok: true, detail: 'ghcr-console listed on port 3012 in AGENTS.md' }
        : { ok: false, detail: 'ghcr-console / port 3012 missing from AGENTS.md' };
    },
  },
  {
    id: 'app-registry',
    label: 'APP_REGISTRY catalog entry',
    path: 'docs/APP_REGISTRY.md',
    check: (root) => {
      const p = path.join(root, 'docs/APP_REGISTRY.md');
      if (!fs.existsSync(p)) return { ok: false, detail: 'docs/APP_REGISTRY.md missing' };
      const text = fs.readFileSync(p, 'utf8');
      const ok = /products\/ghcr-console/.test(text);
      return ok
        ? { ok: true, detail: 'products/ghcr-console listed in APP_REGISTRY.md' }
        : { ok: false, detail: 'products/ghcr-console missing from APP_REGISTRY.md' };
    },
  },
  {
    id: 'app-deployments',
    label: 'app-deployments.yml entry',
    path: 'docs/app-deployments.yml',
    check: (root) => {
      const p = path.join(root, 'docs/app-deployments.yml');
      if (!fs.existsSync(p)) return { ok: false, detail: 'docs/app-deployments.yml missing' };
      const text = fs.readFileSync(p, 'utf8');
      const ok = /^\s*ghcr-console\s*:/m.test(text);
      return ok
        ? { ok: true, detail: 'ghcr-console registered in docs/app-deployments.yml' }
        : { ok: false, detail: 'ghcr-console missing from docs/app-deployments.yml' };
    },
  },
  {
    id: 'docker-standard',
    label: 'DOCKER.md documents GHCR',
    path: 'standards/DOCKER.md',
    check: (root) => fileExists(root, 'standards/DOCKER.md', /ghcr\.io/i),
  },
];

function fileExists(root, rel, contentRe) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return { ok: false, detail: `${rel} missing` };
  if (contentRe) {
    const text = fs.readFileSync(p, 'utf8');
    if (!contentRe.test(text)) {
      return { ok: false, detail: `${rel} exists but does not mention expected content` };
    }
  }
  return { ok: true, detail: `${rel} present` };
}

/**
 * Lowercase GHCR image path segments (registry requirement).
 * @param {string} value
 */
function toGhcrSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build canonical GHCR image references.
 * @param {{ owner?: string, repo?: string, packageName?: string, tag?: string }} [opts]
 */
function buildImageRefs(opts = {}) {
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
  const owner = toGhcrSlug(opts.owner || DEFAULT_OWNER);
  const repo = toGhcrSlug(opts.repo || DEFAULT_REPO);
  const packageName = toGhcrSlug(opts.packageName || DEFAULT_PACKAGE);
  const tag = String(opts.tag || 'latest').replace(/^:/, '');
  if (!owner || !repo || !packageName) {
    throw new Error('owner, repo, and packageName are required for GHCR image refs');
  }
  if (!tag || /\s/.test(tag)) {
    throw new Error('tag must be a non-empty token without whitespace');
  }
  const image = `${REGISTRY_HOST}/${owner}/${repo}/${packageName}`;
  return {
    registry: REGISTRY_HOST,
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

/**
 * Compose OCI/GitHub Actions-style tags for a publish.
 * @param {{ sha?: string, refName?: string, latestOnDefault?: boolean }} [meta]
 */
function composePublishTags(meta = {}) {
  const base = buildImageRefs({ tag: 'latest' }).image;
  const tags = new Set();
  const sha = meta.sha ? String(meta.sha).replace(/[^a-fA-F0-9]/g, '').slice(0, 40) : '';
  if (sha) tags.add(`${base}:sha-${sha.slice(0, 12)}`);
  const refName = String(meta.refName || '').replace(/^refs\/(heads|tags)\//, '');
  if (refName) {
    const safe = toGhcrSlug(refName).replace(/\//g, '-');
    if (safe) tags.add(`${base}:${safe}`);
  }
  if (meta.latestOnDefault !== false) tags.add(`${base}:latest`);
  return Array.from(tags);
}

/**
 * Audit repo-side GHCR wiring surfaces.
 * @param {string} [root=ROOT]
 */
function auditWiring(root = ROOT) {
  const surfaces = REQUIRED_SURFACES.map((s) => {
    const result = s.check(root);
    return {
      id: s.id,
      label: s.label,
      path: s.path,
      ok: Boolean(result.ok),
      detail: result.detail || '',
    };
  });
  const passed = surfaces.filter((s) => s.ok).length;
  const total = surfaces.length;
  const wired = passed === total;
  const refs = buildImageRefs();
  const summary = wired
    ? `GitHub Container Registry IS wired into revvel-standards (${passed}/${total} surfaces).`
    : `GitHub Container Registry is NOT fully wired into revvel-standards (${passed}/${total} surfaces).`;
  return {
    wired,
    score: `${passed}/${total}`,
    passed,
    total,
    surfaces,
    summary,
    product: 'GitHub Container Registry',
    repo: `${DEFAULT_OWNER}/${DEFAULT_REPO}`,
    docs: 'docs/GHCR_SETUP.md',
    app: 'products/ghcr-console',
    registry: REGISTRY_HOST,
    image: refs.image,
    packageUrl: refs.packageUrl,
    blog: 'https://github.blog/news-insights/product-news/introducing-github-container-registry/',
    checked_at: new Date().toISOString(),
  };
}

/**
 * Build a human-readable markdown status report for PR/issue comments.
 * @param {ReturnType<typeof auditWiring>} report
 */
function renderMarkdownReport(report) {
  const lines = [];
  lines.push('## GitHub Container Registry setup status');
  lines.push('');
  lines.push(report.wired ? '**Answer: YES — wired.**' : '**Answer: NO — not fully wired.**');
  lines.push('');
  lines.push(`Score: **${report.score}** · checked \`${report.checked_at}\``);
  lines.push('');
  lines.push(`Default image: \`${report.image}\``);
  lines.push('');
  lines.push('| Surface | Status | Detail |');
  lines.push('| --- | :---: | --- |');
  for (const s of report.surfaces) {
    lines.push(`| ${s.label} (\`${s.path}\`) | ${s.ok ? '✅' : '❌'} | ${s.detail} |`);
  }
  lines.push('');
  lines.push(`Product UI: \`${report.app}\` · Docs: \`${report.docs}\``);
  lines.push('');
  lines.push(`Packages UI: ${report.packageUrl}`);
  lines.push(`Intro: ${report.blog}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Owner click-paths that cannot be completed from a PR alone
 * (package visibility / org policy).
 */
function externalSetupSteps() {
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
        'Actions → GHCR publish → Run workflow → branch main. Green job = image pushed. Open the job log and copy the image tag line.',
    },
    {
      id: 'set-package-visibility',
      title: 'Set package visibility (public or internal) in Packages UI',
      href: 'https://github.com/midnghtsapphire/revvel-standards/pkgs/container/ghcr-console',
      detail:
        'GitHub → repo → Packages → ghcr-console → Package settings → Change visibility. Public = anonymous pull; private needs a token with read:packages.',
    },
    {
      id: 'link-package-to-repo',
      title: 'Link package to this repository (if not auto-linked)',
      href: 'https://github.com/midnghtsapphire/revvel-standards/pkgs/container/ghcr-console',
      detail:
        'Package settings → Repository source → Connect repository → midnghtsapphire/revvel-standards. Labels in the Dockerfile/workflow help auto-link.',
    },
    {
      id: 'optional-read-token',
      title: 'Optional: create GHCR_READ_TOKEN for private pulls on other hosts',
      href: 'https://github.com/settings/tokens?type=beta',
      detail:
        'GitHub → Settings → Developer settings → Fine-grained tokens → Generate → Permissions: Packages Read. Add secret name GHCR_READ_TOKEN on deploy hosts (never commit the value). Documented in docs/SECRETS_MAP.md.',
    },
    {
      id: 'verify-pull',
      title: 'Verify pull + run locally',
      href: 'https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry',
      detail:
        'docker login ghcr.io -u USERNAME --password-stdin <<< TOKEN (private only). Then: docker pull ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:latest && docker run --rm -p 3012:3012 …',
    },
  ];
}

function main() {
  const report = auditWiring(ROOT);
  let outPath = null;
  if (process.argv.includes('--out')) {
    const raw = process.argv[process.argv.indexOf('--out') + 1];
    if (!raw || raw.startsWith('-')) {
      console.error('ghcr-setup: --out requires a file path argument');
      process.exitCode = 2;
      return;
    }
    outPath = raw;
  }
  const json = JSON.stringify(report, null, 2);
  if (outPath) {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, json + '\n', 'utf8');
  }
  if (process.argv.includes('--markdown')) {
    process.stdout.write(renderMarkdownReport(report));
  } else if (process.argv.includes('--image')) {
    process.stdout.write(JSON.stringify(buildImageRefs(), null, 2) + '\n');
  } else {
    process.stdout.write(json + '\n');
  }
  process.exitCode = report.wired ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  REQUIRED_SURFACES,
  DEFAULT_OWNER,
  DEFAULT_REPO,
  DEFAULT_PACKAGE,
  REGISTRY_HOST,
  toGhcrSlug,
  buildImageRefs,
  composePublishTags,
  auditWiring,
  renderMarkdownReport,
  externalSetupSteps,
};
