"use client";

import { useMemo, useState } from "react";
import { STARTERS, TEMPLATES, suggestTitle } from "../lib/titles";

export default function Home() {
  const [messy, setMessy] = useState(
    "[WR]  Need ability to autocreate generic WR titles so I do not have to retype like this one"
  );
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const suggestion = useMemo(
    () => suggestTitle({ title: messy, summary, force: true }),
    [messy, summary]
  );

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied("copy-failed");
    }
  }

  return (
    <div className="min-h-screen bg-grid text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-cyan-900/20 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
          <p className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-900">
            Revvel · Work Request tooling
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            WR Title Studio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
            Paste a messy brain-dump title. Get a clean <code>[WR]</code> title
            from mined templates — no API key, no retyping. On GitHub, comment{" "}
            <code>/wr-title force</code> to apply the same engine to an open issue.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Messy input</h2>
            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Title draft</span>
              <textarea
                value={messy}
                onChange={(e) => setMessy(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </label>
            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Optional summary seed
              </span>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="If the title is sparse, paste the Summary field here"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-emerald-950">Suggested title</h2>
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 font-mono text-sm leading-relaxed text-slate-900">
              {suggestion.title}
            </p>
            <p className="mt-3 text-xs text-emerald-900/80">
              reason: <code>{suggestion.reason}</code>
              {suggestion.templateKey ? (
                <>
                  {" "}
                  · template: <code>{suggestion.templateKey}</code>
                </>
              ) : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyText(suggestion.title, "suggest")}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-800"
              >
                Copy title
              </button>
              <button
                type="button"
                onClick={() => copyText("/wr-title force", "slash")}
                className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                Copy /wr-title force
              </button>
            </div>
            {copied ? (
              <p className="mt-3 text-xs font-medium text-emerald-800" role="status">
                {copied === "copy-failed" ? "Clipboard blocked — select and copy manually." : "Copied."}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">One-click starters</h2>
          <p className="mt-1 text-sm text-slate-600">
            Replace the &lt;placeholders&gt;, paste into the GitHub issue title box.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {STARTERS.map((starter) => (
              <li
                key={starter.key}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <span className="text-sm font-semibold text-slate-800">{starter.title}</span>
                <code className="text-xs text-slate-700">{starter.body}</code>
                <button
                  type="button"
                  onClick={() => copyText(starter.body, starter.key)}
                  className="self-start rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Template catalog</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Key</th>
                  <th className="py-2 pr-4">Pattern</th>
                  <th className="py-2">Usage</th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATES.map((t) => (
                  <tr key={t.key} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4 font-mono text-xs">{t.key}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{t.title}</td>
                    <td className="py-3 text-slate-700">{t.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="pb-8 text-center text-xs text-slate-500">
          Engine SSOT: <code>scripts/wr-autotitle.js</code> · Registry:{" "}
          <code>config/wr-title-templates.yml</code> · Docs:{" "}
          <code>docs/WR_TITLE_AUTOCREATE.md</code>
        </footer>
      </main>
    </div>
  );
}
