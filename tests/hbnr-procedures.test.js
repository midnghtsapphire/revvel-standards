'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const hbnr = require('../scripts/hbnr-procedures');

const ROOT = path.join(__dirname, '..');
const PRODUCT = path.join(ROOT, 'products', 'red-light-therapy-dosage-calculator');

describe('HBNR procedures module', () => {
  it('exports FTC timeline constants matching issue #16112', () => {
    assert.equal(hbnr.USER_NOTIFICATION_CALENDAR_DAYS, 60);
    assert.equal(hbnr.FTC_NOTIFICATION_DEFAULT_CALENDAR_DAYS, 60);
    assert.equal(hbnr.FTC_NOTIFICATION_LARGE_BREACH_BUSINESS_DAYS, 10);
    assert.equal(hbnr.MEDIA_NOTIFICATION_RESIDENT_THRESHOLD, 500);
    assert.match(hbnr.HBNR_CITATION, /16 CFR Part 318/);
  });

  it('classifies red light therapy baseline as PHR vendor in HBNR scope', () => {
    const result = hbnr.redLightTherapyBaselineClassification();
    assert.equal(result.role, 'phr_vendor');
    assert.equal(result.applicability, 'applies');
    assert.equal(result.requiresBreachProcedures, true);
    assert.match(result.linkedPiaIssue, /16110/);
  });

  it('excludes HIPAA-covered entities from HBNR', () => {
    const result = hbnr.classifyPhrEntity({
      offersOrMaintainsPhr: true,
      accessesOrSendsToPhr: false,
      providesServicesToPhrEntity: false,
      hipaaCoveredForSameData: true,
      hasIdentifiableHealthData: true,
      drawsFromMultipleSources: true,
    });
    assert.equal(result.applicability, 'does_not_apply_hipaa');
    assert.equal(result.requiresBreachProcedures, false);
  });

  it('requires counsel review when identifiable health data lacks confirmed multi-source PHR facts', () => {
    const result = hbnr.classifyPhrEntity({
      offersOrMaintainsPhr: false,
      accessesOrSendsToPhr: false,
      providesServicesToPhrEntity: false,
      hipaaCoveredForSameData: false,
      hasIdentifiableHealthData: true,
      drawsFromMultipleSources: false,
    });
    assert.equal(result.applicability, 'needs_counsel_review');
    assert.equal(result.requiresBreachProcedures, true);
  });

  it('computes individual + FTC calendar deadlines for small breaches', () => {
    const plan = hbnr.buildBreachNotificationPlan({
      discoveredOn: '2026-08-03', // Monday
      affectedIndividuals: 42,
      unauthorizedAcquisition: true,
      wasSecured: false,
      byJurisdiction: [{ jurisdiction: 'Oregon', affectedResidents: 42 }],
    });

    assert.equal(plan.isReportableBreach, true);
    assert.equal(plan.largeBreach, false);
    assert.deepEqual(plan.mediaJurisdictions, []);

    const individuals = plan.deadlines.find((d) => d.audience === 'individuals');
    const ftc = plan.deadlines.find((d) => d.audience === 'ftc');
    const media = plan.deadlines.find((d) => d.audience === 'media');

    assert.equal(individuals.required, true);
    assert.equal(individuals.deadlineOn, '2026-10-02');
    assert.equal(ftc.required, true);
    assert.equal(ftc.dayType, 'calendar');
    assert.equal(ftc.deadlineOn, '2026-10-02');
    assert.equal(media.required, false);
  });

  it('accelerates FTC notice and requires media notice when ≥500 residents in a state', () => {
    // discovered Friday 2026-08-07; 10 business days → 2026-08-21
    const plan = hbnr.buildBreachNotificationPlan({
      discoveredOn: '2026-08-07',
      affectedIndividuals: 1200,
      unauthorizedAcquisition: true,
      byJurisdiction: [
        { jurisdiction: 'California', affectedResidents: 650 },
        { jurisdiction: 'Nevada', affectedResidents: 100 },
      ],
    });

    assert.equal(plan.largeBreach, true);
    assert.deepEqual(plan.mediaJurisdictions, ['California']);

    const ftc = plan.deadlines.find((d) => d.audience === 'ftc');
    const media = plan.deadlines.find((d) => d.audience === 'media');

    assert.equal(ftc.dayType, 'business');
    assert.equal(ftc.days, 10);
    assert.equal(ftc.deadlineOn, '2026-08-21');
    assert.equal(media.required, true);
    assert.deepEqual(media.jurisdictions, ['California']);
  });

  it('skips notice when data was secured or acquisition not established', () => {
    const secured = hbnr.buildBreachNotificationPlan({
      discoveredOn: '2026-08-01',
      affectedIndividuals: 900,
      unauthorizedAcquisition: true,
      wasSecured: true,
      byJurisdiction: [{ jurisdiction: 'Texas', affectedResidents: 900 }],
    });
    assert.equal(secured.isReportableBreach, false);

    const unconfirmed = hbnr.buildBreachNotificationPlan({
      discoveredOn: '2026-08-01',
      affectedIndividuals: 10,
      unauthorizedAcquisition: false,
    });
    assert.equal(unconfirmed.isReportableBreach, false);
  });

  it('renders a user notification template with required content elements', () => {
    const body = hbnr.renderUserNotificationTemplate({
      productName: 'Red Light Therapy Dosage Calculator',
      discoveredOn: '2026-08-01',
      noticeDate: '2026-08-05',
      description: 'An unauthorized party accessed a backup containing session logs.',
      dataElements: ['email', 'session logs', 'symptom notes'],
      stepsTaken: ['Revoked credentials', 'Forced password reset'],
      userActions: ['Reset your password', 'Watch for phishing'],
      contactEmail: 'privacy@revvel.io',
    });

    assert.match(body, /What happened/);
    assert.match(body, /What information was involved/);
    assert.match(body, /session logs/);
    assert.match(body, /16 CFR Part 318/);
    assert.match(body, /privacy@revvel\.io/);
  });

  it('privacy policy section states 60-day user and 10-business-day FTC large-breach windows', () => {
    const section = hbnr.privacyPolicyBreachSection();
    const text = section.body.join(' ');
    assert.match(text, /60 calendar days/);
    assert.match(text, /10 business days/);
    assert.match(text, /500 residents/);
    assert.match(text, /Federal Trade Commission/);
  });

  it('addBusinessDays skips weekends', () => {
    // Friday + 1 business day = Monday
    assert.equal(hbnr.addBusinessDays('2026-08-07', 1), '2026-08-10');
    assert.equal(hbnr.addCalendarDays('2026-08-07', 1), '2026-08-08');
  });

  it('escalation path and contacts are populated', () => {
    const plan = hbnr.buildBreachNotificationPlan({
      discoveredOn: '2026-08-01',
      affectedIndividuals: 1,
      unauthorizedAcquisition: true,
    });
    assert.ok(plan.escalationPath.length >= 5);
    assert.match(plan.contacts.privacyLead, /privacy@revvel\.io/);
    assert.match(plan.contacts.onCallChannel, /incident-response/);
  });
});

describe('HBNR product compliance artifacts', () => {
  const requiredFiles = [
    path.join(PRODUCT, 'compliance', 'hbnr-entity-classification.md'),
    path.join(PRODUCT, 'compliance', 'breach-notification-runbook.md'),
    path.join(PRODUCT, 'PRIVACY.md'),
    path.join(PRODUCT, 'app', 'privacy', 'page.tsx'),
    path.join(ROOT, 'docs', 'runbooks', 'red-light-therapy-dosage-calculator.md'),
  ];

  it('ships classification, runbook, privacy policy, privacy page, and ops runbook', () => {
    for (const file of requiredFiles) {
      assert.ok(fs.existsSync(file), `missing required artifact: ${file}`);
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(text.trim().length > 200, `artifact too short: ${file}`);
    }
  });

  it('breach runbook covers discovery, assessment, user/FTC/media notice', () => {
    const runbook = fs.readFileSync(
      path.join(PRODUCT, 'compliance', 'breach-notification-runbook.md'),
      'utf8',
    );
    assert.match(runbook, /discovery/i);
    assert.match(runbook, /assessment/i);
    assert.match(runbook, /60 calendar days/i);
    assert.match(runbook, /10 business days/i);
    assert.match(runbook, /500/);
    assert.match(runbook, /FTC/i);
    assert.match(runbook, /media/i);
    assert.match(runbook, /What happened/);
  });

  it('ops runbook lists breach contacts and escalation path', () => {
    const ops = fs.readFileSync(
      path.join(ROOT, 'docs', 'runbooks', 'red-light-therapy-dosage-calculator.md'),
      'utf8',
    );
    assert.match(ops, /privacy@revvel\.io/);
    assert.match(ops, /security@revvel\.io/);
    assert.match(ops, /escalation/i);
    assert.match(ops, /HBNR|Health Breach Notification/i);
  });

  it('privacy policy confirms notification timelines', () => {
    const privacy = fs.readFileSync(path.join(PRODUCT, 'PRIVACY.md'), 'utf8');
    assert.match(privacy, /60 calendar days/i);
    assert.match(privacy, /10 business days/i);
    assert.match(privacy, /Federal Trade Commission|FTC/);
    assert.match(privacy, /500/);
  });

  it('entity classification documents PHR vendor determination and PIA link', () => {
    const classification = fs.readFileSync(
      path.join(PRODUCT, 'compliance', 'hbnr-entity-classification.md'),
      'utf8',
    );
    assert.match(classification, /PHR vendor|vendor of personal health records/i);
    assert.match(classification, /16110/);
    assert.match(classification, /HBNR|16 CFR Part 318/);
  });
});
