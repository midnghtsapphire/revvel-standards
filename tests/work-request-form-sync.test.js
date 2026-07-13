// Sync-audit test for the WR auto-classify workflow.
//
// History: on 2026-07-08 an interleave-damage incident (see CLAUDE.md gotcha #5)
// duplicated function definitions and left a body-less `def` in the embedded
// Python payload of .github/workflows/wr-auto-classify.yml. This test file
// previously pinned assertions to the *broken* duplicate strings; those 4
// assertions have been updated to check the reconciled implementation instead.

const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(
  __dirname,
  '..',
  '.github',
  'workflows',
  'wr-auto-classify.yml'
);

function readWorkflow() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

describe('wr-auto-classify.yml embedded Python payload', () => {
  const content = readWorkflow();

  test('defines exactly one infer_output_type_from_title_tags', () => {
    const matches = content.match(/def\s+infer_output_type_from_title_tags\s*\(/g) || [];
    expect(matches.length).toBe(1);
  });

  test('does not redeclare deprecated title-inference helpers', () => {
    // These duplicate/dead functions were removed as part of the interleave reconcile.
    expect(content).not.toMatch(/def\s+infer_output_type_from_title\s*\(/);
    expect(content).not.toMatch(/def\s+infer_title_output_type\s*\(/);
  });

  test('defines exactly one fields_needing_classification with explicit second parameter', () => {
    const matches =
      content.match(/def\s+fields_needing_classification\s*\([^)]*\)/g) || [];
    expect(matches.length).toBe(1);
    expect(matches[0]).toMatch(/fields_needing_classification\(parsed,\s*title_output_type\)/);
  });

  test('uses the reconciled single-variable name in the main flow', () => {
    // The reconciled main() uses `title_output_type` end-to-end; the drifting
    // shadowing variants from the interleave incident must not reappear.
    expect(content).toMatch(/title_output_type\s*=\s*infer_output_type_from_title_tags\(title\)/);
    expect(content).not.toMatch(/title_inferred_output_type\s*=/);
    expect(content).not.toMatch(/title_hint_used/);
  });

  test('merge precedence chain has an owning if (no stray elif)', () => {
    // The pre-fix payload had a bare `elif field == "Output Type" and title_output_type in allowed:`
    // with no owning if. The reconciled chain must lead with `if explicit:`.
    expect(content).toMatch(/if\s+explicit\s*:/);
    expect(content).toMatch(/elif\s+field\s*==\s*"Output Type"\s+and\s+title_output_type\s+in\s+ALLOWED_OUTPUT_TYPES\s*:/);
  });

  test('source-legend comment reflects reconciled tier names', () => {
    // The now-nonexistent `title-hint` tier (a duplicate of `title-tag`) must not appear.
    expect(content).not.toMatch(/title-hint\s*=\s*inferred from title tags/);
    expect(content).toMatch(/title-tag\s*=\s*inferred from `#tag` in title/);
    expect(content).toMatch(/classifier\s*=\s*OpenRouter classifier output/);
    expect(content).toMatch(/fallback\s*=\s*opinionated default/);
  });

  test('title-tag output-type mapping stays in sync with the documented full set', () => {
    // Sanity check that the 13-tag mapping from openrouter-auto-route.yml is present.
    const requiredTags = [
      '#research',
      '#report',
      '#brief',
      '#tool',
      '#cli',
      '#lib',
      '#library',
      '#doc',
      '#docs',
      '#spec',
      '#api',
      '#service',
      '#dataset',
    ];
    for (const tag of requiredTags) {
      expect(content).toContain(`"${tag}"`);
    }
  });
});
