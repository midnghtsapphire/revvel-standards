// AG-UI wire format helpers + RFC 6902 JSON Patch subset.
//
// Event names and payload fields follow the open AG-UI event standard
// (https://docs.ag-ui.com/concepts/events): RUN_STARTED, TEXT_MESSAGE_START,
// TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END, STATE_SNAPSHOT, STATE_DELTA
// (a JSON Patch array), RUN_FINISHED, RUN_ERROR. Transport is Server-Sent
// Events, one JSON event per `data:` frame, exactly as AG-UI's HTTP binding.
//
// This module is shared: the server imports it, and the demo page loads it
// in the browser (served at /agui.js), so tests exercise the same code the
// page runs.

export const EventType = Object.freeze({
  RUN_STARTED: 'RUN_STARTED',
  TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  STATE_DELTA: 'STATE_DELTA',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
});

/** Encode one AG-UI event as an SSE frame. */
export function encodeSSE(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Incremental SSE parser. Feed it text chunks as they arrive; it returns the
 * complete events seen so far and keeps any partial frame for the next chunk.
 */
export function createSSEParser() {
  let buffer = '';
  return {
    push(chunk) {
      buffer += chunk;
      const events = [];
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n');
        if (data) events.push(JSON.parse(data));
      }
      return events;
    },
  };
}

// ---- JSON Patch (RFC 6902): add / replace / remove --------------------------

const unescapePointer = (s) => s.replace(/~1/g, '/').replace(/~0/g, '~');
const escapePointer = (s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1');
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function parsePointer(path) {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error(`bad JSON pointer: ${path}`);
  return path.slice(1).split('/').map(unescapePointer);
}

/** Apply a JSON Patch to `doc`; returns a new document (input is not mutated). */
export function applyPatch(doc, patch) {
  let root = clone(doc);
  for (const op of patch) {
    const keys = parsePointer(op.path);
    if (keys.length === 0) {
      if (op.op === 'add' || op.op === 'replace') { root = clone(op.value); continue; }
      throw new Error(`unsupported root op: ${op.op}`);
    }
    let parent = root;
    for (const k of keys.slice(0, -1)) {
      if (parent === null || typeof parent !== 'object' || !(k in parent)) {
        throw new Error(`patch path not found: ${op.path}`);
      }
      parent = parent[k];
    }
    const last = keys[keys.length - 1];
    if (Array.isArray(parent)) {
      const i = last === '-' ? parent.length : Number(last);
      if (!Number.isInteger(i) || i < 0 || i > parent.length) throw new Error(`bad index: ${op.path}`);
      if (op.op === 'add') parent.splice(i, 0, clone(op.value));
      else if (op.op === 'replace') parent[i] = clone(op.value);
      else if (op.op === 'remove') parent.splice(i, 1);
      else throw new Error(`unsupported op: ${op.op}`);
    } else if (parent !== null && typeof parent === 'object') {
      if (op.op === 'add' || op.op === 'replace') parent[last] = clone(op.value);
      else if (op.op === 'remove') delete parent[last];
      else throw new Error(`unsupported op: ${op.op}`);
    } else {
      throw new Error(`patch path not found: ${op.path}`);
    }
  }
  return root;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Top-level diff of two state objects into a JSON Patch. Arrays that only
 * grew (prev is a prefix of next) become `add /key/-` appends so long
 * histories stay cheap on the wire.
 */
export function diffState(prev, next) {
  const patch = [];
  for (const key of Object.keys(next)) {
    const p = `/${escapePointer(key)}`;
    if (!(key in prev)) {
      patch.push({ op: 'add', path: p, value: next[key] });
    } else if (!same(prev[key], next[key])) {
      const a = prev[key];
      const b = next[key];
      if (Array.isArray(a) && Array.isArray(b) && b.length > a.length && same(a, b.slice(0, a.length))) {
        for (const item of b.slice(a.length)) patch.push({ op: 'add', path: `${p}/-`, value: item });
      } else {
        patch.push({ op: 'replace', path: p, value: next[key] });
      }
    }
  }
  for (const key of Object.keys(prev)) {
    if (!(key in next)) patch.push({ op: 'remove', path: `/${escapePointer(key)}` });
  }
  return patch;
}

/** Client-side reducer: fold an AG-UI event into {state, messages, status}. */
export function reduceEvent(view, event) {
  const next = { ...view };
  switch (event.type) {
    case EventType.RUN_STARTED: next.status = 'running'; next.runId = event.runId; break;
    case EventType.STATE_SNAPSHOT: next.state = clone(event.snapshot); break;
    case EventType.STATE_DELTA: next.state = applyPatch(view.state ?? {}, event.delta); break;
    case EventType.TEXT_MESSAGE_START:
      next.messages = [...(view.messages ?? []), { id: event.messageId, role: event.role, text: '' }];
      break;
    case EventType.TEXT_MESSAGE_CONTENT:
      next.messages = (view.messages ?? []).map((m) => (m.id === event.messageId ? { ...m, text: m.text + event.delta } : m));
      break;
    case EventType.RUN_FINISHED: next.status = 'finished'; break;
    case EventType.RUN_ERROR: next.status = 'error'; next.error = event.message; break;
    default: break;
  }
  return next;
}
