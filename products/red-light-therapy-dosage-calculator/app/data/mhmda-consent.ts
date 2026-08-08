/**
 * mhmda-consent.ts — Washington My Health My Data Act (MHMDA) consent model.
 *
 * RCW 19.373 requires affirmative, separate, opt-in consent before collecting,
 * sharing, or selling consumer health data. This module is the single source
 * of truth for:
 *   - health data categories collected by the red-light / stretch-mark app
 *   - purpose + third-party recipient disclosures
 *   - consent record validation (must be explicit and separate from ToS)
 *   - access / correction / deletion (DSAR) request handling
 *   - sister-state law assessment (CT, NV, TX, CA)
 *
 * Nothing here is legal advice. Counsel must sign off before production launch.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type HealthDataCategoryId =
  | "stretch_mark_photos"
  | "symptom_notes"
  | "postpartum_timeline"
  | "session_logs"
  | "severity_self_assessment";

export type DsarRequestType = "access" | "correction" | "deletion";

export type DsarRequestStatus =
  | "received"
  | "in_progress"
  | "completed"
  | "rejected";

export type UsStateCode = "WA" | "CT" | "NV" | "TX" | "CA" | "OTHER";

export interface HealthDataCategory {
  id: HealthDataCategoryId;
  label: string;
  description: string;
  /** Why this category is collected (purpose limitation). */
  purpose: string;
  /** Retention guidance shown to the user. */
  retention: string;
  /** True when MHMDA treats the category as consumer health data. */
  isConsumerHealthData: boolean;
}

export interface ThirdPartyRecipient {
  id: string;
  name: string;
  role: "processor" | "analytics" | "hosting" | "support" | "none";
  purpose: string;
  /** True when this recipient may receive consumer health data. */
  receivesHealthData: boolean;
}

export interface ConsentCategoryChoice {
  categoryId: HealthDataCategoryId;
  granted: boolean;
}

export interface MhmdaConsentInput {
  /** User must affirmatively opt in; default false / missing is denial. */
  explicitOptIn: boolean;
  /**
   * Consent is separate from general Terms of Service. Must be true —
   * bundling MHMDA consent into ToS acceptance is non-compliant.
   */
  separateFromTerms: boolean;
  /** ISO-8601 timestamp when the user affirmed consent. */
  consentedAt?: string;
  /** Optional residency signal (self-attested). National flow still applies. */
  residentState?: UsStateCode | string;
  /** Per-category grants. Missing categories default to denied. */
  categories: ConsentCategoryChoice[];
  /**
   * Separate consent for sharing/selling consumer health data.
   * MHMDA requires this to be independent of collection consent.
   */
  shareOrSellConsent: boolean;
  /** Version of the disclosure text the user saw. */
  policyVersion: string;
}

export interface MhmdaConsentRecord {
  id: string;
  explicitOptIn: boolean;
  separateFromTerms: boolean;
  consentedAt: string;
  residentState: UsStateCode;
  categories: ConsentCategoryChoice[];
  shareOrSellConsent: boolean;
  policyVersion: string;
  /** True only when every MHMDA hard requirement is satisfied. */
  isValid: boolean;
  validationErrors: string[];
}

export interface DsarRequestInput {
  type: DsarRequestType;
  /** Free-text contact so ops can fulfill offline (email preferred). */
  contact: string;
  /** Optional details (e.g. correction payload description). */
  details?: string;
  requestedAt?: string;
}

export interface DsarRequestRecord {
  id: string;
  type: DsarRequestType;
  contact: string;
  details: string;
  requestedAt: string;
  status: DsarRequestStatus;
  /** Target SLA in calendar days (MHMDA-aligned operational target). */
  slaDays: number;
  validationErrors: string[];
  isValid: boolean;
}

export interface StateLawAssessment {
  state: UsStateCode;
  lawName: string;
  requiresExplicitOptIn: boolean;
  privateRightOfAction: boolean;
  notes: string;
  /** Whether the national MHMDA-style flow satisfies this state's baseline. */
  coveredByNationalFlow: boolean;
}

export interface PrivacyPolicySection {
  id: string;
  title: string;
  body: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogs (disclosures shown on the consent screen)
// ─────────────────────────────────────────────────────────────────────────────

export const MHMDA_POLICY_VERSION = "2026-08-08.1";

export const HEALTH_DATA_CATEGORIES: readonly HealthDataCategory[] = [
  {
    id: "stretch_mark_photos",
    label: "Stretch mark / progress photos",
    description:
      "Images you upload to track visual changes in stretch marks over time.",
    purpose:
      "Personal progress visualization and optional session comparison within the app.",
    retention: "Until you delete them or close your account (max 24 months of inactivity).",
    isConsumerHealthData: true,
  },
  {
    id: "symptom_notes",
    label: "Symptom and skin notes",
    description:
      "Free-text notes about skin feel, discomfort, or observations you choose to log.",
    purpose: "Personal journaling alongside red-light / contour-light session logs.",
    retention: "Until you delete them or close your account (max 24 months of inactivity).",
    isConsumerHealthData: true,
  },
  {
    id: "postpartum_timeline",
    label: "Postpartum / recovery timeline",
    description:
      "Optional postpartum week counter or recovery milestone markers you enter.",
    purpose: "Contextualize session history against a self-reported recovery timeline.",
    retention: "Until you delete them or close your account (max 24 months of inactivity).",
    isConsumerHealthData: true,
  },
  {
    id: "session_logs",
    label: "Treatment session logs",
    description:
      "Device session timing, irradiance targets, and frequency you record.",
    purpose: "Calculate dosage and show weekly load for general wellness tracking.",
    retention: "Until you delete them or close your account (max 24 months of inactivity).",
    isConsumerHealthData: true,
  },
  {
    id: "severity_self_assessment",
    label: "Severity self-assessment",
    description:
      "Self-rated stretch mark severity scores (not a clinical diagnosis).",
    purpose: "Let you chart self-reported change over time for personal reference.",
    retention: "Until you delete them or close your account (max 24 months of inactivity).",
    isConsumerHealthData: true,
  },
] as const;

export const THIRD_PARTY_RECIPIENTS: readonly ThirdPartyRecipient[] = [
  {
    id: "none_default",
    name: "No health-data recipients by default",
    role: "none",
    purpose:
      "Consumer health data stays on-device / in your account. We do not sell it.",
    receivesHealthData: false,
  },
  {
    id: "hosting",
    name: "Infrastructure host (e.g. Vercel)",
    role: "hosting",
    purpose:
      "Serves the web app. Transient request logs may include IP; health payloads are not sold or used for ads.",
    receivesHealthData: false,
  },
  {
    id: "support",
    name: "Human support (only if you email us)",
    role: "support",
    purpose:
      "If you submit a data-rights request or support ticket that includes health details, staff process that request only.",
    receivesHealthData: true,
  },
] as const;

export const STATE_LAW_ASSESSMENTS: readonly StateLawAssessment[] = [
  {
    state: "WA",
    lawName: "Washington My Health My Data Act (RCW 19.373)",
    requiresExplicitOptIn: true,
    privateRightOfAction: true,
    notes:
      "Baseline for this product. Affirmative opt-in, separate from ToS, category + purpose + recipient disclosures, and consumer rights to access/withdraw/delete.",
    coveredByNationalFlow: true,
  },
  {
    state: "CT",
    lawName: "Connecticut Data Privacy Act (CTDPA) — consumer health data amendments",
    requiresExplicitOptIn: true,
    privateRightOfAction: false,
    notes:
      "Requires consent for sensitive data including consumer health data. National MHMDA-style opt-in + DSAR flow covers the practical baseline; no private right of action (AG enforcement).",
    coveredByNationalFlow: true,
  },
  {
    state: "NV",
    lawName: "Nevada SB 370 (consumer health data)",
    requiresExplicitOptIn: true,
    privateRightOfAction: false,
    notes:
      "Regulates consumer health data collection/sharing with opt-in and privacy notice duties. National flow satisfies collection consent and deletion; confirm geofence/sharing rules if ads expand.",
    coveredByNationalFlow: true,
  },
  {
    state: "TX",
    lawName: "Texas Data Privacy and Security Act (TDPSA)",
    requiresExplicitOptIn: true,
    privateRightOfAction: false,
    notes:
      "Sensitive data (including health) needs consent. National opt-in + notice + rights request flow covers baseline; monitor AG guidance for any health-specific add-ons.",
    coveredByNationalFlow: true,
  },
  {
    state: "CA",
    lawName: "CPRA sensitive personal information + CMIA",
    requiresExplicitOptIn: false,
    privateRightOfAction: true,
    notes:
      "CPRA uses limit-use / right-to-limit for sensitive PI rather than pure MHMDA opt-in, plus CMIA for medical information. National opt-in is stricter and acceptable; still honor CA-specific rights language in the privacy policy.",
    coveredByNationalFlow: true,
  },
  {
    state: "OTHER",
    lawName: "Other US states (general consumer privacy)",
    requiresExplicitOptIn: false,
    privateRightOfAction: false,
    notes:
      "Applying the WA MHMDA-grade national flow is the conservative default. Re-assess when launching paid acquisition in a new state with a health-data statute.",
    coveredByNationalFlow: true,
  },
] as const;

export const PRIVACY_POLICY_SECTIONS: readonly PrivacyPolicySection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body:
      "This red light therapy / stretch-mark progress tool is a direct-to-consumer general wellness product. We are not a HIPAA covered entity or business associate at launch. Nothing here is medical advice or a medical device.",
  },
  {
    id: "health-data",
    title: "Consumer health data we may collect",
    body:
      "Only after separate MHMDA-style opt-in may we process: stretch mark / progress photos, symptom notes, postpartum timeline markers, treatment session logs, and severity self-assessments. Device dosage calculator inputs used purely for on-screen math without saving are not stored as health records.",
  },
  {
    id: "purposes",
    title: "Purposes",
    body:
      "Provide session timing math, personal progress journaling, and optional export of your own records. We do not use consumer health data for targeted advertising.",
  },
  {
    id: "sharing",
    title: "Sharing and sale",
    body:
      "We do not sell consumer health data. Sharing with a third party requires a separate affirmative consent, except for service providers acting as our processors under contract, or when you deliberately send health details to support.",
  },
  {
    id: "mhmda-rights",
    title: "Your MHMDA and state privacy rights",
    body:
      "You may request access to, correction of, or deletion of consumer health data, and you may withdraw consent at any time. We aim to fulfill verified requests within 45 days (30-day operational target for deletion). Washington residents have additional rights under RCW 19.373, including a private right of action for certain violations.",
  },
  {
    id: "sister-states",
    title: "Other state health privacy laws",
    body:
      "We apply the same explicit opt-in nationally. That posture is designed to satisfy baseline duties under CT consumer health rules, Nevada SB 370, Texas TDPSA sensitive-data consent, and to exceed CPRA right-to-limit expectations in California. See the in-app state-law assessment table for details.",
  },
  {
    id: "security",
    title: "Security and retention",
    body:
      "Health records are stored only after consent, preferably on-device. In-transit traffic uses HTTPS. Inactive health records are purged within 24 months. Breach response follows the FTC Health Breach Notification Rule where applicable.",
  },
  {
    id: "contact",
    title: "How to exercise rights",
    body:
      "Use the in-app Health Data Rights panel or email privacy@revvel.example with subject “Health data request”. Do not include photos in the initial email unless asked.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_IDS = new Set<HealthDataCategoryId>(
  HEALTH_DATA_CATEGORIES.map((c) => c.id),
);

const VALID_DSAR_TYPES = new Set<DsarRequestType>([
  "access",
  "correction",
  "deletion",
]);

export function normalizeState(input?: string | null): UsStateCode {
  if (!input) return "OTHER";
  const code = String(input).trim().toUpperCase();
  if (code === "WA" || code === "WASHINGTON") return "WA";
  if (code === "CT" || code === "CONNECTICUT") return "CT";
  if (code === "NV" || code === "NEVADA") return "NV";
  if (code === "TX" || code === "TEXAS") return "TX";
  if (code === "CA" || code === "CALIFORNIA") return "CA";
  return "OTHER";
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isNonEmptyContact(contact: string): boolean {
  const value = contact.trim();
  if (value.length < 3) return false;
  // Lightweight email-or-phone acceptance; ops verifies offline.
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  return value.length >= 7;
}

/**
 * Build the default per-category choice list (all denied) for the consent UI.
 */
export function defaultCategoryChoices(
  granted = false,
): ConsentCategoryChoice[] {
  return HEALTH_DATA_CATEGORIES.map((category) => ({
    categoryId: category.id,
    granted,
  }));
}

/**
 * Validate and materialize a consent record.
 * Collection of any consumer health data is forbidden unless isValid === true
 * and at least one category is granted.
 */
export function createConsentRecord(input: MhmdaConsentInput): MhmdaConsentRecord {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    errors.push("Consent payload is required.");
  }

  if (input?.explicitOptIn !== true) {
    errors.push("Explicit affirmative opt-in is required (MHMDA).");
  }

  if (input?.separateFromTerms !== true) {
    errors.push("Consent must be collected separately from Terms of Service.");
  }

  if (!input?.policyVersion || String(input.policyVersion).trim() === "") {
    errors.push("policyVersion is required so we know which disclosure was shown.");
  }

  const categories = Array.isArray(input?.categories) ? input.categories : [];
  if (categories.length === 0) {
    errors.push("At least one health data category decision is required.");
  }

  const seen = new Set<string>();
  for (const choice of categories) {
    if (!choice || !CATEGORY_IDS.has(choice.categoryId)) {
      errors.push(`Unknown health data category: ${String(choice?.categoryId)}`);
      continue;
    }
    if (seen.has(choice.categoryId)) {
      errors.push(`Duplicate category decision: ${choice.categoryId}`);
    }
    seen.add(choice.categoryId);
    if (typeof choice.granted !== "boolean") {
      errors.push(`Category ${choice.categoryId} must be true or false.`);
    }
  }

  const anyGranted = categories.some((c) => c && c.granted === true);
  if (input?.explicitOptIn === true && !anyGranted) {
    errors.push("Opt-in was checked but no health data category was granted.");
  }

  // shareOrSellConsent may be false; that is valid. Selling without it is blocked elsewhere.
  if (typeof input?.shareOrSellConsent !== "boolean") {
    errors.push("shareOrSellConsent must be an explicit boolean.");
  }

  const consentedAt =
    input?.consentedAt && !Number.isNaN(Date.parse(input.consentedAt))
      ? new Date(input.consentedAt).toISOString()
      : new Date().toISOString();

  const isValid = errors.length === 0;

  return {
    id: makeId("mhmda"),
    explicitOptIn: input?.explicitOptIn === true,
    separateFromTerms: input?.separateFromTerms === true,
    consentedAt,
    residentState: normalizeState(input?.residentState),
    categories: categories.map((c) => ({
      categoryId: c.categoryId,
      granted: c.granted === true,
    })),
    shareOrSellConsent: input?.shareOrSellConsent === true,
    policyVersion: String(input?.policyVersion ?? "").trim(),
    isValid,
    validationErrors: errors,
  };
}

/**
 * True when the record allows collecting a specific health data category.
 */
export function mayCollectCategory(
  record: MhmdaConsentRecord | null | undefined,
  categoryId: HealthDataCategoryId,
): boolean {
  if (!record || !record.isValid || record.explicitOptIn !== true) return false;
  const choice = record.categories.find((c) => c.categoryId === categoryId);
  return choice?.granted === true;
}

/**
 * True when sharing/selling consumer health data is allowed.
 * Collection consent alone is never enough.
 */
export function mayShareOrSellHealthData(
  record: MhmdaConsentRecord | null | undefined,
): boolean {
  return Boolean(
    record &&
      record.isValid &&
      record.explicitOptIn &&
      record.shareOrSellConsent === true,
  );
}

/**
 * Withdraw consent — returns a new invalid/denied record preserving audit fields.
 */
export function withdrawConsent(
  record: MhmdaConsentRecord,
  at?: string,
): MhmdaConsentRecord {
  const withdrawnAt =
    at && !Number.isNaN(Date.parse(at)) ? new Date(at).toISOString() : new Date().toISOString();

  return {
    ...record,
    id: makeId("mhmda_withdrawn"),
    explicitOptIn: false,
    shareOrSellConsent: false,
    categories: record.categories.map((c) => ({ ...c, granted: false })),
    consentedAt: withdrawnAt,
    isValid: false,
    validationErrors: ["Consent withdrawn by consumer."],
  };
}

/**
 * Create a DSAR (access / correction / deletion) request record.
 */
export function createDsarRequest(input: DsarRequestInput): DsarRequestRecord {
  const errors: string[] = [];
  const type = input?.type;
  if (!VALID_DSAR_TYPES.has(type)) {
    errors.push("DSAR type must be access, correction, or deletion.");
  }

  const contact = String(input?.contact ?? "").trim();
  if (!isNonEmptyContact(contact)) {
    errors.push("A valid contact email or phone is required to fulfill the request.");
  }

  if (type === "correction") {
    const details = String(input?.details ?? "").trim();
    if (details.length < 3) {
      errors.push("Correction requests must describe what should be changed.");
    }
  }

  const requestedAt =
    input?.requestedAt && !Number.isNaN(Date.parse(input.requestedAt))
      ? new Date(input.requestedAt).toISOString()
      : new Date().toISOString();

  const slaDays = type === "deletion" ? 30 : 45;
  const isValid = errors.length === 0;

  return {
    id: makeId("dsar"),
    type: VALID_DSAR_TYPES.has(type) ? type : "access",
    contact,
    details: String(input?.details ?? "").trim(),
    requestedAt,
    status: isValid ? "received" : "rejected",
    slaDays,
    validationErrors: errors,
    isValid,
  };
}

/**
 * Advance a valid DSAR through a simple status machine.
 */
export function transitionDsarStatus(
  request: DsarRequestRecord,
  next: DsarRequestStatus,
): DsarRequestRecord {
  if (!request.isValid && next !== "rejected") {
    return {
      ...request,
      status: "rejected",
      validationErrors: [
        ...request.validationErrors,
        "Cannot advance an invalid DSAR.",
      ],
    };
  }

  const allowed: Record<DsarRequestStatus, DsarRequestStatus[]> = {
    received: ["in_progress", "completed", "rejected"],
    in_progress: ["completed", "rejected"],
    completed: [],
    rejected: [],
  };

  if (!allowed[request.status].includes(next)) {
    return {
      ...request,
      validationErrors: [
        ...request.validationErrors,
        `Illegal status transition ${request.status} → ${next}.`,
      ],
    };
  }

  return { ...request, status: next };
}

/**
 * Local storage shape for client-held health journal entries (post-consent).
 */
export interface HealthJournalEntry {
  id: string;
  categoryId: HealthDataCategoryId;
  createdAt: string;
  /** Opaque user text or metadata; photos are referenced by local object URL/name only. */
  body: string;
  photoName?: string;
}

export function createHealthJournalEntry(input: {
  categoryId: HealthDataCategoryId;
  body: string;
  photoName?: string;
  createdAt?: string;
  consent: MhmdaConsentRecord | null | undefined;
}): { entry: HealthJournalEntry | null; error: string | null } {
  if (!mayCollectCategory(input.consent, input.categoryId)) {
    return {
      entry: null,
      error: "MHMDA consent is missing or does not cover this health data category.",
    };
  }

  const body = String(input.body ?? "").trim();
  if (!body && !input.photoName) {
    return { entry: null, error: "Entry body or photo is required." };
  }

  const createdAt =
    input.createdAt && !Number.isNaN(Date.parse(input.createdAt))
      ? new Date(input.createdAt).toISOString()
      : new Date().toISOString();

  return {
    entry: {
      id: makeId("health"),
      categoryId: input.categoryId,
      createdAt,
      body,
      photoName: input.photoName?.trim() || undefined,
    },
    error: null,
  };
}

/**
 * Apply a deletion DSAR to an in-memory journal (hard delete).
 */
export function applyDeletionToJournal(
  entries: HealthJournalEntry[],
  request: DsarRequestRecord,
): HealthJournalEntry[] {
  if (!request.isValid || request.type !== "deletion") return entries;
  return [];
}

/**
 * Apply a correction DSAR: replace body text on a matching entry id in details.
 * details format: "id=<entryId>; body=<new body>"
 */
export function applyCorrectionToJournal(
  entries: HealthJournalEntry[],
  request: DsarRequestRecord,
): HealthJournalEntry[] {
  if (!request.isValid || request.type !== "correction") return entries;

  const idMatch = /id\s*=\s*([^;]+)/i.exec(request.details);
  const bodyMatch = /body\s*=\s*([\s\S]+)/i.exec(request.details);
  if (!idMatch || !bodyMatch) return entries;

  const targetId = idMatch[1].trim();
  const newBody = bodyMatch[1].trim();

  return entries.map((entry) =>
    entry.id === targetId ? { ...entry, body: newBody } : entry,
  );
}

/**
 * Access DSAR export payload (JSON-serializable).
 */
export function buildAccessExport(
  consent: MhmdaConsentRecord | null,
  entries: HealthJournalEntry[],
  requests: DsarRequestRecord[],
): {
  exportedAt: string;
  consent: MhmdaConsentRecord | null;
  healthEntries: HealthJournalEntry[];
  priorRequests: DsarRequestRecord[];
  categories: readonly HealthDataCategory[];
  recipients: readonly ThirdPartyRecipient[];
} {
  return {
    exportedAt: new Date().toISOString(),
    consent,
    healthEntries: entries,
    priorRequests: requests,
    categories: HEALTH_DATA_CATEGORIES,
    recipients: THIRD_PARTY_RECIPIENTS,
  };
}

export function getStateLawAssessment(state?: string | null): StateLawAssessment {
  const normalized = normalizeState(state);
  return (
    STATE_LAW_ASSESSMENTS.find((row) => row.state === normalized) ??
    STATE_LAW_ASSESSMENTS[STATE_LAW_ASSESSMENTS.length - 1]
  );
}

/**
 * Consent screen checklist used by UI + tests — the MHMDA disclosure minimum.
 */
export function getConsentDisclosureChecklist(): string[] {
  return [
    "Identify each category of consumer health data collected",
    "State the purpose for each category",
    "List third-party recipients (or state there are none for health data)",
    "Obtain affirmative opt-in separate from Terms of Service",
    "Obtain separate consent before any sale/share of health data",
    "Provide access, correction, and deletion request paths",
  ];
}

/** localStorage keys — keep stable for client migrations. */
export const STORAGE_KEYS = {
  consent: "rlt.mhmda.consent.v1",
  journal: "rlt.mhmda.journal.v1",
  dsar: "rlt.mhmda.dsar.v1",
} as const;
