#!/usr/bin/env node
// ============================================================
// OPENROUTER BACKUP CODE REVIEWER
// ============================================================
// Invoked when the primary autonomous reviewer (RecurseML) fails.
// Reads a unified diff from the file path given as argv[2] (or
// $REVIEW_DIFF_FILE), asks OpenRouter for a concise review, and
// appends the result to $GITHUB_STEP_SUMMARY.
//
// Best-effort by design: it never exits non-zero, so a backup-review
// outage cannot itself block the pipeline. Wiring lives in
// .github/workflows/recurse-ml.yml (job: openrouter-fallback).
// ============================================================
'use strict';

const fs = require('fs');
const { callOpenRouter } = require('./openrouter-routing.js');

// Explicit model list so the backup does not depend on a routing profile
// existing. Ordered best-first; callOpenRouter falls through on failure.
const MODELS = ['anthropic/claude-sonnet-4', 'openai/gpt-5.2-codex'];
const MAX_DIFF_CHARS = 60000;

function summary(md) {
  const out = process.env.GITHUB_STEP_SUMMARY;
  if (out) {
    try { fs.appendFileSync(out, md + '\n'); } catch (_) { /* best-effort */ }
  }
  console.log(md);
}

(async () => {
  const diffFile = process.argv[2] || process.env.REVIEW_DIFF_FILE;
  let diff = '';
  try { diff = diffFile ? fs.readFileSync(diffFile, 'utf8') : ''; } catch (_) { diff = ''; }
  diff = diff.slice(0, MAX_DIFF_CHARS);

  if (!diff.trim()) {
    summary('## 🤖 OpenRouter Backup Review\n\n_No diff to review._');
    return;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    summary('## 🤖 OpenRouter Backup Review\n\n⚠️ RecurseML failed and `OPENROUTER_API_KEY` is not configured, so the backup review could not run.');
    return;
  }

  try {
    const res = await callOpenRouter({
      models: MODELS,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior code reviewer acting as the BACKUP reviewer because ' +
            'RecurseML (the primary autonomous reviewer) failed. Review the diff for ' +
            'bugs, security issues, and correctness regressions. Be concise. List ' +
            'concrete findings with file/line where possible; if it looks clean, say so.',
        },
        { role: 'user', content: 'Review this unified diff:\n\n' + diff },
      ],
    });
    const model = res.model || MODELS.join(', ');
    summary(
      '## 🤖 OpenRouter Backup Review (RecurseML fallback)\n\n' +
        '> Primary reviewer RecurseML failed; this review was produced by OpenRouter (' + model + ').\n\n' +
        res.text
    );
  } catch (e) {
    summary(
      '## 🤖 OpenRouter Backup Review\n\n❌ The OpenRouter backup review also failed: `' +
        e.message + '`. Manual review recommended.'
    );
  }
})();
