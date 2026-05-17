'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  generatePromptPacket,
  type PromptPacket
} from '../lib/prompt-generator';

type AccessibilityMode = 'standard' | 'wcag_aaa' | 'dyslexia' | 'adhd' | 'sensory' | 'large_print' | 'eco';

interface FormState {
  idea: string;
  audience: string;
  outputType: string;
  channel: string;
  monetizationGoal: string;
  constraints: string;
  researchDepth: string;
}

const accessibilityModes: Array<{ id: AccessibilityMode; label: string; help: string }> = [
  { id: 'standard', label: 'Standard', help: 'Default readable interface.' },
  { id: 'wcag_aaa', label: 'High contrast', help: 'Black and white high-contrast mode.' },
  { id: 'dyslexia', label: 'Dyslexia-friendly', help: 'Adds extra spacing for easier reading.' },
  { id: 'adhd', label: 'Focus', help: 'Softens supporting panels.' },
  { id: 'sensory', label: 'Sensory safe', help: 'Disables motion and transitions.' },
  { id: 'large_print', label: 'Large print', help: 'Increases base text size.' },
  { id: 'eco', label: 'Eco', help: 'Reduces visual effects.' }
];

const defaultFormState: FormState = {
  idea: 'Create a prompt generation app that turns rough WR ideas into source-backed build packets.',
  audience: 'small-business founders, agencies, AI builders, and Revvel agents',
  outputType: 'app',
  channel: 'founder',
  monetizationGoal: '$29 downloadable prompt packet, $99 monthly workspace, or $499 setup sprint',
  constraints: 'Use public sources only, show evidence, avoid unsupported claims, include code-review gates, and ship a working UI.',
  researchDepth: 'market, SEO, competitor, GitHub, public chatter, facts, technical delivery, revenue, and review'
};

const outputTypes = [
  { value: 'app', label: 'App' },
  { value: 'pdf', label: 'Sellable PDF' },
  { value: 'cli', label: 'CLI' },
  { value: 'mcp', label: 'MCP' },
  { value: 'api', label: 'API' },
  { value: 'skill', label: 'Skill' }
];

const channels = [
  { value: 'founder', label: 'Founder / operator' },
  { value: 'seo', label: 'SEO / content' },
  { value: 'agency', label: 'Agency / marketer' },
  { value: 'developer', label: 'Developer / AI team' }
];

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-slate-700 bg-slate-50 border-slate-200';
}

function Field({
  id,
  label,
  children,
  help
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {help ? <p className="mt-2 text-sm text-slate-600">{help}</p> : null}
    </div>
  );
}

function TextArea({
  id,
  value,
  onChange,
  rows = 4
}: {
  id: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-teal-700"
    />
  );
}

function SelectField({
  id,
  value,
  options,
  onChange
}: {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-teal-700"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [mode, setMode] = useState<AccessibilityMode>('standard');
  const [copied, setCopied] = useState(false);

  const packet: PromptPacket = useMemo(() => generatePromptPacket(form), [form]);

  useEffect(() => {
    const stored = window.localStorage.getItem('promptforge-accessibility-mode') as AccessibilityMode | null;
    if (stored && accessibilityModes.some((item) => item.id === stored)) {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    document.body.dataset.accessibilityMode = mode;
    window.localStorage.setItem('promptforge-accessibility-mode', mode);
  }, [mode]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function copyPacket() {
    await navigator.clipboard.writeText(packet.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main id="main-content" className="min-h-screen bg-slate-50 text-slate-950">
      <a className="skip-link" href="#packet-output">
        Skip to generated prompt packet
      </a>

      <section className="eco-reduce bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-4 py-16 text-white shadow-xl sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              Revvel PromptForge
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Generate prompts with market facts, source logs, and review gates already attached.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
              The app turns Audrey's rough issue notes, snippets, and LLM output into a build-ready packet:
              problem, audience, competitors, public chatter, legal research boundaries, implementation prompt,
              and code-review checklist.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-3xl font-black">$4.51B</p>
                <p className="mt-1 text-sm text-slate-200">Projected 2030 prompt engineering market cited by Research and Markets.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-3xl font-black">270k</p>
                <p className="mt-1 text-sm text-slate-200">PromptBase prompt catalog scale proves demand and crowded competition.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-3xl font-black">8 lanes</p>
                <p className="mt-1 text-sm text-slate-200">Market, SEO, competitors, chatter, facts, technical, revenue, review.</p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-bold">What is different?</h2>
            <ul className="mt-5 space-y-4 text-slate-100">
              <li><strong>Not a generic library:</strong> every output includes why the product should exist.</li>
              <li><strong>Not blind rewriting:</strong> prompt copy is tied to cited market and competitor evidence.</li>
              <li><strong>Not a one-off chat:</strong> packets include review prompts and acceptance gates for PRs.</li>
              <li><strong>Legal OSINT only:</strong> public sources are logged; credentialed dark-web access is not used.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Accessibility modes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Preferences persist locally. Keyboard users can tab through every control.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Accessibility display mode">
              {accessibilityModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  title={item.help}
                  onClick={() => setMode(item.id)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${
                    mode === item.id
                      ? 'border-teal-800 bg-teal-800 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-teal-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form className="eco-reduce rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" aria-label="Prompt packet inputs">
            <h2 className="text-2xl font-black text-slate-950">1. Describe the raw idea</h2>
            <p className="mt-2 text-slate-600">
              Treat the source text as unverified. The generator will add the research checklist and source-backed prompts.
            </p>

            <div className="mt-6 space-y-6">
              <Field id="idea" label="Raw idea or PR request">
                <TextArea id="idea" value={form.idea} rows={5} onChange={(value) => updateField('idea', value)} />
              </Field>

              <Field id="audience" label="Who are we marketing to?">
                <TextArea id="audience" value={form.audience} rows={3} onChange={(value) => updateField('audience', value)} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="outputType" label="Output type">
                  <SelectField id="outputType" value={form.outputType} options={outputTypes} onChange={(value) => updateField('outputType', value)} />
                </Field>
                <Field id="channel" label="Primary channel">
                  <SelectField id="channel" value={form.channel} options={channels} onChange={(value) => updateField('channel', value)} />
                </Field>
              </div>

              <Field id="monetizationGoal" label="Revenue path">
                <TextArea id="monetizationGoal" value={form.monetizationGoal} rows={3} onChange={(value) => updateField('monetizationGoal', value)} />
              </Field>

              <Field id="constraints" label="Rules and constraints">
                <TextArea id="constraints" value={form.constraints} rows={4} onChange={(value) => updateField('constraints', value)} />
              </Field>

              <Field id="researchDepth" label="Research lanes to include">
                <TextArea id="researchDepth" value={form.researchDepth} rows={3} onChange={(value) => updateField('researchDepth', value)} />
              </Field>
            </div>
          </form>

          <div id="packet-output" className="space-y-8">
            <section className="eco-reduce rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-teal-700">Generated packet</p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">Decision and positioning</h2>
                </div>
                <button
                  type="button"
                  onClick={copyPacket}
                  className="min-h-11 rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-teal-800"
                >
                  {copied ? 'Copied' : 'Copy packet'}
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className={`rounded-2xl border p-5 ${scoreColor(packet.scores.blueOcean)}`}>
                  <p className="text-sm font-bold uppercase tracking-wide">Blue-ocean score</p>
                  <p className="mt-2 text-4xl font-black">{packet.scores.blueOcean}/100</p>
                </div>
                <div className={`rounded-2xl border p-5 ${scoreColor(100 - packet.scores.redOcean)}`}>
                  <p className="text-sm font-bold uppercase tracking-wide">Red-ocean pressure</p>
                  <p className="mt-2 text-4xl font-black">{packet.scores.redOcean}/100</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-teal-950">
                <h3 className="font-black">Decision</h3>
                <p className="mt-2">{packet.scores.decision}</p>
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <h3 className="font-black text-slate-950">Problem solved</h3>
                  <p className="mt-2 leading-7 text-slate-700">{packet.problemSolved}</p>
                </div>
                <div>
                  <h3 className="font-black text-slate-950">Differentiation</h3>
                  <p className="mt-2 leading-7 text-slate-700">{packet.differentiation}</p>
                </div>
              </div>
            </section>

            <section className="eco-reduce rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-black text-slate-950">2. Required checklist</h2>
              <div className="mt-5 grid gap-3">
                {packet.checklist.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex gap-3">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-black text-white" aria-hidden="true">
                        OK
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-950">{item.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{item.detail}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="optional-panel px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <article className="eco-reduce rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-black text-slate-950">3. Competitor and gap matrix</h2>
            <div className="mt-5 space-y-4">
              {packet.competitors.map((competitor) => (
                <div key={competitor.name} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-950">{competitor.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{competitor.model}</p>
                  <p className="mt-3 text-sm text-slate-700"><strong>Strength:</strong> {competitor.strength}</p>
                  <p className="mt-2 text-sm text-slate-700"><strong>Gap:</strong> {competitor.gap}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="eco-reduce rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-black text-slate-950">4. Sources and resources used</h2>
            <div className="mt-5 space-y-4">
              {packet.sources.map((source) => (
                <div key={source.id} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-950">{source.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{source.evidence}</p>
                  <p className="mt-2 text-sm text-slate-600"><strong>Use:</strong> {source.use}</p>
                  <a className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-teal-800 underline" href={source.url}>
                    Open source
                  </a>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <article className="eco-reduce rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-2xl font-black text-slate-950">5. Exportable prompt packet</h2>
                <p className="mt-3 leading-7 text-slate-700">
                  Paste this packet into an LLM, GitHub issue, or WR. It includes the source log and reviewer prompt so
                  unsupported claims get caught before launch copy or code lands.
                </p>
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                  <h3 className="font-black">Legal search boundary</h3>
                  <p className="mt-2 text-sm leading-6">
                    This packet uses public web, public GitHub, public docs, and public community chatter. It does not
                    require credentialed dark-web access, private account scraping, or bypassing platform terms.
                  </p>
                </div>
              </div>
              <textarea
                aria-label="Exported prompt packet markdown"
                readOnly
                value={packet.markdown}
                rows={26}
                className="w-full rounded-2xl border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 shadow-inner"
              />
            </div>
          </article>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600 sm:px-6 lg:px-8">
        <p>Revvel PromptForge is owned by MIDNGHTSAPPHIRE. TTY users may dial <a className="font-bold text-teal-800 underline" href="tel:711">711</a> for relay support.</p>
        <p className="mt-2">Local test URL: <code>http://localhost:3006</code>. Vercel root directory: <code>products/prompt-generation-app</code>.</p>
      </footer>
    </main>
  );
}
