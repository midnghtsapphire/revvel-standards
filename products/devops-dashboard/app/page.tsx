'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  head_branch: string;
}

interface PullRequest {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  labels: { name: string }[];
  draft: boolean;
}

interface DashboardState {
  selfHealPRs: PullRequest[];
  recentRuns: WorkflowRun[];
  lastRefresh: string | null;
  loading: boolean;
  error: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(run: WorkflowRun): string {
  if (run.status !== 'completed') return '#d29922'; // yellow — in progress
  if (run.conclusion === 'success') return '#3fb950'; // green
  if (run.conclusion === 'failure') return '#f85149'; // red
  return '#8b949e'; // grey — cancelled / skipped
}

function prLabelColor(label: string): string {
  if (label === 'self-heal' || label === 'auto-fix') return '#1f6feb';
  if (label === 'devin-review') return '#6e40c9';
  return '#21262d';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Styles (inline — no Tailwind/PostCSS required) ──────────────────────────

const S = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem 1.5rem',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  },
  h1: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#f0f6fc',
  },
  badge: (color: string) =>
    ({
      display: 'inline-block',
      background: color,
      color: '#fff',
      borderRadius: 4,
      fontSize: '0.72rem',
      padding: '2px 8px',
      marginRight: 4,
      fontWeight: 600,
    } as React.CSSProperties),
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '1.25rem',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  section: {
    marginBottom: '2.5rem',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#f0f6fc',
    marginBottom: '1rem',
    borderBottom: '1px solid #30363d',
    paddingBottom: '0.5rem',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  meta: {
    fontSize: '0.8rem',
    color: '#8b949e',
  },
  dot: (color: string) =>
    ({
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: color,
      marginRight: 8,
    } as React.CSSProperties),
  refreshBtn: {
    background: '#21262d',
    border: '1px solid #30363d',
    color: '#c9d1d9',
    borderRadius: 6,
    padding: '0.4rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  empty: {
    color: '#8b949e',
    fontStyle: 'italic',
    padding: '1rem 0',
  } as React.CSSProperties,
  error: {
    background: '#3d1a1a',
    border: '1px solid #f85149',
    borderRadius: 8,
    padding: '1rem',
    color: '#f85149',
    marginBottom: '1rem',
  } as React.CSSProperties,
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function DevOpsDashboard() {
  const [state, setState] = useState<DashboardState>({
    selfHealPRs: [],
    recentRuns: [],
    lastRefresh: null,
    loading: false,
    error: null,
  });

  const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'midnghtsapphire/revvel-standards';
  const TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN ?? '';

  const fetchData = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    const headers: HeadersInit = TOKEN
      ? { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github+json' }
      : { Accept: 'application/vnd.github+json' };

    try {
      const [prRes, runsRes] = await Promise.all([
        fetch(
          `https://api.github.com/repos/${REPO}/pulls?state=open&per_page=20`,
          { headers }
        ),
        fetch(
          `https://api.github.com/repos/${REPO}/actions/runs?per_page=20`,
          { headers }
        ),
      ]);

      let selfHealPRs: PullRequest[] = [];
      if (prRes.ok) {
        const prs: PullRequest[] = await prRes.json();
        selfHealPRs = prs.filter(
          pr =>
            pr.labels.some(l =>
              ['self-heal', 'auto-fix', 'self-healing'].includes(l.name)
            ) ||
            pr.title.toLowerCase().includes('[self-heal]') ||
            pr.title.toLowerCase().startsWith('fix(workflow):') ||
            pr.title.toLowerCase().startsWith('fix(script):')||
            pr.title.toLowerCase().startsWith('fix(config):')
        );
      }

      let recentRuns: WorkflowRun[] = [];
      if (runsRes.ok) {
        const data = await runsRes.json();
        recentRuns = (data.workflow_runs ?? []).slice(0, 12);
      }

      setState({
        selfHealPRs,
        recentRuns,
        lastRefresh: new Date().toISOString(),
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error fetching data',
      }));
    }
  }, [REPO, TOKEN]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>🛠 DevOps Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {state.lastRefresh && (
            <span style={S.meta}>Refreshed {timeAgo(state.lastRefresh)}</span>
          )}
          <button style={S.refreshBtn} onClick={fetchData} disabled={state.loading}>
            {state.loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {state.error && <div style={S.error}>⚠ {state.error}</div>}

      {/* Self-Healing PRs */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>
          🩹 Self-Healing PRs{' '}
          <span style={S.badge('#1f6feb')}>{state.selfHealPRs.length}</span>
        </h2>

        {state.selfHealPRs.length === 0 ? (
          <p style={S.empty}>
            {state.loading ? 'Loading…' : 'No open self-healing PRs — system is clean ✅'}
          </p>
        ) : (
          state.selfHealPRs.map(pr => (
            <div key={pr.number} style={S.card}>
              <div style={S.row}>
                <div>
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#58a6ff', fontWeight: 600 }}
                  >
                    #{pr.number} {pr.title}
                  </a>
                  {pr.draft && (
                    <span style={{ ...S.badge('#21262d'), marginLeft: 8 }}>Draft</span>
                  )}
                </div>
                <span style={S.meta}>{timeAgo(pr.created_at)}</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                {pr.labels.map(l => (
                  <span key={l.name} style={S.badge(prLabelColor(l.name))}>
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Workflow Runs */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>⚙ Recent Workflow Runs</h2>

        {state.recentRuns.length === 0 ? (
          <p style={S.empty}>{state.loading ? 'Loading…' : 'No recent runs found.'}</p>
        ) : (
          state.recentRuns.map(run => (
            <div key={run.id} style={S.card}>
              <div style={S.row}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={S.dot(statusColor(run))} />
                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 500 }}
                  >
                    {run.name}
                  </a>
                </div>
                <span style={S.meta}>{timeAgo(run.created_at)}</span>
              </div>
              <div style={{ ...S.meta, marginTop: '0.25rem' }}>
                Branch: <code style={{ color: '#79c0ff' }}>{run.head_branch}</code>
                {run.status !== 'completed' && (
                  <span style={{ ...S.badge('#d29922'), marginLeft: 8 }}>
                    {run.status}
                  </span>
                )}
                {run.conclusion && run.conclusion !== 'success' && (
                  <span style={{ ...S.badge('#f85149'), marginLeft: 8 }}>
                    {run.conclusion}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* How to configure */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>⚙ Configuration</h2>
        <div style={S.card}>
          <p style={{ marginBottom: '0.75rem' }}>
            Set the following environment variables in a{' '}
            <code style={{ color: '#79c0ff' }}>.env.local</code> file to connect to
            your GitHub repo:
          </p>
          <pre
            style={{
              background: '#0d1117',
              padding: '0.75rem 1rem',
              borderRadius: 6,
              fontSize: '0.85rem',
              color: '#c9d1d9',
              overflowX: 'auto',
            }}
          >
            {`NEXT_PUBLIC_GITHUB_REPO=midnghtsapphire/revvel-standards
NEXT_PUBLIC_GITHUB_TOKEN=ghp_...   # optional — increases rate limit`}
          </pre>
          <p style={{ ...S.meta, marginTop: '0.75rem' }}>
            Deploy to Vercel and add these as environment variables in the project
            settings. The dashboard auto-refreshes every 60 seconds.
          </p>
        </div>
      </div>

      <footer style={{ ...S.meta, textAlign: 'center', paddingTop: '2rem' }}>
        DevOps Dashboard · {REPO} ·{' '}
        <a href={`https://github.com/${REPO}/actions`} target="_blank" rel="noopener noreferrer">
          Actions ↗
        </a>
        {' · '}
        <a href={`https://github.com/${REPO}/pulls`} target="_blank" rel="noopener noreferrer">
          Pull Requests ↗
        </a>
      </footer>
    </div>
  );
}
