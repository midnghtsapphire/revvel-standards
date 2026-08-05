'use client';

import { useEffect, useMemo, useState } from 'react';
import { generatePromptPacket, packetToMarkdown } from '../lib/prompt-generator';

const MODES = [
  { id: 'default', label: 'Default' },
  { id: 'aaa', label: 'Enhanced contrast' },
  { id: 'dyslexia', label: 'Dyslexia-friendly' },
  { id: 'focus', label: 'Focus mode' },
  { id: 'contrast', label: 'High contrast' },
  { id: 'large', label: 'Large text' },
  { id: 'mono', label: 'Monospace' },
];

type ModeId = (typeof MODES)[number]['id'];

function isModeId(value: string): value is ModeId {
  return MODES.some((item) => item.id === value);
}

export default function Page() {
  const [idea, setIdea] = useState('');
  const [audience, setAudience] = useState('founders');
  const [mode, setMode] = useState<ModeId>('default');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('pf-mode') : null;
    if (stored && isModeId(stored)) {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pf-mode', mode);
    }
  }, [mode]);

  const packet = useMemo(
    () => (idea.trim() ? generatePromptPacket({ idea, audience }) : null),
    [idea, audience]
  );

  const markdown = packet ? packetToMarkdown(packet) : '';

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyError('');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Clipboard write failed:', error);
      setCopied(false);
      setCopyError('Clipboard access is unavailable. Copy the markdown manually below.');
    }
  }

  return (
    <main className={`mode-${mode} mx-auto min-h-screen max-w-5xl p-6`}>
      <header className="focus-keep mb-6">
        <h1 className="text-3xl font-bold">Revvel PromptForge</h1>
        <p className="opacity-80">Rough idea → source-backed prompt packet.</p>
      </header>

      <section className="focus-keep mb-4 flex flex-wrap gap-2" aria-label="Accessibility modes">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
            className={`rounded border px-3 py-1 ${mode === item.id ? 'bg-white text-black' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="focus-keep mb-6 grid gap-3">
        <label className="flex flex-col gap-1">
          <span>Idea / WR</span>
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={4}
            className="rounded border border-white/20 bg-black/40 p-2"
            placeholder="e.g. OSINT tool for tracking competitor pricing"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Audience</span>
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className="rounded border border-white/20 bg-black/40 p-2"
          >
            <option value="founders">Founders</option>
            <option value="agencies">Agencies</option>
            <option value="ai-builders">AI Builders</option>
            <option value="internal">Internal Revvel</option>
          </select>
        </label>
      </section>

      {packet ? (
        <section className="focus-keep grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded border border-white/10 bg-black/30 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Blue-ocean score</h2>
              <p className="mt-2 text-3xl font-bold">{packet.scores.blueOcean}/100</p>
            </article>
            <article className="rounded border border-white/10 bg-black/30 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Red-ocean score</h2>
              <p className="mt-2 text-3xl font-bold">{packet.scores.redOcean}/100</p>
            </article>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyMarkdown}
              className="rounded bg-emerald-300 px-3 py-1 text-black"
            >
              {copied ? 'Copied' : 'Copy markdown'}
            </button>
          </div>

          {copyError ? <p className="text-sm text-amber-200">{copyError}</p> : null}

          <pre className="whitespace-pre-wrap rounded border border-white/10 bg-black/40 p-4 text-sm">
            {markdown}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
