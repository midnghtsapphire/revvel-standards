import { ReviewFinding, Severity } from "./types";

/**
 * Deterministic, keyless reviewer used for:
 * - local demos / CI without GROQ_API_KEY
 * - fallback when Groq returns 401/402/429/5xx
 *
 * Heuristics are intentionally simple and high-signal. They are NOT a
 * replacement for a full SAST suite — they keep the product usable offline
 * and give regression tests a stable oracle.
 */
export function reviewDiffLocally(diff: string, chunkIndex: number): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const lines = (diff ?? "").replace(/\r\n/g, "\n").split("\n");
  let currentFile: string | undefined;
  let addedLineNo = 0;

  const rules: Array<{
    id: string;
    severity: Severity;
    title: string;
    test: (line: string) => boolean;
    detail: (line: string) => string;
  }> = [
    {
      id: "secret-api-key",
      severity: "critical",
      title: "Possible hardcoded secret",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}/i.test(line) &&
        !/\$\{|process\.env|secrets\.|GITHUB_TOKEN|<.*>/.test(line),
      detail: () =>
        "Hardcoded credentials in source are a critical leak risk. Move to env vars / GitHub secrets and rotate the exposed value.",
    },
    {
      id: "dangerously-set-html",
      severity: "high",
      title: "Unsanitized HTML injection sink",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /dangerouslySetInnerHTML|innerHTML\s*=/.test(line),
      detail: () =>
        "DOM HTML sinks are XSS hotspots. Prefer text content, sanitize with a vetted library, or avoid raw HTML entirely.",
    },
    {
      id: "eval-exec",
      severity: "high",
      title: "Dynamic code execution",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /\beval\s*\(|new Function\s*\(|child_process\.exec\s*\(/.test(line),
      detail: () =>
        "eval/exec with untrusted input enables remote code execution. Use safe parsers or explicit allow-lists.",
    },
    {
      id: "console-log",
      severity: "low",
      title: "Debug logging left in diff",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /console\.(log|debug|info)\s*\(/.test(line),
      detail: () =>
        "Console noise often leaks PII in production logs. Prefer structured logging behind a level gate.",
    },
    {
      id: "todo-fixme",
      severity: "info",
      title: "TODO/FIXME marker introduced",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /\b(TODO|FIXME|HACK|XXX)\b/.test(line),
      detail: () => "Track follow-ups in issues rather than leaving permanent debt markers in main.",
    },
    {
      id: "empty-catch",
      severity: "medium",
      title: "Swallowed error handler",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /catch\s*\([^)]*\)\s*\{\s*\}/.test(line),
      detail: () =>
        "Empty catch blocks hide failures. Log with context, rethrow unexpected errors, or document why silence is safe.",
    },
    {
      id: "any-type",
      severity: "low",
      title: "TypeScript any weakens safety",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /:\s*any\b|as\s+any\b/.test(line),
      detail: () => "Prefer unknown + narrowing, or a concrete interface, so callers get compile-time checks.",
    },
    {
      id: "force-push-hint",
      severity: "medium",
      title: "Force-push pattern detected",
      test: (line) =>
        /^\+/.test(line) &&
        !/^\+\+\+/.test(line) &&
        /git\s+push\s+.*--force|--force-with-lease/.test(line),
      detail: () =>
        "Force pushes rewrite shared history. Prefer rebase + normal push, and block force-push on protected branches.",
    },
  ];

  for (const raw of lines) {
    if (raw.startsWith("diff --git ")) {
      const m = raw.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = m ? m[2] : currentFile;
      addedLineNo = 0;
      continue;
    }
    if (raw.startsWith("+++ b/")) {
      currentFile = raw.slice(6).trim() || currentFile;
      continue;
    }
    if (raw.startsWith("@@")) {
      const m = raw.match(/\+(\d+)/);
      addedLineNo = m ? Number(m[1]) - 1 : addedLineNo;
      continue;
    }

    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      addedLineNo += 1;
      for (const rule of rules) {
        if (!rule.test(raw)) continue;
        findings.push({
          id: `${rule.id}-${chunkIndex}-${findings.length + 1}`,
          severity: rule.severity,
          title: rule.title,
          detail: rule.detail(raw),
          file: currentFile,
          lineHint: addedLineNo > 0 ? String(addedLineNo) : undefined,
          ruleId: rule.id,
          chunkIndex,
        });
      }
    } else if (raw.startsWith(" ") || raw === "") {
      // context line — keep line numbering for + side approximate tracking only on +
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      // deleted line — does not advance new-file line numbers
    }
  }

  // Meta finding when the chunk is empty of added lines.
  const added = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  if (added === 0 && lines.some((l) => l.startsWith("-") && !l.startsWith("---"))) {
    findings.push({
      id: `deletes-only-${chunkIndex}`,
      severity: "info",
      title: "Deletion-only chunk",
      detail: "This chunk only removes code. Confirm callers and tests still cover the remaining paths.",
      file: currentFile,
      ruleId: "deletes-only",
      chunkIndex,
    });
  }

  return findings;
}

export function summarizeLocalFindings(findings: ReviewFinding[], label: string): string {
  if (!findings.length) {
    return `Chunk "${label}": no heuristic issues found.`;
  }
  const bySev = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const parts = Object.entries(bySev)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sev, n]) => `${n} ${sev}`)
    .join(", ");
  return `Chunk "${label}": ${findings.length} finding(s) (${parts}).`;
}
