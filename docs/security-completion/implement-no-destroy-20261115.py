#!/usr/bin/env python3
"""Scoped, reproducible additions for the owner-authorized no-destroy draft PR."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEADER = (
    "REVVEL-DISABLED | AGENT: security-specia"
    "list | MODEL: runtime-unspecified | WR: "
    "security-no-destroy-20261115 | DATE: 202"
    "6-11-15 | STATUS: REPLACED"
)


def retire(old, reason, prefix="//"):
    return (
        f"{prefix} {HEADER}\n{prefix} REASON: {reason}\n"
        + "".join(prefix + " " + line + "\n" for line in old.splitlines())
        + f"{prefix} REVVEL-DISABLED-END\n"
    )


def replace_once(text, old, new, reason, prefix="//"):
    assert text.count(old) == 1, old[:100]
    return text.replace(old, retire(old, reason, prefix) + new, 1)


p = ROOT / "scripts/no-destroy-guard.js"
s = p.read_text()
s = s.replace(
    "const LOCKFILE_RE",
    (
        "// 2026-11-15 owner rule: all paths are "
        "protected against file deletion; labels "
        "never bypass.\nconst LOCKFILE_RE"
    ),
    1,
)
s = replace_once(
    s,
    """  if (allowDestroy) {
    return { fail: false, reasons: ["`allow-destroy` label present — guard intentionally skipped."] };
  }""",
    "",
    "Owner forbids destructive changes; allowDestroy is retained only as an inert compatibility argument.",
)
s = s.replace(
    "function evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy }) {",
    """// 2026-11-15: additive global limits retain the old protected-path limit as a stricter layer.
function evaluateDiff(files, {
  protectedPrefixes = DEFAULT_PROTECTED.split(','), maxDeleted = 400, allowDestroy,
  maxGlobalDeleted = 1000, replacementRatio = 0.8, minReplacementLines = 20,
} = {}) {""",
    1,
)
s = s.replace(
    "  const reasons = [];",
    """  const reasons = [];
  if (!Array.isArray(files)) throw new Error('Diff must be an array');
  for (const [name, value] of Object.entries({ maxDeleted, maxGlobalDeleted, minReplacementLines })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  }
  if (!Number.isFinite(replacementRatio) || replacementRatio <= 0 || replacementRatio > 1) {
    throw new Error('Invalid replacementRatio');
  }
  let globalDeleted = 0;""",
    1,
)
s = replace_once(
    s,
    """    if (!inProtected(f.path)) continue;
    if (f.status === "D") deletedFiles.push(f.path);
    if (!LOCKFILE_RE.test(f.path)) protectedDeleted += Number(f.deleted) || 0;""",
    (
        "    if (typeof f.path !== 'string' || !f"
        ".path || !/^[AMDT]$/.test(f.status)) {\n "
        "     throw new Error('Missing or unsuppo"
        "rted diff path/status');\n    }\n    if (f"
        ".status === 'D') deletedFiles.push(f.pat"
        "h);\n    if (f.status === 'T') reasons.pu"
        "sh(`Changes existing file type: ${JSON.s"
        "tringify(f.path)}.`);\n    if (f.added =="
        "= '-' || f.deleted === '-') {\n      if ("
        "f.status !== 'A') reasons.push(`Cannot q"
        "uantify existing binary change: ${JSON.s"
        "tringify(f.path)}.`);\n      continue;\n  "
        "  }\n    if (!/^\\d+$/.test(String(f.added"
        ")) || !/^\\d+$/.test(String(f.deleted))) "
        "{\n      throw new Error('Invalid diff li"
        "ne counts');\n    }\n    const deleted = N"
        "umber(f.deleted);\n    if (!Number.isSafe"
        "Integer(deleted) || !Number.isSafeIntege"
        "r(Number(f.added))) {\n      throw new Er"
        "ror('Unsafe diff line counts');\n    }\n  "
        "  globalDeleted += deleted; // Includes "
        "lockfiles and every directory.\n    if (i"
        "nProtected(f.path) && !LOCKFILE_RE.test("
        "f.path)) protectedDeleted += deleted;\n  "
        "  if (f.beforeLines !== undefined && (!N"
        "umber.isSafeInteger(f.beforeLines) || f."
        "beforeLines < 0)) {\n      throw new Erro"
        "r('Invalid baseline line count');\n    }\n"
        "    if (f.status !== 'D' && f.beforeLine"
        "s >= minReplacementLines && deleted / f."
        "beforeLines >= replacementRatio) {\n     "
        " reasons.push(`Replaces or strips ${dele"
        "ted}/${f.beforeLines} baseline lines in "
        "${JSON.stringify(f.path)} (ratio limit $"
        "{replacementRatio}).`);\n    }"
    ),
    "The previous loop skipped every unprotected path and silently coerced malformed counts.",
)
s = replace_once(
    s,
    "    reasons.push(`Deletes ${deletedFiles.length} existing file(s) under protected paths:`);",
    "    reasons.push(`Deletes ${deletedFiles.length} existing file(s) anywhere in the repository:`);",
    "File deletion is prohibited globally, not only in product directories.",
)
s = replace_once(
    s,
    "    deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${p}`));",
    "    deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${JSON.stringify(p)}`));",
    "Escape newlines/control characters so a Git filename cannot inject log annotations.",
)
s = s.replace(
    "  return { fail: reasons.length > 0, reasons };",
    """  if (globalDeleted > maxGlobalDeleted) {
    reasons.push(`Removes ${globalDeleted} lines repository-wide (limit ${maxGlobalDeleted}).`);
  }
  return { fail: reasons.length > 0, reasons };""",
    1,
)
start = s.index("function readDiff(baseSha) {")
end = s.index("\nfunction main()", start)
old = s[start:end]
new = (
    "// Git is invoked directly, never throug"
    "h a shell; PR blobs are read as DATA.\n//"
    " --no-ext-diff/--no-textconv prohibit ex"
    "ecutable drivers. --no-renames deliberat"
    "ely\n// exposes a rename as deletion + ad"
    "dition because the owner prohibits file "
    "loss.\nfunction git(args, cwd) {\n  return"
    " execFileSync('git', args, {\n    cwd, ma"
    "xBuffer: 64 * 1024 * 1024, stdio: ['igno"
    "re', 'pipe', 'pipe'],\n  });\n}\n\nfunction "
    "resolveCommit(ref, cwd) {\n  if (typeof r"
    "ef !== 'string' || !ref || ref.startsWit"
    "h('-') || /[\\x00-\\x20]/.test(ref)) {\n   "
    " throw new Error('Missing or invalid com"
    "mit reference');\n  }\n  const sha = git(["
    "'rev-parse', '--verify', '--end-of-optio"
    "ns', `${ref}^{commit}`], cwd).toString('"
    "ascii').trim();\n  if (!/^[a-f0-9]{40,64}"
    "$/.test(sha)) throw new Error('Invalid r"
    "esolved commit');\n  return sha;\n}\n\nfunct"
    "ion nulRecords(buffer) {\n  if (buffer.le"
    "ngth && buffer[buffer.length - 1] !== 0)"
    " throw new Error('Unterminated Git path "
    "data');\n  // Invalid UTF-8 paths fail cl"
    "osed, rather than combining two distinct"
    " byte paths.\n  const text = new TextDeco"
    "der('utf-8', { fatal: true }).decode(buf"
    "fer);\n  return text ? text.slice(0, -1)."
    "split('\\0') : [];\n}\n\nfunction countLines"
    "(buffer) {\n  let n = 0;\n  for (const byt"
    "e of buffer) if (byte === 10) n++;\n  ret"
    "urn n + (buffer.length && buffer[buffer."
    "length - 1] !== 10 ? 1 : 0);\n}\n\nfunction"
    " readDiff(baseSha, headSha = 'HEAD', { c"
    "wd } = {}) {\n  const base = resolveCommi"
    "t(baseSha, cwd);\n  const head = resolveC"
    "ommit(headSha, cwd);\n  const baseline = "
    "git(['merge-base', base, head], cwd).toS"
    "tring('ascii').trim();\n  if (!/^[a-f0-9]"
    "{40,64}$/.test(baseline)) throw new Erro"
    "r('No valid merge base');\n  const args ="
    " ['diff', '--no-ext-diff', '--no-textcon"
    "v', '--no-renames'];\n  const nameStatus "
    "= nulRecords(git([...args, '--name-statu"
    "s', '-z', baseline, head, '--'], cwd));\n"
    "  const numstat = nulRecords(git([...arg"
    "s, '--numstat', '-z', baseline, head, '-"
    "-'], cwd));\n  const status = new Map();\n"
    "  if (nameStatus.length % 2) throw new E"
    "rror('Malformed name-status data');\n  fo"
    "r (let i = 0; i < nameStatus.length; i +"
    "= 2) {\n    const code = nameStatus[i];\n "
    "   const filename = nameStatus[i + 1];\n "
    "   if (!/^[AMDT]$/.test(code) || !filena"
    "me || status.has(filename)) throw new Er"
    "ror('Unsupported Git status');\n    statu"
    "s.set(filename, code);\n  }\n  const files"
    " = [];\n  for (const record of numstat) {"
    "\n    const first = record.indexOf('\\t');"
    "\n    const second = record.indexOf('\\t',"
    " first + 1);\n    if (first <= 0 || secon"
    "d <= first + 1) throw new Error('Malform"
    "ed numstat data');\n    const added = rec"
    "ord.slice(0, first);\n    const deleted ="
    " record.slice(first + 1, second);\n    co"
    "nst filename = record.slice(second + 1);"
    " // tabs/newlines in the path stay intac"
    "t\n    if (!status.has(filename)) throw n"
    "ew Error('Diff status/count mismatch');\n"
    "    const code = status.get(filename);\n "
    "   status.delete(filename);\n    const be"
    "foreLines = code === 'A' ? 0 : countLine"
    "s(git(['cat-file', 'blob', `${baseline}:"
    "${filename}`], cwd));\n    files.push({ p"
    "ath: filename, added, deleted, status: c"
    "ode, beforeLines });\n  }\n  if (status.si"
    "ze) throw new Error('Diff omitted change"
    "d files');\n  return files;\n}\n\nfunction p"
    "ositiveInteger(value, fallback, name) {\n"
    "  if (value === undefined) return fallba"
    "ck;\n  if (!/^[1-9]\\d*$/.test(value) || !"
    "Number.isSafeInteger(Number(value))) thr"
    "ow new Error(`Invalid ${name}`);\n  retur"
    "n Number(value);\n}\n"
)
s = replace_once(
    s, old, new, "Whitespace-splitting Git paths was unsafe; explicit merge-base and NUL records fail closed."
)
s = replace_once(
    s,
    """    console.log("::warning::BASE_SHA not set — no-destroy guard skipped.");
    return 0;""",
    """    console.error('No-Destroy Guard: BASE_SHA is required; no baseline means no successful check.');
    return 1;""",
    "Missing baseline must never appear as a passing check.",
)
s = replace_once(
    s,
    """  const maxDeleted = Math.max(1, parseInt(process.env.MAX_DELETED || "400", 10) || 400);
  const allowDestroy = (process.env.ALLOW_DESTROY || "").toLowerCase() === "true";

  const files = readDiff(baseSha);
  const { fail, reasons } = evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy });""",
    (
        "  const maxDeleted = positiveInteger(pro"
        "cess.env.MAX_DELETED, 400, 'MAX_DELETED'"
        ");\n  const maxGlobalDeleted = positiveIn"
        "teger(process.env.MAX_GLOBAL_DELETED, 10"
        "00, 'MAX_GLOBAL_DELETED');\n  const minRe"
        "placementLines = positiveInteger(process"
        ".env.MIN_REPLACEMENT_LINES, 20, 'MIN_REP"
        "LACEMENT_LINES');\n  const replacementRat"
        "io = process.env.REPLACEMENT_RATIO === u"
        "ndefined ? 0.8 : Number(process.env.REPL"
        "ACEMENT_RATIO);\n  const files = readDiff"
        "(baseSha, process.env.HEAD_SHA || 'HEAD'"
        ");\n  const { fail, reasons } = evaluateD"
        "iff(files, {\n    protectedPrefixes, maxD"
        "eleted, maxGlobalDeleted, minReplacement"
        "Lines, replacementRatio,\n  });"
    ),
    "Strict threshold validation; ALLOW_DESTROY is not read and cannot bypass owner policy.",
)
s = replace_once(
    s,
    '''      "\\nIf this removal is intentional, add the `allow-destroy` label to the PR and re-run.\\n" +
      "Otherwise, change the approach to EDIT existing files with minimal diffs instead of replacing them."''',
    (
        "      '\\nNo label bypass is permitted. P"
        "reserve the original work with dated com"
        "ments and additive changes.\\n' +\n      '"
        "Owner review is required; agents must ne"
        "ver merge their own PRs.' "
    ),
    "The legacy remediation instructed agents to violate the no-delete owner rule.",
)
s = replace_once(
    s,
    '    console.error("no-destroy-guard error:", e.message);',
    (
        "    console.error('no-destroy-guard erro"
        "r: baseline/diff evaluation failed; chec"
        "k Git refs and threshold configuration.'"
        ");"
    ),
    "Do not echo arbitrary Git stderr or filename content into annotations.",
)
s = replace_once(
    s,
    "module.exports = { evaluateDiff };",
    "module.exports = { evaluateDiff, readDiff, main, countLines };",
    "Export Git integration and CLI logic for real-repository regression tests.",
)
s = s.replace(
    " * Env:\n",
    """ * 2026-11-15 controlling behavior: global file-loss block, global 1000-line
 * deletion budget (including lockfiles), 80% replacement/loss on files >=20
 * baseline lines, and the retained protected 400-line budget. The old bypass
 * description above is historical only; neither a label nor env overrides policy.
 * HEAD_SHA defaults to HEAD locally. Missing baseline and Git errors fail closed.
 * MAX_GLOBAL_DELETED, MIN_REPLACEMENT_LINES, REPLACEMENT_RATIO configure heuristics.
 * These are tripwires, not proof of intent or universal destruction detection.
 *
 * Env:\n""",
    1,
)
p.write_text(s)

p = ROOT / "tests/no-destroy-guard.test.js"
s = p.read_text()
for name in ["ignores deletions outside protected paths", "allow-destroy label overrides the guard"]:
    start = s.index(f'test("{name}"')
    end = s.index("\n});", start) + len("\n});")
    s = replace_once(
        s, s[start:end], "", "Owner global no-delete/no-bypass policy supersedes this legacy expected pass."
    )
s = s.replace(
    "console.log(`\\nTest Summary:",
    (
        'test("blocks deletion outside protected '
        'paths", () => {\n  assert.strictEqual(eva'
        "luateDiff([{ path: 'docs/old.md', added:"
        " '0', deleted: '1', status: 'D' }], opts"
        ').fail, true);\n});\n\ntest("allow-destroy '
        'remains inert", () => {\n  assert.strictE'
        "qual(evaluateDiff([{ path: 'products/foo"
        "/page.tsx', added: '0', deleted: '9999',"
        " status: 'D' }], { ...opts, allowDestroy"
        ': true }).fail, true);\n});\n\ntest("global'
        " deletion budget includes unprotected pa"
        'ths and lockfiles", () => {\n  assert.str'
        "ictEqual(evaluateDiff([{ path: 'package-"
        "lock.json', added: '1', deleted: '1001',"
        " status: 'M' }], opts).fail, true);\n});\n"
        '\ntest("whole-file replacement is detecte'
        'd globally", () => {\n  assert.strictEqua'
        "l(evaluateDiff([{ path: 'scripts/tool.js"
        "', added: '20', deleted: '20', beforeLin"
        "es: 20, status: 'M' }], opts).fail, true"
        ');\n});\n\ntest("invalid counts fail closed'
        '", () => {\n  assert.throws(() => evaluat'
        "eDiff([{ path: 'docs/old.md', added: '0'"
        ", deleted: 'NaN', status: 'M' }], opts))"
        ";\n});\n\nconsole.log(`\\nTest Summary:"
    ),
    1,
)
p.write_text(s)

p = ROOT / ".github/workflows/no-destroy-guard.yml"
s = p.read_text()
s = s.replace(
    "# `allow-destroy` label. See scripts/no-destroy-guard.js.",
    (
        "# `allow-destroy` label. See scripts/no-"
        "destroy-guard.js.\n# 2026-11-15: the over"
        "ride above is retired history. No label "
        "may bypass this check.\n# Global loss/rep"
        "lacement tripwires execute only BASE scr"
        "ipts; HEAD blobs are data."
    ),
    1,
)
s = (
    replace_once(
        s,
        """      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: '22' """,
        "",
        "Unused exact block",
        "#",
    )
    if False
    else s
)
s = (
    replace_once(
        s,
        """      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: '22' """,
        "",
        "Unused exact block",
        "#",
    )
    if False
    else s
)
old = s[s.index("      - uses: actions/checkout@v7"):]
new = """      # Real upstream commit SHAs resolved via gh api on 2026-11-15.
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: ${{ github.event.pull_request.base.sha }}
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: '22'
      - name: Fetch PR commit as data only
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          set -euo pipefail
          [[ "$PR_NUMBER" =~ ^[1-9][0-9]*$ ]]
          [[ "$HEAD_SHA" =~ ^[a-f0-9]{40}$ ]]
          git fetch --no-tags origin "refs/pull/$PR_NUMBER/head"
          test "$(git rev-parse FETCH_HEAD)" = "$HEAD_SHA"
      - name: Block destructive diffs
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: node scripts/no-destroy-guard.js
"""
s = replace_once(
    s, old, new, "Unpinned actions and PR checkout would permit security-script self-bypass; checkout BASE only.", "#"
)
p.write_text(s)
