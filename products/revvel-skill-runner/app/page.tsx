"use client";

import { useState } from "react";

const SKILLS = [
  {
    id: "ocr-document-parser",
    name: "OCR Document Parser",
    category: "Document AI",
    description:
      "Extract structured Markdown from images, PDFs, and scanned docs. Powered by vision LLM (cloud) or PaddleOCR (local). Feeds directly into RAG pipelines.",
    trigger: "ocr document parser",
    icon: "📄",
    inputLabel: "Image URL",
    inputPlaceholder: "https://example.com/invoice.png",
    inputType: "url" as const,
  },
  {
    id: "product-pipeline",
    name: "Product Pipeline",
    category: "Product Operations",
    description:
      "Operate the daily Revvel product creation pipeline — listen, triage, brief, gate, build, certify, ship.",
    trigger: "product pipeline",
    icon: "🏭",
  },
  {
    id: "content-automation",
    name: "Content Automation",
    category: "Content",
    description:
      "AI-powered content creation pipeline. Generate blog posts, social copy, and SEO-optimised articles.",
    trigger: "content automation",
    icon: "✍️",
  },
  {
    id: "openrouter-swarms",
    name: "OpenRouter Swarms",
    category: "AI Infrastructure",
    description:
      "Orchestrate multi-LLM swarms via OpenRouter. Run Scout/Sage/Forge patterns in parallel.",
    trigger: "openrouter swarms",
    icon: "🧠",
  },
  {
    id: "skill-forge",
    name: "Skill Forge",
    category: "Developer Tools",
    description:
      "Create, validate, and publish new Revvel skills. Automates SKILL.md, tests, and registry entry.",
    trigger: "skill forge",
    icon: "⚒️",
  },
  {
    id: "eeat-trust-authority",
    name: "E-E-A-T Trust Authority",
    category: "SEO / Trust",
    description:
      "Audit and improve Experience, Expertise, Authoritativeness, Trustworthiness signals across properties.",
    trigger: "eeat trust",
    icon: "🏅",
  },
  {
    id: "ralph-loop",
    name: "Ralph Self-Healing Loop",
    category: "Ops",
    description:
      "Detect and auto-heal broken workflows, stale PRs, and stuck WRs. Keeps the pipeline moving.",
    trigger: "ralph loop",
    icon: "🔄",
  },
];

type RunStatus = "idle" | "running" | "done" | "error";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [runStatus, setRunStatus] = useState<Record<string, RunStatus>>({});
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [skillInputs, setSkillInputs] = useState<Record<string, string>>({});

  const filtered = SKILLS.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
  );

  async function runSkill(skillId: string, trigger: string, customInput?: string) {
    setRunStatus((prev) => ({ ...prev, [skillId]: "running" }));
    setOutputs((prev) => ({ ...prev, [skillId]: "" }));

    try {
      // OCR skill routes to the dedicated /api/ocr endpoint
      if (skillId === "ocr-document-parser") {
        const imageUrl = customInput?.trim();
        if (!imageUrl) {
          setOutputs((prev) => ({ ...prev, [skillId]: "⚠️ Paste an image URL above and click Run." }));
          setRunStatus((prev) => ({ ...prev, [skillId]: "error" }));
          return;
        }
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "OCR failed");
        setOutputs((prev) => ({ ...prev, [skillId]: data.output }));
        setRunStatus((prev) => ({ ...prev, [skillId]: "done" }));
        return;
      }

      const res = await fetch("/api/run-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, trigger }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Skill run failed");

      setOutputs((prev) => ({ ...prev, [skillId]: data.output }));
      setRunStatus((prev) => ({ ...prev, [skillId]: "done" }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setOutputs((prev) => ({ ...prev, [skillId]: `Error: ${message}` }));
      setRunStatus((prev) => ({ ...prev, [skillId]: "error" }));
    }
  }

  return (
    <main className="min-h-screen text-white">
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚡</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Revvel Skill Runner
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Browse and run AI-powered skills from the Revvel registry. Ship
            products faster.
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search skills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-purple-800/50 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            🔍
          </span>
        </div>

        {/* Skills grid */}
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-16">
            No skills match &ldquo;{query}&rdquo;
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                status={runStatus[skill.id] ?? "idle"}
                output={outputs[skill.id] ?? ""}
                inputValue={skillInputs[skill.id] ?? ""}
                onInputChange={(val) =>
                  setSkillInputs((prev) => ({ ...prev, [skill.id]: val }))
                }
                onRun={() =>
                  runSkill(skill.id, skill.trigger, skillInputs[skill.id])
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-900/40 mt-16 py-6">
        <p className="text-center text-gray-600 text-sm">
          Revvel Skill Runner · Built to{" "}
          <span className="text-purple-400">ship faster</span>
        </p>
      </footer>
    </main>
  );
}

function SkillCard({
  skill,
  status,
  output,
  inputValue,
  onInputChange,
  onRun,
}: {
  skill: (typeof SKILLS)[number];
  status: RunStatus;
  output: string;
  inputValue: string;
  onInputChange: (val: string) => void;
  onRun: () => void;
}) {
  const statusConfig: Record<
    RunStatus,
    { label: string; cls: string }
  > = {
    idle: { label: "Run", cls: "bg-purple-600 hover:bg-purple-500" },
    running: { label: "Running…", cls: "bg-yellow-600 cursor-not-allowed" },
    done: { label: "Run again", cls: "bg-green-700 hover:bg-green-600" },
    error: { label: "Retry", cls: "bg-red-700 hover:bg-red-600" },
  };

  const { label, cls } = statusConfig[status];

  return (
    <div className="bg-white/5 border border-purple-900/40 rounded-2xl p-5 flex flex-col gap-4 hover:border-purple-700/60 transition">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{skill.icon}</span>
          <span className="text-xs text-purple-400 uppercase tracking-wider font-medium">
            {skill.category}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-white">{skill.name}</h2>
        <p className="text-gray-400 text-sm mt-1">{skill.description}</p>
      </div>

      {"inputLabel" in skill && skill.inputLabel && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            {skill.inputLabel}
          </label>
          <input
            type={skill.inputType ?? "text"}
            placeholder={skill.inputPlaceholder ?? ""}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="bg-black/30 border border-purple-900/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      )}

      <button
        onClick={onRun}
        disabled={status === "running"}
        className={`mt-auto w-full py-2 rounded-lg text-sm font-semibold text-white transition ${cls}`}
      >
        {label}
      </button>

      {output && (
        <div
          className={`rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-60 overflow-auto ${
            status === "error"
              ? "bg-red-900/30 text-red-300"
              : "bg-black/40 text-green-300"
          }`}
        >
          {output}
        </div>
      )}
    </div>
  );
}
