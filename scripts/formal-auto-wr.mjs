#!/usr/bin/env node
/**
 * formal-auto-wr.mjs
 * Reads a formal-report.json (dual-path XOR) and emits:
 *  - WR markdown under wr/pending/formal/
 *  - Optional GitHub issue/PR creation when --apply and GH_TOKEN set
 *
 * Never merges. Always human-review-required.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPORT =
  process.env.FORMAL_REPORT ||
  path.join(process.cwd(), "artifacts/formal-report.json");
const OUT_DIR =
  process.env.WR_OUT || path.join(process.cwd(), "wr/pending/formal");

function loadReport(p) {
  if (!fs.existsSync(p)) {
    console.error(`no report at ${p}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function priorityFor(verdict) {
  if (verdict === "fail" || verdict === "structural_conflict") return "priority:p1";
  if (verdict === "needs_reaudit" || verdict === "duplicate_risk") return "priority:p2";
  return "priority:p3";
}

/** Map formal verdicts onto allowlisted formal:* labels only. */
function formalLabelFor(verdict) {
  if (verdict === "pass") return "formal:pass";
  if (verdict === "needs_reaudit") return "formal:reaudit";
  // fail | structural_conflict | duplicate_risk → formal:fail
  return "formal:fail";
}

function shouldOpen(verdict) {
  return (
    verdict === "fail" ||
    verdict === "needs_reaudit" ||
    verdict === "structural_conflict" ||
    verdict === "duplicate_risk"
  );
}

function wrMarkdown(report, audit) {
  const v = audit.verdict;
  return `# [WR] Formal: ${v} on ${report.repo}#${audit.pr_number} — ${audit.title}

## Description

Formal dual-path verification (\`${report.method}\`, window ${report.window_hours}h) produced verdict **${v}**.

### Formal summary
- Winner path: \`${audit.winner}\`
- Agreement: ${audit.agreement_bps} bps
- Risk score: ${audit.risk_score}
- XOR bits: ${audit.xor_bits}
- Path A score: ${audit.path_a_score} · Path B score: ${audit.path_b_score}
- Rationale: ${audit.rationale}

### Agent judgements
${(audit.judgements || [])
  .map(
    (j) =>
      `- ${j.agent} (${j.role}) stance=${j.stance} correct=${j.was_correct}`,
  )
  .join("\n") || "_none_"}

### Desired outcome
1. Re-open dual-path analysis with fresh predicates if \`needs_reaudit\`.
2. If \`fail\` / structural: land a fix PR that restores the formal winner side predicates.
3. Keep human review: do **not** merge without midnghtsapphire approval.

### Labels
\`wr\`, \`formal:auto-wr\`, \`${formalLabelFor(v)}\`, \`human-review-required\`, \`${priorityFor(v)}\`

### Auto-filled by Research Engine
- **Phase Alignment:** _(auto)_
- **Revenue Impact:** process reliability / agent fleet quality
- **Priority:** ${priorityFor(v)}
- **Acceptance Criteria:** formal re-run shows pass OR documented human override with evidence
- **Technical Approach:** _(auto)_
- **Dependencies:** formal verifier pack, OpenRouter optional
- **Estimated Effort:** _(auto)_
- **Risk Assessment:** silent process drift if ignored
- **Success Metrics:** formal:pass on re-run; scorecard event logged

---
provenance:
  loop: formal-auto-wr
  source_report: ${path.basename(REPORT)}
  generated_at: ${new Date().toISOString()}
  human_gate: required
`;
}

function main() {
  const apply = process.argv.includes("--apply");
  const report = loadReport(REPORT);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const audits = report.audits || [];
  const opened = [];
  for (const audit of audits) {
    if (!shouldOpen(audit.verdict)) continue;
    const file = path.join(
      OUT_DIR,
      `WR-formal-${audit.pr_number}-${audit.verdict}.md`,
    );
    fs.writeFileSync(file, wrMarkdown(report, audit));
    opened.push({ file, pr: audit.pr_number, verdict: audit.verdict });
    console.log(`wrote ${file}`);
  }

  const summaryPath = path.join(OUT_DIR, "INDEX.md");
  fs.writeFileSync(
    summaryPath,
    `# Formal auto-WR index\n\nGenerated ${new Date().toISOString()}\n\n` +
      opened.map((o) => `- PR #${o.pr} ${o.verdict}: \`${path.basename(o.file)}\``).join("\n") +
      (opened.length ? "\n" : "\n_No auto-WRs (all pass or empty)._\n"),
  );

  if (apply) {
    console.log(
      "--apply requested: create GitHub issues via gh api from CI (see workflow).",
    );
    console.log(JSON.stringify({ opened: opened.length, files: opened }, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        repo: report.repo,
        summary: report.summary,
        auto_wrs: opened.length,
      },
      null,
      2,
    ),
  );
}

main();
