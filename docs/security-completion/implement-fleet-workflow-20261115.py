#!/usr/bin/env python3
"""In-place trusted fleet wiring with a read-only PR gate; legacy blocks stay visible."""

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
    retired = (
        "# "
        + HEADER
        + "\n# REASON: "
        + reason
        + "\n"
        + "\n".join(("# " + x).rstrip() for x in old.splitlines())
        + "\n# REVVEL-DISABLED-END\n"
    )
    if old.startswith("            "):
        retired = "\n".join("            // " + line[2:] for line in retired.splitlines()) + "\n"
    elif old.startswith("          "):
        retired = "\n".join("          " + line for line in retired.splitlines()) + "\n"
    return s.replace(old, retired + new, 1)


p = ROOT / ".github/workflows/security-fleet.yml"
s = p.read_text()
s = s.replace(
    "  pull_request:\n    types: [opened, edited, synchronize]",
    """  pull_request:
    types: [opened, edited, synchronize, reopened]
  # Write alerts execute only the trusted base workflow/scripts, never PR checkout.
  pull_request_target:
    types: [opened, edited, synchronize, reopened]""",
    1,
)
s = replace(
    s,
    "permissions:\n  contents: read\n  issues: write",
    "permissions:\n  contents: read\n",
    "Default token is read-only; only trusted reporting jobs grant issues: write.",
)
s = replace(
    s,
    """    if: >-
      github.event_name == 'pull_request' ||
      ((github.event_name == 'issues' || github.event_name == 'issue_comment') &&
       !contains(github.event.issue.labels.*.name, 'security-fleet'))""",
    """    if: >-
      github.event_name == 'pull_request_target' ||
      ((github.event_name == 'issues' || github.event_name == 'issue_comment') &&
       !contains(github.event.issue.labels.*.name, 'security-fleet'))""",
    "Untrusted pull_request code cannot be executed with issue-write credentials; retain own-output exclusion.",
)
# Both checkout blocks have different shapes. Pin each active action while
# preserving every former uses line as a dated inert comment.
for old, new in [
    (
        "        uses: actions/checkout@v7",
        "        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4",
    ),
    (
        "        uses: actions/setup-node@v7",
        "        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4",
    ),
    (
        "        uses: actions/github-script@v9.0.0",
        "        uses: actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b # v7",
    ),
]:
    assert s.count(old) == 2
    s = s.replace(
        old,
        f"# {HEADER}\n# REASON: Immutable upstream action commit "
        f"resolved via gh api 2026-11-15.\n# {old}\n# REVVEL-DISABLED-END\n{new}",
    )
s = s.replace(
    "          fetch-depth: 0",
    (
        "          ref: ${{ github.event.pull_req"
        "uest.base.sha || github.sha }}\n         "
        " fetch-depth: 0\n          persist-creden"
        "tials: false"
    ),
    1,
)
s = (
    replace(
        s,
        """      - name: Install dependencies
        run: npm ci --no-audit --no-fund""",
        "",
        "Event/PR scans use built-ins only; no dependency install or lifecycle execution is needed.",
    )
    if s.count("      - name: Install dependencies\n        run: npm ci --no-audit --no-fund") == 1
    else s
)
# Retire the first install only; the scheduled install is separately secured.
old = "      - name: Install dependencies\n        run: npm ci --no-audit --no-fund"
if s.count(old) == 2:
    first = s.index(old)
    s = (
        s[:first]
        + replace(
            s[first: first + len(old)], old, "", "Built-in event/PR detectors need no dependency lifecycle scripts."
        )
        + s[first + len(old):]
    )
start = s.index('      - name: "@sentinel — scan event text')
end = s.index("\n      - name: File finding", start)
s = replace(
    s,
    s[start:end],
    (
        '      - name: "@sentinel — scan event te'
        'xt for instruction smuggling"\n        ru'
        "n: |\n          set -euo pipefail\n       "
        "   node scripts/security-fleet.js sentin"
        'el --event-file "$GITHUB_EVENT_PATH" --j'
        "son > /tmp/sentinel-findings.json\n      "
        "    # Do not cat reports: excerpts can c"
        "ontain sensitive event text.\n\n      - na"
        'me: "@exfil + @sentinel + no-destroy — s'
        'can exact PR data"\n        if: github.ev'
        "ent_name == 'pull_request_target'\n      "
        "  env:\n          BASE_SHA: ${{ github.ev"
        "ent.pull_request.base.sha }}\n          H"
        "EAD_SHA: ${{ github.event.pull_request.h"
        "ead.sha }}\n          PR_NUMBER: ${{ gith"
        "ub.event.pull_request.number }}\n        "
        "run: |\n          set -euo pipefail\n     "
        '     [[ "$PR_NUMBER" =~ ^[1-9][0-9]*$ ]]'
        '\n          [[ "$HEAD_SHA" =~ ^[a-f0-9]{4'
        "0}$ ]]\n          # Public repository: fe"
        "tch needs no stored checkout credentials"
        '.\n          git fetch --no-tags origin "'
        'refs/pull/$PR_NUMBER/head"\n          tes'
        't "$(git rev-parse FETCH_HEAD)" = "$HEAD'
        '_SHA"\n          node scripts/security-fl'
        'eet.js pr --event-file "$GITHUB_EVENT_PA'
        'TH" --json > /tmp/exfil-findings.json\n  '
        "        # Report-only alert lane; malfor"
        "med inputs still fail the job.\n"
    ),
    (
        "Scan actual comment event data; Git erro"
        "rs are fatal and reports are never echoe"
        "d. PR checkout is never performed."
    ),
)
s = replace(
    s,
    (
        "          SOURCE_URL: ${{ github.event.i"
        "ssue.html_url || github.event.comment.ht"
        "ml_url || github.event.pull_request.html"
        "_url || '' }}"
    ),
    (
        "          SOURCE_URL: ${{ github.event.c"
        "omment.html_url || github.event.issue.ht"
        "ml_url || github.event.pull_request.html"
        "_url || '' }}\n"
    ),
    "Alert links must identify the actual comment scanned, not always the parent issue.",
)
s = replace(
    s,
    (
        "            const reports = [];\n        "
        "    try { reports.push({ handle: '@senti"
        "nel', report: JSON.parse(fs.readFileSync"
        "('/tmp/sentinel-findings.json', 'utf8'))"
        " }); } catch (e) { core.info('no sentine"
        "l report'); }\n            try { reports."
        "push({ handle: '@exfil', report: JSON.pa"
        "rse(fs.readFileSync('/tmp/exfil-findings"
        ".json', 'utf8')) }); } catch (e) { core."
        "info('no exfil report'); }"
    ),
    """            const trustedRoot = (process.env && process.env.GITHUB_WORKSPACE)
              || (typeof process.cwd === 'function' ? process.cwd() : '.');
            const { validateReport } = require(`${trustedRoot}/scripts/security-fleet.js`);
            const reports = [{ handle: '@sentinel', report: validateReport(
              JSON.parse(fs.readFileSync('/tmp/sentinel-findings.json', 'utf8')), 'sentinel') }];
            if (context.eventName === 'pull_request_target' || context.eventName === 'pull_request') {
              reports.push({ handle: '@sentinel + @exfil + no-destroy', report: validateReport(
                JSON.parse(fs.readFileSync('/tmp/exfil-findings.json', 'utf8')), 'pr') });
            }""",
    "Required scans must be schema-valid; missing output is failure, not no findings.",
)
s = (
    replace(
        s,
        (
            "            const { data: open } = await"
            " github.rest.issues.listForRepo({ owner,"
            " repo, state: 'open', labels: 'security-"
            "fleet', per_page: 100 });"
        ),
        (
            "            const open = await github.pa"
            "ginate(github.rest.issues.listForRepo, {"
            " owner, repo, state: 'open', labels: 'se"
            "curity-fleet', per_page: 100 });\n"
        ),
        "Dedup searches all open finding issues, not only the first page.",
    )
    if s.count(
        (
            "            const { data: open } = await"
            " github.rest.issues.listForRepo({ owner,"
            " repo, state: 'open', labels: 'security-"
            "fleet', per_page: 100 });"
        )
    )
    == 1
    else s
)
# There are identical list calls in both lanes; preserve and paginate both.
old = (
    "            const { data: open } = await"
    " github.rest.issues.listForRepo({ owner,"
    " repo, state: 'open', labels: 'security-"
    "fleet', per_page: 100 });"
)
if s.count(old) == 2:
    s = s.replace(
        old,
        "# "
        + HEADER
        + "\n# REASON: Scan all open issues for dedup, including later pages.\n# "
        + old
        + "\n# REVVEL-DISABLED-END\n"
        + (
            "            const open = await github.pa"
            "ginate(github.rest.issues.listForRepo, {"
            " owner, repo, state: 'open', labels: 'se"
            "curity-fleet', per_page: 100 });"
        ),
    )
s = (
    replace(s, "                ...r.report.findings.map((f) => `- `${f.rule}`: ${f.excerpt}`),", "", "Unused match")
    if False
    else s
)
s = replace(
    s,
    "                ...r.report.findings.map((f) => `- \\`${f.rule}\\`: ${f.excerpt}`),".replace("\\`", "\\`"),
    (
        "                ...r.report.findings.map"
        "((f) => `- \\`${f.rule}\\`: content omitte"
        "d; inspect source locally`),"
    ).replace("\\`", "\\`"),
    "Do not publish secret-bearing excerpts or attacker instructions in generated issues.",
)
# Secure the trusted dispatch/sweep checkout explicitly.
s = s.replace(
    "        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4\n\n      - name: Setup Node",
    (
        "        uses: actions/checkout@11d5960a3"
        "26750d5838078e36cf38b85af677262 # v4\n   "
        "     with:\n          ref: ${{ github.eve"
        "nt.repository.default_branch }}\n        "
        "  persist-credentials: false\n\n      - na"
        "me: Setup Node"
    ),
    1,
)
s = replace(
    s,
    "      - name: Install dependencies\n        run: npm ci --no-audit --no-fund",
    (
        "      - name: Install trusted dependenci"
        "es without lifecycle scripts\n        run"
        ": npm ci --ignore-scripts --no-audit --n"
        "o-fund\n"
    ),
    "Sweeps use default-branch dependencies only and do not execute npm lifecycle scripts.",
)
s = replace(
    s,
    """          node scripts/security-fleet.js exprwatch --json > /tmp/exprwatch.json || true
          node scripts/security-fleet.js permit --json > /tmp/permit.json || true
          node scripts/security-fleet.js redteam --json > /tmp/redteam.json || true""",
    """          set -euo pipefail
          node scripts/security-fleet.js exprwatch --json > /tmp/exprwatch.json
          node scripts/security-fleet.js permit --json > /tmp/permit.json
          node scripts/security-fleet.js redteam --json > /tmp/redteam.json""",
    "Scanner failures must be red; findings remain report-only in the trusted alert sweep.",
)
s = replace(
    s,
    """                core.warning(`could not read ${m.file}: ${e.message}`);
                continue;""",
    """                throw new Error(`Missing or invalid ${m.key} report; no findings may be auto-closed.`);""",
    "Unreadable scan output must not green a sweep or close inherited finding issues.",
)
s = s.replace(
    "              const findings = report.findings || [];",
    (
        "              const { validateReport } ="
        " require(`${process.env.GITHUB_WORKSPACE"
        "}/scripts/security-fleet.js`);\n         "
        "     validateReport(report, m.key);\n    "
        "          const findings = report.findin"
        "gs;"
    ),
    1,
)
s = replace(
    s,
    (
        "                ...findings.slice(0, 50)"
        ".map((f) => `- \\`${f.source}${f.job ? '#"
        "' + f.job : ''}\\`: ${f.excerpt}`),"
    ),
    (
        "                ...findings.slice(0, 50)"
        ".map((f) => `- \\`${f.rule}\\`: content om"
        "itted; inspect trusted source locally`),"
    ),
    "Sweep issues also omit all raw source excerpts and potentially secret-bearing paths.",
)
# New job is in the EXISTING fleet workflow, not a second pipeline. It cannot
# write issues or execute PR scripts, dependencies, checkout actions, or manifests.
s += """
  pr-blocking:
    name: Security fleet PR tripwires (read-only)
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Checkout trusted base scripts only
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: ${{ github.event.pull_request.base.sha }}
          fetch-depth: 0
          persist-credentials: false
      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: '22'
      - name: Fetch and scan exact PR commit as data
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          set -euo pipefail
          [[ "$PR_NUMBER" =~ ^[1-9][0-9]*$ ]]
          [[ "$HEAD_SHA" =~ ^[a-f0-9]{40}$ ]]
          git fetch --no-tags origin "refs/pull/$PR_NUMBER/head"
          test "$(git rev-parse FETCH_HEAD)" = "$HEAD_SHA"
          node scripts/security-fleet.js pr --event-file "$GITHUB_EVENT_PATH" --json --strict
"""
s = s.replace(
    "on:\n",
    """# 2026-11-15 controlling behavior: read-only PR tripwires block on findings;
# trusted base/default-branch jobs write redacted, deduped alerts. Heuristics are
# not universal detection. GHA is account-blocked; local tests are the receipt.
# No active enforcement is claimed before owner merge and required-check setup.
on:\n""",
    1,
)
p.write_text("\n".join(x.rstrip() for x in s.splitlines()) + "\n")
