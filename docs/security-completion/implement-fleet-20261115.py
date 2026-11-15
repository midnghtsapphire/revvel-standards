#!/usr/bin/env python3
"""Preserve superseded fleet code while adding trusted-data-only PR tripwires."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEADER = (
    "REVVEL-DISABLED | AGENT: security-specia"
    "list | MODEL: runtime-unspecified | WR: "
    "security-no-destroy-20261115 | DATE: 202"
    "6-11-15 | STATUS: REPLACED"
)


def replace(s, old, new, reason, prefix="//"):
    assert s.count(old) == 1, old[:100]
    retired = (
        f"{prefix} {HEADER}\n{prefix} REASON: {reason}\n"
        + "\n".join((prefix + " " + x).rstrip() for x in old.splitlines())
        + f"\n{prefix} REVVEL-DISABLED-END\n"
    )
    return s.replace(old, retired + new, 1)


p = ROOT / "scripts/security-fleet.js"
s = p.read_text()
s = replace(
    s,
    "const YAML = require('yaml');",
    (
        "// Event/PR scans need only Node built-i"
        "ns; trusted sweep lanes load YAML lazily"
        ".\nconst YAML = { parse: (text) => requir"
        "e('yaml').parse(text) };\n"
    ),
    "Do not install or execute PR dependencies for the read-only injection/exfil gate.",
)
s = replace(
    s,
    "        source,\n        excerpt: excerpt(m[0]),",
    "        source,\n        excerpt: excerpt(redactSensitiveText(m[0])),\n",
    "Sentinel excerpts can include leaked credentials; redact complete values before any output.",
)
s = replace(
    s,
    "  return `${String(value).slice(0, 8)}…[redacted]`;",
    "  return '[redacted]';\n",
    "Even credential prefixes must not be copied into logs or tracking issues.",
)
s = s.replace(
    "function scanSecretExfil(text,",
    """function redactSensitiveText(text) {
  let safe = String(text);
  for (const pattern of SECRET_PATTERNS) safe = safe.replace(pattern.re, '[redacted]');
  return safe;
}

function scanSecretExfil(text,""",
    1,
)
s = replace(
    s,
    "    return findings; // malformed YAML is workflow-yaml-validation's job, not ours",
    """    return [{ member: 'exprwatch', rule: 'unparseable-workflow', source: file,
      excerpt: 'Workflow could not be parsed; expression audit was not completed.' }];\n""",
    "A failed expression audit cannot be reported as zero findings.",
)
idx = s.index("\nfunction main() {")
s = (
    s[:idx]
    + (
        "\n// 2026-11-15: strict report contract. "
        "Missing/malformed output must not appear"
        "\n// as a clean scan or auto-close a prio"
        "r finding. All callers use trusted code."
        "\nfunction validateReport(report, expecte"
        "dMember) {\n  if (!report || report.membe"
        "r !== expectedMember || !Array.isArray(r"
        "eport.findings) ||\n      !Number.isSafeI"
        "nteger(report.count) || report.count !=="
        " report.findings.length) {\n    throw new"
        " Error('Missing or invalid security-flee"
        "t report');\n  }\n  for (const f of report"
        ".findings) {\n    if (!f || typeof f.rule"
        " !== 'string' || !/^[a-z0-9-]+$/.test(f."
        "rule) ||\n        typeof f.excerpt !== 's"
        "tring' || typeof f.source !== 'string' |"
        "|\n        typeof f.member !== 'string' |"
        "| (expectedMember !== 'pr' && f.member !"
        "== expectedMember)) {\n      throw new Er"
        "ror('Malformed security-fleet finding');"
        "\n    }\n  }\n  return report;\n}\n\nfunction "
        "selectEventText(payload, eventName) {\n  "
        "if (!payload || typeof payload !== 'obje"
        "ct') throw new Error('Invalid event payl"
        "oad');\n  let entity;\n  if (eventName ==="
        " 'issue_comment') entity = payload.comme"
        "nt; // NOT issue.body\n  else if (eventNa"
        "me === 'issues') entity = payload.issue;"
        "\n  else if (eventName === 'pull_request'"
        " || eventName === 'pull_request_target')"
        " entity = payload.pull_request;\n  else t"
        "hrow new Error('Unsupported scan event')"
        ";\n  if (!entity || typeof entity !== 'ob"
        "ject' || !Object.prototype.hasOwnPropert"
        "y.call(entity, 'body') ||\n      (entity."
        "body !== null && typeof entity.body !== "
        "'string') ||\n      (entity.title !== und"
        "efined && typeof entity.title !== 'strin"
        "g')) {\n    throw new Error('Missing or m"
        "alformed event text');\n  }\n  return `${e"
        "ntity.title || ''}\\n\\n${entity.body || '"
        "'}`;\n}\n\nfunction scanPr({ baseSha, headS"
        "ha = 'HEAD', text, cwd } = {}) {\n  if (t"
        "ypeof text !== 'string') throw new Error"
        "('PR metadata text is required (empty st"
        "ring is valid)');\n  const { execFileSync"
        " } = require('node:child_process');\n  co"
        "nst invoke = (args) => execFileSync('git"
        "', args, {\n    cwd, maxBuffer: 64 * 1024"
        " * 1024, stdio: ['ignore', 'pipe', 'pipe"
        "'],\n  }).toString('utf8');\n  const resol"
        "ve = (ref) => {\n    if (typeof ref !== '"
        "string' || !ref || ref.startsWith('-') |"
        "| /[\\x00-\\x20]/.test(ref)) throw new Err"
        "or('Missing/invalid PR ref');\n    const "
        "sha = invoke(['rev-parse', '--verify', '"
        "--end-of-options', `${ref}^{commit}`]).t"
        "rim();\n    if (!/^[a-f0-9]{40,64}$/.test"
        "(sha)) throw new Error('Invalid PR commi"
        "t');\n    return sha;\n  };\n  const base ="
        " resolve(baseSha);\n  const head = resolv"
        "e(headSha);\n  const baseline = invoke(['"
        "merge-base', base, head]).trim();\n  if ("
        "!/^[a-f0-9]{40,64}$/.test(baseline)) thr"
        "ow new Error('Missing PR merge base');\n "
        " const diff = invoke(['diff', '--no-ext-"
        "diff', '--no-textconv', '--no-renames', "
        "'--unified=0', baseline, head, '--']);\n "
        " // Inspect additions only: removing a l"
        "eaked token must not itself re-leak or\n "
        " // fail a remediation. Metadata and add"
        "ed text are DATA, never executable code."
        "\n  const addedText = diff.split('\\n').fi"
        "lter((line) => line.startsWith('+') && !"
        "line.startsWith('+++')).map((line) => li"
        "ne.slice(1)).join('\\n');\n  const finding"
        "s = [\n    ...scanPromptInjection(text, {"
        " source: 'PR metadata' }),\n    ...scanSe"
        "cretExfil(text, { source: 'PR metadata' "
        "}),\n    ...scanPromptInjection(addedText"
        ", { source: 'PR additions' }),\n    ...sc"
        "anSecretExfil(addedText, { source: 'PR a"
        "dditions' }),\n  ];\n  // Blocking logs/re"
        "ports contain rule + location only, not "
        "attacker text.\n  return { member: 'pr', "
        "count: findings.length,\n    findings: fi"
        "ndings.map((f) => ({ ...f, excerpt: '[co"
        "ntent omitted]' })),\n    baseline, head,"
        " metadataScanned: true };\n}\n"
    )
    + s[idx:]
)
s = replace(
    s,
    """  let text = textIdx >= 0 ? args[textIdx + 1] : null;
  if (text == null && fileIdx >= 0) text = fs.readFileSync(args[fileIdx + 1], 'utf8');""",
    (
        "  const eventIdx = args.indexOf('--event"
        "-file');\n  let text = textIdx >= 0 ? arg"
        "s[textIdx + 1] : null;\n  if (textIdx >= "
        "0 && (text === undefined || text.startsW"
        "ith('--'))) throw new Error('Missing --t"
        "ext value');\n  if (text == null && fileI"
        "dx >= 0) text = fs.readFileSync(args[fil"
        "eIdx + 1], 'utf8');\n  if (eventIdx >= 0)"
        " {\n    const payload = JSON.parse(fs.rea"
        "dFileSync(args[eventIdx + 1], 'utf8'));\n"
        "    text = selectEventText(payload, proc"
        "ess.env.GITHUB_EVENT_NAME);\n  }\n  if (['"
        "sentinel', 'exfil', 'pr'].includes(membe"
        "r) && typeof text !== 'string') {\n    th"
        "row new Error('Explicit scan text/file/e"
        "vent is required');\n  }\n  if (member ==="
        " 'pr') {\n    const report = scanPr({ bas"
        "eSha: process.env.BASE_SHA, headSha: pro"
        "cess.env.HEAD_SHA || 'HEAD', text });\n  "
        "  validateReport(report, 'pr');\n    cons"
        "ole.log(json ? JSON.stringify(report, nu"
        "ll, 2) : `security-fleet PR: ${report.co"
        "unt} finding(s); content omitted`);\n    "
        "process.exit(strict && report.count > 0 "
        "? 1 : 0);\n  }"
    ),
    "Missing text is an invalid scan, not a clean sentinel/exfil report; add portable strict PR mode.",
)
s = replace(
    s,
    "if (require.main === module) main();",
    """if (require.main === module) {
  try { main(); } catch (_) {
    // Never echo file contents, raw Git stderr or token-shaped error arguments.
    console.error('security-fleet scan failed; verify inputs, refs, and trusted dependencies.');
    process.exit(2);
  }
}\n""",
    "Invalid/missing input and scanner errors must not green the check or leak diagnostic secrets.",
)
s = s.replace(
    "  INJECTION_RULES,\n",
    "  validateReport,\n  selectEventText,\n  scanPr,\n  redactSensitiveText,\n  INJECTION_RULES,\n",
    1,
)
p.write_text("\n".join(x.rstrip() for x in s.splitlines()) + "\n")
