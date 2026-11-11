#!/usr/bin/env node
"use strict";

/**
 * Rebuild the research gold set (research-gold-v1) from pinned source files.
 *
 * Why this exists: most of the real research with a recorded verdict lives in
 * PRIVATE repos (linear-a, tartaria-tablets). linear-a carries a
 * PRIVATE_DATA_NOTICE.md ("must never be redistributed, published"), and this
 * repo is public. So the public fixture holds provenance plus SHA-256 hashes
 * for those rows, and this script regenerates the verbatim text locally from
 * files the owner can read, then checks every hash.
 *
 * Nothing here is invented. Every question is a fixed template wrapped around
 * text copied from a source file, and every reference answer is source text.
 * Rows with no decided verdict in the source ([VERIFY], Unverified, Open,
 * Not reconciled, partial) are skipped, never guessed.
 *
 * Usage:
 *   node build-research-gold.js --sources DIR [--public FILE] [--private FILE]
 *     DIR holds the pinned files as DIR/<repo>/<path-in-repo>.
 *     Each file's git blob SHA is checked against PINS before parsing.
 *   node build-research-gold.js --sources DIR --verify FILE
 *     Rebuild and compare against a committed public fixture.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const OWNER = "midnghtsapphire";

const PINS = {
  "linear-a": {
    commit: "1d1ec1b7496822c6726a10fc5cc2c25dd0623b16",
    visibility: "private",
    files: {
      "data/ledger/hypotheses.jsonl": "be9d2c97c867b3f18fa3e0422fc77fb7f08ff4b7",
      "docs/research/WINE-GROK-REPORT-CHECK-2026-11-04.md": "c52ba9e30f29c64e3ea3efad4df2dee764c54257",
    },
  },
  "tartaria-tablets": {
    commit: "a04b4db530ee4b8c19277a050d8f48ec0adc6ac5",
    visibility: "private",
    files: {
      "appendix-errata-in-the-sources.md": "cbf275208d8699a035646bf42e65fa407365e8ba",
      "draft-sweep-findings.md": "f7e2eb6d9b102dacbae90299a6819bfecc4dec59",
    },
  },
  risingaloha: {
    commit: "83a727d46540788a17ecd851d62bb804e33ebcee",
    visibility: "public",
    files: {
      "data/debunks.json": "0e03fe88711a5a41e626548b3d5b2c42c163d2e9",
    },
  },
};

// Errata entries whose "As printed" text already states the finding, so the question would leak the answer.
const ERRATA_EXCLUDED = {
  A1: "the As-printed text states the finding (it names the drawing as a Tordos hut section), so the question would leak the answer",
};

// A pointer such as "As recorded there" is not an answer.
const POINTER_ANSWER = /^(as recorded|recorded in|the published values|against the)/i;
const MIN_ERRATA_ANSWER_CHARS = 250;

// Ledger rows the source itself marks as conflicted or superseded.
const LEDGER_EXCLUDED = {
  "H-0004": "status_conflict: ledger says rejected, receipt says inconclusive (docs/findings/INDEX.md)",
  "H-0005": "status_conflict: ledger says rejected, receipt says inconclusive (docs/findings/INDEX.md)",
  "H-0006": "status_conflict: ledger says rejected, receipt says inconclusive (docs/findings/INDEX.md)",
};

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash("sha1").update(header).update(buffer).digest("hex");
}

function readPinned(sourcesDir, repo, file) {
  const abs = path.join(sourcesDir, repo, file);
  const buffer = fs.readFileSync(abs);
  const actual = gitBlobSha(buffer);
  const expected = PINS[repo].files[file];
  if (actual !== expected) {
    throw new Error(`${repo}/${file}: blob sha ${actual} does not match pinned ${expected}`);
  }
  return buffer.toString("utf8");
}

function blobUrl(repo, file) {
  return `https://github.com/${OWNER}/${repo}/blob/${PINS[repo].commit}/${file}`;
}

// Trim and drop markdown bold markers only. No word is changed.
function clean(text) {
  return text.replace(/\r\n/g, "\n").replace(/\*\*/g, "").trim();
}

function makeRow(repo, file, locator, spec) {
  return {
    id: "",
    question: spec.question,
    reference_answer: spec.reference,
    source_repo: `${OWNER}/${repo}`,
    source_path: file,
    source_sha: PINS[repo].commit,
    source_blob_sha: PINS[repo].files[file],
    source_locator: locator,
    source_url: blobUrl(repo, file),
    domain: spec.domain,
    difficulty: null,
    question_form: spec.form,
    label: spec.label,
    caveat: spec.caveat || null,
    visibility: PINS[repo].visibility,
  };
}

// ---- linear-a ledger -------------------------------------------------------

function ledgerRows(sourcesDir, skipped) {
  const file = "data/ledger/hypotheses.jsonl";
  const records = readPinned(sourcesDir, "linear-a", file)
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const finals = new Map();
  const annotations = new Map();
  for (const record of records) {
    if (record.record_type === "annotation") {
      const list = annotations.get(record.annotates.id) || [];
      list.push(record.annotation);
      annotations.set(record.annotates.id, list);
    } else {
      finals.set(record.id, record);
    }
  }
  const rows = [];
  for (const [id, record] of [...finals.entries()].sort()) {
    const settledStatus = ["rejected", "tested", "promoted"].includes(record.status);
    const tests = Array.isArray(record.tests) ? record.tests : [];
    const notes = annotations.get(id) || [];
    const rivals = notes.some((note) => note.field === "rivals");
    const tierChange = notes.some((note) => note.field === "tier");
    const allDecided = tests.length > 0 && tests.every((test) => typeof test.outcome === "string");
    const ownCaveat = /not a settled resolution/i.test(record.notes || "");
    let reason = null;
    if (LEDGER_EXCLUDED[id]) reason = LEDGER_EXCLUDED[id];
    else if (!settledStatus) reason = `final status ${record.status} is not settled`;
    else if (!allDecided) reason = "no recorded test outcome";
    else if (rivals || tierChange) reason = "ledger annotation links or re-tiers this result (contested)";
    else if (ownCaveat) reason = "record's own notes say it is not a settled resolution";
    if (reason) {
      skipped.push({ source: `linear-a/${file}`, locator: id, reason });
      continue;
    }
    const receipts = tests.map((test) =>
      ["receipt_id", "outcome", "observed", "null_mean", "p_value", "q_value"]
        .filter((key) => test[key] !== undefined)
        .map((key) => `${key}=${test[key]}`)
        .join(" "),
    );
    rows.push(
      makeRow("linear-a", file, id, {
        form: "ledger_hypothesis",
        domain: "linear-a/preregistered-hypothesis",
        label: `ledger:${record.status}`,
        question:
          `A preregistered hypothesis in a research ledger reads: "${clean(record.claim)}" ` +
          "From its recorded test, what is its final status and what did the test find?",
        reference:
          `Final ledger status: ${record.status}. Recorded test result(s): ${receipts.join(" | ")}.`,
      }),
    );
  }
  return rows;
}

// ---- linear-a wine claim check --------------------------------------------

function wineRows(sourcesDir, skipped) {
  const file = "docs/research/WINE-GROK-REPORT-CHECK-2026-11-04.md";
  const text = readPinned(sourcesDir, "linear-a", file);
  const start = text.indexOf("## 2. Claim-by-claim verdicts");
  const end = text.indexOf("\n## 3.", start);
  const section = text.slice(start, end === -1 ? undefined : end);
  const rows = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^\| (\d\.\d+) \|(.*)$/);
    if (!match) continue;
    const cells = match[2].split(" | ").map((cell) => cell.replace(/^\s*\|?\s*|\s*\|?\s*$/g, ""));
    if (cells.length < 3) continue;
    const [claim, verdict, source] = cells;
    const decided = /^\*\*(Confirmed|Wrong)/.test(verdict);
    if (!decided) {
      skipped.push({ source: `linear-a/${file}`, locator: match[1], reason: `verdict not decided: ${verdict.slice(0, 50)}` });
      continue;
    }
    rows.push(
      makeRow("linear-a", file, `claim ${match[1]}`, {
        form: "claim_verification",
        domain: "linear-a/wine-vat-sign-claim-check",
        label: /^\*\*Wrong/.test(verdict) ? "wrong" : "confirmed",
        question:
          "Check this claim from an outside LLM research report against the sources, " +
          `then give the verdict and the grounds: "${claim.replace(/\*\*/g, "")}"`,
        reference: `Verdict: ${verdict.replace(/\*\*/g, "")} Grounds: ${(source || "").replace(/\*\*/g, "")}`,
      }),
    );
  }
  return rows;
}

// ---- tartaria errata -------------------------------------------------------

function errataRows(sourcesDir, skipped) {
  const file = "appendix-errata-in-the-sources.md";
  const text = readPinned(sourcesDir, "tartaria-tablets", file);
  const rows = [];
  for (const part of text.split(/^(?=### )/m)) {
    const head = part.match(/^### (\S+?)\.?\s+(.*)$/m);
    if (!head) continue;
    const asPrinted = part.match(/\*\*As printed\.\*\*([\s\S]*?)\n\*\*The original\./);
    const original = part.match(/\*\*The original\.\*\*([\s\S]*?)\n\*\*Checked\./);
    const checked = part.match(/\n\*\*Checked\.([\s\S]*?)\n\*\*Consequence\./);
    const status = part.match(/\*\*Status\.\s*([^*]+)\*\*/);
    if (!asPrinted || !original || !checked || !status) continue;
    const statusText = status[1].trim().replace(/\.$/, "");
    if (!/^Settled/i.test(statusText) || /\bOpen\b/i.test(statusText)) {
      skipped.push({ source: `tartaria-tablets/${file}`, locator: head[1], reason: `status not settled: ${statusText.slice(0, 60)}` });
      continue;
    }
    if (ERRATA_EXCLUDED[head[1]]) {
      skipped.push({ source: `tartaria-tablets/${file}`, locator: head[1], reason: ERRATA_EXCLUDED[head[1]] });
      continue;
    }
    const answerChars = clean(original[1]).length + clean(checked[1]).length;
    if (POINTER_ANSWER.test(clean(original[1])) || answerChars < MIN_ERRATA_ANSWER_CHARS) {
      skipped.push({ source: `tartaria-tablets/${file}`, locator: head[1], reason: `recorded answer is a pointer or too thin to score (${answerChars} chars)` });
      continue;
    }
    const caveat = /^Settled$/i.test(statusText) ? null : `source status: ${statusText}`;
    rows.push(
      makeRow("tartaria-tablets", file, head[1], {
        form: "source_errata",
        domain: "tartaria/scholarly-source-errata",
        label: "settled",
        caveat,
        question:
          "A published source prints the following. Is it correct? State what the original actually is " +
          `and how that was checked.\n\n${clean(asPrinted[1])}`,
        reference:
          `The original: ${clean(original[1])}\n\nChecked: ${clean(checked[1])}\n\nStatus: ${statusText}.`,
      }),
    );
  }
  return rows;
}

// ---- tartaria draft sweep --------------------------------------------------

function sweepRows(sourcesDir, skipped) {
  const file = "draft-sweep-findings.md";
  const text = readPinned(sourcesDir, "tartaria-tablets", file);
  const start = text.indexOf("## Already correct");
  const end = text.indexOf("\n## ", start + 5);
  const section = text.slice(start, end === -1 ? undefined : end);
  const rows = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^\| (?!Claim|---)(.+?) \| (.+?) \| (\*\*Correct.*)\|\s*$/);
    if (!match) continue;
    rows.push(
      makeRow("tartaria-tablets", file, `already-correct table row ${rows.length + 1}`, {
        form: "claim_verification",
        domain: "tartaria/manuscript-claim-check",
        label: "correct",
        question:
          "A book manuscript draft makes this claim. Checked against the verified sources, is it correct? " +
          `Claim topic: "${match[1]}" (draft location: ${match[2]}).`,
        reference: `Verdict: ${match[3].replace(/\*\*/g, "").trim()}`,
      }),
    );
  }
  void skipped;
  return rows;
}

// ---- risingaloha debunks (public) ------------------------------------------

function debunkRows(sourcesDir, skipped) {
  const file = "data/debunks.json";
  const entries = JSON.parse(readPinned(sourcesDir, "risingaloha", file));
  const rows = [];
  for (const entry of entries) {
    if (!entry.verdict || !entry.claim || !entry.summary) {
      skipped.push({ source: `risingaloha/${file}`, locator: entry.slug || "?", reason: "missing verdict, claim or summary" });
      continue;
    }
    rows.push(
      makeRow("risingaloha", file, entry.slug, {
        form: "claim_verification",
        domain: "health-claims/fact-check",
        label: entry.verdict,
        question: `Fact-check this claim and give a verdict with the main reasons: "${entry.claim}"`,
        reference: `Verdict: ${entry.verdict}. ${entry.oneLiner} ${entry.summary}`,
      }),
    );
  }
  return rows;
}

// ---- assembly --------------------------------------------------------------

function buildRows(sourcesDir) {
  const skipped = [];
  const rows = [
    ...ledgerRows(sourcesDir, skipped),
    ...wineRows(sourcesDir, skipped),
    ...errataRows(sourcesDir, skipped),
    ...sweepRows(sourcesDir, skipped),
    ...debunkRows(sourcesDir, skipped),
  ];
  const kept = [];
  for (const row of rows) {
    // A reference that still carries the source's own [VERIFY] mark is not a settled answer.
    if (/\[VERIFY/.test(row.reference_answer)) {
      skipped.push({ source: `${row.source_repo.split("/")[1]}/${row.source_path}`, locator: row.source_locator, reason: "reference answer carries a [VERIFY] mark in the source" });
    } else {
      kept.push(row);
    }
  }
  rows.length = 0;
  rows.push(...kept);
  const counters = {};
  const repoShort = { "linear-a": "la", "tartaria-tablets": "tt", risingaloha: "ra" };
  const formShort = { ledger_hypothesis: "ledger", claim_verification: "claim", source_errata: "errata" };
  for (const row of rows) {
    const key = `${repoShort[row.source_repo.split("/")[1]]}-${formShort[row.question_form]}`;
    counters[key] = (counters[key] || 0) + 1;
    row.id = `rg1-${key}-${String(counters[key]).padStart(3, "0")}`;
    row.question_sha256 = sha256(row.question);
    row.reference_sha256 = sha256(row.reference_answer);
  }
  return { rows, skipped };
}

function toPublicRow(row) {
  const out = { ...row };
  if (row.visibility === "private") {
    out.question = null;
    out.reference_answer = null;
  }
  return out;
}

function serialize(rows) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  if (!args.sources) {
    process.stderr.write("usage: build-research-gold.js --sources DIR [--public FILE] [--private FILE] [--verify FILE]\n");
    return 2;
  }
  const { rows, skipped } = buildRows(args.sources);
  const publicText = serialize(rows.map(toPublicRow));
  if (args.verify) {
    const committed = fs.readFileSync(args.verify, "utf8");
    if (committed !== publicText) {
      process.stderr.write("rebuilt public fixture differs from the committed one\n");
      return 1;
    }
    process.stdout.write(`verified ${rows.length} rows against ${args.verify}\n`);
  }
  if (args.public) fs.writeFileSync(args.public, publicText);
  if (args.private) fs.writeFileSync(args.private, serialize(rows));
  const byRepo = {};
  for (const row of rows) byRepo[row.source_repo] = (byRepo[row.source_repo] || 0) + 1;
  process.stdout.write(`${JSON.stringify({ count: rows.length, byRepo, skipped: skipped.length })}\n`);
  if (args.skipped) fs.writeFileSync(args.skipped, JSON.stringify(skipped, null, 2) + "\n");
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { PINS, buildRows, gitBlobSha, serialize, sha256, toPublicRow };
