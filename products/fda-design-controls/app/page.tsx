'use client';

import { useState, useMemo } from 'react';
import {
  DESIGN_PHASES,
  type ProjectInfo,
  buildDhfMarkdown,
  buildDhfCsv,
  countAllItems,
  countChecked,
  phaseCompletionPct,
} from './data/controls';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT: ProjectInfo = {
  deviceName: '',
  deviceVersion: '1.0',
  projectLead: '',
  intendedUse: '',
  deviceClass: '',
  startDate: '',
  targetDate: '',
};

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-500';
}

function badgeColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [project, setProject] = useState<ProjectInfo>(DEFAULT_PROJECT);
  // Map<phaseId, Set<itemId>>
  const [checkedMap, setCheckedMap] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [activePhaseId, setActivePhaseId] = useState<string>(
    DESIGN_PHASES[0].id
  );
  const [activeTab, setActiveTab] = useState<'checklist' | 'export'>(
    'checklist'
  );
  const [exportType, setExportType] = useState<'markdown' | 'csv'>('markdown');
  const [showGuidance, setShowGuidance] = useState<string | null>(null);

  // ── Toggle a single checklist item ─────────────────────────────────────────
  function toggleItem(phaseId: string, itemId: string) {
    setCheckedMap((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(phaseId) ?? []);
      if (set.has(itemId)) {
        set.delete(itemId);
      } else {
        set.add(itemId);
      }
      next.set(phaseId, set);
      return next;
    });
  }

  // ── Mark all items in a phase ───────────────────────────────────────────────
  function markAllInPhase(phaseId: string, checked: boolean) {
    const phase = DESIGN_PHASES.find((p) => p.id === phaseId);
    if (!phase) return;
    setCheckedMap((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(phaseId, new Set(phase.items.map((i) => i.id)));
      } else {
        next.set(phaseId, new Set());
      }
      return next;
    });
  }

  // ── Summary counts ──────────────────────────────────────────────────────────
  const { total, required } = useMemo(() => countAllItems(), []);
  const { checked, checkedRequired } = useMemo(
    () => countChecked(checkedMap),
    [checkedMap]
  );
  const overallPct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const requiredPct =
    required > 0 ? Math.round((checkedRequired / required) * 100) : 0;

  // ── Report text ─────────────────────────────────────────────────────────────
  const markdownReport = useMemo(
    () => buildDhfMarkdown(project, checkedMap),
    [project, checkedMap]
  );
  const csvReport = useMemo(
    () => buildDhfCsv(project, checkedMap),
    [project, checkedMap]
  );

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Active phase data ───────────────────────────────────────────────────────
  const activePhase = DESIGN_PHASES.find((p) => p.id === activePhaseId)!;
  const activeChecked = checkedMap.get(activePhaseId) ?? new Set<string>();
  const activePct = phaseCompletionPct(activePhase, activeChecked);
  const allActiveChecked = activePhase.items.every((i) =>
    activeChecked.has(i.id)
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-blue-300 tracking-tight">
              🏥 FDA Design Controls Tracker
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              21 CFR 820.30 · Design History File (DHF) Generator
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={`font-semibold ${badgeColor(overallPct)}`}>
              {overallPct}% overall
            </span>
            <span className="text-gray-600">|</span>
            <span className={`font-semibold ${badgeColor(requiredPct)}`}>
              {requiredPct}% required
            </span>
            <a
              href="https://www.fda.gov/media/116762/download"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              FDA Guidance ↗
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-0">
        {/* ── Left panel: Project info + phase nav ── */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-900 flex flex-col">
          {/* Project info */}
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Project Info
            </h2>
            <div className="space-y-2">
              <InputField
                label="Device Name"
                value={project.deviceName}
                placeholder="e.g. CardioMonitor 3000"
                onChange={(v) => setProject((p) => ({ ...p, deviceName: v }))}
              />
              <InputField
                label="Version"
                value={project.deviceVersion}
                placeholder="1.0"
                onChange={(v) =>
                  setProject((p) => ({ ...p, deviceVersion: v }))
                }
              />
              <InputField
                label="Project Lead"
                value={project.projectLead}
                placeholder="Name / Role"
                onChange={(v) =>
                  setProject((p) => ({ ...p, projectLead: v }))
                }
              />
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Device Class
                </label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  value={project.deviceClass}
                  onChange={(e) =>
                    setProject((p) => ({
                      ...p,
                      deviceClass: e.target.value as ProjectInfo['deviceClass'],
                    }))
                  }
                >
                  <option value="">— Select —</option>
                  <option value="Class I">Class I</option>
                  <option value="Class II">Class II</option>
                  <option value="Class III">Class III</option>
                </select>
              </div>
              <InputField
                label="Intended Use"
                value={project.intendedUse}
                placeholder="Brief description"
                onChange={(v) =>
                  setProject((p) => ({ ...p, intendedUse: v }))
                }
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">
                    Start
                  </label>
                  <input
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                    value={project.startDate}
                    onChange={(e) =>
                      setProject((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">
                    Target
                  </label>
                  <input
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                    value={project.targetDate}
                    onChange={(e) =>
                      setProject((p) => ({ ...p, targetDate: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Phase navigation */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Design Phases
            </h2>
            <nav className="space-y-1">
              {DESIGN_PHASES.map((phase) => {
                const phaseChecked =
                  checkedMap.get(phase.id) ?? new Set<string>();
                const pct = phaseCompletionPct(phase, phaseChecked);
                const isActive = phase.id === activePhaseId;
                return (
                  <button
                    key={phase.id}
                    onClick={() => {
                      setActivePhaseId(phase.id);
                      setActiveTab('checklist');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-800 text-blue-100'
                        : 'hover:bg-gray-800 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{phase.title}</span>
                      <span
                        className={`ml-2 text-xs font-semibold flex-shrink-0 ${badgeColor(pct)}`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {phase.cfr}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Overall progress bar */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Overall: {checked}/{total}</span>
              <span className={badgeColor(overallPct)}>{overallPct}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor(overallPct)}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Required: {checkedRequired}/{required}</span>
              <span className={badgeColor(requiredPct)}>{requiredPct}%</span>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="border-b border-gray-800 bg-gray-900 px-6 flex items-center gap-4">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'checklist'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Checklist
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Export DHF
            </button>
          </div>

          {/* ── Checklist tab ── */}
          {activeTab === 'checklist' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-gray-100">
                    {activePhase.title}
                  </h2>
                  <p className="text-xs text-blue-400 mt-0.5">
                    {activePhase.cfr}
                  </p>
                  <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                    {activePhase.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-2xl font-bold ${badgeColor(activePct)}`}>
                    {activePct}%
                  </span>
                  <button
                    onClick={() =>
                      markAllInPhase(activePhaseId, !allActiveChecked)
                    }
                    className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    {allActiveChecked ? 'Uncheck All' : 'Check All'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {activePhase.items.map((item) => {
                  const done = activeChecked.has(item.id);
                  const isGuidanceOpen = showGuidance === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        done
                          ? 'border-emerald-700 bg-emerald-950/30'
                          : 'border-gray-700 bg-gray-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleItem(activePhaseId, item.id)}
                          role="checkbox"
                          aria-checked={done}
                          className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                            done
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-500 hover:border-blue-400'
                          }`}
                          aria-label={done ? 'Uncheck item' : 'Check item'}
                        >
                          {done && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-medium ${
                                done ? 'line-through text-gray-500' : 'text-gray-100'
                              }`}
                            >
                              {item.text}
                            </span>
                            {item.required ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/50 flex-shrink-0">
                                Required
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600/50 flex-shrink-0">
                                Recommended
                              </span>
                            )}
                          </div>
                          {/* Guidance toggle */}
                          <button
                            onClick={() =>
                              setShowGuidance(isGuidanceOpen ? null : item.id)
                            }
                            className="mt-1 text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                          >
                            <span>{isGuidanceOpen ? '▲' : '▼'}</span>
                            <span>Guidance</span>
                          </button>
                          {isGuidanceOpen && (
                            <p className="mt-2 text-sm text-gray-400 bg-gray-800 rounded p-3 border border-gray-700 leading-relaxed">
                              {item.guidance}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase navigation arrows */}
              <div className="flex justify-between mt-8">
                {DESIGN_PHASES.findIndex((p) => p.id === activePhaseId) > 0 ? (
                  <button
                    onClick={() => {
                      const idx = DESIGN_PHASES.findIndex(
                        (p) => p.id === activePhaseId
                      );
                      setActivePhaseId(DESIGN_PHASES[idx - 1].id);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition-colors"
                  >
                    ← Previous Phase
                  </button>
                ) : (
                  <div />
                )}
                {DESIGN_PHASES.findIndex((p) => p.id === activePhaseId) <
                DESIGN_PHASES.length - 1 ? (
                  <button
                    onClick={() => {
                      const idx = DESIGN_PHASES.findIndex(
                        (p) => p.id === activePhaseId
                      );
                      setActivePhaseId(DESIGN_PHASES[idx + 1].id);
                    }}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm text-blue-100 transition-colors"
                  >
                    Next Phase →
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('export')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-sm text-emerald-100 transition-colors"
                  >
                    Generate DHF ↗
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Export tab ── */}
          {activeTab === 'export' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-lg font-bold text-gray-100 mb-1">
                Export Design History File
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Download your DHF summary as Markdown (for Git / documentation
                systems) or CSV (for spreadsheets and QMS imports). Data stays
                in your browser — nothing is sent to any server.
              </p>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard
                  label="Total Items"
                  value={`${checked}/${total}`}
                  sub={`${overallPct}% complete`}
                  color={badgeColor(overallPct)}
                />
                <StatCard
                  label="Required"
                  value={`${checkedRequired}/${required}`}
                  sub={`${requiredPct}% complete`}
                  color={badgeColor(requiredPct)}
                />
                <StatCard
                  label="Design Phases"
                  value={`${DESIGN_PHASES.length}`}
                  sub="per 21 CFR 820.30"
                  color="text-blue-400"
                />
                <StatCard
                  label="Compliance Risk"
                  value={
                    requiredPct >= 80
                      ? 'Low'
                      : requiredPct >= 50
                      ? 'Medium'
                      : 'High'
                  }
                  sub={
                    requiredPct < 80
                      ? 'Complete required items'
                      : 'On track'
                  }
                  color={badgeColor(requiredPct)}
                />
              </div>

              {/* Per-phase summary table */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Phase
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        CFR
                      </th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DESIGN_PHASES.map((phase) => {
                      const phaseChecked =
                        checkedMap.get(phase.id) ?? new Set<string>();
                      const pct = phaseCompletionPct(phase, phaseChecked);
                      const done = phaseChecked.size;
                      return (
                        <tr
                          key={phase.id}
                          className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                          onClick={() => {
                            setActivePhaseId(phase.id);
                            setActiveTab('checklist');
                          }}
                        >
                          <td className="py-2 px-3 text-gray-200">
                            {phase.title}
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs">
                            {phase.cfr}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-medium ${badgeColor(pct)}`}>
                              {done}/{phase.items.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Export controls */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex rounded overflow-hidden border border-gray-700">
                  <button
                    onClick={() => setExportType('markdown')}
                    className={`px-4 py-2 text-sm transition-colors ${
                      exportType === 'markdown'
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    onClick={() => setExportType('csv')}
                    className={`px-4 py-2 text-sm transition-colors ${
                      exportType === 'csv'
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    CSV
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (exportType === 'markdown') {
                      downloadFile(
                        markdownReport,
                        'design-history-file.md',
                        'text/markdown'
                      );
                    } else {
                      downloadFile(
                        csvReport,
                        'design-controls-checklist.csv',
                        'text/csv'
                      );
                    }
                  }}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-sm font-medium rounded transition-colors"
                >
                  ↓ Download{' '}
                  {exportType === 'markdown' ? 'Markdown' : 'CSV'}
                </button>
              </div>

              {/* Preview */}
              <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap font-mono leading-relaxed">
                {exportType === 'markdown' ? markdownReport : csvReport}
              </pre>

              <p className="mt-4 text-xs text-gray-500">
                Reference: 21 CFR 820.30 · FDA Design Controls Guidance ·{' '}
                <a
                  href="https://www.fda.gov/media/116762/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline"
                >
                  FDA Slides PDF
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 bg-gray-900 px-6 py-3 text-xs text-gray-500 text-center">
        FDA Design Controls Tracker · 21 CFR 820.30 · All processing is
        client-side. No data is transmitted. Not a substitute for legal or
        regulatory counsel.
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
