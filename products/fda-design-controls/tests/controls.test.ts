/**
 * controls.test.ts — Unit tests for the FDA Design Controls data model.
 *
 * Run with:  npm test  (which runs: tsx tests/controls.test.ts)
 */

import assert from 'node:assert/strict';
import {
  DESIGN_PHASES,
  countAllItems,
  countChecked,
  phaseCompletionPct,
  buildDhfMarkdown,
  buildDhfCsv,
  type ProjectInfo,
} from '../app/data/controls';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN_PHASES structure
// ─────────────────────────────────────────────────────────────────────────────

assert.ok(DESIGN_PHASES.length > 0, 'DESIGN_PHASES must not be empty');

// All required phase IDs from 21 CFR 820.30 must be present
const expectedPhaseIds = [
  'planning',
  'input',
  'output',
  'review',
  'verification',
  'validation',
  'transfer',
  'changes',
  'dhf',
];

for (const id of expectedPhaseIds) {
  const phase = DESIGN_PHASES.find((p) => p.id === id);
  assert.ok(phase, `Phase '${id}' must exist in DESIGN_PHASES`);
  assert.ok(phase.cfr.startsWith('820.30'), `Phase '${id}' cfr must reference 820.30`);
  assert.ok(phase.items.length > 0, `Phase '${id}' must have at least one checklist item`);
}

// Every phase must have unique item IDs within itself
for (const phase of DESIGN_PHASES) {
  const ids = phase.items.map((i) => i.id);
  const unique = new Set(ids);
  assert.equal(
    ids.length,
    unique.size,
    `Phase '${phase.id}' must have unique item IDs`
  );
}

// Every item must have non-empty text and guidance
for (const phase of DESIGN_PHASES) {
  for (const item of phase.items) {
    assert.ok(
      item.text.trim().length > 0,
      `Phase '${phase.id}' item '${item.id}' must have non-empty text`
    );
    assert.ok(
      item.guidance.trim().length > 0,
      `Phase '${phase.id}' item '${item.id}' must have non-empty guidance`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// countAllItems
// ─────────────────────────────────────────────────────────────────────────────

const { total, required } = countAllItems();

assert.ok(total > 0, 'total items must be > 0');
assert.ok(required > 0, 'required items must be > 0');
assert.ok(required <= total, 'required items must not exceed total');

// Verify total matches manual count
let manualTotal = 0;
for (const phase of DESIGN_PHASES) {
  manualTotal += phase.items.length;
}
assert.equal(total, manualTotal, 'countAllItems total must match manual count');

// ─────────────────────────────────────────────────────────────────────────────
// countChecked
// ─────────────────────────────────────────────────────────────────────────────

// Empty map → 0 checked
const emptyMap = new Map<string, Set<string>>();
const emptyResult = countChecked(emptyMap);
assert.equal(emptyResult.checked, 0, 'empty map → 0 checked');
assert.equal(emptyResult.checkedRequired, 0, 'empty map → 0 checkedRequired');

// Mark all items in all phases
const allCheckedMap = new Map<string, Set<string>>();
for (const phase of DESIGN_PHASES) {
  allCheckedMap.set(phase.id, new Set(phase.items.map((i) => i.id)));
}
const allResult = countChecked(allCheckedMap);
assert.equal(allResult.checked, total, 'all checked → checked === total');
assert.equal(
  allResult.checkedRequired,
  required,
  'all checked → checkedRequired === required'
);

// Mark only one phase
const firstPhase = DESIGN_PHASES[0];
const onePhaseMap = new Map<string, Set<string>>();
onePhaseMap.set(firstPhase.id, new Set(firstPhase.items.map((i) => i.id)));
const onePhaseResult = countChecked(onePhaseMap);
assert.equal(
  onePhaseResult.checked,
  firstPhase.items.length,
  'one phase checked → checked === phase item count'
);

// ─────────────────────────────────────────────────────────────────────────────
// phaseCompletionPct
// ─────────────────────────────────────────────────────────────────────────────

const testPhase = DESIGN_PHASES[0];

assert.equal(
  phaseCompletionPct(testPhase, new Set()),
  0,
  'empty set → 0%'
);

const allItemIds = new Set(testPhase.items.map((i) => i.id));
assert.equal(
  phaseCompletionPct(testPhase, allItemIds),
  100,
  'all items → 100%'
);

// Half the items (if at least 2 items)
if (testPhase.items.length >= 2) {
  const half = new Set(testPhase.items.slice(0, Math.floor(testPhase.items.length / 2)).map((i) => i.id));
  const halfPct = phaseCompletionPct(testPhase, half);
  assert.ok(halfPct > 0 && halfPct < 100, 'half items → 0% < pct < 100%');
}

// ─────────────────────────────────────────────────────────────────────────────
// buildDhfMarkdown
// ─────────────────────────────────────────────────────────────────────────────

const sampleProject: ProjectInfo = {
  deviceName: 'CardioMonitor 3000',
  deviceVersion: '2.1',
  projectLead: 'Jane Smith, RA',
  intendedUse: 'Continuous ECG monitoring for ICU patients',
  deviceClass: 'Class II',
  startDate: '2024-01-15',
  targetDate: '2025-06-30',
};

// Empty checklist
const mdEmpty = buildDhfMarkdown(sampleProject, new Map());
assert.ok(
  mdEmpty.includes('# Design History File Summary — CardioMonitor 3000'),
  'markdown must include device name H1'
);
assert.ok(mdEmpty.includes('**Version:** 2.1'), 'markdown must include version');
assert.ok(mdEmpty.includes('**Device Class:** Class II'), 'markdown must include device class');
assert.ok(mdEmpty.includes('21 CFR 820.30'), 'markdown must reference CFR');
assert.ok(mdEmpty.includes('820.30(a)'), 'markdown must include planning phase cfr');

// All phases should appear
for (const phase of DESIGN_PHASES) {
  assert.ok(
    mdEmpty.includes(phase.title),
    `markdown must include phase title '${phase.title}'`
  );
}

// Full checklist
const mdFull = buildDhfMarkdown(sampleProject, allCheckedMap);
assert.ok(mdFull.includes('[x]'), 'full checklist markdown must contain [x] items');
assert.ok(
  (mdFull.match(/\[x\]/g) ?? []).length === total,
  'full checklist must have all items checked'
);

// ─────────────────────────────────────────────────────────────────────────────
// buildDhfCsv
// ─────────────────────────────────────────────────────────────────────────────

const csvEmpty = buildDhfCsv(sampleProject, new Map());

// Split on the blank line that separates the checklist section from the footer
const [checklistSection] = csvEmpty.split('\n\n');
const csvLines = checklistSection.split('\n');

// Must have a header row
assert.ok(
  csvLines[0].includes('"Phase"'),
  'CSV must start with Phase header'
);
assert.ok(csvLines[0].includes('"CFR"'), 'CSV must include CFR column');
assert.ok(csvLines[0].includes('"Required"'), 'CSV must include Required column');
assert.ok(csvLines[0].includes('"Completed"'), 'CSV must include Completed column');

// Data rows (one per item, skip header)
const dataRows = csvLines.slice(1).filter((l) => l.trim() !== '');
assert.equal(dataRows.length, total, `CSV must have ${total} data rows`);

// All rows should have "No" for Completed when map is empty
for (const row of dataRows) {
  assert.ok(row.includes('"No"'), `Every data row in empty map must show Completed="No"`);
}

// Full checklist CSV should show "Yes" for Completed
const csvFull = buildDhfCsv(sampleProject, allCheckedMap);
const [fullChecklistSection] = csvFull.split('\n\n');
const fullDataRows = fullChecklistSection.split('\n').slice(1).filter((l) => l.trim() !== '');
for (const row of fullDataRows) {
  assert.ok(row.includes('"Yes"'), `Every data row in full map must show Completed="Yes"`);
}

// Project metadata footer must be present in CSV
assert.ok(csvEmpty.includes('"CardioMonitor 3000"'), 'CSV must include device name in footer');
assert.ok(csvEmpty.includes('"Class II"'), 'CSV must include device class in footer');

// ─────────────────────────────────────────────────────────────────────────────
console.log(`✅ All FDA Design Controls tests passed (${total} items across ${DESIGN_PHASES.length} phases)`);
