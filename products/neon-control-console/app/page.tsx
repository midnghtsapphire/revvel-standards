'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Project = {
  id: string;
  name?: string;
  region_id?: string;
  pg_version?: number | string;
  created_at?: string;
};

type Branch = {
  id: string;
  name: string;
  current_state?: string;
  default?: boolean;
  expires_at?: string;
};

type Status = {
  mode: string;
  hasApiKey: boolean;
  defaultProjectId: string | null;
  apiHost: string;
  secrets: Record<string, string>;
  features: string[];
};

type CliResult = {
  command?: string;
  description?: string;
  notes?: string[];
  previewName?: string | null;
  error?: string;
  actions?: string[];
};

type WorkflowResult = {
  yaml?: string;
  previewBranch?: string;
  secretsRequired?: string[];
  varsRequired?: string[];
  notes?: string[];
  error?: string;
};

const CLI_ACTIONS = [
  { id: 'install', label: 'Install neonctl' },
  { id: 'auth-set-key', label: 'Export NEON_API_KEY' },
  { id: 'list-projects', label: 'List projects' },
  { id: 'list-branches', label: 'List branches' },
  { id: 'create-branch', label: 'Create branch' },
  { id: 'delete-branch', label: 'Delete branch' },
  { id: 'connection-string', label: 'Connection string' },
] as const;

const S = {
  page: {
    maxWidth: 1180,
    margin: '0 auto',
    padding: '2rem 1.25rem 4rem',
  } as React.CSSProperties,
  glass: {
    background: 'var(--panel)',
    border: '1px solid var(--panel-border)',
    borderRadius: 16,
    padding: '1.25rem 1.35rem',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
    marginBottom: '1rem',
  } as React.CSSProperties,
  h1: {
    margin: 0,
    fontSize: '1.85rem',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,
  muted: { color: 'var(--muted)', margin: '0.35rem 0 0' } as React.CSSProperties,
  row: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    alignItems: 'center',
  },
  badge: (bg: string) =>
    ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: bg,
      color: '#0b1020',
      fontWeight: 700,
      fontSize: '0.75rem',
      borderRadius: 999,
      padding: '0.28rem 0.7rem',
    }) as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.78rem',
    color: 'var(--muted)',
    marginBottom: 4,
    fontWeight: 600,
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: 'rgba(8,12,24,0.72)',
    border: '1px solid rgba(148,163,184,0.28)',
    borderRadius: 10,
    color: 'var(--text)',
    padding: '0.55rem 0.7rem',
  } as React.CSSProperties,
  btn: (primary = false) =>
    ({
      background: primary
        ? 'linear-gradient(135deg, #70e0a8, #6ea8ff)'
        : 'rgba(255,255,255,0.06)',
      color: primary ? '#0b1020' : 'var(--text)',
      border: primary ? 'none' : '1px solid rgba(148,163,184,0.28)',
      borderRadius: 10,
      padding: '0.55rem 0.95rem',
      fontWeight: 700,
    }) as React.CSSProperties,
  pre: {
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    background: 'rgba(5,8,16,0.85)',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 12,
    padding: '0.9rem 1rem',
    fontSize: '0.85rem',
    lineHeight: 1.45,
    overflow: 'auto',
    maxHeight: 360,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
  } as React.CSSProperties,
  thtd: {
    textAlign: 'left' as const,
    padding: '0.55rem 0.4rem',
    borderBottom: '1px solid rgba(148,163,184,0.16)',
  } as React.CSSProperties,
  err: { color: 'var(--danger)', margin: '0.5rem 0 0' } as React.CSSProperties,
  ok: { color: 'var(--accent)', margin: '0.5rem 0 0' } as React.CSSProperties,
};

export default function NeonControlConsolePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState('demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);

  const [cliAction, setCliAction] = useState<string>('list-projects');
  const [branchName, setBranchName] = useState('preview/pr-42-feat-auth');
  const [parent, setParent] = useState('main');
  const [headRef, setHeadRef] = useState('feat/Some-Long/Ref');
  const [prNumber, setPrNumber] = useState('42');
  const [cliResult, setCliResult] = useState<CliResult | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowResult | null>(null);
  const [expiryDays, setExpiryDays] = useState(14);
  const [copied, setCopied] = useState<string | null>(null);
  const [opsMd, setOpsMd] = useState('');

  const loadStatusAndProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, projectsRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/projects'),
      ]);
      const statusJson = await statusRes.json();
      const projectsJson = await projectsRes.json();
      if (!statusRes.ok) throw new Error(statusJson.error || 'status failed');
      if (!projectsRes.ok) throw new Error(projectsJson.error || 'projects failed');
      setStatus(statusJson);
      setMode(projectsJson.mode || statusJson.mode || 'demo');
      const list: Project[] = projectsJson.projects || [];
      setProjects(list);
      const preferred =
        statusJson.defaultProjectId ||
        list[0]?.id ||
        '';
      setProjectId((prev) => prev || preferred);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async (pid: string) => {
    if (!pid) {
      setBranches([]);
      return;
    }
    setBranchError(null);
    try {
      const res = await fetch(`/api/branches?projectId=${encodeURIComponent(pid)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'branches failed');
      setBranches(json.branches || []);
      setMode(json.mode || mode);
    } catch (e) {
      setBranches([]);
      setBranchError(e instanceof Error ? e.message : 'Failed to load branches');
    }
  }, [mode]);

  useEffect(() => {
    void loadStatusAndProjects();
  }, [loadStatusAndProjects]);

  useEffect(() => {
    if (projectId) void loadBranches(projectId);
  }, [projectId, loadBranches]);

  const generateCli = useCallback(async () => {
    setCliResult(null);
    const res = await fetch('/api/cli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: cliAction,
        projectId,
        branchName,
        parent,
        headRef,
        prNumber,
        pooled: true,
      }),
    });
    const json = await res.json();
    setCliResult(json);
  }, [cliAction, projectId, branchName, parent, headRef, prNumber]);

  const generateWorkflow = useCallback(async () => {
    setWorkflow(null);
    const res = await fetch('/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expiryDays,
        headRef,
        prNumber,
      }),
    });
    const json = await res.json();
    setWorkflow(json);
  }, [expiryDays, headRef, prNumber]);

  useEffect(() => {
    void generateCli();
  }, [generateCli]);

  useEffect(() => {
    void generateWorkflow();
  }, [generateWorkflow]);

  useEffect(() => {
    // Lightweight client-side ops brief (no secret values).
    const lines = [
      '# Neon Control Console — Ops Brief',
      '',
      `- Mode: ${mode}`,
      `- Projects: ${projects.length}`,
      `- Selected project: ${projectId || '(none)'}`,
      `- Branches loaded: ${branches.length}`,
      '',
      '## neonctl',
      '```bash',
      cliResult?.command || 'neonctl projects list --output json',
      '```',
      '',
    ];
    setOpsMd(lines.join('\n'));
  }, [mode, projects, projectId, branches, cliResult]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId]
  );

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied('copy-failed');
    }
  }

  return (
    <main style={S.page}>
      <header style={{ ...S.glass, marginBottom: '1.25rem' }}>
        <div style={{ ...S.row, justifyContent: 'space-between' }}>
          <div>
            <h1 style={S.h1}>Neon Control Console</h1>
            <p style={S.muted}>
              Neon API playground + <strong>neonctl</strong> command builder + GitHub Actions
              PR-preview workflow generator. Live when <code>NEON_API_KEY</code> is set; demo
              fixtures otherwise.
            </p>
          </div>
          <div style={S.row}>
            <span
              style={S.badge(mode === 'live' ? 'var(--accent)' : 'var(--warn)')}
              title="API mode"
            >
              {mode === 'live' ? 'LIVE API' : 'DEMO MODE'}
            </span>
            <button type="button" style={S.btn(false)} onClick={() => void loadStatusAndProjects()}>
              Refresh
            </button>
          </div>
        </div>
        {status && (
          <p style={{ ...S.muted, marginTop: '0.85rem', fontSize: '0.86rem' }}>
            Host: <code>{status.apiHost}</code>
            {' · '}
            NEON_API_KEY: <code>{status.secrets?.NEON_API_KEY}</code>
            {' · '}
            NEON_PROJECT_ID: <code>{status.secrets?.NEON_PROJECT_ID}</code>
          </p>
        )}
        {loading && <p style={S.muted}>Loading projects…</p>}
        {error && <p style={S.err}>{error}</p>}
      </header>

      <section style={S.grid}>
        <div style={S.glass}>
          <h2 style={{ marginTop: 0 }}>Projects</h2>
          <label style={S.label} htmlFor="project">
            Active project
          </label>
          <select
            id="project"
            style={S.input}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.name || p.id) + ` (${p.id})`}
              </option>
            ))}
          </select>
          {selectedProject && (
            <ul style={{ ...S.muted, paddingLeft: '1.1rem', marginBottom: 0 }}>
              <li>Region: {selectedProject.region_id || '—'}</li>
              <li>Postgres: {selectedProject.pg_version ?? '—'}</li>
              <li>Created: {selectedProject.created_at || '—'}</li>
            </ul>
          )}
        </div>

        <div style={S.glass}>
          <h2 style={{ marginTop: 0 }}>Branches</h2>
          {branchError && <p style={S.err}>{branchError}</p>}
          {!branchError && branches.length === 0 && (
            <p style={S.muted}>No branches for this project.</p>
          )}
          {branches.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.thtd}>Name</th>
                    <th style={S.thtd}>State</th>
                    <th style={S.thtd}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      <td style={S.thtd}>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-2)',
                            padding: 0,
                            fontWeight: 600,
                          }}
                          onClick={() => setBranchName(b.name)}
                          title="Use in CLI builder"
                        >
                          {b.name}
                        </button>
                      </td>
                      <td style={S.thtd}>{b.current_state || '—'}</td>
                      <td style={S.thtd}>{b.default ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section style={S.glass}>
        <h2 style={{ marginTop: 0 }}>neonctl CLI builder</h2>
        <p style={S.muted}>
          Generates copy-paste commands that read <code>NEON_API_KEY</code> from the environment
          (never <code>--api-key</code> on argv).
        </p>
        <div style={{ ...S.grid, marginTop: '0.85rem' }}>
          <div>
            <label style={S.label} htmlFor="cli-action">
              Action
            </label>
            <select
              id="cli-action"
              style={S.input}
              value={cliAction}
              onChange={(e) => setCliAction(e.target.value)}
            >
              {CLI_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label} htmlFor="branch-name">
              Branch name
            </label>
            <input
              id="branch-name"
              style={S.input}
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label} htmlFor="parent">
              Parent branch
            </label>
            <input
              id="parent"
              style={S.input}
              value={parent}
              onChange={(e) => setParent(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label} htmlFor="head-ref">
              PR head ref (slug helper)
            </label>
            <input
              id="head-ref"
              style={S.input}
              value={headRef}
              onChange={(e) => setHeadRef(e.target.value)}
            />
          </div>
          <div>
            <label style={S.label} htmlFor="pr-number">
              PR number
            </label>
            <input
              id="pr-number"
              style={S.input}
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
            />
          </div>
        </div>
        <div style={{ ...S.row, marginTop: '0.9rem' }}>
          <button type="button" style={S.btn(true)} onClick={() => void generateCli()}>
            Generate command
          </button>
          {cliResult?.command && (
            <button
              type="button"
              style={S.btn(false)}
              onClick={() => void copyText('cli', cliResult.command || '')}
            >
              {copied === 'cli' ? 'Copied' : 'Copy command'}
            </button>
          )}
          {cliResult?.previewName && (
            <span style={S.badge('rgba(110,168,255,0.85)')}>
              preview → {cliResult.previewName}
            </span>
          )}
        </div>
        {cliResult?.error && <p style={S.err}>{cliResult.error}</p>}
        {cliResult?.description && <p style={S.ok}>{cliResult.description}</p>}
        {cliResult?.command && <pre style={{ ...S.pre, marginTop: '0.75rem' }}>{cliResult.command}</pre>}
        {cliResult?.notes && cliResult.notes.length > 0 && (
          <ul style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            {cliResult.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={S.glass}>
        <h2 style={{ marginTop: 0 }}>GitHub Actions preview workflow</h2>
        <p style={S.muted}>
          Same contract as this monorepo&apos;s <code>neon-branch.yml</code>:{' '}
          <code>vars.NEON_PROJECT_ID</code> + <code>secrets.NEON_API_KEY</code>, SHA-pinned Neon
          actions, fork/Dependabot skipped.
        </p>
        <div style={{ maxWidth: 220, marginTop: '0.75rem' }}>
          <label style={S.label} htmlFor="expiry">
            Branch expiry (days)
          </label>
          <input
            id="expiry"
            type="number"
            min={1}
            max={90}
            style={S.input}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value) || 14)}
          />
        </div>
        <div style={{ ...S.row, marginTop: '0.85rem' }}>
          <button type="button" style={S.btn(true)} onClick={() => void generateWorkflow()}>
            Generate YAML
          </button>
          {workflow?.yaml && (
            <button
              type="button"
              style={S.btn(false)}
              onClick={() => void copyText('yaml', workflow.yaml || '')}
            >
              {copied === 'yaml' ? 'Copied' : 'Copy YAML'}
            </button>
          )}
          {workflow?.previewBranch && (
            <span style={S.badge('rgba(112,224,168,0.9)')}>
              sample branch → {workflow.previewBranch}
            </span>
          )}
        </div>
        {workflow?.error && <p style={S.err}>{workflow.error}</p>}
        {workflow?.yaml && <pre style={{ ...S.pre, marginTop: '0.75rem' }}>{workflow.yaml}</pre>}
        {workflow?.notes && (
          <ul style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            {workflow.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={S.glass}>
        <h2 style={{ marginTop: 0 }}>Ops brief export</h2>
        <div style={S.row}>
          <button
            type="button"
            style={S.btn(false)}
            onClick={() => void copyText('md', opsMd)}
          >
            {copied === 'md' ? 'Copied' : 'Copy Markdown'}
          </button>
          <button
            type="button"
            style={S.btn(false)}
            onClick={() => {
              const blob = new Blob([opsMd], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'neon-ops-brief.md';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download .md
          </button>
        </div>
        <pre style={{ ...S.pre, marginTop: '0.75rem' }}>{opsMd}</pre>
      </section>

      <footer style={{ ...S.muted, fontSize: '0.82rem', marginTop: '1.5rem' }}>
        <p>
          Secrets used by name only: <code>NEON_API_KEY</code>, <code>NEON_PROJECT_ID</code> (var).
          Get a key in the{' '}
          <a href="https://console.neon.tech" target="_blank" rel="noreferrer">
            Neon Console
          </a>
          . CLI docs:{' '}
          <a href="https://neon.tech/docs/reference/neon-cli" target="_blank" rel="noreferrer">
            neonctl
          </a>
          . API docs:{' '}
          <a href="https://api-docs.neon.tech/reference/getting-started-with-neon-api" target="_blank" rel="noreferrer">
            Neon API
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
