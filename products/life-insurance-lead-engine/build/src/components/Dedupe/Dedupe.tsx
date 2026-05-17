'use client';

import { useState } from 'react';
import { parseFile, rowsToCSV, type ParsedRow } from '@/utils/parser';
import { dedupe, type DedupeStats } from '@/utils/dedupe';

export default function Dedupe() {
  const [stats, setStats] = useState<DedupeStats | null>(null);
  const [cleaned, setCleaned] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await parseFile(file);
      const { cleaned, stats } = dedupe(rows);
      setCleaned(cleaned);
      setStats(stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse error');
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const csv = rowsToCSV(cleaned);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deduped_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">🧹 CSV / Excel Dedupe Tool</h2>
      <p className="text-sm text-slate-600 mb-4">
        Upload your existing leads. We remove duplicates via exact email/phone matching and fuzzy name matching (Fuse.js).
        100% client-side — your data never leaves your browser.
      </p>

      <input
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={onFile}
        className="block mb-4"
      />

      {loading && <p>Processing…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {stats && (
        <div className="bg-slate-50 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">Results</h3>
          <ul className="text-sm space-y-1">
            <li>Original rows: <strong>{stats.original}</strong></li>
            <li>Duplicates removed: <strong className="text-red-600">{stats.duplicatesRemoved}</strong></li>
            <li className="ml-4">↳ Exact email matches: {stats.exactEmail}</li>
            <li className="ml-4">↳ Exact phone matches: {stats.exactPhone}</li>
            <li className="ml-4">↳ Fuzzy name matches: {stats.fuzzyName}</li>
            <li>Remaining clean leads: <strong className="text-emerald-600">{stats.remaining}</strong></li>
          </ul>
          <button onClick={download} className="mt-3 bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700">
            ⬇ Download Cleaned CSV
          </button>
        </div>
      )}
    </div>
  );
}
