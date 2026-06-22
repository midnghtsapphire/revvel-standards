'use client';

import { useState, useMemo } from 'react';
import {
  buildMarkdownReport,
  buildCsvExport,
  calculateDuctSize,
  calculateEnergy,
  calculateLoad,
  normalizeLoadInputs,
  recommendEquipment,
} from './data/calculator';
import { CLIMATE_ZONES, INSULATION_LEVELS, REFRIGERANTS } from './data/constants';

// Display refrigerants low-GWP first, then transitional, then phased-out.
const REFRIGERANT_STATUS_ORDER = ['low-gwp', 'transitional', 'phased-out'] as const;
const REFRIGERANTS_BY_STATUS = [...REFRIGERANTS].sort(
  (a, b) =>
    REFRIGERANT_STATUS_ORDER.indexOf(a.status) - REFRIGERANT_STATUS_ORDER.indexOf(b.status)
);

export default function HomePage() {
  // ── Input state ─────────────────────────────────────
  const [floorArea, setFloorArea] = useState(1500);
  const [ceilingHeight, setCeilingHeight] = useState(9);
  const [windowFraction, setWindowFraction] = useState(0.15);
  const [occupants, setOccupants] = useState(2);
  const [climateZoneId, setClimateZoneId] = useState('3a');
  const [insulationLevelId, setInsulationLevelId] = useState('good');
  const [indoorCoolingSetpoint, setIndoorCoolingSetpoint] = useState(75);
  const [indoorHeatingSetpoint, setIndoorHeatingSetpoint] = useState(70);
  const [seer2, setSeer2] = useState(16);
  const [hspf2, setHspf2] = useState(8.5);
  const [electricityRate, setElectricityRate] = useState(16);
  const [isFurnace, setIsFurnace] = useState(false);
  const [gasRate, setGasRate] = useState(1.5);
  const [activeTab, setActiveTab] = useState<'load' | 'energy' | 'duct' | 'refrigerant'>('load');

  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    'mailto:audrey@midnghtsapphire.com?subject=HVAC%20Calc%20Service%20Pro';

  // ── Computed results ────────────────────────────────
  const inputs = useMemo(
    () =>
      normalizeLoadInputs({
        floorArea,
        ceilingHeight,
        windowFraction,
        occupants,
        climateZoneId,
        insulationLevelId,
        indoorCoolingSetpoint,
        indoorHeatingSetpoint,
      }),
    [
      floorArea, ceilingHeight, windowFraction, occupants,
      climateZoneId, insulationLevelId, indoorCoolingSetpoint, indoorHeatingSetpoint,
    ]
  );

  const load = useMemo(() => calculateLoad(inputs), [inputs]);
  const equipment = useMemo(() => recommendEquipment(load.sensibleCoolingLoad), [load]);
  const duct = useMemo(() => calculateDuctSize({ coolingLoadBtu: load.sensibleCoolingLoad }), [load]);
  const energy = useMemo(
    () =>
      calculateEnergy({
        coolingLoadBtu: load.sensibleCoolingLoad,
        heatingLoadBtu: load.sensibleHeatingLoad,
        seer2,
        hspf2,
        electricityRateCentsKwh: electricityRate,
        gasRateDollarsTherm: isFurnace ? gasRate : undefined,
        climateZoneId: inputs.climateZoneId,
        isFurnace,
      }),
    [load, seer2, hspf2, electricityRate, isFurnace, gasRate, inputs.climateZoneId]
  );

  const markdown = useMemo(
    () => buildMarkdownReport(inputs, load, energy, duct),
    [inputs, load, energy, duct]
  );

  const csv = useMemo(() => buildCsvExport(load, energy), [load, energy]);

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hvac-load-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hvac-load-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const verdictColor = {
    'undersized': 'text-red-400',
    'optimal': 'text-emerald-400',
    'slightly-oversized': 'text-yellow-400',
    'oversized': 'text-red-400',
  }[equipment.verdict];

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">HVAC Load Calculator</h1>
          <p className="text-gray-400 mt-2">
            Manual J (simplified) cooling &amp; heating loads · Equipment sizing (Manual S) ·
            Duct sizing (Manual D) · Annual energy cost estimates
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Inputs panel ── */}
          <div className="lg:col-span-1 space-y-5 bg-gray-900 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Building Inputs
            </h2>

            <InputRow label="Floor Area (sq ft)">
              <input
                type="number" min={100} max={50000}
                value={floorArea}
                onChange={(e) => setFloorArea(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label="Ceiling Height (ft)">
              <input
                type="number" min={7} max={20} step={0.5}
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label="Window Fraction (% of floor)">
              <input
                type="number" min={5} max={50} step={1}
                value={Math.round(windowFraction * 100)}
                onChange={(e) => setWindowFraction(Number(e.target.value) / 100)}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label="Occupants">
              <input
                type="number" min={0} max={50}
                value={occupants}
                onChange={(e) => setOccupants(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label="Climate Zone">
              <select
                value={climateZoneId}
                onChange={(e) => setClimateZoneId(e.target.value)}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              >
                {CLIMATE_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </InputRow>

            <InputRow label="Insulation Level">
              <select
                value={insulationLevelId}
                onChange={(e) => setInsulationLevelId(e.target.value)}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              >
                {INSULATION_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </InputRow>

            <InputRow label={`Cooling Setpoint (°F)`}>
              <input
                type="number" min={68} max={80}
                value={indoorCoolingSetpoint}
                onChange={(e) => setIndoorCoolingSetpoint(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label={`Heating Setpoint (°F)`}>
              <input
                type="number" min={60} max={78}
                value={indoorHeatingSetpoint}
                onChange={(e) => setIndoorHeatingSetpoint(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <h2 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 pt-2">
              Energy Inputs
            </h2>

            <InputRow label="SEER2 Rating">
              <input
                type="number" min={14} max={30} step={0.5}
                value={seer2}
                onChange={(e) => setSeer2(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label={isFurnace ? "Furnace AFUE (e.g. 0.95)" : "HSPF2 Rating"}>
              <input
                type="number" min={0.5} max={15} step={0.1}
                value={hspf2}
                onChange={(e) => setHspf2(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <InputRow label="Electricity (¢/kWh)">
              <input
                type="number" min={5} max={60} step={0.5}
                value={electricityRate}
                onChange={(e) => setElectricityRate(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
              />
            </InputRow>

            <div className="flex items-center gap-3">
              <input
                id="furnace-toggle"
                type="checkbox"
                checked={isFurnace}
                onChange={(e) => {
                  const furnace = e.target.checked;
                  setIsFurnace(furnace);
                  // The hspf2 field is reused for AFUE in furnace mode. Reset it
                  // to a sensible default for the selected mode so the previous
                  // mode's value (e.g. 8.5 HSPF2) isn't read as an absurd AFUE.
                  setHspf2(furnace ? 0.95 : 8.5);
                }}
                className="w-4 h-4 accent-blue-500"
              />
              <label htmlFor="furnace-toggle" className="text-sm text-gray-300">
                Gas furnace heating
              </label>
            </div>

            {isFurnace && (
              <InputRow label="Gas Rate ($/therm)">
                <input
                  type="number" min={0.5} max={5} step={0.1}
                  value={gasRate}
                  onChange={(e) => setGasRate(Number(e.target.value))}
                  className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                />
              </InputRow>
            )}
          </div>

          {/* ── Results panel ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                label="Cooling Load"
                value={`${(load.sensibleCoolingLoad / 1000).toFixed(1)} kBTU/hr`}
                sub={`${load.recommendedCoolingTons.toFixed(2)} tons`}
              />
              <SummaryCard
                label="Heating Load"
                value={`${(load.sensibleHeatingLoad / 1000).toFixed(1)} kBTU/hr`}
                sub={`${(load.recommendedHeatingBtu / 1000).toFixed(1)} kBTU/hr`}
              />
              <SummaryCard
                label="Annual Cost"
                value={`$${energy.totalAnnualCost.toFixed(0)}`}
                sub={`$${energy.annualCoolingCost.toFixed(0)} cool + $${energy.annualHeatingCost.toFixed(0)} heat`}
              />
              <SummaryCard
                label="Equipment"
                value={`${equipment.nominalTons} ton`}
                sub={<span className={verdictColor}>{equipment.verdict.replace(/-/g, ' ')}</span>}
              />
            </div>

            {/* Tabs */}
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="flex border-b border-gray-700">
                {(['load', 'energy', 'duct', 'refrigerant'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'duct' ? 'Duct Sizing' : tab === 'refrigerant' ? 'Refrigerants' : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Detail`}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === 'load' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">Cooling Load Breakdown</h3>
                    <BreakdownTable entries={Object.entries(load.coolingBreakdown)} total={load.sensibleCoolingLoad} />
                    <h3 className="font-semibold text-white mt-4">Heating Load Breakdown</h3>
                    <BreakdownTable entries={Object.entries(load.heatingBreakdown)} total={load.sensibleHeatingLoad} />
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      equipment.verdict === 'optimal' ? 'bg-emerald-950 text-emerald-300' :
                      equipment.verdict === 'slightly-oversized' ? 'bg-yellow-950 text-yellow-300' :
                      'bg-red-950 text-red-300'
                    }`}>
                      <strong>Equipment Note:</strong> {equipment.note}
                    </div>
                  </div>
                )}

                {activeTab === 'energy' && (
                  <div className="space-y-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="text-left py-2">Metric</th>
                          <th className="text-right py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <DataRow label="Annual Cooling" value={`${energy.annualCoolingKwh.toLocaleString()} kWh`} />
                        <DataRow label="Cooling Cost" value={`$${energy.annualCoolingCost.toFixed(0)}`} />
                        <DataRow label="Annual Heating" value={`${energy.annualHeatingKwh.toLocaleString()} kWh eq`} />
                        <DataRow label="Heating Cost" value={`$${energy.annualHeatingCost.toFixed(0)}`} />
                        <DataRow label="Total Annual Cost" value={<strong>${energy.totalAnnualCost.toFixed(0)}</strong>} />
                        <DataRow label="CO₂ Equivalent" value={`${energy.co2EquivalentKg.toFixed(0)} kg`} />
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2">
                      Based on ASHRAE climate zone design data. Actual costs vary with usage patterns, utility rates, and equipment age.
                    </p>
                  </div>
                )}

                {activeTab === 'duct' && (
                  <div className="space-y-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="text-left py-2">Metric</th>
                          <th className="text-right py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <DataRow label="Required Airflow" value={`${duct.requiredCfm.toLocaleString()} CFM`} />
                        <DataRow label="Duct Area" value={`${duct.ductAreaSqIn.toFixed(1)} sq in`} />
                        <DataRow label="Round Duct Diameter" value={`${duct.roundDuctDiameter.toFixed(1)}"`} />
                        <DataRow label="Rectangular Duct" value={`${duct.rectangularDuct.width}" × ${duct.rectangularDuct.height}"`} />
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2">
                      Sized for main trunk at 800 FPM supply velocity, 20°F supply-return ΔT.
                      Branch ducts require separate Manual D calculations.
                    </p>
                  </div>
                )}

                {activeTab === 'refrigerant' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400 mb-3">
                      Common refrigerants and phase-out status (AIM Act / EPA).
                    </p>
                    {REFRIGERANTS_BY_STATUS.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                        <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                          r.status === 'low-gwp' ? 'bg-emerald-900 text-emerald-300' :
                          r.status === 'transitional' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                        }`}>{r.status}</span>
                        <div>
                          <p className="font-medium text-white text-sm">{r.name}</p>
                          <p className="text-xs text-gray-400">GWP: {r.gwp.toLocaleString()} · {r.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadMarkdown}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ↓ Download Report (.md)
              </button>
              <button
                onClick={downloadCsv}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ↓ Download Data (.csv)
              </button>
              <a
                href={checkoutUrl}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade for API Access →
              </a>
            </div>

            <p className="text-xs text-gray-600">
              Simplified Manual J estimates for preliminary sizing only. Have a licensed engineer perform a full Manual J/D/S before purchasing equipment.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function BreakdownTable({
  entries,
  total,
}: {
  entries: [string, number][];
  total: number;
}) {
  function camelToLabel(key: string) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-700 text-gray-400">
          <th className="text-left py-1.5">Component</th>
          <th className="text-right py-1.5">BTU/hr</th>
          <th className="text-right py-1.5">%</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, val]) => (
          <tr key={key} className="border-b border-gray-800">
            <td className="py-1.5 text-gray-300">{camelToLabel(key)}</td>
            <td className="py-1.5 text-right text-white">{Math.round(val).toLocaleString()}</td>
            <td className="py-1.5 text-right text-gray-400">
              {total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'}%
            </td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="py-1.5 text-white">Total</td>
          <td className="py-1.5 text-right text-white">{Math.round(total).toLocaleString()}</td>
          <td className="py-1.5 text-right text-gray-400">100%</td>
        </tr>
      </tbody>
    </table>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-800">
      <td className="py-2 text-gray-300">{label}</td>
      <td className="py-2 text-right text-white">{value}</td>
    </tr>
  );
}
