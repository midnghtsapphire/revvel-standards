'use client';

import { useMemo, useState } from 'react';
import {
  CI_WORKFLOW_SNIPPET,
  SAMPLE_BAD_TF,
  SAMPLE_GOOD_TF,
  buildLintCsv,
  buildLintMarkdown,
  lintTerraformSource,
  type LintResult,
} from './lib/fmt-check';

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [source, setSource] = useState(SAMPLE_BAD_TF);
  const [result, setResult] = useState<LintResult | null>(null);
  const [copied, setCopied] = useState(false);

  const statusBadge = useMemo(() => {
    if (!result) return null;
    return result.ok ? (
      <span className="badge ok">PASS</span>
    ) : (
      <span className="badge fail">FAIL · {result.summary.errors} error(s)</span>
    );
  }, [result]);

  function runLint() {
    setResult(lintTerraformSource(source));
  }

  function applyHint() {
    if (result?.formattedHint) {
      setSource(result.formattedHint);
      setResult(lintTerraformSource(result.formattedHint));
    }
  }

  async function copyWorkflow() {
    try {
      await navigator.clipboard.writeText(CI_WORKFLOW_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.04em' }}>
          REVVEL · INFRASTRUCTURE QUALITY
        </p>
        <h1 style={{ margin: '0.35rem 0', fontSize: '1.85rem' }}>Terraform Lint Guard</h1>
        <p className="muted" style={{ maxWidth: 720 }}>
          Paste HCL, catch the formatting issues that fail{' '}
          <code>terraform fmt -check</code>, and ship the same gate CI uses:{' '}
          <code>ShubhamTatvamasi/terraform-lint-action@v1</code>.
        </p>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Live hub page:{' '}
          <a href="https://revvel-standards.vercel.app/docs/terraform-lint-guard/">
            revvel-standards.vercel.app/docs/terraform-lint-guard/
          </a>
        </p>
      </header>

      <div className="grid two">
        <section className="card">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <button type="button" className="primary" onClick={runLint}>
              Run fmt check
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSource(SAMPLE_GOOD_TF);
                setResult(null);
              }}
            >
              Load clean sample
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSource(SAMPLE_BAD_TF);
                setResult(null);
              }}
            >
              Load dirty sample
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!result?.formattedHint}
              onClick={applyHint}
            >
              Apply suggested format
            </button>
          </div>
          <label htmlFor="tf-source" className="muted" style={{ display: 'block', marginBottom: 6 }}>
            Terraform source
          </label>
          <textarea
            id="tf-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            aria-label="Terraform source to lint"
          />
          <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
            Heuristic checker for instant feedback. Authoritative CI still runs real{' '}
            <code>terraform fmt</code> via the GitHub Action.
          </p>
        </section>

        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Results</h2>
            {statusBadge}
          </div>

          {!result && (
            <p className="muted" style={{ marginTop: '1rem' }}>
              Click <strong>Run fmt check</strong> to scan the editor.
            </p>
          )}

          {result && (
            <>
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                {result.summary.lines} lines · {result.summary.errors} errors ·{' '}
                {result.summary.warnings} warnings
              </p>
              <ul className="findings">
                {result.findings.length === 0 && (
                  <li className="muted">No formatting issues detected.</li>
                )}
                {result.findings.map((f) => (
                  <li key={`${f.line}-${f.rule}-${f.message}`}>
                    <div>
                      <span className={f.severity === 'error' ? 'sev-error' : 'sev-warning'}>
                        {f.severity.toUpperCase()}
                      </span>{' '}
                      <code>
                        L{f.line}:C{f.column}
                      </code>{' '}
                      <code>{f.rule}</code>
                    </div>
                    <div>{f.message}</div>
                    {f.snippet && <pre className="snippet">{f.snippet}</pre>}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      'terraform-lint-report.md',
                      buildLintMarkdown(result, { filename: 'editor.tf' }),
                      'text/markdown'
                    )
                  }
                >
                  Download Markdown
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText('terraform-lint-report.csv', buildLintCsv(result), 'text/csv')
                  }
                >
                  Download CSV
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>CI workflow snippet</h2>
          <button type="button" className="secondary" onClick={copyWorkflow}>
            {copied ? 'Copied' : 'Copy YAML'}
          </button>
        </div>
        <p className="muted">
          Matches <code>.github/workflows/terraform-lint.yml</code> in this monorepo. The action only
          runs <code>terraform fmt -check -recursive</code>, so install Terraform first.
        </p>
        <pre className="snippet">{CI_WORKFLOW_SNIPPET}</pre>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>API</h2>
        <p className="muted">
          <code>GET /api/lint</code> — schema · <code>POST /api/lint</code> with JSON{' '}
          <code>{`{ "source": "...", "format": "json|markdown|csv" }`}</code>
        </p>
        <pre className="snippet">{`curl -s -X POST http://localhost:3012/api/lint \\
  -H 'content-type: application/json' \\
  -d '{"source":"variable \\"x\\" {\\n type=string\\n}","format":"json"}'`}</pre>
      </section>

      <footer className="muted" style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
        Monetization path: SaaS seat for multi-repo Terraform quality dashboards + CI badge
        upsell via Polar.sh. Source:{' '}
        <a href="https://github.com/midnghtsapphire/revvel-standards/tree/main/products/terraform-lint-guard">
          products/terraform-lint-guard
        </a>
        .
      </footer>
    </main>
  );
}
