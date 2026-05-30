const fs = require('fs');
const filepath = 'wr/issues/issue-14008-fix-orphaned-pipe-row-breaking-competitor-comparis.md';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Remove advanced template header boilerplate
content = content.replace(/# ─────────────────────────────────────────────────────────────────────────────[\s\S]*?---\n+/, '');

// 2. Set Status to Complete
content = content.replace(/\*\*WR Status:\*\* 🟡 In Progress/, '**WR Status:** ✅ Complete');
content = content.replace(/\*\*Research Status:\*\* ✅ Complete \/ 🟡 In Progress \/ ⭕ Not Started/, '**Research Status:** ✅ Complete');

// 3. Extract the description text for summary and remove it from Metadata table
const descriptionMatch = content.match(/\| Description \| (## Summary[\s\S]*?) \|\n\| Private/);
let descriptionText = '';
if (descriptionMatch) {
  descriptionText = descriptionMatch[1];
  // clean it from the table
  content = content.replace(descriptionMatch[1], '[Detailed description moved to Executive Summary]');
}

// 4. Update Executive Summary
const execSummary = `## Executive Summary\n\nA stray Markdown table row in the competitor comparison section of the Boberdoo evaluation document (issue-13755) is separated from its parent table by a blank line, causing it to render as orphaned plain text. This document outlines the required fix to remove the blank line and restore proper table structure.`;
content = content.replace(/## Executive Summary\n\n\[2-3 sentence summary of repository purpose, current state, and key recommendations\]/, execSummary);

// 5. Add tasks to Immediate Actions (P0)
const actions = `## Recommendations\n\n### Immediate Actions (P0)\n\n1. **Fix orphaned table row**\n   - **Why:** Restores visual consistency and readability of the competitor comparison table.\n   - **How:** In \`wr/issues/issue-13755-evaluate-and-research-and-implement-boberdoo-for-l.md\`, navigate to line 196. Remove the blank line separating the \`| **This Engine** |\` row from the competitor table block above it.\n   - **Effort:** 10 minutes\n   - **Revenue Impact:** N/A (formatting fix)`;
content = content.replace(/## Recommendations\n\n### Immediate Actions \(P0\)[\s\S]*?## Short-Term Actions \(P1\) - Within 1-2 Weeks/, actions + '\n\n### Short-Term Actions (P1) - Within 1-2 Weeks');

// 6. Add tasks to Implementation Tasks Created
const tasks = `### Implementation Tasks Created\n\n**Issues Created:**\n\n1. [Issue #14008]: Fix orphaned pipe row breaking competitor comparison table structure - [P0]`;
content = content.replace(/### Implementation Tasks Created\n\n\*\*Issues Created:\*\*\n\n1\. \[Issue #X\]: \[Title\] - \[Priority\]\n2\. \[Issue #Y\]: \[Title\] - \[Priority\]/, tasks);


// Remove placeholders and unfilled sections
content = content.replace(/\[Count\]/g, '0');
content = content.replace(/\[Count and notable ones\]/g, 'None');
content = content.replace(/\[Count and critical ones\]/g, 'None');
content = content.replace(/\[Type and provider\]/g, 'N/A');
content = content.replace(/\[Platform\]/g, 'N/A');
content = content.replace(/\[Tooling\]/g, 'N/A');
content = content.replace(/\[Framework\/libraries\]/g, 'N/A');

fs.writeFileSync(filepath, content, 'utf8');
