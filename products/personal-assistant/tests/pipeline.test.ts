import assert from "node:assert/strict";
import {
  SAMPLE_FRAGMENTS,
  buildCsvExport,
  buildMarkdownExport,
  classifyFragment,
  ingestFragments,
  redactFragment,
  runPipeline,
  structureFiles,
} from "../app/data/pipeline";

{
  const normalized = ingestFragments([
    { source: "gmail", body: "  Hello world\nSecond line  " },
    { source: "unknown-source", body: "" },
    { source: "sms", title: "Ping", body: "Call me" },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].source, "gmail");
  assert.equal(normalized[0].title, "Hello world");
  assert.equal(normalized[1].source, "sms");
  assert.equal(normalized[1].title, "Ping");
}

{
  const [normalized] = ingestFragments([
    {
      source: "gmail",
      body: "Email ops@example.com or call +1 415-555-0182 and ping @midnghtsapphire please.",
    },
  ]);
  const redacted = redactFragment(normalized);
  assert.match(redacted.redactedBody, /\[REDACTED_EMAIL\]/);
  assert.match(redacted.redactedBody, /\[REDACTED_PHONE\]/);
  assert.match(redacted.redactedBody, /\[REDACTED_HANDLE\]/);
  assert.equal(redacted.redactions.emails, 1);
  assert.equal(redacted.redactions.phones, 1);
  assert.equal(redacted.redactions.handles, 1);
  assert.doesNotMatch(redacted.redactedBody, /ops@example\.com/);
  assert.doesNotMatch(redacted.redactedBody, /415-555-0182/);
  assert.doesNotMatch(redacted.redactedBody, /@midnghtsapphire/);
}

{
  const [action] = ingestFragments([
    {
      source: "gmail",
      body: "Action item: please review the PR and follow up by Friday deadline.",
    },
  ]);
  const classified = classifyFragment(redactFragment(action));
  assert.equal(classified.category, "action-item");
  assert.ok(classified.confidence > 0.2);
}

{
  const [meeting] = ingestFragments([
    {
      source: "outlook",
      body: "Teams meeting tomorrow at 10:00 with agenda and dial-in.",
    },
  ]);
  assert.equal(classifyFragment(redactFragment(meeting)).category, "meeting");
}

{
  const [research] = ingestFragments([
    {
      source: "drive",
      body: "Competitor benchmark research deep dive with market size citations.",
    },
  ]);
  assert.equal(classifyFragment(redactFragment(research)).category, "research");
}

{
  const [finance] = ingestFragments([
    {
      source: "sms",
      body: "Invoice amount due $480 — send payment receipt please.",
    },
  ]);
  assert.equal(classifyFragment(redactFragment(finance)).category, "finance");
}

{
  const result = runPipeline(SAMPLE_FRAGMENTS, {
    owner: "midnghtsapphire",
    repoName: "personal-knowledge-base",
    defaultBranch: "main",
  });

  assert.equal(result.summary.fragmentCount, SAMPLE_FRAGMENTS.length);
  assert.ok(result.summary.fileCount >= SAMPLE_FRAGMENTS.length);
  assert.ok(result.summary.redactionTotals.emails >= 1);
  assert.ok(result.summary.redactionTotals.phones >= 1);
  assert.ok(result.directoryTree.some((path) => path.includes("inbox/") || path.includes("docs/")));
  assert.ok(result.commitPlan.some((step) => step.action === "open_pr"));
  assert.ok(result.agentLog.length >= 5);
  assert.match(result.markdownExport, /Personal Assistant Structure Plan/);
  assert.match(result.markdownExport, /personal-knowledge-base/);
  assert.match(result.csvExport, /"path","category","source","title","fragment_ids"/);

  const files = structureFiles(result.fragments);
  assert.ok(files.every((file) => file.path.endsWith(".md")));
  assert.ok(files.some((file) => file.path.includes("_index.md")));

  const md = buildMarkdownExport({
    summary: result.summary,
    fragments: result.fragments,
    files: result.files,
    directoryTree: result.directoryTree,
    commitPlan: result.commitPlan,
    agentLog: result.agentLog,
  });
  assert.match(md, /Category breakdown/);

  const csv = buildCsvExport(result.files);
  assert.ok(csv.split("\n").length > 2);
}

{
  const empty = runPipeline([]);
  assert.equal(empty.summary.fragmentCount, 0);
  assert.equal(empty.summary.fileCount, 0);
  assert.deepEqual(empty.files, []);
}

console.log("✅ Personal assistant pipeline tests passed.");
