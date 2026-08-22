'use client';

import { useMemo, useState } from 'react';
import {
  answerLine,
  buildImageRefs,
  externalSetupSteps,
  shippedReport,
  type WiringReport,
} from '../lib/ghcr';

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
  input: {
    width: '100%',
    maxWidth: 280,
    background: '#0d1117',
    border: '1px solid #30363d',
    color: '#f0f6fc',
    borderRadius: 6,
    padding: '0.45rem 0.65rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,
};

export default function GhcrConsolePage() {
  const [report, setReport] = useState<WiringReport>(() => shippedReport());
  const [setupDone, setSetupDone] = useState<Record<string, boolean>>({});
  const [tag, setTag] = useState('latest');
  const steps = useMemo(() => externalSetupSteps(), []);
  const refs = useMemo(() => {
    try {
      return buildImageRefs({ tag: tag.trim() || 'latest' });
    } catch {
      return buildImageRefs({ tag: 'latest' });
    }
  }, [tag]);

  const toggleStep = (id: string) =>
    setSetupDone((prev) => ({ ...prev, [id]: !prev[id] }));

  const setupPassed = steps.filter((s) => setupDone[s.id]).length;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>GHCR · container registry setup</h1>
          <p style={S.sub}>
            Direct answer for{' '}
            <a href="https://github.com/midnghtsapphire/revvel-standards/issues/17695">
              WR #17695
            </a>
            : is{' '}
            <a
              href="https://github.blog/news-insights/product-news/introducing-github-container-registry/"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Container Registry
            </a>{' '}
            wired into <span style={S.code}>midnghtsapphire/revvel-standards</span>?
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            style={S.primary}
            href={refs.packageUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open Packages UI
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
          <div style={S.meta}>Default image</div>
          <div style={{ ...S.code, wordBreak: 'break-all' }}>{refs.image}</div>
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

      <section style={S.section} aria-labelledby="image-title">
        <h2 id="image-title" style={S.sectionTitle}>
          Image reference builder
        </h2>
        <div style={S.card}>
          <label style={{ ...S.meta, display: 'block', marginBottom: 6 }} htmlFor="tag">
            Tag
          </label>
          <input
            id="tag"
            style={S.input}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="latest"
            aria-label="Image tag"
          />
          <pre
            style={{
              ...S.code,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
              marginTop: 12,
              color: '#c9d1d9',
            }}
          >
{`# pull / run
${refs.pull}
${refs.run}

# login (private packages only — token on stdin, never argv)
echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin`}
          </pre>
        </div>
      </section>

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
          Same-repo pushes use the job <span style={S.code}>GITHUB_TOKEN</span> with{' '}
          <span style={S.code}>packages: write</span>. Tick these after each click-path in{' '}
          <a href="https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/GHCR_SETUP.md">
            docs/GHCR_SETUP.md
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
          <pre style={{ ...S.code, whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#c9d1d9' }}>
{`# exit 0 = fully wired repo-side
node scripts/ghcr-setup.js
node scripts/ghcr-setup.js --markdown
node scripts/ghcr-setup.js --image

# Actions → "GHCR publish" → Run workflow (push image)
# Actions → "GHCR setup status" → Run workflow (audit only)

cd products/ghcr-console && npm test && npm run dev   # http://localhost:3012`}
          </pre>
        </div>
      </section>

      <section style={S.section} aria-labelledby="about-title">
        <h2 id="about-title" style={S.sectionTitle}>
          What GHCR does (and does not)
        </h2>
        <ul style={S.list}>
          <li>
            <strong>Does:</strong> host OCI images at <span style={S.code}>ghcr.io</span>,
            auth with GitHub identity, publish from Actions via{' '}
            <span style={S.code}>GITHUB_TOKEN</span> + <span style={S.code}>packages: write</span>.
          </li>
          <li>
            <strong>Does not:</strong> replace Docker Hub, Harbor, or ECR. Package visibility and
            org retention policies are owner-side settings.
          </li>
          <li>
            <strong>Secrets:</strong> no token required for same-repo push. Optional{' '}
            <span style={S.code}>GHCR_READ_TOKEN</span> for private pulls on other hosts
            (name only in docs/SECRETS_MAP.md).
          </li>
        </ul>
      </section>

      <footer style={{ ...S.meta, borderTop: '1px solid #30363d', paddingTop: 16 }}>
        Live DoD page:{' '}
        <a href="https://revvel-standards.vercel.app/docs/ghcr-console/">
          revvel-standards.vercel.app/docs/ghcr-console/
        </a>
        {' · '}
        Source:{' '}
        <a href="https://github.com/midnghtsapphire/revvel-standards/tree/main/products/ghcr-console">
          products/ghcr-console
        </a>
      </footer>
    </div>
  );
}
