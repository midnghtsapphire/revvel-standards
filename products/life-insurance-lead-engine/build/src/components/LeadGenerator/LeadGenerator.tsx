import React, { useState } from 'react';
import Papa from 'papaparse';
import { Download, Loader2, Search } from 'lucide-react';
import { scrapeNpi, ScrapedLead, LIFE_EVENTS } from '@/api/npiScraper';

export default function LeadGenerator() {
  const [zipCodes, setZipCodes] = useState('92624, 92629, 92675, 92672, 92673');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    LIFE_EVENTS.filter(e => e.tier === 'A').map(e => e.term)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLeads, setGeneratedLeads] = useState<ScrapedLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleEvent = (term: string) => {
    setSelectedEvents(prev =>
      prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedLeads([]);

    const zips = zipCodes.split(',').map(z => z.trim()).filter(z => z.length > 0);
    if (zips.length === 0) {
      setError('Please enter at least one zip code.');
      setIsGenerating(false);
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Please select at least one life event category.');
      setIsGenerating(false);
      return;
    }

    try {
      const leads = await scrapeNpi(zips, selectedEvents);
      leads.sort((a, b) => a.priority_tier.localeCompare(b.priority_tier));
      setGeneratedLeads(leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate leads');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPitchScript = (lifeEvent: string, tier: string): string => {
    switch (lifeEvent) {
      case 'New Homeowner':
        return 'Mortgage protection term life — covers the loan balance if anything happens to you';
      case 'New Parent':
        return 'Income replacement term life + children\'s whole life rider — lock in low rates at birth';
      case 'Recently Married':
        return 'Joint income protection — ensure your spouse maintains their lifestyle if you pass';
      case 'Single Parent':
        return 'Income replacement term life — you\'re the sole provider; one policy protects everything';
      case 'Growing Family (2+ kids)':
        return 'Increasing term or whole life — coverage that grows as your family\'s needs grow';
      case 'New Job / Income Increase':
        return 'Update existing coverage or add a supplemental policy to match your new income level';
      case 'College Graduate':
        return 'Lock in whole life rates while you\'re young and healthy — builds cash value for decades';
      case 'Divorce / Life Transition':
        return 'Review and update beneficiaries; standalone policy now that joint coverage has ended';
      case 'Empty Nester':
        return 'Final expense or permanent life — focus shifts from income replacement to legacy / estate';
      case 'Self-Employed / Freelancer':
        return 'Business continuation + personal income replacement — no employer group life to fall back on';
      case 'Pre-Retirement (55–64)':
        return 'Final expense + guaranteed whole life — lock in before insurability changes';
      case 'Young Adult (18–25)':
        return 'Whole life starter policy — lowest premiums ever, cash value that grows tax-deferred';
      default:
        return tier === 'A'
          ? 'Term life with living benefits — affordable income replacement for your family'
          : 'Whole life or IUL — long-term protection with tax-advantaged cash accumulation';
    }
  };

  const downloadGeneratedCsv = () => {
    if (generatedLeads.length === 0) return;

    const csvData = generatedLeads.map(lead => ({
      'Tier': lead.priority_tier,
      'First Name': lead.first_name,
      'Last Name': lead.last_name,
      'Age Range': lead.age_range,
      'Life Event': lead.life_event,
      'Family Status': lead.family_status,
      'Phone': lead.phone,
      'Address': lead.address,
      'Zip': lead.zip,
      'Pitch Angle': getPitchScript(lead.life_event, lead.priority_tier),
      'Call Status': '',
      'Notes': ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'individual_family_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Individual &amp; Family Leads</h2>
      <p className="text-sm text-gray-600 mb-6">
        Build a targeted outreach worksheet by zip code and life event. Each profile is pre-scored and paired with a tailored pitch script for individuals and families.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="zipcodes" className="block text-sm font-medium text-gray-700">Target Zip Codes (comma separated)</label>
          <div className="mt-1">
            <input
              type="text"
              name="zipcodes"
              id="zipcodes"
              className="block w-full px-3 py-2 rounded-md sm:text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              value={zipCodes}
              onChange={(e) => setZipCodes(e.target.value)}
              placeholder="e.g. 92624, 92629"
            />
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Life Event Categories</p>
          <div className="grid grid-cols-2 gap-2">
            {LIFE_EVENTS.map(event => (
              <label
                key={event.term}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                  selectedEvents.includes(event.term)
                    ? 'bg-blue-50 border-blue-400 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedEvents.includes(event.term)}
                  onChange={() => toggleEvent(event.term)}
                />
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  event.tier === 'A' ? 'bg-red-500' :
                  event.tier === 'B' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                {event.term}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 mr-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Tier A — highest coverage urgency</span>
            <span className="inline-flex items-center gap-1 mr-2"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Tier B</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Tier C</span>
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building Prospect List...</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Generate Prospects</>
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
                <span className="text-sm text-gray-500 ml-2">Prospect Profiles Generated</span>
              </div>
              <button
                onClick={downloadGeneratedCsv}
                className="flex items-center text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-200"
              >
                <Download className="w-4 h-4 mr-1" /> Export CSV with Scripts
              </button>
            </div>

            <div className="text-sm text-gray-700 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
              <p className="font-semibold mb-1">Outreach Strategy:</p>
              <p>Fill in contact details from your referral network, purchased lists, or public records. Each profile includes a tailored pitch angle — lead with the life event, not the product.</p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Life Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pitch Angle</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {generatedLeads.slice(0, 12).map((lead) => (
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
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.life_event}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lead.family_status}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lead.age_range}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs" title={getPitchScript(lead.life_event, lead.priority_tier)}>
                        {getPitchScript(lead.life_event, lead.priority_tier)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {generatedLeads.length > 12 && (
              <p className="text-center text-xs text-gray-500 mt-2">Showing top 12 results. Export CSV to see all {generatedLeads.length} profiles.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
