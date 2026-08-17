"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  execution: string;
  costHint?: string;
  goodFor?: string[];
  badFor?: string[];
};

type BomItem = {
  id: string;
  name: string;
  category: string;
  provider: string;
  status: string;
  freeTier: boolean;
  costNote: string;
  skillsFit: string[];
  notes: string;
};

type ChatResult = {
  requestId?: string;
  content?: string;
  mode?: string;
  model?: string;
  citations?: string[];
  skillInvocations?: Array<{
    skillId: string;
    category: string;
    status: string;
    result?: unknown;
    error?: string;
    durationMs?: number;
  }>;
  error?: string;
};

type Monitor = {
  snapshot?: {
    totalRequests: number;
    liveRequests: number;
    mockRequests: number;
    errorCount: number;
    rateLimitedCount: number;
    avgLatencyMs: number;
    skillHits?: Record<string, number>;
  };
};

const PROMPT_PRESETS = [
  {
    label: "Skills fit",
    text: "When is Perplexity API a good fit vs bad fit for a SaaS research feature that needs citations and tool calling?",
  },
  {
    label: "BOM for search",
    text: "Which BOM items pair with web_search skills and what do they cost?",
  },
  {
    label: "MCP vs custom",
    text: "Compare MCP tools vs custom functions for wiring Revvel skills into Perplexity Agent API.",
  },
];

export default function HomePage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [bom, setBom] = useState<BomItem[]>([]);
  const [bomQuery, setBomQuery] = useState("perplexity");
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0].text);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "bom_lookup",
    "skill_classify",
    "repo_context",
  ]);
  const [forceMock, setForceMock] = useState(true);
  const [chatResult, setChatResult] = useState<ChatResult | null>(null);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const [h, s, m] = await Promise.all([
        fetch("/api/health").then((r) => r.json()),
        fetch("/api/skills").then((r) => r.json()),
        fetch("/api/monitor").then((r) => r.json()),
      ]);
      setHealth(h);
      setSkills(s.skills || []);
      setMonitor(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadBom = useCallback(async (q: string) => {
    const res = await fetch(`/api/bom?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setBom(data.items || []);
  }, []);

  useEffect(() => {
    void loadMeta();
    void loadBom("perplexity");
  }, [loadMeta, loadBom]);

  const localSkills = useMemo(
    () => skills.filter((s) => s.execution === "local"),
    [skills]
  );

  function toggleSkill(id: string) {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function runChat() {
    setBusy(true);
    setError(null);
    setChatResult(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mock: forceMock,
          skills: selectedSkills,
          messages: [
            {
              role: "system",
              content:
                "You are the Revvel pplx-api skills assistant. Prefer citing skills by id and explaining good vs bad fits.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = (await res.json()) as ChatResult;
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      }
      setChatResult(data);
      const mon = await fetch("/api/monitor").then((r) => r.json());
      setMonitor(mon);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 space-y-3">
        <p className="badge bg-teal-500/20 text-teal-200">
          production-app · port 3012 · WR #16930
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          pplx-api Skills Console
        </h1>
        <p className="max-w-3xl text-teal-100/80">
          The “skills” you see in Perplexity’s chat thought process are Agent API{" "}
          <strong className="text-teal-50">tools</strong>: built-in search,
          MCP servers, and custom functions. This app wires them up with auth,
          rate limits, BOM lookup, response parsing, and a monitoring snapshot —
          mock mode works without a key.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-teal-200/80">
          <span className="badge bg-black/40">
            mode: {String(health?.mode ?? "…")}
          </span>
          <span className="badge bg-black/40">
            key: {health?.hasPerplexityKey ? "configured" : "missing → mock"}
          </span>
          <span className="badge bg-black/40">
            reqs: {monitor?.snapshot?.totalRequests ?? 0}
          </span>
          <span className="badge bg-black/40">
            avg: {monitor?.snapshot?.avgLatencyMs ?? 0}ms
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Chat + skills</h2>
            <label className="flex items-center gap-2 text-sm text-teal-100/80">
              <input
                type="checkbox"
                checked={forceMock}
                onChange={(e) => setForceMock(e.target.checked)}
              />
              Force mock
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {PROMPT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn-ghost"
                onClick={() => setPrompt(p.text)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            className="input min-h-[140px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about Perplexity skills, costs, BOM fit…"
          />

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-teal-300/70">
              Local skills to expose
            </p>
            <div className="flex flex-wrap gap-2">
              {localSkills.map((s) => {
                const on = selectedSkills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    className={`badge border ${
                      on
                        ? "border-teal-400 bg-teal-500/30 text-teal-50"
                        : "border-teal-900 bg-black/20 text-teal-200/70"
                    }`}
                  >
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={busy || !prompt.trim()}
            onClick={() => void runChat()}
          >
            {busy ? "Running…" : "Run chat"}
          </button>

          {error && (
            <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}

          {chatResult && (
            <div className="space-y-3 rounded-xl border border-teal-900/50 bg-black/30 p-4">
              <div className="flex flex-wrap gap-2 text-xs text-teal-200/80">
                <span className="badge bg-teal-900/50">
                  {chatResult.mode || "?"}
                </span>
                <span className="badge bg-teal-900/50">
                  {chatResult.model || "model n/a"}
                </span>
                <span className="badge bg-teal-900/50">
                  {chatResult.requestId}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-teal-50/90">
                {chatResult.content || chatResult.error || "(empty)"}
              </pre>
              {!!chatResult.skillInvocations?.length && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-teal-300/70">
                    Skill invocations
                  </p>
                  {chatResult.skillInvocations.map((s, i) => (
                    <div
                      key={`${s.skillId}-${i}`}
                      className="rounded-lg border border-teal-900/40 bg-teal-950/40 p-2 text-xs"
                    >
                      <div className="font-semibold text-teal-100">
                        {s.skillId}{" "}
                        <span className="font-normal text-teal-300/70">
                          · {s.category} · {s.status}
                          {s.durationMs != null ? ` · ${s.durationMs}ms` : ""}
                        </span>
                      </div>
                      {s.error && (
                        <p className="mt-1 text-red-200">{s.error}</p>
                      )}
                      {s.result != null && (
                        <pre className="mt-1 max-h-40 overflow-auto text-teal-100/70">
                          {JSON.stringify(s.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!!chatResult.citations?.length && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-teal-300/70">
                    Citations
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-teal-200/80">
                    {chatResult.citations.map((c) => (
                      <li key={c}>
                        <a className="underline hover:text-white" href={c}>
                          {c}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6 lg:col-span-2">
          <section className="card p-5 space-y-3">
            <h2 className="text-lg font-semibold text-white">Skill registry</h2>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {skills.map((s) => (
                <article
                  key={s.id}
                  className="rounded-xl border border-teal-900/50 bg-black/20 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-teal-50">{s.name}</h3>
                    <span className="badge bg-teal-900/60 text-teal-100">
                      {s.category}
                    </span>
                    <span className="badge bg-black/40 text-teal-200/70">
                      {s.execution}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-teal-100/70">{s.description}</p>
                  {s.costHint && (
                    <p className="mt-1 text-[11px] text-amber-200/80">
                      {s.costHint}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <h2 className="text-lg font-semibold text-white">BOM lookup</h2>
            <div className="flex gap-2">
              <input
                className="input"
                value={bomQuery}
                onChange={(e) => setBomQuery(e.target.value)}
                placeholder="Search BOM…"
              />
              <button
                type="button"
                className="btn-ghost shrink-0"
                onClick={() => void loadBom(bomQuery)}
              >
                Search
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto">
              {bom.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-teal-900/50 bg-black/20 p-3 text-xs"
                >
                  <div className="font-semibold text-teal-50">{item.name}</div>
                  <div className="mt-1 text-teal-200/70">
                    {item.provider} · {item.status}
                    {item.freeTier ? " · free tier" : ""}
                  </div>
                  <p className="mt-1 text-amber-100/80">{item.costNote}</p>
                  <p className="mt-1 text-teal-100/60">{item.notes}</p>
                  <p className="mt-1 text-teal-300/70">
                    skills: {item.skillsFit.join(", ")}
                  </p>
                </article>
              ))}
              {!bom.length && (
                <p className="text-sm text-teal-200/60">No BOM matches.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Good vs bad — quick operator guide
        </h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm text-teal-100/80">
          <div>
            <h3 className="mb-2 font-semibold text-emerald-300">Good uses</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Citation-backed research & competitor briefs</li>
              <li>Agent workflows that need live web_search + custom skills</li>
              <li>BOM-assisted API selection before provisioning keys</li>
              <li>MCP bridge into existing enterprise tool servers</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-rose-300">Bad / careful uses</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Private data without custom functions or trusted MCP</li>
              <li>Bulk scraping / high QPS (tool fees + rate limits)</li>
              <li>Deterministic CI fixtures (use mock mode instead)</li>
              <li>Replacing the no-key research lane for free automation</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-teal-200/50">
        APIs: /api/health · /api/chat · /api/skills · /api/bom · /api/monitor —
        see README.md
      </footer>
    </main>
  );
}
