'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type PlanRow = {
  issueId: string;
  mode: string;
  commentText: string;
  variables: Record<string, string>;
  commitMessage: string;
  author: string;
  url: string;
  sha: string;
};

type SyncResponse = {
  ok: boolean;
  dryRun?: boolean;
  planned?: number;
  plans?: PlanRow[];
  results?: Array<Record<string, unknown>>;
  error?: string;
  config?: {
    hasLinearApiKey: boolean;
    hasDoneStateId: boolean;
    hasWebhookSecret: boolean;
    linearEndpoint: string;
  };
};

const SAMPLE_MESSAGE = `fix(agent): heal flaky CI for ENG-105

Closes ENG-105 and notes follow-up on OPS-12.`;

const S = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem 1.25rem 4rem',
  } as React.CSSProperties,
  hero: {
    display: 'grid',
    gap: '0.75rem',
    marginBottom: '1.75rem',
  } as React.CSSProperties,
  kicker: {
    color: '#9fb0d0',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  h1: {
    fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
    fontWeight: 800,
    lineHeight: 1.15,
  } as React.CSSProperties,
  lead: {
    color: '#9fb0d0',
    maxWidth: 720,
    lineHeight: 1.55,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
  } as React.CSSProperties,
  panel: {
    background: 'linear-gradient(180deg, #121a2f 0%, #0f1628 100%)',
    border: '1px solid #2a3a5c',
    borderRadius: 16,
    padding: '1.1rem',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#9fb0d0',
    marginBottom: 6,
    fontWeight: 600,
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: '#0b1020',
    color: '#e7eefc',
    border: '1px solid #2a3a5c',
    borderRadius: 10,
    padding: '0.7rem 0.8rem',
    marginBottom: '0.85rem',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    minHeight: 140,
    background: '#0b1020',
    color: '#e7eefc',
    border: '1px solid #2a3a5c',
    borderRadius: 10,
    padding: '0.75rem 0.85rem',
    marginBottom: '0.85rem',
    resize: 'vertical' as const,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    lineHeight: 1.45,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.6rem',
    alignItems: 'center',
    marginBottom: '0.85rem',
  },
  btn: (primary?: boolean): React.CSSProperties => ({
    background: primary
      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
      : '#18233d',
    color: '#fff',
    border: primary ? '1px solid #60a5fa' : '1px solid #2a3a5c',
    borderRadius: 10,
    padding: '0.65rem 0.95rem',
    fontWeight: 700,
  }),
  pill: (ok: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    padding: '0.25rem 0.65rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    background: ok ? 'rgba(61,214,140,0.12)' : 'rgba(240,113,120,0.12)',
    color: ok ? '#3dd68c' : '#f07178',
    border: `1px solid ${ok ? 'rgba(61,214,140,0.35)' : 'rgba(240,113,120,0.35)'}`,
  }),
  pre: {
    background: '#0b1020',
    border: '1px solid #2a3a5c',
    borderRadius: 12,
    padding: '0.85rem',
    overflow: 'auto',
    maxHeight: 420,
    fontSize: '0.82rem',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,
  muted: { color: '#9fb0d0', fontSize: '0.9rem', lineHeight: 1.5 } as React.CSSProperties,
  list: { margin: '0.5rem 0 0 1.1rem', color: '#c9d7f2', lineHeight: 1.55 } as React.CSSProperties,
  footer: {
    marginTop: '1.5rem',
    color: '#9fb0d0',
    fontSize: '0.85rem',
    lineHeight: 1.5,
  } as React.CSSProperties,
};

export default function HomePage() {
  const [message, setMessage] = useState(SAMPLE_MESSAGE);
  const [author, setAuthor] = useState('agent-factory');
  const [url, setUrl] = useState('https://github.com/midnghtsapphire/revvel-standards/commit/deadbeef');
  const [sha, setSha] = useState('deadbeef');
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [health, setHealth] = useState<SyncResponse['config'] | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => setHealth(j.config || null))
      .catch(() => setHealth(null));
  }, []);

  const runSync = useCallback(async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, author, url, sha, dryRun }),
      });
      const json = (await res.json()) as SyncResponse;
      if (!res.ok && !json.plans && !json.results) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [message, author, url, sha]);

  const issuePreview = useMemo(() => {
    const matches = message.match(/\b([A-Z][A-Z0-9]+-\d+)\b/g) || [];
    return [...new Set(matches)];
  }, [message]);

  return (
    <main style={S.page}>
      <header style={S.hero}>
        <div style={S.kicker}>Agent Factory · production-app</div>
        <h1 style={S.h1}>Linear API Synchronization</h1>
        <p style={S.lead}>
          Paste a commit message (or fire a GitHub push webhook). We extract Linear
          issue keys like <code>ENG-105</code>, plan a GraphQL mutation that marks the
          issue Done and posts an Agent Factory comment, then optionally execute it
          live against Linear.
        </p>
        <div style={S.row}>
          <span style={S.pill(Boolean(health?.hasLinearApiKey))}>
            LINEAR_API_KEY {health?.hasLinearApiKey ? 'present' : 'missing'}
          </span>
          <span style={S.pill(Boolean(health?.hasDoneStateId))}>
            DONE state {health?.hasDoneStateId ? 'configured' : 'comment-only'}
          </span>
          <span style={S.pill(Boolean(health?.hasWebhookSecret))}>
            webhook secret {health?.hasWebhookSecret ? 'on' : 'open (dev)'}
          </span>
        </div>
      </header>

      <div style={S.grid}>
        <section style={S.panel}>
          <h2 style={{ marginBottom: '0.85rem', fontSize: '1.05rem' }}>Playground</h2>
          <label style={S.label} htmlFor="message">Commit message</label>
          <textarea
            id="message"
            style={S.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            spellCheck={false}
          />
          <label style={S.label} htmlFor="author">Author</label>
          <input id="author" style={S.input} value={author} onChange={(e) => setAuthor(e.target.value)} />
          <label style={S.label} htmlFor="url">Commit URL</label>
          <input id="url" style={S.input} value={url} onChange={(e) => setUrl(e.target.value)} />
          <label style={S.label} htmlFor="sha">SHA</label>
          <input id="sha" style={S.input} value={sha} onChange={(e) => setSha(e.target.value)} />

          <div style={S.row}>
            <button type="button" style={S.btn(true)} disabled={loading} onClick={() => runSync(true)}>
              {loading ? 'Working…' : 'Dry-run plan'}
            </button>
            <button
              type="button"
              style={S.btn(false)}
              disabled={loading || !live}
              title={live ? 'Execute live Linear mutations' : 'Enable the live toggle first'}
              onClick={() => runSync(false)}
            >
              Execute live
            </button>
            <label style={{ ...S.muted, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={live}
                onChange={(e) => setLive(e.target.checked)}
              />
              Enable live mode (needs LINEAR_API_KEY)
            </label>
          </div>

          <p style={S.muted}>
            Detected issue keys:{' '}
            {issuePreview.length ? issuePreview.join(', ') : 'none yet — include e.g. ENG-105'}
          </p>
          {error ? <p style={{ color: '#f07178', marginTop: 8 }}>{error}</p> : null}
        </section>

        <section style={S.panel}>
          <h2 style={{ marginBottom: '0.85rem', fontSize: '1.05rem' }}>Plan / result</h2>
          {!result ? (
            <p style={S.muted}>Run a dry-run to preview GraphQL variables and comment text.</p>
          ) : (
            <>
              <p style={S.muted}>
                {result.dryRun === false ? 'Live execution' : 'Dry-run'} · planned{' '}
                {result.planned ?? result.plans?.length ?? 0} update(s)
                {result.ok === false ? ' · completed with errors' : ''}
              </p>
              <pre style={S.pre}>{JSON.stringify(result, null, 2)}</pre>
            </>
          )}
        </section>
      </div>

      <section style={{ ...S.panel, marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '0.65rem', fontSize: '1.05rem' }}>Wire it up</h2>
        <ol style={S.list}>
          <li>
            Deploy this app (Vercel) and set secrets: <code>LINEAR_API_KEY</code>, optional{' '}
            <code>LINEAR_DONE_STATE_ID</code>, optional <code>GITHUB_WEBHOOK_SECRET</code>.
          </li>
          <li>
            Point a GitHub repo <strong>Push</strong> webhook at{' '}
            <code>POST /api/github-commit-receiver?live=1</code>.
          </li>
          <li>
            Or import <code>workflows/n8n/linear-github-commit-sync.json</code> into n8n and
            attach Linear header auth.
          </li>
          <li>
            CLI: <code>node scripts/linear-api-sync.js --message &quot;fix: ENG-105&quot; --dry-run</code>
          </li>
        </ol>
        <p style={S.footer}>
          API docs: <a href="/api/health">/api/health</a> · <a href="/api/sync">/api/sync</a> ·{' '}
          <a href="/api/github-commit-receiver">/api/github-commit-receiver</a>
          <br />
          Marketing keywords: Linear GitHub sync, Agent Factory automation, commit issue closer,
          n8n Linear GraphQL, SaaS engineering ops.
        </p>
      </section>
    </main>
  );
}
