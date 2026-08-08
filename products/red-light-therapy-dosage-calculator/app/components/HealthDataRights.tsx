"use client";

import { useMemo, useState } from "react";
import {
  HEALTH_DATA_CATEGORIES,
  STATE_LAW_ASSESSMENTS,
  type DsarRequestRecord,
  type DsarRequestType,
  type HealthDataCategoryId,
  type HealthJournalEntry,
  type MhmdaConsentRecord,
  applyCorrectionToJournal,
  applyDeletionToJournal,
  buildAccessExport,
  createDsarRequest,
  createHealthJournalEntry,
  mayCollectCategory,
  withdrawConsent,
} from "../data/mhmda-consent";

interface Props {
  consent: MhmdaConsentRecord | null;
  entries: HealthJournalEntry[];
  requests: DsarRequestRecord[];
  onConsentChange: (record: MhmdaConsentRecord | null) => void;
  onEntriesChange: (entries: HealthJournalEntry[]) => void;
  onRequestsChange: (requests: DsarRequestRecord[]) => void;
}

export default function HealthDataRights({
  consent,
  entries,
  requests,
  onConsentChange,
  onEntriesChange,
  onRequestsChange,
}: Props) {
  const [categoryId, setCategoryId] = useState<HealthDataCategoryId>("symptom_notes");
  const [body, setBody] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [journalError, setJournalError] = useState<string | null>(null);

  const [dsarType, setDsarType] = useState<DsarRequestType>("access");
  const [contact, setContact] = useState("");
  const [details, setDetails] = useState("");
  const [dsarMessage, setDsarMessage] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);

  const grantedCategories = useMemo(
    () =>
      HEALTH_DATA_CATEGORIES.filter((category) =>
        mayCollectCategory(consent, category.id),
      ),
    [consent],
  );

  const handleAddEntry = (event: React.FormEvent) => {
    event.preventDefault();
    const { entry, error } = createHealthJournalEntry({
      categoryId,
      body,
      photoName: photoName || undefined,
      consent,
    });
    if (error || !entry) {
      setJournalError(error ?? "Could not save entry.");
      return;
    }
    setJournalError(null);
    onEntriesChange([entry, ...entries]);
    setBody("");
    setPhotoName("");
  };

  const handleDsar = (event: React.FormEvent) => {
    event.preventDefault();
    const request = createDsarRequest({ type: dsarType, contact, details });
    if (!request.isValid) {
      setDsarMessage(request.validationErrors.join(" "));
      setExportJson(null);
      onRequestsChange([request, ...requests]);
      return;
    }

    let nextEntries = entries;
    if (request.type === "deletion") {
      nextEntries = applyDeletionToJournal(entries, request);
      onEntriesChange(nextEntries);
      onConsentChange(consent ? withdrawConsent(consent) : null);
    } else if (request.type === "correction") {
      nextEntries = applyCorrectionToJournal(entries, request);
      onEntriesChange(nextEntries);
    }

    const completed = { ...request, status: "completed" as const };
    onRequestsChange([completed, ...requests]);

    if (request.type === "access") {
      const payload = buildAccessExport(consent, nextEntries, [completed, ...requests]);
      setExportJson(JSON.stringify(payload, null, 2));
      setDsarMessage(
        `Access export ready (SLA ${request.slaDays} days). Copy JSON below or save it offline.`,
      );
    } else if (request.type === "deletion") {
      setExportJson(null);
      setDsarMessage(
        `Deletion request completed locally. Health journal cleared and consent withdrawn (SLA target ${request.slaDays} days).`,
      );
    } else {
      setExportJson(null);
      setDsarMessage(
        `Correction applied where the entry id matched (SLA ${request.slaDays} days).`,
      );
    }
  };

  const handleWithdraw = () => {
    if (!consent) return;
    onConsentChange(withdrawConsent(consent));
    setDsarMessage(
      "Consent withdrawn. Further health data collection is blocked until you opt in again.",
    );
  };

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-6"
      aria-labelledby="health-rights-title"
      data-testid="health-data-rights"
    >
      <h2 id="health-rights-title" className="text-xl font-semibold text-slate-900">
        Health data journal &amp; rights
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        Log health-related notes only after MHMDA consent. Use access, correction, or deletion
        requests anytime. Data stays in this browser unless you export or email support.
      </p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-800">
        <p>
          Consent status:{" "}
          <strong data-testid="consent-status">
            {consent?.isValid ? "Active opt-in" : "Not consented / withdrawn"}
          </strong>
        </p>
        {consent?.isValid ? (
          <p className="mt-1 text-xs text-slate-600">
            Policy {consent.policyVersion} · state {consent.residentState} · share/sell{" "}
            {consent.shareOrSellConsent ? "allowed" : "denied"} · granted{" "}
            {grantedCategories.map((c) => c.label).join(", ") || "none"}
          </p>
        ) : null}
        {consent?.isValid ? (
          <button
            type="button"
            onClick={handleWithdraw}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            data-testid="withdraw-consent"
          >
            Withdraw consent
          </button>
        ) : null}
      </div>

      <form className="mt-5 space-y-3 border-t border-slate-100 pt-5" onSubmit={handleAddEntry}>
        <h3 className="text-sm font-semibold text-slate-900">Add journal entry</h3>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value as HealthDataCategoryId)}
            className="rounded-xl border border-slate-200 p-3"
            data-testid="journal-category"
          >
            {HEALTH_DATA_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
                {!mayCollectCategory(consent, category.id) ? " (not consented)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Notes</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="rounded-xl border border-slate-200 p-3"
            placeholder="Symptom note, postpartum week, severity score, session reflection…"
            data-testid="journal-body"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Photo file name (optional, local only)</span>
          <input
            type="text"
            value={photoName}
            onChange={(event) => setPhotoName(event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
            placeholder="stretch-mark-week-6.jpg"
            data-testid="journal-photo-name"
          />
        </label>
        {journalError ? (
          <p className="text-sm text-red-700" role="alert" data-testid="journal-error">
            {journalError}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
          data-testid="journal-save"
        >
          Save entry
        </button>
      </form>

      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Stored entries ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="text-xs text-slate-500">No health entries stored.</p>
        ) : (
          <ul className="space-y-2" data-testid="journal-list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
              >
                <div className="font-semibold text-slate-900">
                  {entry.categoryId} · {entry.id}
                </div>
                <div className="text-slate-500">{entry.createdAt}</div>
                <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
                {entry.photoName ? <p className="mt-1">Photo: {entry.photoName}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="mt-6 space-y-3 border-t border-slate-100 pt-5" onSubmit={handleDsar}>
        <h3 className="text-sm font-semibold text-slate-900">
          Access · correct · delete (DSAR)
        </h3>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Request type</span>
          <select
            value={dsarType}
            onChange={(event) => setDsarType(event.target.value as DsarRequestType)}
            className="rounded-xl border border-slate-200 p-3"
            data-testid="dsar-type"
          >
            <option value="access">Access / export</option>
            <option value="correction">Correction</option>
            <option value="deletion">Deletion</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Contact email or phone</span>
          <input
            type="text"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="rounded-xl border border-slate-200 p-3"
            placeholder="you@example.com"
            data-testid="dsar-contact"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">
            Details{" "}
            {dsarType === "correction"
              ? "(required: id=entryId; body=…)"
              : "(optional)"}
          </span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={2}
            className="rounded-xl border border-slate-200 p-3"
            placeholder={
              dsarType === "correction"
                ? "id=health_xxx; body=Updated note text"
                : "Anything we should know to fulfill this request"
            }
            data-testid="dsar-details"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          data-testid="dsar-submit"
        >
          Submit rights request
        </button>
        {dsarMessage ? (
          <p className="text-sm text-slate-800" data-testid="dsar-message">
            {dsarMessage}
          </p>
        ) : null}
        {exportJson ? (
          <pre
            className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100"
            data-testid="dsar-export"
          >
            {exportJson}
          </pre>
        ) : null}
      </form>

      {requests.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">Request history</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600" data-testid="dsar-history">
            {requests.map((request) => (
              <li key={request.id}>
                {request.requestedAt} · {request.type} · {request.status}
                {request.validationErrors.length
                  ? ` · ${request.validationErrors.join("; ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Sister-state health privacy assessment
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          National MHMDA-grade opt-in is the default. Summary of related regimes:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table
            className="min-w-full text-left text-xs text-slate-700"
            data-testid="state-law-table"
          >
            <thead>
              <tr className="border-b border-slate-200 text-slate-900">
                <th className="py-2 pr-3">State</th>
                <th className="py-2 pr-3">Law</th>
                <th className="py-2 pr-3">Opt-in</th>
                <th className="py-2 pr-3">Private RoA</th>
                <th className="py-2">Covered by national flow</th>
              </tr>
            </thead>
            <tbody>
              {STATE_LAW_ASSESSMENTS.map((row) => (
                <tr key={row.state} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-semibold">{row.state}</td>
                  <td className="py-2 pr-3">{row.lawName}</td>
                  <td className="py-2 pr-3">
                    {row.requiresExplicitOptIn ? "Yes" : "Contextual"}
                  </td>
                  <td className="py-2 pr-3">{row.privateRightOfAction ? "Yes" : "No"}</td>
                  <td className="py-2">{row.coveredByNationalFlow ? "Yes" : "Review"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
