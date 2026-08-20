# Zizmor (GitHub Actions security audit)

**Workflow:** [`.github/workflows/zizmor.yml`](../.github/workflows/zizmor.yml)
**Baseline:** [`config/zizmor-baseline.txt`](../config/zizmor-baseline.txt)
**Gate:** [`scripts/zizmor-baseline-gate.js`](../scripts/zizmor-baseline-gate.js)
**Issue:** [#17807](https://github.com/midnghtsapphire/revvel-standards/issues/17807)

## What it does

[zizmor](https://docs.zizmor.sh/) audits workflow YAML for Actions-specific
risks that CodeQL does not cover well: `template-injection`, `unpinned-uses`,
`artipacked` (credential persistence on `actions/checkout`),
`excessive-permissions`, `cache-poisoning`, and related rules.

On every PR that touches `.github/workflows/**` the workflow:

1. Runs zizmor and uploads SARIF to GitHub code scanning (**advisory** —
   `continue-on-error: true`).
2. Runs the **baseline ratchet** (`node scripts/zizmor-baseline-gate.js`).
   That step is the real fail-closed gate.

## Reading a red zizmor check — the line-shift gotcha

GitHub code scanning's "new alerts appear in code changed by this pull
request" comparison is **line-based**. If a PR inserts or deletes lines
above a pre-existing finding, that finding's line number moves and the
check re-reports it as **new** — even when the finding *set* is unchanged
or smaller.

This is not theoretical. PR #17806 added a five-line comment near the top
of `auto-error-handler.yml`. Every finding below it shifted by five lines.
Measured properly (zizmor 1.29.0 on the changed workflows at `main` vs the
branch, then diffing finding sets):

```text
=== NEW on the branch ===   30 entries
=== gone ===                31 entries
```

Every one of the 30 "new" pairs had a twin in "gone" at the same file and
rule, offset by the inserted lines. The single unpaired "gone" entry was a
finding the PR actually fixed. The PR removed one finding and introduced
none — while the code-scanning check reported a regression.

**Do not treat a red zizmor code-scanning annotation as a reason to revert
a fix.** Compare finding **sets** (file + rule), not line numbers.

### How to compare sets

```bash
pip install zizmor

# On the branch
zizmor --offline --persona=regular --min-severity low --format sarif \
  .github/workflows/ > /tmp/branch.sarif

# At the merge base (same command) > /tmp/main.sarif

# Diff file::rule pairs (the ratchet's key space)
node -e '
const fs=require("fs");
const count=p=>{
  const d=JSON.parse(fs.readFileSync(p,"utf8"));
  const m=new Map();
  for (const run of d.runs||[]) for (const r of run.results||[]) {
    if (r.level==="note") continue;
    const rule=(r.ruleId||"").split("/").pop();
    for (const loc of r.locations||[]) {
      const uri=loc.physicalLocation?.artifactLocation?.uri||"";
      const base=uri.split("/").pop();
      const k=base+"::"+rule;
      m.set(k,(m.get(k)||0)+1);
    }
  }
  return m;
};
const a=count("/tmp/main.sarif"), b=count("/tmp/branch.sarif");
for (const [k,v] of b) if (v>(a.get(k)||0)) console.log("NEW/UP",k,v,"was",a.get(k)||0);
for (const [k,v] of a) if (!b.has(k)) console.log("GONE",k,v);
'
```

Or just trust the ratchet: `node scripts/zizmor-baseline-gate.js` exits 0
when no `file::rule` count grew, regardless of line numbers.

## The baseline ratchet

`config/zizmor-baseline.txt` is a frozen list of

```text
workflow-basename.yml::rule-id count
```

pairs (error + warning only; persona `regular`, `--min-severity low`).

| Event | Gate result |
| --- | --- |
| count stays the same | pass |
| count goes down (you fixed debt) | pass — then lower the baseline in the same PR |
| count goes up | **fail** |
| a new `file::rule` pair appears | **fail** (new rule class on a file not on the ratchet) |
| zizmor missing / crash / baseline missing | **fail** (exit 0 means the postcondition holds) |

Update the baseline only by **lowering** counts after real cleanups. Never
raise a count to make CI green.

```bash
# After a real cleanup, regenerate and commit the lower baseline:
node scripts/zizmor-baseline-gate.js --print-baseline > config/zizmor-baseline.txt
```

## Developer workflow when the ratchet fails

1. Read the gate output — it names each `file::rule` that grew.
2. Fix the new finding (preferred), or confirm it is a false positive and
   open a separate issue; do not bump the baseline to silence it.
3. If you cleared pre-existing debt, regenerate the baseline so the ratchet
   stays tight.
4. Ignore a red **code-scanning** zizmor annotation that has no matching
   ratchet failure — that is almost certainly a line shift (see above).

## Related

- CLAUDE.md gotcha #8 — pin third-party Actions to full commit SHAs.
- `tests/no-untrusted-expression-in-run.test.js` — separate ratchet for
  `${{ }}` injection of attacker-influenced values (overlaps
  `template-injection` but is tracked on its own; see #17801).
- `standards/GREEN_MAIN_STANDARD.md` — a permanently-red security check is
  indistinguishable from one that just started failing for a real reason.
