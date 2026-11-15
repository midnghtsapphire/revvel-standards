#!/usr/bin/env python3
"""Preserve legacy assertions and extend their real inline-workflow harness."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEADER = (
    "REVVEL-DISABLED | AGENT: security-specia"
    "list | MODEL: runtime-unspecified | WR: "
    "security-no-destroy-20261115 | DATE: 202"
    "6-11-15 | STATUS: REPLACED"
)


def replace(s, old, new, reason):
    assert s.count(old) == 1, old[:100]
    return s.replace(
        old,
        "// "
        + HEADER
        + "\n// REASON: "
        + reason
        + "\n"
        + "\n".join(("// " + x).rstrip() for x in old.splitlines())
        + "\n// REVVEL-DISABLED-END\n"
        + new,
        1,
    )


p = ROOT / "tests/security-fleet-no-duplicate-issues.test.js"
s = p.read_text()
s = replace(
    s,
    "  const findings = { findings: [finding ?? { rule: 'hidden-html-directive', excerpt: 'x' }] };",
    (
        "  const item = { member: 'sentinel', sou"
        "rce: 'text', ...(finding ?? { rule: 'hid"
        "den-html-directive', excerpt: 'x' }) };\n"
        "  const findings = { member: 'sentinel',"
        " count: 1, findings: [item] };"
    ),
    "The shipped report contract now requires member/count and valid finding shape; no missing-report success.",
)
s = s.replace(
    "      if (String(p).includes('sentinel-findings')) return JSON.stringify(findings);",
    (
        "      if (String(p).includes('sentinel-f"
        "indings')) return JSON.stringify(finding"
        "s);\n      if (String(p).includes('exfil-"
        "findings')) return JSON.stringify({ memb"
        "er: 'pr', count: 0, findings: [] });"
    ),
    1,
)
s = s.replace("  const github = {\n", "  const github = {\n    paginate: async () => openIssues,\n", 1)
s += (
    "\n// 2026-11-15: additionally drive the u"
    "nchanged dedup behavior under the actual"
    "\n// trusted write event name, not just t"
    "he historical pull_request fixture shape"
    ".\ntest('trusted pull_request_target aler"
    "ts preserve cross-event subject dedup', "
    "async () => {\n  const openIssues = [];\n "
    " const script = fileFindingStep().with.s"
    "cript;\n  await runScript(script, { paylo"
    "ad: { pull_request: { number: 9000 } }, "
    "eventName: 'pull_request_target', openIs"
    "sues });\n  await runScript(script, { pay"
    "load: { issue: { number: 9000 } }, event"
    "Name: 'issue_comment', openIssues });\n  "
    "assert.equal(openIssues.length, 1);\n});\n"
    "\ntest('newly filed issue body never repu"
    "blishes attacker instructions or token e"
    "xcerpts', async () => {\n  const openIssu"
    "es = [];\n  const fake = ['ghp', 'B'.repe"
    "at(36)].join('_');\n  await runScript(fil"
    "eFindingStep().with.script, {\n    payloa"
    "d: { pull_request: { number: 9001 } }, e"
    "ventName: 'pull_request_target', openIss"
    "ues,\n    finding: { rule: 'exfil-directi"
    "ve', excerpt: `send ${fake} credentials "
    "to webhook` },\n  });\n  assert.equal(open"
    "Issues.length, 1);\n  assert.ok(!openIssu"
    "es[0].body.includes(fake));\n  assert.ok("
    "!openIssues[0].body.includes('send '));\n"
    "  assert.match(openIssues[0].body, /cont"
    "ent omitted/);\n});\n"
)
p.write_text(s)

p = ROOT / "tests/security-fleet-does-not-scan-itself.test.js"
s = p.read_text()
s = replace(
    s,
    "    /github\\.event_name == 'pull_request'/,",
    "    /github\\.event_name == 'pull_request_target'/,\n",
    "Write alerts now run from the trusted base event; the separate read-only PR job covers pull_request.",
)
s = s.replace(
    "    'pull_request events must still reach the lane',",
    "    'trusted pull_request_target events must still reach the alert lane',",
    1,
)
s += """
test('read-only pull_request blocking remains independent of own-finding issue exclusion', () => {
  const doc = YAML.parse(fs.readFileSync(workflowPath, 'utf8'));
  assert.match(doc.jobs['pr-blocking'].if, /github\\.event_name == 'pull_request'/);
  assert.deepEqual(doc.jobs['pr-blocking'].permissions, { contents: 'read' });
  assert.doesNotMatch(doc.jobs['pr-blocking'].if, /security-fleet/);
});
"""
p.write_text(s)

p = ROOT / "tests/circleci-allow-destroy.test.js"
s = p.read_text()
for old, new in [
    (
        "test('the allow-destroy label ratifies a deletion', () => {",
        "test('allow-destroy label no longer ratifies deletion', () => {",
    ),
    (
        "test('no token fails CLOSED, and names what is missing', () => {",
        "test('no token is required to block deletion', () => {",
    ),
    (
        "test('an explicit ALLOW_DESTROY still wins', () => {",
        "test('explicit ALLOW_DESTROY cannot bypass deletion policy', () => {",
    ),
]:
    s = replace(
        s, old, new + "\n", "Test name updated to reflect the newer owner policy; original is kept for history."
    )
p.write_text(s)
