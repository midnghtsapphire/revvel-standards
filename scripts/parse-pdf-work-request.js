'use strict';

/**
 * Parse GitHub Work Request issue bodies for sellable-pdf routing.
 * Mirrors heading logic used by .github/workflows/wr-auto-classify.yml
 * (### Label with optional " (required)" suffix).
 */

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSection(body, label) {
  if (!body || typeof body !== 'string') return null;
  const re = new RegExp(
    `(?:^|\\n)###\\s+${escapeRegex(label)}(?:\\s*\\([^)]*\\))?\\s*\\n+([\\s\\S]*?)(?=\\n###|\\n*$)`,
    'm'
  );
  const m = body.match(re);
  if (!m) return null;
  let chunk = m[1].trim();
  if (!chunk || /^_?no response_?$/i.test(chunk)) return null;
  const firstLine = chunk
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean);
  return firstLine || null;
}

const BATCH_VALUES = new Set(['Not applicable', 'Autocreate 3', 'Autocreate 20']);

/**
 * @param {string} body Issue body (markdown from GitHub).
 * @param {{ forceSellablePdf?: boolean }} [opts] Set when `output-type:sellable-pdf` label is present but body omits dropdown.
 * @returns {{
 *   isSellablePdf: boolean,
 *   outputType: string | null,
 *   pdfPipelineBatch: string | null,
 *   autocreateCount: number | null,
 *   validBatch: boolean
 * }}
 */
function parsePdfWorkRequest(body, opts = {}) {
  const out = {
    isSellablePdf: false,
    outputType: null,
    pdfPipelineBatch: null,
    autocreateCount: null,
    validBatch: false,
  };

  const ot = parseSection(body, 'Output Type');
  if (ot) out.outputType = ot;

  if (ot === 'sellable-pdf' || opts.forceSellablePdf) {
    out.isSellablePdf = true;
  }

  const batch = parseSection(body, 'PDF pipeline batch');
  if (batch) out.pdfPipelineBatch = batch;

  if (batch && BATCH_VALUES.has(batch)) {
    out.validBatch = true;
    if (batch === 'Not applicable') out.autocreateCount = 1;
    else if (batch === 'Autocreate 3') out.autocreateCount = 3;
    else if (batch === 'Autocreate 20') out.autocreateCount = 20;
  }

  return out;
}

module.exports = { parsePdfWorkRequest, parseSection, BATCH_VALUES };

if (require.main === module) {
  const body = process.env.ISSUE_BODY || '';
  const force = process.env.FORCE_SELLABLE_PDF === 'true';
  const result = parsePdfWorkRequest(body, { forceSellablePdf: force });
  process.stdout.write(JSON.stringify(result));
}
