"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HealthDataRights from "./components/HealthDataRights";
import MhmdaConsentGate from "./components/MhmdaConsentGate";
import {
  calculateDosage,
  CompensationProfile,
  formatMinutes,
  normalizeDosageInput,
} from "./data/calculator";
import {
  STORAGE_KEYS,
  type DsarRequestRecord,
  type HealthJournalEntry,
  type MhmdaConsentRecord,
} from "./data/mhmda-consent";

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

function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode — fail soft; in-memory state still works this session.
  }
}

export default function Home() {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const normalized = useMemo(() => normalizeDosageInput(state), [state]);
  const result = useMemo(() => calculateDosage(normalized), [normalized]);

  const [hydrated, setHydrated] = useState(false);
  const [consent, setConsent] = useState<MhmdaConsentRecord | null>(null);
  const [entries, setEntries] = useState<HealthJournalEntry[]>([]);
  const [requests, setRequests] = useState<DsarRequestRecord[]>([]);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [declinedHealthData, setDeclinedHealthData] = useState(false);

  useEffect(() => {
    const storedConsent = readStorage<MhmdaConsentRecord>(STORAGE_KEYS.consent);
    const storedEntries = readStorage<HealthJournalEntry[]>(STORAGE_KEYS.journal) ?? [];
    const storedRequests = readStorage<DsarRequestRecord[]>(STORAGE_KEYS.dsar) ?? [];
    setConsent(storedConsent);
    setEntries(Array.isArray(storedEntries) ? storedEntries : []);
    setRequests(Array.isArray(storedRequests) ? storedRequests : []);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (consent) writeStorage(STORAGE_KEYS.consent, consent);
    else if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.consent);
    }
  }, [consent, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.journal, entries);
  }, [entries, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(STORAGE_KEYS.dsar, requests);
  }, [requests, hydrated]);

  const handleNumberChange = (key: keyof FormState, value: number) => {
    setState((previous) => ({ ...previous, [key]: value }));
  };

  const consentActive = Boolean(consent?.isValid);

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
          <p className="mt-3 text-sm text-slate-600">
            <Link href="/privacy" className="font-semibold text-cyan-800 underline">
              Privacy Policy (MHMDA disclosures)
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
                <p className="text-3xl font-bold text-cyan-950">
                  {formatMinutes(result.adjustedTimeSeconds)}
                </p>
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
                Total energy per session:{" "}
                <strong>{result.totalEnergyJoules.toFixed(0)} J</strong>
              </p>
              <p className="text-sm text-slate-700">
                Weekly dose load:{" "}
                <strong>{result.weeklyDoseJPerCm2.toFixed(1)} J/cm2</strong>
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              This app is for general wellness and informational purposes only. It is not a medical
              device and does not diagnose, treat, cure, or prevent any condition. Red light and PBM
              session parameters vary by device, wavelength, distance, and individual response.
              Consult a qualified clinician for medical decisions.
            </div>
          </aside>
        </section>

        {hydrated && !consentActive && !showConsentForm && !declinedHealthData ? (
          <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-md">
            <h2 className="text-lg font-semibold text-slate-900">
              Optional health progress journal
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Want to store stretch mark photos, symptom notes, postpartum timeline markers, or
              severity self-assessments? Washington MHMDA and similar state laws require an
              explicit opt-in first — separate from any terms acceptance.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowConsentForm(true)}
                className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
                data-testid="open-consent"
              >
                Review MHMDA consent
              </button>
              <button
                type="button"
                onClick={() => setDeclinedHealthData(true)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                data-testid="skip-health-data"
              >
                Calculator only
              </button>
            </div>
          </section>
        ) : null}

        {hydrated && showConsentForm && !consentActive ? (
          <MhmdaConsentGate
            onConsented={(record) => {
              setConsent(record);
              setShowConsentForm(false);
              setDeclinedHealthData(false);
            }}
            onDecline={() => {
              setShowConsentForm(false);
              setDeclinedHealthData(true);
              setConsent(null);
            }}
          />
        ) : null}

        {hydrated && declinedHealthData && !consentActive && !showConsentForm ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            Health data collection is off.{" "}
            <button
              type="button"
              className="font-semibold text-violet-800 underline"
              onClick={() => setShowConsentForm(true)}
              data-testid="reopen-consent"
            >
              Enable MHMDA consent
            </button>{" "}
            anytime. See the{" "}
            <Link href="/privacy" className="font-semibold text-cyan-800 underline">
              privacy policy
            </Link>
            .
          </section>
        ) : null}

        {hydrated ? (
          <HealthDataRights
            consent={consent}
            entries={entries}
            requests={requests}
            onConsentChange={(record) => {
              setConsent(record);
              if (!record?.isValid) {
                setShowConsentForm(false);
              }
            }}
            onEntriesChange={setEntries}
            onRequestsChange={setRequests}
          />
        ) : null}
      </main>
    </div>
  );
}
