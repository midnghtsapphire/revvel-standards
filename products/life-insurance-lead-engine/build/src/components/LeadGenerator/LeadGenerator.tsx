'use client';

import { useState } from 'react';
import { fetchNPIByZip, leadsToCSV, generatePitchScript, type NPIProvider } from '@/api/npiScraper';

export default function LeadGenerator() {
  const [zips, setZips] = useState('90210, 10001, 33139');
  const [leads, setLeads] = useState<NPIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const zipList = zips.split(',').map(z => z.trim()).filter(Boolean);
      const all: NPIProvider[] = [];
      for (const z of zipList) {
        const r = await fetchNPIByZip(z, 50);
        all.push(...r);
      }
      all.sort((a, b) => a.tier.localeCompare(b.tier));
      setLeads(all);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const csv = leadsToCSV(leads);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'high_value_medical_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const tierCount = (t: 'A' | 'B' | 'C') => leads.filter(l => l.tier === t).length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">🎯 NPI Lead Generator</h2>
      <p className="text-sm text-slate-600 mb-4">
        Enter ZIP codes (comma-separated) to pull medical professionals from the public NPPES Registry.
        Leads are auto-scored: <strong>Tier A</strong> (surgeons, specialists) → <strong>Tier C</strong> (general practice).
      </p>
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={zips}
          onChange={(e) => setZips(e.target.value)}
          placeholder="90210, 10001, 33139"
        />
        <button
          onClick={run}
          disabled={loading}
          className="bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Generate Leads'}
        </button>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {leads.length > 0 && (
        <div>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded">Tier A: {tierCount('A')}</span>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded">Tier B: {tierCount('B')}</span>
            <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded">Tier C: {tierCount('C')}</span>
            <button onClick={download} className="ml-auto bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700">
              ⬇ Download CSV ({leads.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Tier</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Specialty</th>
                  <th className="p-2 text-left">Phone</th>
                  <th className="p-2 text-left">City</th>
                  <th className="p-2 text-left">Pitch</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map(l => (
                  <tr key={l.npi} className="border-t">
                    <td className="p-2 font-bold">{l.tier}</td>
                    <td className="p-2">{l.firstName} {l.lastName} {l.credential}</td>
                    <td className="p-2">{l.specialty}</td>
                    <td className="p-2">{l.phone}</td>
                    <td className="p-2">{l.city}, {l.state}</td>
                    <td className="p-2 text-xs text-slate-600">{l.pitchAngle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 10 && (
              <p className="text-xs text-slate-500 mt-2">Showing top 10 of {leads.length}. Download CSV for all leads + full pitch scripts.</p>
            )}
          </div>

          {leads[0] && (
            <details className="mt-4 bg-slate-50 p-4 rounded">
              <summary className="cursor-pointer font-semibold">Sample Pitch Script (Tier {leads[0].tier})</summary>
              <p className="mt-2 text-sm italic">{generatePitchScript(leads[0])}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
