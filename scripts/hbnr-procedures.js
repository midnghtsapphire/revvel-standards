/**
 * FTC Health Breach Notification Rule (HBNR) — 16 CFR Part 318
 *
 * Operational helpers for non-HIPAA consumer health products (red light therapy
 * family and siblings) that may handle PHR-identifiable health information.
 *
 * Timelines align with issue #16112 and the FTC HBNR:
 * https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule
 *
 * Not legal advice. Counsel must sign entity classification before production
 * collection of identifiable health data (see PIA #16110).
 *
 * @module scripts/hbnr-procedures
 */

'use strict';

const HBNR_CITATION = '16 CFR Part 318';
const HBNR_FTC_URL =
  'https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule';

/** @type {number} Calendar-day ceiling for individual notification after discovery. */
const USER_NOTIFICATION_CALENDAR_DAYS = 60;

/** @type {number} Default FTC notice window (calendar days) when large-breach threshold is not met. */
const FTC_NOTIFICATION_DEFAULT_CALENDAR_DAYS = 60;

/** @type {number} Accelerated FTC window (business days) when >500 residents of any state/jurisdiction are affected. */
const FTC_NOTIFICATION_LARGE_BREACH_BUSINESS_DAYS = 10;

/** @type {number} Media notice trigger: residents of a single state/jurisdiction (≥ this count). */
const MEDIA_NOTIFICATION_RESIDENT_THRESHOLD = 500;

/**
 * FTC accelerated window trigger: more than this many residents of any single
 * state/jurisdiction (issue #16112: >500).
 */
const LARGE_BREACH_RESIDENT_THRESHOLD = 500;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Default operational contacts for the red light therapy product line. */
const DEFAULT_BREACH_CONTACTS = {
  privacyLead: 'privacy@revvel.io (Privacy Lead — Audrey Evans)',
  securityLead: 'security@revvel.io (Security Lead)',
  legalCounsel: 'legal@revvel.io (Healthcare privacy counsel — retain before production)',
  executiveEscalation: '@midnghtsapphire (Owner / executive escalation)',
  ftcIntake:
    'FTC Health Breach Notification portal — https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule',
  userNoticeFrom: 'privacy@revvel.io',
  onCallChannel:
    '#incident-response (ops) → page privacy + security leads within 1 hour of confirmed breach',
};

/**
 * @param {string} iso
 * @returns {Date}
 */
function parseIsoDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`discoveredOn must be YYYY-MM-DD, got: ${iso}`);
  }
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return date;
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {string} isoDate
 * @param {number} days
 * @returns {string}
 */
function addCalendarDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

/**
 * Add business days (Mon–Fri, UTC). Federal holidays are not encoded.
 * @param {string} isoDate
 * @param {number} days
 * @returns {string}
 */
function addBusinessDays(isoDate, days) {
  if (!Number.isInteger(days) || days < 0) {
    throw new Error('business days must be a non-negative integer');
  }
  const date = parseIsoDate(isoDate);
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return formatIsoDate(date);
}

/**
 * @param {string} startIso
 * @param {string} endIso
 * @returns {number}
 */
function calendarDaysBetween(startIso, endIso) {
  const start = parseIsoDate(startIso).getTime();
  const end = parseIsoDate(endIso).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * Classify whether the product is in HBNR scope.
 *
 * @param {object} input
 * @param {boolean} input.offersOrMaintainsPhr
 * @param {boolean} input.accessesOrSendsToPhr
 * @param {boolean} input.providesServicesToPhrEntity
 * @param {boolean} input.hipaaCoveredForSameData
 * @param {boolean} input.hasIdentifiableHealthData
 * @param {boolean} input.drawsFromMultipleSources
 */
function classifyPhrEntity(input) {
  const rationale = [];

  if (input.hipaaCoveredForSameData) {
    rationale.push(
      'HIPAA covered entity or business associate obligations apply to the same data; HBNR excludes HIPAA-covered breaches handled under the HIPAA Breach Notification Rule.',
    );
    return {
      role: 'hipaa_covered_excluded',
      applicability: 'does_not_apply_hipaa',
      rationale,
      requiresBreachProcedures: false,
      linkedPiaIssue: 'https://github.com/midnghtsapphire/revvel-standards/issues/16110',
    };
  }

  if (!input.hasIdentifiableHealthData) {
    rationale.push(
      'No PHR-identifiable health information is collected (no link between health data and an individual).',
    );
    return {
      role: 'not_covered',
      applicability: 'does_not_apply_not_phr',
      rationale,
      requiresBreachProcedures: false,
      linkedPiaIssue: 'https://github.com/midnghtsapphire/revvel-standards/issues/16110',
    };
  }

  if (input.offersOrMaintainsPhr && input.drawsFromMultipleSources) {
    rationale.push(
      'Product offers or maintains electronic PHR-identifiable health information drawn from multiple sources → vendor of personal health records under HBNR.',
    );
    return {
      role: 'phr_vendor',
      applicability: 'applies',
      rationale,
      requiresBreachProcedures: true,
      linkedPiaIssue: 'https://github.com/midnghtsapphire/revvel-standards/issues/16110',
    };
  }

  if (input.accessesOrSendsToPhr) {
    rationale.push(
      'Product accesses information in a PHR or sends information to a PHR → PHR-related entity under HBNR.',
    );
    return {
      role: 'phr_related_entity',
      applicability: 'applies',
      rationale,
      requiresBreachProcedures: true,
      linkedPiaIssue: 'https://github.com/midnghtsapphire/revvel-standards/issues/16110',
    };
  }

  if (input.providesServicesToPhrEntity) {
    rationale.push(
      'Product provides services to a PHR vendor or PHR-related entity in connection with the PHR → third-party service provider under HBNR.',
    );
    return {
      role: 'third_party_service_provider',
      applicability: 'applies',
      rationale,
      requiresBreachProcedures: true,
      linkedPiaIssue: 'https://github.com/midnghtsapphire/revvel-standards/issues/16110',
    };
  }

  rationale.push(
    'Identifiable health data is present but multi-source PHR / related-entity facts are not confirmed. Treat as needs_counsel_review pending PIA #16110; maintain breach procedures until counsel documents non-coverage.',
  );
  return {
    role: 'not_covered',
    applicability: 'needs_counsel_review',
    rationale,
    requiresBreachProcedures: true,
    linkedPiaIssue: 'https://github.com/midnghtsapphire/revvel-standards/issues/16110',
  };
}

/**
 * Baseline classification for the red light therapy product line (D2C wellness).
 * Assumes identifiable health data + multi-source PHR characteristics when
 * accounts / session logs / photos ship — pending counsel sign-off via PIA #16110.
 */
function redLightTherapyBaselineClassification() {
  return classifyPhrEntity({
    offersOrMaintainsPhr: true,
    accessesOrSendsToPhr: false,
    providesServicesToPhrEntity: false,
    hipaaCoveredForSameData: false,
    hasIdentifiableHealthData: true,
    drawsFromMultipleSources: true,
  });
}

/**
 * @param {Array<{ jurisdiction: string, affectedResidents: number }>|undefined} byJurisdiction
 * @param {number} [threshold]
 * @param {'gte'|'gt'} [mode]
 */
function jurisdictionsOverThreshold(
  byJurisdiction,
  threshold = MEDIA_NOTIFICATION_RESIDENT_THRESHOLD,
  mode = 'gte',
) {
  if (!Array.isArray(byJurisdiction) || byJurisdiction.length === 0) return [];
  return byJurisdiction.filter((row) => {
    if (!row || !Number.isFinite(row.affectedResidents)) return false;
    if (String(row.jurisdiction || '').trim().length === 0) return false;
    return mode === 'gt'
      ? row.affectedResidents > threshold
      : row.affectedResidents >= threshold;
  });
}

/**
 * @param {object} input
 * @param {string} input.discoveredOn
 * @param {number} input.affectedIndividuals
 * @param {Array<{ jurisdiction: string, affectedResidents: number }>} [input.byJurisdiction]
 * @param {boolean} [input.wasSecured]
 * @param {boolean} input.unauthorizedAcquisition
 * @param {typeof DEFAULT_BREACH_CONTACTS} [contacts]
 */
function buildBreachNotificationPlan(input, contacts = DEFAULT_BREACH_CONTACTS) {
  const reasons = [];
  // Media: ≥500 residents of a state/jurisdiction (issue #16112).
  const mediaHits = jurisdictionsOverThreshold(
    input.byJurisdiction,
    MEDIA_NOTIFICATION_RESIDENT_THRESHOLD,
    'gte',
  );
  const mediaJurisdictions = mediaHits.map((row) => row.jurisdiction);
  // FTC accelerated window: >500 residents of any state/jurisdiction.
  const ftcLargeHits = jurisdictionsOverThreshold(
    input.byJurisdiction,
    LARGE_BREACH_RESIDENT_THRESHOLD,
    'gt',
  );
  const largeByJurisdiction = ftcLargeHits.length > 0;
  const largeByTotal =
    Number.isFinite(input.affectedIndividuals) &&
    input.affectedIndividuals > LARGE_BREACH_RESIDENT_THRESHOLD;
  // Issue #16112: accelerated FTC window when >500 residents of any state/jurisdiction.
  const largeBreach = largeByJurisdiction;

  let isReportableBreach = true;
  if (!input.unauthorizedAcquisition) {
    isReportableBreach = false;
    reasons.push(
      'No unauthorized acquisition established — continue investigation; do not send HBNR notices yet.',
    );
  }
  if (input.wasSecured) {
    isReportableBreach = false;
    reasons.push(
      'Information was secured (e.g. encryption rendering data unusable/unreadable) — HBNR notice may not be required; document the determination.',
    );
  }
  if (!Number.isFinite(input.affectedIndividuals) || input.affectedIndividuals < 0) {
    throw new Error('affectedIndividuals must be a non-negative number');
  }
  if (
    input.affectedIndividuals === 0 &&
    input.unauthorizedAcquisition &&
    !input.wasSecured
  ) {
    reasons.push(
      'Zero confirmed affected individuals — contain, investigate, and reassess before notice.',
    );
    isReportableBreach = false;
  }

  if (isReportableBreach) {
    reasons.push(
      'Unauthorized acquisition of unsecured PHR-identifiable health information — HBNR notification duties apply.',
    );
  }

  const deadlines = [
    {
      audience: 'individuals',
      required: isReportableBreach,
      days: USER_NOTIFICATION_CALENDAR_DAYS,
      dayType: 'calendar',
      deadlineOn: isReportableBreach
        ? addCalendarDays(input.discoveredOn, USER_NOTIFICATION_CALENDAR_DAYS)
        : null,
      notes:
        'Notify each affected individual without unreasonable delay and no later than 60 calendar days after discovery.',
    },
    {
      audience: 'ftc',
      required: isReportableBreach,
      days: largeBreach
        ? FTC_NOTIFICATION_LARGE_BREACH_BUSINESS_DAYS
        : FTC_NOTIFICATION_DEFAULT_CALENDAR_DAYS,
      dayType: largeBreach ? 'business' : 'calendar',
      deadlineOn: isReportableBreach
        ? largeBreach
          ? addBusinessDays(input.discoveredOn, FTC_NOTIFICATION_LARGE_BREACH_BUSINESS_DAYS)
          : addCalendarDays(input.discoveredOn, FTC_NOTIFICATION_DEFAULT_CALENDAR_DAYS)
        : null,
      jurisdictions: largeBreach ? mediaJurisdictions : undefined,
      notes: largeBreach
        ? 'More than 500 residents of at least one state/jurisdiction affected — notify the FTC within 10 business days of discovery.'
        : 'Notify the FTC no later than 60 calendar days after discovery (unless the accelerated large-breach window applies).',
    },
    {
      audience: 'media',
      required: isReportableBreach && mediaJurisdictions.length > 0,
      days: USER_NOTIFICATION_CALENDAR_DAYS,
      dayType: 'calendar',
      deadlineOn:
        isReportableBreach && mediaJurisdictions.length > 0
          ? addCalendarDays(input.discoveredOn, USER_NOTIFICATION_CALENDAR_DAYS)
          : null,
      jurisdictions: mediaJurisdictions,
      notes:
        mediaJurisdictions.length > 0
          ? `Notify prominent media in: ${mediaJurisdictions.join(', ')} (≥${MEDIA_NOTIFICATION_RESIDENT_THRESHOLD} residents each).`
          : `Media notice not triggered (no state/jurisdiction with ≥${MEDIA_NOTIFICATION_RESIDENT_THRESHOLD} affected residents).`,
    },
  ];

  if (largeByTotal && !largeByJurisdiction) {
    reasons.push(
      'Total affected exceeds 500 but no single jurisdiction breakdown hit the threshold — obtain residency counts immediately; FTC accelerated window may still apply once residency is known.',
    );
  }

  return {
    isReportableBreach,
    reasons,
    largeBreach,
    mediaJurisdictions,
    deadlines,
    contacts,
    escalationPath: [
      '1. Discoverer pages on-call channel and opens incident ticket within 15 minutes.',
      '2. Security Lead confirms containment and evidence preservation within 1 hour.',
      '3. Privacy Lead opens HBNR assessment checklist and starts the discovery clock documentation.',
      '4. Legal counsel reviews reportability within 1 business day (same day if largeBreach).',
      '5. Executive owner approves individual / FTC / media notice packages before send.',
      '6. Privacy Lead files FTC notice and sends user notices; records proof of send + content.',
      '7. Post-incident review within 10 business days; update runbook and vendor controls.',
    ],
  };
}

/**
 * @param {object} fields
 * @param {string} fields.productName
 * @param {string} fields.discoveredOn
 * @param {string} fields.description
 * @param {string[]} fields.dataElements
 * @param {string[]} fields.stepsTaken
 * @param {string[]} fields.userActions
 * @param {string} fields.contactEmail
 * @param {string} [fields.noticeDate]
 */
function renderUserNotificationTemplate(fields) {
  const noticeDate = fields.noticeDate || formatIsoDate(new Date());
  const dataList = (fields.dataElements || []).map((item) => `  - ${item}`).join('\n');
  const stepsList = (fields.stepsTaken || []).map((item) => `  - ${item}`).join('\n');
  const actionsList = (fields.userActions || []).map((item) => `  - ${item}`).join('\n');

  return [
    `Subject: Important notice about your ${fields.productName} health information`,
    '',
    `Date of notice: ${noticeDate}`,
    `Date we discovered the incident: ${fields.discoveredOn}`,
    '',
    'What happened',
    String(fields.description || '').trim(),
    '',
    'What information was involved',
    dataList || '  - (list PHR-identifiable elements)',
    '',
    'What we are doing',
    stepsList || '  - (containment, investigation, notification steps)',
    '',
    'What you can do',
    actionsList || '  - (password reset, monitoring, contact us)',
    '',
    'For more information',
    `Contact our Privacy Lead at ${fields.contactEmail}.`,
    '',
    'This notice is provided in accordance with the FTC Health Breach Notification Rule (16 CFR Part 318).',
    '',
  ].join('\n');
}

/** Structured privacy-policy section confirming HBNR timelines. */
function privacyPolicyBreachSection() {
  return {
    title: 'Health information breach notification',
    body: [
      'If we experience a breach of security involving your unsecured personal health record (PHR) identifiable health information, and the FTC Health Breach Notification Rule applies, we will notify you without unreasonable delay and no later than 60 calendar days after we discover the breach.',
      'We will also notify the Federal Trade Commission. If a breach affects more than 500 residents of any state or jurisdiction, we will notify the FTC within 10 business days of discovery and notify prominent media in each such state or jurisdiction.',
      'Notices will describe what happened, the types of information involved, the steps we are taking, the steps you can take, and how to contact us.',
      `Regulatory reference: ${HBNR_CITATION}. More information: ${HBNR_FTC_URL}.`,
    ],
  };
}

/**
 * @param {string} deadlineOn
 * @param {string} todayIso
 */
function assertDeadlineNotMissed(deadlineOn, todayIso) {
  const daysRemaining = calendarDaysBetween(todayIso, deadlineOn);
  return { missed: daysRemaining < 0, daysRemaining };
}

module.exports = {
  HBNR_CITATION,
  HBNR_FTC_URL,
  USER_NOTIFICATION_CALENDAR_DAYS,
  FTC_NOTIFICATION_DEFAULT_CALENDAR_DAYS,
  FTC_NOTIFICATION_LARGE_BREACH_BUSINESS_DAYS,
  MEDIA_NOTIFICATION_RESIDENT_THRESHOLD,
  LARGE_BREACH_RESIDENT_THRESHOLD,
  DEFAULT_BREACH_CONTACTS,
  addCalendarDays,
  addBusinessDays,
  calendarDaysBetween,
  classifyPhrEntity,
  redLightTherapyBaselineClassification,
  jurisdictionsOverThreshold,
  buildBreachNotificationPlan,
  renderUserNotificationTemplate,
  privacyPolicyBreachSection,
  assertDeadlineNotMissed,
};
