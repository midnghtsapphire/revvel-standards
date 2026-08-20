'use client';

import { useMemo, useState } from 'react';
import {
  POLICY,
  answerLine,
  humanSteps,
  shippedReport,
  verifyCommands,
  type AuditDemoReport,
} from '../lib/timeouts';

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
  sub: { color: '#8b949e', marginTop: 6, maxWidth: 720, lineHeight: 1.5 } as React.CSSProperties,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
    marginBottom: 16,
  } as React.CSSProperties,
  stat: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '0.85rem 1rem',
  } as React.CSSProperties,
  statLabel: { color: '#8b949e', fontSize: '0.78rem', marginBottom: 4 } as React.CSSProperties,
  statValue: { color: '#f0f6fc', fontSize: '1.35rem', fontWeight: 700 } as React.CSSProperties,
  pre: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '0.85rem 1rem',
    overflowX: 'auto' as const,
    fontSize: '0.82rem',
    lineHeight: 1.55,
    color: '#c9d1d9',
  } as React.CSSProperties,
  err: {
    background: '#3d1a1a',
    border: '1px solid #f8514966',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    color: '#ffa198',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.85rem',
    marginBottom: 12,
  } as React.CSSProperties,
  ol: { paddingLeft: '1.2rem', lineHeight: 1.6, color: '#c9d1d9' } as React.CSSProperties,
  li: { marginBottom: 10 } as React.CSSProperties,
};

export default function Page() {
  const [report, setReport] = useState<AuditDemoReport>(() => shippedReport());
  const steps = useMemo(() => humanSteps(), []);
  const commands = useMemo(() => verifyCommands(), []);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>Copilot Timeout Console</h1>
          <p style={S.sub}>
            Floor for every <strong>visiting LLM</strong>, <strong>OpenRouter</strong>, and{' '}
            <strong>Copilot</strong> execution job in revvel-standards. Stops coding sessions from
            dying with a 10-minute wall clock.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={S.btn} onClick={() => setReport(shippedReport())}>
            Refresh status
          </button>
          <a
            style={S.primary}
            href="https://github.com/midnghtsapphire/revvel-standards/blob/main/config/copilot-timeouts.yml"
          >
            Open policy YAML
          </a>
        </div>
      </header>

      <div style={S.answer(report.ok)} role="status">
        {answerLine(report)}
      </div>

      <section style={S.section} aria-label="Policy numbers">
        <div style={S.grid}>
          <div style={S.stat}>
            <div style={S.statLabel}>Floor</div>
            <div style={S.statValue}>{POLICY.floor_minutes}m</div>
          </div>
          <div style={S.stat}>
            <div style={S.statLabel}>Ceiling (if proven)</div>
            <div style={S.statValue}>{POLICY.recommended_ceiling_minutes}m</div>
          </div>
          <div style={S.stat}>
            <div style={S.statLabel}>Host default</div>
            <div style={S.statValue}>{POLICY.host_default_minutes}m</div>
          </div>
          <div style={S.stat}>
            <div style={S.statLabel}>Catalog score</div>
            <div style={S.statValue}>{report.score}</div>
          </div>
        </div>
        <div style={S.err} title="Error signature this policy eliminates">
          {POLICY.error_signature}
        </div>
        <p style={S.meta}>
          Policy: <code>{POLICY.policy_path}</code> · Auditor:{' '}
          <code>{POLICY.audit_script}</code> · Issue:{' '}
          <a href={POLICY.issue}>#{'17775'}</a> · Checked{' '}
          <code>{report.checked_at}</code>
        </p>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Targeted execution jobs</h2>
        {report.targets.map((t) => (
          <div key={t.id} style={S.card}>
            <div style={S.row}>
              <div>
                <div style={{ fontWeight: 600, color: '#f0f6fc' }}>{t.workflow}</div>
                <div style={S.meta}>
                  jobs: <code>{t.jobs}</code> · expected {t.expected_minutes}m
                </div>
                <div style={{ ...S.meta, marginTop: 4 }}>{t.reason}</div>
              </div>
              <span style={S.badge(t.status.ok)}>{t.status.label}</span>
            </div>
          </div>
        ))}
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Click-by-click when a job still dies at 10m</h2>
        <ol style={S.ol}>
          {steps.map((step) => (
            <li key={step.id} style={S.li}>
              <strong style={{ color: '#f0f6fc' }}>{step.title}.</strong> {step.detail}
            </li>
          ))}
        </ol>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Verify commands</h2>
        <pre style={S.pre}>{commands.join('\n')}</pre>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>What is intentionally NOT raised</h2>
        <div style={S.card}>
          <p style={{ lineHeight: 1.55 }}>
            Short automation stays tight on purpose: <code>wr-field-filler</code>,{' '}
            <code>host</code> decomposition, <code>agent-monitor</code>, lint, label sync. Raising
            those burns runner minutes without helping a coding agent finish. Only jobs that run a
            visiting LLM / OpenRouter / Copilot session get the 60-minute floor.
          </p>
        </div>
      </section>
    </main>
  );
}
