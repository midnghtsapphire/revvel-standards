'use client';

import { useEffect, useMemo, useState } from 'react';
import { generatePromptPacket, packetToMarkdown } from '../lib/prompt-generator';

const MODES = [
  { id: 'default', label: 'Default' },
  { id: 'aaa', label: 'WCAG AAA' },
  { id: 'dyslexia', label: 'Dyslexia-friendly' },
  { id: 'focus', label: 'Focus mode' },
  { id: 'contrast', label: 'High contrast' },
  { id: 'large', label: 'Large text' },
  { id: 'mono', label: 'Monospace' },
];

export default function Page() {
  const [idea, setIdea] = useState('');
  const [audience, setAudience] = useState('founders');
  const [mode, setMode] = useState('default');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('pf-mode') : null;
    if (stored) setMode(stored);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('pf-mode', mode);
  }, [mode]);

  const packet = useMemo(
    () => (idea.trim() ? generatePromptPacket({ idea, audience }) : null),
    [idea, audience]
  );

  const markdown = packet ? packetToMarkdown(packet) : '';

  return (
    <main className={`mode-${mode} min-h-screen p-6 max-w-5xl mx-auto`}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Revvel PromptForge</h1>
        <p className="opacity-80">Rough idea → source-backed prompt packet.</p>
      </header>

      <section className="mb-4 flex gap-2 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1 rounded border ${mode === m.id ? 'bg-white text-black' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </section>

      <section className="grid gap-3 mb-6 focus-keep">
        <label className="flex flex-col gap-1">
          <span>Idea / WR</span>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="p-2 rounded bg-black/40 border border-white/20"
            placeholder="e.g. OSINT tool for tracking competitor pricing"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Audience</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="p-2 rounded bg-black/40 border border-white/20"
          >
            <option value="founders">Founders</option>
            <option value="agencies">Agencies</option>
            <option value="ai-builders">AI Builders</option>
            <option value="internal">Internal Revvel</option>
          </select>
        </label>
      </section>

      {packet && (
        <section className="focus-keep grid gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(markdown)}
              className="px-3 py-1 rounded bg-emerald-300 text-black"
            >
              Copy markdown
            </button>
          </div>
          <pre className="whitespace-pre-wrap p-4 bg-black/40 rounded border border-white/10 text-sm">
{markdown}
          </pre>
        </section>
      )}
    </main>
  );
}
