"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calculateDosage, CompensationProfile, formatMinutes, normalizeDosageInput } from "./data/calculator";

interface FormState {
  irradianceMwPerCm2: number;
  targetDoseJPerCm2: number;
  treatmentAreaCm2: number;
  sessionsPerWeek: number;
  dutyCyclePercent: number;
  compensationProfile: CompensationProfile;
}

const INITIAL_STATE: FormState = {
  irradianceMwPerCm2: 35,
  targetDoseJPerCm2: 10,
  treatmentAreaCm2: 100,
  sessionsPerWeek: 4,
  dutyCyclePercent: 100,
  compensationProfile: "none",
};

function NumberInput({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: keyof FormState;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (key: keyof FormState, value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(id, Number(event.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
      />
    </label>
  );
}

export default function Home() {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const normalized = useMemo(() => normalizeDosageInput(state), [state]);
  const result = useMemo(() => calculateDosage(normalized), [normalized]);

  const handleNumberChange = (key: keyof FormState, value: number) => {
    setState((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-grid text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-cyan-900/20 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
          <p className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-900">
            Red Light Therapy Tool
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Universal Dosage Calculator for Photobiomodulation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
            Enter irradiance and your target dose. The calculator uses the universal formula:
            <strong> time = (dose × 1000) / irradiance</strong>, then applies pulse and
            compensation adjustments for practical session timing.
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            Direct-to-consumer wellness tool. Inputs stay in your browser for this session. We do{" "}
            <strong>not</strong> claim HIPAA compliance.{" "}
            <Link href="/privacy" className="font-medium text-cyan-800 underline-offset-2 hover:underline">
              Privacy policy
            </Link>
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
            <h2 className="text-xl font-semibold">Inputs</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberInput
                id="irradianceMwPerCm2"
                label="Irradiance (mW/cm2)"
                value={state.irradianceMwPerCm2}
                min={1}
                max={300}
                onChange={handleNumberChange}
              />
              <NumberInput
                id="targetDoseJPerCm2"
                label="Target Dose (J/cm2)"
                value={state.targetDoseJPerCm2}
                min={1}
                max={120}
                onChange={handleNumberChange}
              />
              <NumberInput
                id="dutyCyclePercent"
                label="Duty Cycle (%)"
                value={state.dutyCyclePercent}
                min={5}
                max={100}
                onChange={handleNumberChange}
              />
              <NumberInput
                id="sessionsPerWeek"
                label="Sessions / Week"
                value={state.sessionsPerWeek}
                min={1}
                max={21}
                onChange={handleNumberChange}
              />
              <NumberInput
                id="treatmentAreaCm2"
                label="Treatment Area (cm2)"
                value={state.treatmentAreaCm2}
                min={1}
                max={10000}
                onChange={handleNumberChange}
              />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Compensation</span>
                <select
                  value={state.compensationProfile}
                  onChange={(event) =>
                    setState((previous) => ({
                      ...previous,
                      compensationProfile: event.target.value as CompensationProfile,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                >
                  <option value="none">None (lab-equivalent)</option>
                  <option value="solar_meter">Solar meter correction (x2)</option>
                  <option value="skin_reflection">Skin reflection correction (x2.5)</option>
                </select>
              </label>
            </div>
          </form>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
            <h2 className="text-xl font-semibold">Session Output</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-cyan-50 p-4">
                <p className="text-sm text-cyan-900">Estimated Session Time</p>
                <p className="text-3xl font-bold text-cyan-950">{formatMinutes(result.adjustedTimeSeconds)}</p>
              </div>
              <p className="text-sm text-slate-700">
                Base time: <strong>{formatMinutes(result.baseTimeSeconds)}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Effective irradiance:{" "}
                <strong>{result.effectiveIrradianceMwPerCm2.toFixed(1)} mW/cm2</strong>
              </p>
              <p className="text-sm text-slate-700">
                Compensation multiplier: <strong>x{result.compensationMultiplier}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Total energy per session: <strong>{result.totalEnergyJoules.toFixed(0)} J</strong>
              </p>
              <p className="text-sm text-slate-700">
                Weekly dose load: <strong>{result.weeklyDoseJPerCm2.toFixed(1)} J/cm2</strong>
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              This app is for general wellness and informational purposes only. It is not a medical
              device and does not diagnose, treat, cure, or prevent any condition. Red light and PBM
              session parameters vary by device, wavelength, distance, and individual response.
              Consult a qualified clinician for medical decisions. Wellness disclaimers do not create
              HIPAA coverage or any claim of HIPAA compliance. See the{" "}
              <Link href="/privacy" className="font-semibold underline underline-offset-2">
                privacy policy
              </Link>{" "}
              for actual data handling.
            </div>
          </aside>
        </section>

        <footer className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-600 shadow-sm">
          <a href="/privacy" className="font-semibold text-cyan-800 underline-offset-2 hover:underline">
            Privacy policy
          </a>
          <span className="mx-2 text-slate-400">·</span>
          <span>
            FTC HBNR breach notice timelines: users ≤60 calendar days; FTC ≤60 calendar days or ≤10
            business days if &gt;500 residents of any state/jurisdiction are affected.
          </span>
        </footer>
      </main>
    </div>
  );
}
