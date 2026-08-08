"use client";

import { useMemo, useState } from "react";
import {
  HEALTH_DATA_CATEGORIES,
  MHMDA_POLICY_VERSION,
  THIRD_PARTY_RECIPIENTS,
  type ConsentCategoryChoice,
  type HealthDataCategoryId,
  type MhmdaConsentRecord,
  type UsStateCode,
  createConsentRecord,
  defaultCategoryChoices,
  getConsentDisclosureChecklist,
} from "../data/mhmda-consent";

const STATE_OPTIONS: { value: UsStateCode; label: string }[] = [
  { value: "WA", label: "Washington" },
  { value: "CT", label: "Connecticut" },
  { value: "NV", label: "Nevada" },
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
  { value: "OTHER", label: "Other / prefer not to say" },
];

interface Props {
  onConsented: (record: MhmdaConsentRecord) => void;
  onDecline: () => void;
}

export default function MhmdaConsentGate({ onConsented, onDecline }: Props) {
  const [explicitOptIn, setExplicitOptIn] = useState(false);
  const [separateFromTerms, setSeparateFromTerms] = useState(false);
  const [shareOrSellConsent, setShareOrSellConsent] = useState(false);
  const [residentState, setResidentState] = useState<UsStateCode>("OTHER");
  const [categories, setCategories] = useState<ConsentCategoryChoice[]>(() =>
    defaultCategoryChoices(false),
  );
  const [error, setError] = useState<string | null>(null);

  const checklist = useMemo(() => getConsentDisclosureChecklist(), []);

  const toggleCategory = (categoryId: HealthDataCategoryId) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.categoryId === categoryId ? { ...c, granted: !c.granted } : c,
      ),
    );
  };

  const grantAll = () => setCategories(defaultCategoryChoices(true));
  const denyAll = () => setCategories(defaultCategoryChoices(false));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const record = createConsentRecord({
      explicitOptIn,
      separateFromTerms,
      shareOrSellConsent,
      residentState,
      categories,
      policyVersion: MHMDA_POLICY_VERSION,
    });

    if (!record.isValid) {
      setError(record.validationErrors.join(" "));
      return;
    }

    setError(null);
    onConsented(record);
  };

  return (
    <section
      className="rounded-3xl border border-violet-300 bg-violet-50/90 p-5 shadow-md sm:p-6"
      aria-labelledby="mhmda-consent-title"
      data-testid="mhmda-consent-gate"
    >
      <p className="inline-flex rounded-full bg-violet-200 px-3 py-1 text-xs font-semibold tracking-wide text-violet-950">
        MHMDA health data consent (separate from Terms)
      </p>
      <h2 id="mhmda-consent-title" className="mt-3 text-xl font-semibold text-violet-950">
        Explicit opt-in before any consumer health data is collected
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-violet-900">
        Washington&apos;s My Health My Data Act (and similar state rules) require{" "}
        <strong>affirmative, separate</strong> consent before we collect stretch mark
        photos, symptom notes, postpartum timeline markers, session logs, or severity
        self-assessments. The dosage calculator math above works without this consent.
        Policy version: <code className="text-xs">{MHMDA_POLICY_VERSION}</code>.
      </p>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-violet-900">
        {checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-violet-950">
            Health data categories
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={grantAll}
              className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-900"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={denyAll}
              className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-900"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-3">
            {HEALTH_DATA_CATEGORIES.map((category) => {
              const choice = categories.find((c) => c.categoryId === category.id);
              return (
                <label
                  key={category.id}
                  className="flex cursor-pointer gap-3 rounded-2xl border border-violet-200 bg-white p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={choice?.granted === true}
                    onChange={() => toggleCategory(category.id)}
                    data-testid={`category-${category.id}`}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {category.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {category.description}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      <strong>Purpose:</strong> {category.purpose}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      <strong>Retention:</strong> {category.retention}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-violet-950">
            Third-party recipients
          </legend>
          <ul className="space-y-2 text-xs text-slate-700">
            {THIRD_PARTY_RECIPIENTS.map((recipient) => (
              <li
                key={recipient.id}
                className="rounded-xl border border-violet-100 bg-white px-3 py-2"
              >
                <strong>{recipient.name}</strong> ({recipient.role}) — {recipient.purpose}
                {recipient.receivesHealthData
                  ? " May receive health details you choose to send."
                  : " Does not receive stored health records by default."}
              </li>
            ))}
          </ul>
        </fieldset>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-violet-950">State of residence (optional)</span>
          <select
            value={residentState}
            onChange={(event) => setResidentState(event.target.value as UsStateCode)}
            className="w-full rounded-xl border border-violet-200 bg-white p-3 text-base text-slate-900"
            data-testid="resident-state"
          >
            {STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-3 text-sm text-violet-950">
          <input
            type="checkbox"
            className="mt-1"
            checked={separateFromTerms}
            onChange={(event) => setSeparateFromTerms(event.target.checked)}
            data-testid="separate-from-terms"
          />
          <span>
            I understand this consent is <strong>separate from</strong> the general Terms of
            Service and Privacy Policy acceptance.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-violet-950">
          <input
            type="checkbox"
            className="mt-1"
            checked={explicitOptIn}
            onChange={(event) => setExplicitOptIn(event.target.checked)}
            data-testid="explicit-opt-in"
          />
          <span>
            I <strong>explicitly opt in</strong> to collection and processing of the health data
            categories I selected above for the stated purposes.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-violet-950">
          <input
            type="checkbox"
            className="mt-1"
            checked={shareOrSellConsent}
            onChange={(event) => setShareOrSellConsent(event.target.checked)}
            data-testid="share-or-sell"
          />
          <span>
            Optional separate consent: allow sharing of my consumer health data with third
            parties beyond processors/support. <strong>Leave unchecked</strong> — we do not
            sell health data by default.
          </span>
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-violet-800"
            data-testid="consent-submit"
          >
            Save health data consent
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-900"
            data-testid="consent-decline"
          >
            Continue without health data
          </button>
        </div>
      </form>
    </section>
  );
}
