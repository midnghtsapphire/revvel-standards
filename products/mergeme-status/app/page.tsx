'use client';

import { useMemo, useState } from 'react';
import {
  answerLine,
  externalSetupSteps,
  shippedReport,
  type WiringReport,
} from '../lib/wiring';

const S = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '2rem 1.25rem 3rem',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1.5rem',
  },
  h1: { fontSize: '1.65rem', fontWeight: 700, color: '#f0f6fc' } as React.CSSProperties,
  sub: { color: '#8b949e', marginTop: 6, maxWidth: 640, lineHeight: 1.5 } as React.CSSProperties,
  answer: (ok: boolean): React.CSSProperties => ({
    background: ok ? '#12261e' : '#3d1a1a',
    border: `1px solid ${ok ? '#3fb950' : '#f85149'}`,
    borderRadius: 10,
    padding: '1rem 1.15rem',
    marginBottom: '1.5rem',
    color: ok ? '#3fb950' : '#f85149',
    fontWeight: 700,
    fontSize: '1.05rem',
  }),
  section: { marginBottom: '2rem' } as React.CSSProperties,
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#f0f6fc',
    borderBottom: '1px solid #30363d',
    paddingBottom: 8,
    marginBottom: 12,
  } as React.CSSProperties,
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '0.9rem 1rem',
    marginBottom: 8,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  meta: { color: '#8b949e', fontSize: '0.85rem' } as React.CSSProperties,
  badge: (ok: boolean): React.CSSProperties => ({
    display: 'inline-block',
    background: ok ? '#238636' : '#da3633',
    color: '#fff',
    borderRadius: 999,
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '2px 10px',
  }),
  btn: {
    background: '#21262d',
    border: '1px solid #30363d',
    color: '#c9d1d9',
    borderRadius: 6,
    padding: '0.45rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  primary: {
    background: '#238636',
    border: '1px solid #2ea043',
    color: '#fff',
    borderRadius: 6,
    padding: '0.55rem 1rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10,
    marginBottom: 16,
  } as React.CSSProperties,
  stat: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '1rem',
  } as React.CSSProperties,
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.8rem',
    color: '#79c0ff',
  } as React.CSSProperties,
  list: { paddingLeft: '1.2rem', lineHeight: 1.6, color: '#c9d1d9' } as React.CSSProperties,
};

export default function MergeMeStatusPage() {
  const [report, setReport] = useState<WiringReport>(() => shippedReport());
  const [setupDone, setSetupDone] = useState<Record<string, boolean>>({});
  const steps = useMemo(() => externalSetupSteps(), []);

  const toggleStep = (id: string) =>
    setSetupDone((prev) => ({ ...prev, [id]: !prev[id] }));

  const setupPassed = steps.filter((s) => setupDone[s.id]).length;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>MergeMe.dev · wiring status</h1>
          <p style={S.sub}>
            Direct answer for{' '}
            <a href="https://github.com/midnghtsapphire/revvel-standards/issues/16824">
              WR #16824
            </a>
            : is{' '}
            <a href="https://mergeme.dev" target="_blank" rel="noreferrer">
              mergeme.dev
            </a>{' '}
            wired into <span style={S.code}>midnghtsapphire/revvel-standards</span>?
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a style={S.primary} href="https://github.com/marketplace/mergeme-app" target="_blank" rel="noreferrer">
            Open Marketplace
          </a>
          <button
            type="button"
            style={S.btn}
            onClick={() => setReport(shippedReport())}
          >
            ↻ Refresh report
          </button>
        </div>
      </header>

      <div style={S.answer(report.wired)} role="status" aria-live="polite">
        {answerLine(report)}
      </div>

      <div style={S.grid}>
        <div style={S.stat}>
          <div style={S.meta}>Repo-side score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f0f6fc' }}>{report.score}</div>
        </div>
        <div style={S.stat}>
          <div style={S.meta}>Product</div>
          <div style={{ fontWeight: 600 }}>{report.product}</div>
          <div style={S.meta}>{report.site}</div>
        </div>
        <div style={S.stat}>
          <div style={S.meta}>Owner setup checklist</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f0f6fc' }}>
            {setupPassed}/{steps.length}
          </div>
        </div>
        <div style={S.stat}>
          <div style={S.meta}>Checked</div>
          <div style={S.meta}>{new Date(report.checked_at).toLocaleString()}</div>
        </div>
      </div>

      <section style={S.section} aria-labelledby="surfaces-title">
        <h2 id="surfaces-title" style={S.sectionTitle}>
          Repo surfaces (machine-checked)
        </h2>
        {report.surfaces.map((s) => (
          <div key={s.id} style={S.card}>
            <div style={S.row}>
              <div>
                <strong style={{ color: '#f0f6fc' }}>{s.label}</strong>
                <div style={S.meta}>
                  <span style={S.code}>{s.path}</span> — {s.detail}
                </div>
              </div>
              <span style={S.badge(s.ok)}>{s.ok ? 'WIRED' : 'MISSING'}</span>
            </div>
          </div>
        ))}
      </section>

      <section style={S.section} aria-labelledby="setup-title">
        <h2 id="setup-title" style={S.sectionTitle}>
          Owner setup (browser — cannot be done from a PR alone)
        </h2>
        <p style={{ ...S.meta, marginBottom: 12 }}>
          MergeMe uses a GitHub App + Slack OAuth. Tick these after you complete each click-path
          in{' '}
          <a href="https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/MERGEME_INTEGRATION.md">
            docs/MERGEME_INTEGRATION.md
          </a>
          .
        </p>
        {steps.map((step, idx) => (
          <div key={step.id} style={S.card}>
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(setupDone[step.id])}
                    onChange={() => toggleStep(step.id)}
                    aria-label={step.title}
                    style={{ marginTop: 4 }}
                  />
                  <span>
                    <strong style={{ color: '#f0f6fc' }}>
                      {idx + 1}. {step.title}
                    </strong>
                    <div style={S.meta}>{step.detail}</div>
                    <div style={{ marginTop: 6 }}>
                      <a href={step.href} target="_blank" rel="noreferrer">
                        Open step →
                      </a>
                    </div>
                  </span>
                </label>
              </div>
              <span style={S.badge(Boolean(setupDone[step.id]))}>
                {setupDone[step.id] ? 'DONE' : 'TODO'}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section style={S.section} aria-labelledby="cli-title">
        <h2 id="cli-title" style={S.sectionTitle}>
          CLI / CI
        </h2>
        <div style={S.card}>
          <pre style={{ ...S.code, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
{`# exit 0 = fully wired repo-side
node scripts/mergeme-wiring.js
node scripts/mergeme-wiring.js --markdown

# Actions → "MergeMe.dev wiring status" → Run workflow
# optional issue_number=16824 to comment the report

cd products/mergeme-status && npm test && npm run dev   # http://localhost:3012`}
          </pre>
        </div>
      </section>

      <section style={S.section} aria-labelledby="about-title">
        <h2 id="about-title" style={S.sectionTitle}>
          What MergeMe does (and does not)
        </h2>
        <ul style={S.list}>
          <li>
            <strong>Does:</strong> one updating Slack card per PR; threaded review comments;
            @mention → Slack user maps; repo→channel routing.
          </li>
          <li>
            <strong>Does not:</strong> replace GitHub auto-merge, Mergify, Graphite stacks, or
            <span style={S.code}> pr-state-orchestrator.yml</span>.
          </li>
          <li>
            <strong>Secrets:</strong> no <span style={S.code}>MERGEME_API_KEY</span> in this repo —
            install is OAuth/App based at mergeme.dev.
          </li>
        </ul>
      </section>

      <footer style={{ ...S.meta, borderTop: '1px solid #30363d', paddingTop: 16 }}>
        Live DoD page:{' '}
        <a href="https://midnghtsapphire.github.io/revvel-standards/docs/mergeme-status/">
          midnghtsapphire.github.io/revvel-standards/docs/mergeme-status/
        </a>
        {' · '}
        Source:{' '}
        <a href="https://github.com/midnghtsapphire/revvel-standards/tree/main/products/mergeme-status">
          products/mergeme-status
        </a>
      </footer>
    </div>
  );
}
