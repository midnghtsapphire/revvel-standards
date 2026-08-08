"use client";

import { useMemo, useState } from "react";
import {
  DEMO_CHAT,
  organizeChat,
  toMarkdown,
  toWrPackMarkdown,
  type DeploymentPlanLane,
  type OrganizeResult,
} from "./data/organize";

type ExportMode = "plan" | "wr-pack" | "filtered" | "json";

function statusClass(status: DeploymentPlanLane["status"]): string {
  if (status === "ready") return "badge-ready";
  if (status === "deferred") return "badge-deferred";
  return "badge-pending";
}

function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LaneCard({ lane }: { lane: DeploymentPlanLane }) {
  return (
    <article className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-sky-300/80">Order {lane.order}</p>
          <h3 className="mt-1 text-lg font-semibold text-white sm:text-xl">{lane.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(lane.status)}`}>
          {lane.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{lane.purpose}</p>
      <dl className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Target</dt>
          <dd className="font-mono text-sky-200">{lane.target}</dd>
        </div>
        <div>
          <dt className="text-slate-500">First $</dt>
          <dd>{lane.firstDollar}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Matched segments</dt>
          <dd>{lane.segmentCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Blockers in lane</dt>
          <dd className={lane.blockerCount ? "text-rose-300" : ""}>{lane.blockerCount}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function Home() {
  const [chat, setChat] = useState(DEMO_CHAT);
  const [sourceName, setSourceName] = useState("finisher-chat.txt");
  const [exportMode, setExportMode] = useState<ExportMode>("plan");
  const [copied, setCopied] = useState(false);

  const result: OrganizeResult = useMemo(
    () => organizeChat(chat, { sourceName: sourceName.trim() || "chat-dump" }),
    [chat, sourceName],
  );

  const exportText = useMemo(() => {
    if (exportMode === "plan") return toMarkdown(result);
    if (exportMode === "wr-pack") return toWrPackMarkdown(result);
    if (exportMode === "filtered") return result.filteredText;
    return JSON.stringify(result, null, 2);
  }, [exportMode, result]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const ext = exportMode === "json" ? "json" : "md";
    downloadText(`deployment-${exportMode}.${ext}`, exportText);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="glass rounded-3xl p-6 sm:p-8">
        <p className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
          Revvel Finishers · SaaS
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl">
          Filter research chats into the correct deployment order
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Paste a huge implementation / research chat. Noise is stripped, segments are classified,
          and work is organized into the Finisher money path (0→1→2 first): seed finishers, produce
          sellables, Gumroad, then Vercel apps — with blockers surfaced early and paste-ready WRs.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 px-3 py-1">Port 3012</span>
          <span className="rounded-full border border-white/10 px-3 py-1">$29 pack · $99/mo workspace</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Script-first · no agent sprawl</span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">1. Paste chat dump</h2>
              <p className="mt-1 text-sm text-slate-400">UI chrome, “Worked for…”, and sandbox URLs are filtered.</p>
            </div>
            <button
              type="button"
              onClick={() => setChat(DEMO_CHAT)}
              className="rounded-xl border border-violet-300/30 bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-500/25"
            >
              Load demo chat
            </button>
          </div>

          <label className="mt-4 block text-sm text-slate-300">
            Source name
            <input
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-sm text-sky-100 outline-none ring-sky-400/40 focus:ring-2"
              placeholder="finisher.txt"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Chat / research transcript
            <textarea
              value={chat}
              onChange={(event) => setChat(event.target.value)}
              rows={18}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none ring-sky-400/40 focus:ring-2 sm:text-sm"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">2. Filter stats</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Raw lines", result.stats.rawLines],
                ["Kept", result.stats.keptLines],
                ["Dropped", result.stats.droppedLines],
                ["Segments", result.stats.segmentCount],
                ["Blockers", result.stats.blockerCount],
                ["Filter ratio", result.stats.filterRatio],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {result.blockers.length > 0 && (
              <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
                <h3 className="text-sm font-semibold text-rose-200">Blockers surfaced early</h3>
                <ul className="mt-2 space-y-2 text-sm text-rose-100/90">
                  {result.blockers.slice(0, 5).map((blocker) => (
                    <li key={blocker.id}>
                      <span className="font-mono text-rose-200">{blocker.id}</span> · {blocker.excerpt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">3. Export for GitHub</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["plan", "Deployment plan"],
                  ["wr-pack", "WR pack"],
                  ["filtered", "Filtered chat"],
                  ["json", "JSON"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExportMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    exportMode === mode
                      ? "bg-sky-400 text-slate-950"
                      : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-[11px] leading-relaxed text-slate-200 sm:text-xs">
              {exportText}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                {copied ? "Copied" : "Copy export"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Ordered deployment lanes</h2>
            <p className="mt-1 text-sm text-slate-400">
              Do not scramble: money path is Finisher-0 → 1 → 2 before portfolio and affiliate work.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {result.deploymentPlan.map((lane) => (
            <LaneCard key={lane.id} lane={lane} />
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Classified segments</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">Conf</th>
                <th className="px-2 py-2">Excerpt</th>
              </tr>
            </thead>
            <tbody>
              {result.segments.map((segment) => (
                <tr key={segment.id} className="border-t border-white/10 align-top text-slate-300">
                  <td className="px-2 py-3 font-mono text-xs text-sky-200">{segment.id}</td>
                  <td className="px-2 py-3">{segment.category}</td>
                  <td className="px-2 py-3 font-mono text-xs">{segment.deploymentTarget}</td>
                  <td className="px-2 py-3">{segment.confidence}</td>
                  <td className="px-2 py-3 text-xs leading-relaxed text-slate-400">{segment.excerpt}</td>
                </tr>
              ))}
              {result.segments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-slate-500">
                    No segments survived the filter. Paste a denser research chat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pb-8 text-center text-xs text-slate-500">
        CLI twin: <code className="text-slate-400">node scripts/chat-deployment-organizer.js --input chat.txt --format markdown</code>
        {" · "}
        Closes the “filter and organize the chat into the correct deployment” loop for WR-16924.
      </footer>
    </div>
  );
}
