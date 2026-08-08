import assert from "node:assert/strict";
import {
  HEALTH_DATA_CATEGORIES,
  MHMDA_POLICY_VERSION,
  STATE_LAW_ASSESSMENTS,
  THIRD_PARTY_RECIPIENTS,
  applyCorrectionToJournal,
  applyDeletionToJournal,
  buildAccessExport,
  createConsentRecord,
  createDsarRequest,
  createHealthJournalEntry,
  defaultCategoryChoices,
  getConsentDisclosureChecklist,
  getStateLawAssessment,
  mayCollectCategory,
  mayShareOrSellHealthData,
  normalizeState,
  transitionDsarStatus,
  withdrawConsent,
} from "../app/data/mhmda-consent";

function validConsentInput(overrides: Record<string, unknown> = {}) {
  return {
    explicitOptIn: true,
    separateFromTerms: true,
    shareOrSellConsent: false,
    residentState: "WA",
    categories: defaultCategoryChoices(true),
    policyVersion: MHMDA_POLICY_VERSION,
    ...overrides,
  };
}

{
  const denied = createConsentRecord({
    explicitOptIn: false,
    separateFromTerms: true,
    shareOrSellConsent: false,
    categories: defaultCategoryChoices(true),
    policyVersion: MHMDA_POLICY_VERSION,
  });
  assert.equal(denied.isValid, false);
  assert.ok(denied.validationErrors.some((e) => /opt-in/i.test(e)));
}

{
  const bundled = createConsentRecord({
    explicitOptIn: true,
    separateFromTerms: false,
    shareOrSellConsent: false,
    categories: defaultCategoryChoices(true),
    policyVersion: MHMDA_POLICY_VERSION,
  });
  assert.equal(bundled.isValid, false);
  assert.ok(bundled.validationErrors.some((e) => /separate/i.test(e)));
}

{
  const noCats = createConsentRecord({
    explicitOptIn: true,
    separateFromTerms: true,
    shareOrSellConsent: false,
    categories: defaultCategoryChoices(false),
    policyVersion: MHMDA_POLICY_VERSION,
  });
  assert.equal(noCats.isValid, false);
  assert.ok(noCats.validationErrors.some((e) => /no health data category/i.test(e)));
}

{
  const ok = createConsentRecord(validConsentInput());
  assert.equal(ok.isValid, true);
  assert.equal(ok.validationErrors.length, 0);
  assert.equal(ok.policyVersion, MHMDA_POLICY_VERSION);
  assert.equal(ok.residentState, "WA");
  assert.equal(mayCollectCategory(ok, "stretch_mark_photos"), true);
  assert.equal(mayCollectCategory(ok, "symptom_notes"), true);
  assert.equal(mayShareOrSellHealthData(ok), false);
}

{
  const partial = createConsentRecord(
    validConsentInput({
      categories: defaultCategoryChoices(false).map((c) =>
        c.categoryId === "symptom_notes" ? { ...c, granted: true } : c,
      ),
    }),
  );
  assert.equal(partial.isValid, true);
  assert.equal(mayCollectCategory(partial, "symptom_notes"), true);
  assert.equal(mayCollectCategory(partial, "postpartum_timeline"), false);
}

{
  const share = createConsentRecord(validConsentInput({ shareOrSellConsent: true }));
  assert.equal(mayShareOrSellHealthData(share), true);
}

{
  const ok = createConsentRecord(validConsentInput());
  const withdrawn = withdrawConsent(ok, "2026-08-01T00:00:00.000Z");
  assert.equal(withdrawn.isValid, false);
  assert.equal(withdrawn.explicitOptIn, false);
  assert.equal(mayCollectCategory(withdrawn, "session_logs"), false);
  assert.equal(withdrawn.consentedAt, "2026-08-01T00:00:00.000Z");
}

{
  const blocked = createHealthJournalEntry({
    categoryId: "stretch_mark_photos",
    body: "week 4 photo",
    photoName: "w4.jpg",
    consent: null,
  });
  assert.equal(blocked.entry, null);
  assert.match(String(blocked.error), /consent/i);
}

{
  const consent = createConsentRecord(validConsentInput());
  const saved = createHealthJournalEntry({
    categoryId: "postpartum_timeline",
    body: "Postpartum week 6",
    consent,
  });
  assert.equal(saved.error, null);
  assert.ok(saved.entry);
  assert.equal(saved.entry?.categoryId, "postpartum_timeline");
}

{
  const bad = createDsarRequest({ type: "access", contact: "nope" });
  assert.equal(bad.isValid, false);
  assert.equal(bad.status, "rejected");
}

{
  const access = createDsarRequest({
    type: "access",
    contact: "user@example.com",
  });
  assert.equal(access.isValid, true);
  assert.equal(access.slaDays, 45);
  assert.equal(access.status, "received");

  const deletion = createDsarRequest({
    type: "deletion",
    contact: "user@example.com",
  });
  assert.equal(deletion.slaDays, 30);

  const correctionMissing = createDsarRequest({
    type: "correction",
    contact: "user@example.com",
  });
  assert.equal(correctionMissing.isValid, false);

  const correction = createDsarRequest({
    type: "correction",
    contact: "user@example.com",
    details: "id=health_1; body=Fixed note",
  });
  assert.equal(correction.isValid, true);
}

{
  const consent = createConsentRecord(validConsentInput());
  const a = createHealthJournalEntry({
    categoryId: "symptom_notes",
    body: "itchy",
    consent,
  }).entry!;
  const b = createHealthJournalEntry({
    categoryId: "severity_self_assessment",
    body: "severity 3",
    consent,
  }).entry!;

  const corrected = applyCorrectionToJournal(
    [a, b],
    createDsarRequest({
      type: "correction",
      contact: "a@b.co",
      details: `id=${a.id}; body=no longer itchy`,
    }),
  );
  assert.equal(corrected.find((e) => e.id === a.id)?.body, "no longer itchy");
  assert.equal(corrected.find((e) => e.id === b.id)?.body, "severity 3");

  const deleted = applyDeletionToJournal(
    corrected,
    createDsarRequest({ type: "deletion", contact: "a@b.co" }),
  );
  assert.equal(deleted.length, 0);
}

{
  const consent = createConsentRecord(validConsentInput());
  const entry = createHealthJournalEntry({
    categoryId: "session_logs",
    body: "12 min @ 40 mW",
    consent,
  }).entry!;
  const req = createDsarRequest({ type: "access", contact: "a@b.co" });
  const exported = buildAccessExport(consent, [entry], [req]);
  assert.equal(exported.healthEntries.length, 1);
  assert.equal(exported.categories.length, HEALTH_DATA_CATEGORIES.length);
  assert.ok(exported.recipients.length >= 1);
}

{
  const req = createDsarRequest({ type: "access", contact: "a@b.co" });
  const next = transitionDsarStatus(req, "in_progress");
  assert.equal(next.status, "in_progress");
  const done = transitionDsarStatus(next, "completed");
  assert.equal(done.status, "completed");
  const illegal = transitionDsarStatus(done, "received");
  assert.ok(illegal.validationErrors.some((e) => /Illegal status/i.test(e)));
}

{
  assert.equal(normalizeState("washington"), "WA");
  assert.equal(normalizeState("ct"), "CT");
  assert.equal(normalizeState("Nevada"), "NV");
  assert.equal(normalizeState("TX"), "TX");
  assert.equal(normalizeState("unknown"), "OTHER");

  const wa = getStateLawAssessment("WA");
  assert.equal(wa.requiresExplicitOptIn, true);
  assert.equal(wa.privateRightOfAction, true);
  assert.equal(wa.coveredByNationalFlow, true);

  for (const state of ["CT", "NV", "TX", "CA"] as const) {
    const row = getStateLawAssessment(state);
    assert.equal(row.state, state);
    assert.equal(row.coveredByNationalFlow, true);
  }

  assert.ok(STATE_LAW_ASSESSMENTS.length >= 5);
  assert.ok(THIRD_PARTY_RECIPIENTS.length >= 1);
  assert.ok(HEALTH_DATA_CATEGORIES.every((c) => c.isConsumerHealthData));
}

{
  const checklist = getConsentDisclosureChecklist();
  assert.ok(checklist.some((item) => /category/i.test(item)));
  assert.ok(checklist.some((item) => /purpose/i.test(item)));
  assert.ok(checklist.some((item) => /third-party|recipient/i.test(item)));
  assert.ok(checklist.some((item) => /Terms of Service/i.test(item)));
  assert.ok(checklist.some((item) => /deletion/i.test(item)));
}

console.log("✅ MHMDA consent + DSAR tests passed.");
