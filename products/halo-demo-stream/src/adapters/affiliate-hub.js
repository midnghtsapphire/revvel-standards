// affiliate-hub adapter: the "agent" is the product's own catalogue and
// filter/sort code (products/affiliate-hub/app/lib/programs.mjs), the same
// module app/page.tsx renders from. Nothing here is canned: every result is
// computed by that code at request time. It is a rule-based agent, not an
// LLM; an LLM-backed agent can replace run() later without changing the
// AG-UI/session plumbing.

import { affiliatePrograms, filterAndSortPrograms } from '../../../affiliate-hub/app/lib/programs.mjs';

const TYPES = new Set(['all', 'recurring', 'one-time', 'hybrid']);
const SORTS = new Set(['name', 'ltv']);

export const id = 'affiliate-hub';

export function initialState() {
  return {
    product: id,
    catalogueSize: affiliatePrograms.length,
    query: { searchTerm: '', filterType: 'all', sortBy: 'ltv' },
    results: [],
    runs: 0,
    lastDevice: null,
    history: [],
  };
}

export function normalizeQuery(raw = {}) {
  const searchTerm = typeof raw.searchTerm === 'string' ? raw.searchTerm.slice(0, 80) : '';
  const filterType = TYPES.has(raw.filterType) ? raw.filterType : 'all';
  const sortBy = SORTS.has(raw.sortBy) ? raw.sortBy : 'ltv';
  return { searchTerm, filterType, sortBy };
}

/**
 * Run the agent. Yields {text} chunks for the streamed assistant message and
 * finishes with {state}, the next committed state.
 */
export async function* run({ state, query, deviceId }) {
  const q = normalizeQuery(query);
  yield { text: `Searching ${affiliatePrograms.length} affiliate programs` };
  yield { text: ` for "${q.searchTerm}", type ${q.filterType}, sorted by ${q.sortBy}.\n` };
  const matches = filterAndSortPrograms(q);
  if (matches.length === 0) yield { text: 'No programs match. Try a broader search.\n' };
  for (const [i, p] of matches.entries()) {
    yield { text: `${i + 1}. ${p.name}: ${p.commission} (${p.type}, LTV ${p.ltv}, cookie ${p.cookieWindow})\n` };
  }
  yield { text: `Found ${matches.length} of ${affiliatePrograms.length} programs.` };
  const results = matches.map((p) => ({ name: p.name, type: p.type, commission: p.commission, ltv: p.ltv }));
  const runs = state.runs + 1;
  yield {
    state: {
      ...state,
      query: q,
      results,
      runs,
      lastDevice: deviceId,
      history: [...state.history, { run: runs, device: deviceId, query: q, count: results.length }],
    },
  };
}
