import React, { useState } from 'react';
import Papa from 'papaparse';
import { Download, Loader2, Search } from 'lucide-react';
import { scrapeNpi, ScrapedLead } from '@/api/npiScraper';

export default function LeadGenerator() {
  const [zipCodes, setZipCodes] = useState('92624, 92629, 92675, 92672, 92673');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLeads, setGeneratedLeads] = useState<ScrapedLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedLeads([]);

    const zips = zipCodes.split(',').map(z => z.trim()).filter(z => z.length > 0);

    try {
      const leads = await scrapeNpi(zips);
      // Sort by priority tier A -> B -> C
      leads.sort((a, b) => a.priority_tier.localeCompare(b.priority_tier));
      setGeneratedLeads(leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate leads');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPitchScript = (specialty: string, tier: string) => {
    if (tier === 'A') {
      if (specialty.includes('Surgery') || specialty.includes('Orthopedic')) {
        return "Disability income + key person life ('their hands are the business')";
      }
      if (specialty.includes('Cardio') || specialty.includes('Medicine')) {
        return "Estate planning + buy-sell agreements";
      }
      if (specialty.includes('Anesthesiology')) {
        return "1099 contractors often need their own life + disability stack";
      }
      if (specialty.includes('Dermatology')) {
        return "Cash-flow heavy, great IUL/whole life candidates for tax-advantaged cash value";
      }
    }
    if (tier === 'B' && specialty.includes('odont')) {
      return "Practice loan collateral life + family protection IUL";
    }
    return "Tax-advantaged retirement via IUL or whole life cash value (practice owners)";
  };

  const downloadGeneratedCsv = () => {
    if (generatedLeads.length === 0) return;

    const csvData = generatedLeads.map(lead => ({
      'Tier': lead.priority_tier,
      'First Name': lead.first_name,
      'Last Name': lead.last_name,
      'Credential': lead.credential,
      'Specialty': lead.specialty,
      'Practice Name': lead.practice_name,
      'Phone': lead.phone,
      'Address': lead.address,
      'Zip': lead.zip,
      'Pitch Angle': getPitchScript(lead.specialty, lead.priority_tier),
      'Call Status': '',
      'Notes': ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'high_value_medical_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Generate High-Value Medical Leads</h2>
      <p className="text-sm text-gray-600 mb-6">
        Pulls top-tier prospects directly from the NPPES NPI Registry for specified zip codes. Automatically scores and provides tailored pitch scripts.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="zipcodes" className="block text-sm font-medium text-gray-700">Target Zip Codes (comma separated)</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              name="zipcodes"
              id="zipcodes"
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md sm:text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              value={zipCodes}
              onChange={(e) => setZipCodes(e.target.value)}
              placeholder="e.g. 92624, 92629"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gathering Leads...</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Generate Leads</>
          )}
        </button>

        {error && (
          <div className="text-sm text-red-600 mt-2">{error}</div>
        )}

        {generatedLeads.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-md border border-gray-200">
              <div>
                <span className="text-2xl font-bold text-gray-900">{generatedLeads.length}</span>
                <span className="text-sm text-gray-500 ml-2">High-Value Prospects Found</span>
              </div>
              <button
                onClick={downloadGeneratedCsv}
                className="flex items-center text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-200"
              >
                <Download className="w-4 h-4 mr-1" /> Export CSV with Scripts
              </button>
            </div>

            <div className="text-sm text-gray-700 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
              <p className="font-semibold mb-1">Cold Call Strategy:</p>
              <p>These are practice phones. Ask for &quot;Dr. [Last Name]&quot;. The front desk will gatekeep. Mention you&apos;re a &quot;licensed life insurance specialist calling about high-net-worth physician planning&quot;.</p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pitch Angle</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {generatedLeads.slice(0, 10).map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lead.priority_tier === 'A' ? 'bg-red-100 text-red-800' :
                          lead.priority_tier === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Tier {lead.priority_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">Dr. {lead.last_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lead.specialty}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs" title={getPitchScript(lead.specialty, lead.priority_tier)}>
                        {getPitchScript(lead.specialty, lead.priority_tier)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {generatedLeads.length > 10 && (
              <p className="text-center text-xs text-gray-500 mt-2">Showing top 10 results. Export CSV to see all {generatedLeads.length} leads.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
