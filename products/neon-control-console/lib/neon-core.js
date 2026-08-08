/**
 * neon-core.js — Neon API client, neonctl CLI generator, and GitHub Actions
 * workflow builder for the Neon Control Console.
 *
 * Pure CommonJS so root `node --test` can require it without a Next.js runtime.
 * The Next.js app re-exports these helpers from TypeScript route handlers.
 *
 * Auth: NEON_API_KEY goes in the Authorization header (Bearer). Never put the
 * key on a CLI argv in generated examples that run in CI — prefer
 * `NEON_API_KEY` env + `--api-key` omitted (neonctl reads the env), matching
 * CLAUDE.md gotcha #4.
 *
 * Fallback: when no API key is configured, callers should use DEMO_FIXTURES so
 * the playground still works for click-testing without secrets.
 */
'use strict';

const DEFAULT_API_HOST = 'https://console.neon.tech/api/v2';

/** Demo data used when NEON_API_KEY is missing (local/demo mode). */
const DEMO_FIXTURES = {
  projects: [
    {
      id: 'autumn-breeze-12345678',
      name: 'revvel-preview',
      region_id: 'aws-us-east-1',
      pg_version: 16,
      created_at: '2026-01-15T12:00:00Z',
      proxy_host: 'ep-demo-pooler.us-east-1.aws.neon.tech',
    },
    {
      id: 'quiet-forest-87654321',
      name: 'revvel-prod',
      region_id: 'aws-us-west-2',
      pg_version: 16,
      created_at: '2025-11-02T09:30:00Z',
      proxy_host: 'ep-prod-pooler.us-west-2.aws.neon.tech',
    },
  ],
  branches: {
    'autumn-breeze-12345678': [
      {
        id: 'br-main-aaaa',
        name: 'main',
        project_id: 'autumn-breeze-12345678',
        current_state: 'ready',
        default: true,
        created_at: '2026-01-15T12:00:00Z',
      },
      {
        id: 'br-preview-bbbb',
        name: 'preview/pr-42-feat-auth',
        project_id: 'autumn-breeze-12345678',
        current_state: 'ready',
        default: false,
        parent_id: 'br-main-aaaa',
        created_at: '2026-07-20T18:00:00Z',
        expires_at: '2026-08-03T18:00:00Z',
      },
    ],
    'quiet-forest-87654321': [
      {
        id: 'br-main-cccc',
        name: 'main',
        project_id: 'quiet-forest-87654321',
        current_state: 'ready',
        default: true,
        created_at: '2025-11-02T09:30:00Z',
      },
    ],
  },
};

/**
 * Slugify a git ref the same way `.github/workflows/neon-branch.yml` does so
 * CLI-generated preview names match what Actions will create/delete.
 *
 * @param {string} headRef
 * @param {number|string} prNumber
 * @returns {string}
 */
function slugifyPreviewBranch(headRef, prNumber) {
  const raw = String(headRef ?? '');
  let slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
  if (!slug) slug = 'branch';
  const n = String(prNumber ?? '').replace(/[^\d]/g, '') || '0';
  return `preview/pr-${n}-${slug}`;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.apiKey]
 * @param {string} [opts.apiHost]
 * @param {typeof fetch} [opts.fetchImpl]
 */
function createNeonClient(opts = {}) {
  const apiKey = opts.apiKey || '';
  const apiHost = (opts.apiHost || DEFAULT_API_HOST).replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl || globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available; pass fetchImpl to createNeonClient');
  }

  /**
   * @param {string} path
   * @param {RequestInit} [init]
   */
  async function request(path, init = {}) {
    if (!apiKey) {
      const err = new Error('NEON_API_KEY is not configured');
      // @ts-ignore
      err.code = 'NO_API_KEY';
      throw err;
    }
    const url = path.startsWith('http') ? path : `${apiHost}${path.startsWith('/') ? '' : '/'}${path}`;
    const headers = Object.assign(
      {
        Accept: 'application/json',
        // Header value only — never pass the key on CLI argv (CLAUDE.md #4).
        Authorization: 'Bearer ' + apiKey,
      },
      init.headers || {}
    );
    if (init.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetchImpl(url, { ...init, headers });
    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    if (!res.ok) {
      const msg =
        (body && (body.message || body.error)) ||
        `Neon API HTTP ${res.status}`;
      const err = new Error(String(msg));
      // @ts-ignore
      err.status = res.status;
      // @ts-ignore
      err.body = body;
      throw err;
    }
    return body;
  }

  return {
    apiHost,
    hasKey: Boolean(apiKey),
    async listProjects() {
      const data = await request('/projects');
      return Array.isArray(data?.projects) ? data.projects : [];
    },
    async listBranches(projectId) {
      if (!projectId) throw new Error('projectId is required');
      const data = await request(
        `/projects/${encodeURIComponent(projectId)}/branches`
      );
      return Array.isArray(data?.branches) ? data.branches : [];
    },
    async createBranch(projectId, { name, parentId, expiresAt } = {}) {
      if (!projectId) throw new Error('projectId is required');
      if (!name) throw new Error('branch name is required');
      const payload = {
        branch: {
          name,
          ...(parentId ? { parent_id: parentId } : {}),
          ...(expiresAt ? { expires_at: expiresAt } : {}),
        },
      };
      return request(`/projects/${encodeURIComponent(projectId)}/branches`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async deleteBranch(projectId, branchIdOrName) {
      if (!projectId) throw new Error('projectId is required');
      if (!branchIdOrName) throw new Error('branch id or name is required');
      return request(
        `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchIdOrName)}`,
        { method: 'DELETE' }
      );
    },
  };
}

/**
 * Build neonctl command strings for common operations.
 * Prefer env-based auth (`NEON_API_KEY`) over `--api-key` flags so secrets
 * never land on argv (ps/proc leak).
 *
 * @param {object} input
 * @param {string} input.action - list-projects | list-branches | create-branch | delete-branch | connection-string | auth-set-key | install
 * @param {string} [input.projectId]
 * @param {string} [input.branchName]
 * @param {string} [input.parent]
 * @param {boolean} [input.pooled]
 * @returns {{ command: string, description: string, notes: string[] }}
 */
function buildNeonctlCommand(input = {}) {
  const action = String(input.action || '').trim();
  const projectId = input.projectId ? String(input.projectId).trim() : '';
  const branchName = input.branchName ? String(input.branchName).trim() : '';
  const parent = input.parent ? String(input.parent).trim() : 'main';
  const notes = [
    'Install once: npm i -g neonctl  (or: npx neonctl …)',
    'Auth: export NEON_API_KEY=… then neonctl reads it automatically (no --api-key on argv).',
  ];

  switch (action) {
    case 'install':
      return {
        command: 'npm install -g neonctl',
        description: 'Install the Neon CLI globally',
        notes,
      };
    case 'auth-set-key':
      return {
        command: 'export NEON_API_KEY="your-neon-api-key"',
        description: 'Load API key into the shell environment (never commit the value)',
        notes: [
          ...notes,
          'Get a key: Neon Console → Account settings → API keys.',
          'In GitHub Actions use secrets.NEON_API_KEY instead of exporting locally.',
        ],
      };
    case 'list-projects':
      return {
        command: 'neonctl projects list --output json',
        description: 'List all Neon projects visible to the API key',
        notes,
      };
    case 'list-branches': {
      if (!projectId) {
        return {
          command: 'neonctl branches list --project-id <PROJECT_ID> --output json',
          description: 'List branches for a project (set projectId to fill the placeholder)',
          notes,
        };
      }
      return {
        command: `neonctl branches list --project-id ${shellQuote(projectId)} --output json`,
        description: `List branches in project ${projectId}`,
        notes,
      };
    }
    case 'create-branch': {
      const name = branchName || 'preview/pr-0-feature';
      if (!projectId) {
        return {
          command: `neonctl branches create --project-id <PROJECT_ID> --name ${shellQuote(name)} --parent ${shellQuote(parent)}`,
          description: 'Create a branch (set projectId to fill the placeholder)',
          notes,
        };
      }
      return {
        command: `neonctl branches create --project-id ${shellQuote(projectId)} --name ${shellQuote(name)} --parent ${shellQuote(parent)}`,
        description: `Create branch ${name} from ${parent}`,
        notes,
      };
    }
    case 'delete-branch': {
      const name = branchName || '<BRANCH_NAME>';
      if (!projectId) {
        return {
          command: `neonctl branches delete ${shellQuote(name)} --project-id <PROJECT_ID>`,
          description: 'Delete a branch by name (set projectId)',
          notes,
        };
      }
      return {
        command: `neonctl branches delete ${shellQuote(name)} --project-id ${shellQuote(projectId)}`,
        description: `Delete branch ${name}`,
        notes,
      };
    }
    case 'connection-string': {
      const name = branchName || 'main';
      const pooledFlag = input.pooled === false ? '' : ' --pooled';
      if (!projectId) {
        return {
          command: `neonctl connection-string ${shellQuote(name)} --project-id <PROJECT_ID>${pooledFlag}`,
          description: 'Print a Postgres connection string for a branch',
          notes: [
            ...notes,
            'Do not log the connection string — it contains credentials.',
          ],
        };
      }
      return {
        command: `neonctl connection-string ${shellQuote(name)} --project-id ${shellQuote(projectId)}${pooledFlag}`,
        description: `Connection string for branch ${name}`,
        notes: [
          ...notes,
          'Do not log the connection string — it contains credentials.',
        ],
      };
    }
    default: {
      const err = new Error(
        `Unknown neonctl action "${action}". Expected one of: install, auth-set-key, list-projects, list-branches, create-branch, delete-branch, connection-string`
      );
      // @ts-ignore
      err.code = 'BAD_ACTION';
      throw err;
    }
  }
}

/**
 * Quote a token for safe inclusion in a single shell command string.
 * @param {string} value
 */
function shellQuote(value) {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Generate a GitHub Actions workflow that creates/deletes Neon preview branches
 * per PR — same contract as `.github/workflows/neon-branch.yml` (project id via
 * vars, API key via secrets, fork/Dependabot skipped).
 *
 * @param {object} [opts]
 * @param {string} [opts.projectIdVar] - default NEON_PROJECT_ID
 * @param {string} [opts.apiKeySecret] - default NEON_API_KEY
 * @param {number} [opts.expiryDays] - default 14
 * @returns {string} YAML text
 */
function buildPreviewWorkflowYaml(opts = {}) {
  const projectIdVar = opts.projectIdVar || 'NEON_PROJECT_ID';
  const apiKeySecret = opts.apiKeySecret || 'NEON_API_KEY';
  const expiryDays = Number.isFinite(opts.expiryDays) ? Number(opts.expiryDays) : 14;
  const days = Math.max(1, Math.min(90, Math.floor(expiryDays)));

  return `name: Neon Preview Branch

# Generated by products/neon-control-console — pin action SHAs before merge.
# Requires:
#   - vars.${projectIdVar}
#   - secrets.${apiKeySecret}

on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}

permissions:
  contents: read

jobs:
  setup:
    name: Setup
    if: >-
      github.event.pull_request.head.repo.full_name == github.repository
      && github.actor != 'dependabot[bot]'
    outputs:
      neon_branch: \${{ steps.neon_branch.outputs.name }}
    runs-on: ubuntu-latest
    steps:
      - name: Compute Neon branch name
        id: neon_branch
        env:
          HEAD_REF: \${{ github.event.pull_request.head.ref }}
          PR_NUMBER: \${{ github.event.number }}
        run: |
          slug=$(printf '%s' "$HEAD_REF" \\
            | tr '[:upper:]' '[:lower:]' \\
            | tr -c 'a-z0-9' '-' \\
            | sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//' \\
            | cut -c1-40)
          slug=\${slug%-}
          echo "name=preview/pr-\${PR_NUMBER}-\${slug}" >> "$GITHUB_OUTPUT"

  create_neon_branch:
    name: Create Neon Branch
    needs: setup
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Expiration (+${days} days)
        id: get_expiration_date
        run: echo "EXPIRES_AT=$(date -u --date '+${days} days' +'%Y-%m-%dT%H:%M:%SZ')" >> "$GITHUB_ENV"
      - name: Create Neon Branch
        id: create_neon_branch
        uses: neondatabase/create-branch-action@fb620d43d4c565abaf088b848a4e28e5c4ea4d9c # v6
        with:
          project_id: \${{ vars.${projectIdVar} }}
          branch_name: \${{ needs.setup.outputs.neon_branch }}
          api_key: \${{ secrets.${apiKeySecret} }}
          expires_at: \${{ env.EXPIRES_AT }}

  delete_neon_branch:
    name: Delete Neon Branch
    needs: setup
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete Neon Branch
        uses: neondatabase/delete-branch-action@4468d825d5a88ef4012f1705a82f02ec3072f776 # v3
        with:
          project_id: \${{ vars.${projectIdVar} }}
          branch: \${{ needs.setup.outputs.neon_branch }}
          api_key: \${{ secrets.${apiKeySecret} }}
`;
}

/**
 * Build a markdown ops brief from current project/branch snapshot.
 * @param {object} snapshot
 * @param {object[]} snapshot.projects
 * @param {Record<string, object[]>} [snapshot.branchesByProject]
 * @param {string} [snapshot.mode] - live | demo
 */
function buildOpsMarkdown(snapshot = {}) {
  const projects = Array.isArray(snapshot.projects) ? snapshot.projects : [];
  const branchesByProject = snapshot.branchesByProject || {};
  const mode = snapshot.mode || 'demo';
  const lines = [
    '# Neon Control Console — Ops Brief',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Mode: ${mode}`,
    `- Projects: ${projects.length}`,
    '',
    '## Projects',
    '',
  ];
  if (projects.length === 0) {
    lines.push('_No projects._', '');
  } else {
    for (const p of projects) {
      lines.push(`### ${p.name || p.id}`);
      lines.push(`- ID: \`${p.id}\``);
      if (p.region_id) lines.push(`- Region: ${p.region_id}`);
      if (p.pg_version) lines.push(`- Postgres: ${p.pg_version}`);
      const branches = branchesByProject[p.id] || [];
      lines.push(`- Branches: ${branches.length}`);
      for (const b of branches) {
        const flag = b.default ? ' (default)' : '';
        lines.push(`  - \`${b.name}\`${flag} — ${b.current_state || 'unknown'}`);
      }
      lines.push('');
    }
  }
  lines.push('## neonctl quick start', '');
  lines.push('```bash');
  lines.push(buildNeonctlCommand({ action: 'install' }).command);
  lines.push(buildNeonctlCommand({ action: 'auth-set-key' }).command);
  lines.push(buildNeonctlCommand({ action: 'list-projects' }).command);
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

/**
 * CSV export of branches across projects.
 * @param {object[]} rows - { projectId, projectName, branchName, state, default }
 */
function buildBranchesCsv(rows = []) {
  const header = '"project_id","project_name","branch_name","state","default"';
  const body = rows.map((r) =>
    [
      csvCell(r.projectId),
      csvCell(r.projectName),
      csvCell(r.branchName),
      csvCell(r.state),
      csvCell(r.default ? 'true' : 'false'),
    ].join(',')
  );
  return [header, ...body].join('\n');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * Resolve config from environment for server routes.
 * @param {NodeJS.ProcessEnv} [env]
 */
function resolveNeonConfig(env = process.env) {
  const apiKey = (env.NEON_API_KEY || '').trim();
  const projectId = (env.NEON_PROJECT_ID || env.NEXT_PUBLIC_NEON_PROJECT_ID || '').trim();
  const apiHost = (env.NEON_API_HOST || DEFAULT_API_HOST).trim();
  return {
    apiKey,
    projectId,
    apiHost,
    mode: apiKey ? 'live' : 'demo',
  };
}

/**
 * List projects — live API or demo fixtures.
 * @param {ReturnType<typeof createNeonClient> | null} client
 * @param {{ mode: string }} config
 */
async function listProjectsOrDemo(client, config) {
  if (config.mode === 'live' && client) {
    const projects = await client.listProjects();
    return { mode: 'live', projects };
  }
  return { mode: 'demo', projects: DEMO_FIXTURES.projects.slice() };
}

/**
 * List branches — live API or demo fixtures.
 */
async function listBranchesOrDemo(client, config, projectId) {
  const pid = projectId || config.projectId;
  if (!pid) throw new Error('projectId is required');
  if (config.mode === 'live' && client) {
    const branches = await client.listBranches(pid);
    return { mode: 'live', projectId: pid, branches };
  }
  const branches = DEMO_FIXTURES.branches[pid] || [];
  return { mode: 'demo', projectId: pid, branches: branches.slice() };
}

module.exports = {
  DEFAULT_API_HOST,
  DEMO_FIXTURES,
  slugifyPreviewBranch,
  createNeonClient,
  buildNeonctlCommand,
  buildPreviewWorkflowYaml,
  buildOpsMarkdown,
  buildBranchesCsv,
  resolveNeonConfig,
  listProjectsOrDemo,
  listBranchesOrDemo,
  shellQuote,
};
