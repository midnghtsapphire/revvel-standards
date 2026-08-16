'use client';

import { useMemo, useState } from 'react';
import {
  DIALECTS,
  RULE_CATALOG,
  buildReportMarkdown,
  lintSql,
  type Dialect,
  type LintResult,
} from './data/linter';

const SAMPLE = `SELECT
    u.id,
    u.name,
    COUNT(o.id) AS order_count
FROM users AS u
LEFT JOIN orders AS o
    ON u.id = o.user_id
WHERE u.active = TRUE
GROUP BY u.id, u.name
ORDER BY order_count DESC;
`;

function severityClass(sev: string): string {
  if (sev === 'error') return 'text-red-400 bg-red-950/50 border-red-800';
  if (sev === 'warning') return 'text-amber-300 bg-amber-950/40 border-amber-800';
  return 'text-sky-300 bg-sky-950/40 border-sky-800';
}

export default function HomePage() {
  const [sql, setSql] = useState(SAMPLE);
  const [dialect, setDialect] = useState<Dialect>('postgresql');
  const [result, setResult] = useState<LintResult | null>(null);
  const [tab, setTab] = useState<'results' | 'formatted' | 'report' | 'rules'>(
    'results'
  );
  const [busy, setBusy] = useState(false);
  const [apiNote, setApiNote] = useState<string | null>(null);

  const reportMd = useMemo(
    () => (result ? buildReportMarkdown(result, 'playground') : ''),
    [result]
  );

  function runLocal() {
    setBusy(true);
    setApiNote(null);
    try {
      const r = lintSql(sql, { dialect });
      setResult(r);
      setTab('results');
    } finally {
      setBusy(false);
    }
  }

  async function runViaApi() {
    setBusy(true);
    setApiNote(null);
    try {
      const res = await fetch('/api/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, dialect }),
      });
      const data = (await res.json()) as LintResult & { error?: string };
      if (data.error) {
        setApiNote(data.error);
        return;
      }
      setResult(data);
      setApiNote(`API responded HTTP ${res.status}`);
      setTab('results');
    } catch (err) {
      setApiNote(err instanceof Error ? err.message : 'API request failed');
    } finally {
      setBusy(false);
    }
  }

  function applyFormat() {
    const r = lintSql(sql, { dialect });
    setSql(r.formatted);
    setResult(r);
    setTab('formatted');
  }

  function downloadReport() {
    const blob = new Blob([reportMd || '# empty\n'], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sql-lint-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Revvel · SaaS playground
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          GoSQLX SQL Linter
        </h1>
        <p className="max-w-3xl text-slate-300">
          Multi-dialect SQL validation, lint rules L001–L010, and formatting —
          aligned with the{' '}
          <a
            className="text-cyan-400 underline-offset-2 hover:underline"
            href="https://github.com/ajitpratap0/GoSQLX"
            target="_blank"
            rel="noreferrer"
          >
            GoSQLX
          </a>{' '}
          parser used in CI (<code className="text-cyan-200">ajitpratap0/GoSQLX@v1.14.0</code>
          ). Paste a query, pick a dialect, and get actionable feedback in
          milliseconds.
        </p>
      </header>

      <section className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Dialect</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={dialect}
            onChange={(e) => setDialect(e.target.value as Dialect)}
          >
            {DIALECTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={runLocal}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            Lint locally
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={runViaApi}
            className="rounded-lg border border-cyan-700 bg-cyan-950/40 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-50"
          >
            Lint via API
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={applyFormat}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Format
          </button>
          <button
            type="button"
            onClick={() => setSql(SAMPLE)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Reset sample
          </button>
        </div>
        {apiNote ? (
          <p className="text-xs text-slate-400 sm:col-span-3">{apiNote}</p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            SQL input
          </label>
          <textarea
            className="sql-input h-[28rem] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100 outline-none ring-cyan-500/40 focus:ring-2"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            aria-label="SQL input"
          />
        </section>

        <section className="flex min-h-[28rem] flex-col rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex flex-wrap gap-1 border-b border-slate-800 p-2">
            {(
              [
                ['results', 'Results'],
                ['formatted', 'Formatted'],
                ['report', 'Report'],
                ['rules', 'Rules'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  tab === id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
            {result ? (
              <button
                type="button"
                onClick={downloadReport}
                className="ml-auto rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Download MD
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-auto p-4 text-sm">
            {tab === 'rules' ? (
              <ul className="space-y-2">
                {RULE_CATALOG.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300">{r.id}</span>
                      <span className="font-semibold">{r.name}</span>
                      <span
                        className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] uppercase ${severityClass(
                          r.severity
                        )}`}
                      >
                        {r.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-400">{r.description}</p>
                  </li>
                ))}
              </ul>
            ) : !result ? (
              <p className="text-slate-500">
                Run <strong>Lint locally</strong> or <strong>Lint via API</strong>{' '}
                to see violations, extracted tables, and a formatted copy.
              </p>
            ) : tab === 'results' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="OK" value={result.ok ? 'yes' : 'no'} good={result.ok} />
                  <Stat label="Dialect" value={result.dialect} />
                  <Stat label="Tables" value={String(result.tables.length)} />
                  <Stat
                    label="E / W / I"
                    value={`${result.summary.errors}/${result.summary.warnings}/${result.summary.infos}`}
                  />
                </div>
                {result.tables.length ? (
                  <p className="text-xs text-slate-400">
                    Tables:{' '}
                    <span className="font-mono text-slate-200">
                      {result.tables.join(', ')}
                    </span>
                  </p>
                ) : null}
                {result.violations.length === 0 ? (
                  <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-emerald-300">
                    No violations — query looks clean.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {result.violations.map((v, idx) => (
                      <li
                        key={`${v.rule}-${v.line}-${v.column}-${idx}`}
                        className={`rounded-lg border p-3 ${severityClass(v.severity)}`}
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs">[{v.rule}]</span>
                          <span className="font-semibold">{v.name}</span>
                          <span className="text-xs opacity-80">
                            @ {v.line}:{v.column}
                          </span>
                        </div>
                        <p className="mt-1">{v.message}</p>
                        {v.suggestion ? (
                          <p className="mt-1 text-xs opacity-80">
                            Suggestion: {v.suggestion}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-slate-500">
                  Elapsed {result.elapsedMs} ms · {result.statementCount} statement(s)
                </p>
              </div>
            ) : tab === 'formatted' ? (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                {result.formatted}
              </pre>
            ) : (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                {reportMd}
              </pre>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 grid gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5 md:grid-cols-3">
        <div>
          <h2 className="text-sm font-semibold text-cyan-300">CI integration</h2>
          <p className="mt-1 text-sm text-slate-400">
            Repo workflow{' '}
            <code className="text-slate-200">.github/workflows/gosqlx-lint.yml</code>{' '}
            runs the official action on curated <code className="text-slate-200">sql/**</code>{' '}
            fixtures.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-cyan-300">REST API</h2>
          <p className="mt-1 text-sm text-slate-400">
            <code className="text-slate-200">POST /api/lint</code> with{' '}
            <code className="text-slate-200">{`{ sql, dialect }`}</code>. GET returns
            dialects + rule catalog.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-cyan-300">Standards</h2>
          <p className="mt-1 text-sm text-slate-400">
            Developer guide:{' '}
            <code className="text-slate-200">standards/SQL_CODE_STANDARDS.md</code>
          </p>
        </div>
      </section>

      <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
        Playground implements GoSQLX-aligned rules in TypeScript for instant UX.
        Authoritative parse for merge gates is the GoSQLX CLI/Action in CI.
        Not a substitute for dialect-specific database engines.
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 font-semibold ${
          good === true
            ? 'text-emerald-400'
            : good === false
              ? 'text-red-400'
              : 'text-slate-100'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
