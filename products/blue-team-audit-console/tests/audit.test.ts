/**
 * audit.test.ts — domain tests for blue-team audit model + export.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import {
  addNote,
  buildAuditModel,
  coverageOf,
  createGroup,
  filterEvents,
  markVisited,
  renderAuditMarkdown,
  serializeAuditFiles,
  suspicionLabel,
  tagEvent,
  toggleFlag,
} from '../app/lib/audit';
import { emptyOverlay } from '../app/lib/types';
import { DEMO_TRACES, getTrace, listTraceSummaries } from '../app/data/demo-traces';

const trace = DEMO_TRACES[0];
assert.ok(trace, 'demo trace 0 must exist');
assert.ok(trace.events.length >= 8, 'scaffold session should have multiple events');
assert.ok(getTrace(trace.meta.name), 'getTrace resolves by name');
assert.equal(listTraceSummaries().length, DEMO_TRACES.length);

// empty overlay → empty commits in model (nothing flagged/noted)
let overlay = emptyOverlay();
let model = buildAuditModel(trace, overlay, 'auditor@revvel.local');
assert.equal(model.schema_version, 2);
assert.equal(model.source, 'auditor');
assert.equal(model.trace, trace.meta.name);
assert.equal(model.commits.length, 0);
assert.equal(model.session.commit_count, trace.events.length);
assert.equal(model.session.flag_count, 0);
assert.equal(model.coverage.total, trace.events.length);
assert.equal(model.coverage.visited, 0);

// flag + note + visit
const suspect = trace.events.find((e) => e.id === 'ev_007');
assert.ok(suspect, 'expected high-suspicion event ev_007');
overlay = toggleFlag(overlay, suspect.id);
overlay = addNote(overlay, suspect.id, 'Auth bypass comment is a security regression', 'auditor@revvel.local');
overlay = markVisited(overlay, suspect.id);
overlay = markVisited(overlay, 'ev_001');

model = buildAuditModel(trace, overlay, 'auditor@revvel.local');
assert.equal(model.commits.length, 1);
assert.equal(model.commits[0].event_id, 'ev_007');
assert.equal(model.commits[0].flagged, true);
assert.equal(model.commits[0].target_key, 'commit:ev_007');
assert.equal(model.commits[0].notes.length, 1);
assert.match(model.commits[0].notes[0].text, /security regression/i);
assert.equal(model.session.flag_count, 1);
assert.equal(model.session.note_count, 1);
assert.equal(coverageOf(trace, overlay).visited, 2);

// groups + tags
const created = createGroup(overlay, 'Auth churn', '#f87171');
overlay = created.overlay;
overlay = tagEvent(overlay, suspect.id, created.groupId);
model = buildAuditModel(trace, overlay, 'auditor@revvel.local');
assert.equal(model.userGroups.length, 1);
assert.equal(model.commits[0].tagged_group_names[0], 'Auth churn');

// markdown export
const md = renderAuditMarkdown(model, '2026-08-08T00:00:00.000Z');
assert.match(md, /# Audit notes/);
assert.match(md, /Flagged/);
assert.match(md, /ev_007|middleware|security/i);
assert.match(md, /Coverage: 2\/\d+/);

// file bundle greenfield shape
const files = serializeAuditFiles(model);
for (const key of [
  'manifest.json',
  'items/commits.jsonl',
  'items/threads.jsonl',
  'items/areas.jsonl',
  'groups/user_groups.jsonl',
  'status/dismissals.jsonl',
  'status/coverage.json',
  'AI_AUDIT.md',
]) {
  assert.ok(key in files, `bundle missing ${key}`);
}
// Populated artifacts when commits/groups exist; empty JSONL is valid for unused kinds.
assert.ok(files['manifest.json'].length > 0);
assert.ok(files['items/commits.jsonl'].length > 0);
assert.ok(files['groups/user_groups.jsonl'].length > 0);
assert.ok(files['AI_AUDIT.md'].length > 0);
assert.ok(files['status/coverage.json'].length > 0);
const manifest = JSON.parse(files['manifest.json']);
assert.equal(manifest.schema_version, 2);
assert.equal(manifest.counts.commits, 1);

// filter helpers
const suspects = filterEvents(trace, { suspectsOnly: true, overlay });
assert.ok(suspects.some((e) => e.id === 'ev_007'));
const bashOnly = filterEvents(trace, { kind: 'bash' });
assert.ok(bashOnly.every((e) => e.kind === 'bash'));
const q = filterEvents(trace, { query: 'middleware' });
assert.ok(q.length >= 1);

assert.equal(suspicionLabel(0.92), 'high');
assert.equal(suspicionLabel(0.5), 'medium');
assert.equal(suspicionLabel(0.1), 'clear');
assert.equal(suspicionLabel(null), 'none');

// toggle off
overlay = toggleFlag(overlay, suspect.id);
model = buildAuditModel(trace, overlay);
// still present because note + tag remain
assert.equal(model.commits.length, 1);
assert.equal(model.commits[0].flagged, false);

console.log('audit.test.ts: ok');
