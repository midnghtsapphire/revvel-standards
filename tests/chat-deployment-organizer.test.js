"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  organizeChat,
  filterChatLines,
  isNoiseLine,
  classifyText,
  mapTarget,
  FINISHER_PIPELINE,
  toMarkdown,
} = require("../scripts/chat-deployment-organizer");

const REPO_ROOT = path.join(__dirname, "..");
const CLI = path.join(REPO_ROOT, "scripts", "chat-deployment-organizer.js");

const SAMPLE_CHAT = `
Ctrl+K
Ctrl+J

Worked for 26s

Skip to content
Marketplace

I want to create repository revvel-finishers that clean up all fragmented code.
REVENUE_GATE — name buyer, channel, price. Scripts before agents.

WR / PR order (do not scramble)
0 Finisher-0 Create revvel-finishers + SYSTEM_PROMPT
1 Finisher-1 Run build_skills_vault.py + build_packs.py → products/dist
2 Finisher-2 Gumroad live: vault $99, packs $29, R&D $399
3 Finisher-3 daily-digest push + Vercel
Issue create returned 403 (same App permission gap).

Bottom line: commerce last-mile is the blocker; finishers should be script-first.
audit-404s.sh should curl product URLs and fail on HTTP 404.

Next Move: Create revvel-finishers + grant App access.
`;

test("isNoiseLine drops UI chrome and keeps substance", () => {
  assert.equal(isNoiseLine("Ctrl+K"), true);
  assert.equal(isNoiseLine("Worked for 26s"), true);
  assert.equal(isNoiseLine("Skip to content"), true);
  assert.equal(isNoiseLine(""), true);
  assert.equal(isNoiseLine("Create revvel-finishers seed package"), false);
});

test("filterChatLines reduces noise from sample dump", () => {
  const { kept, dropped, rawLines } = filterChatLines(SAMPLE_CHAT);
  assert.ok(rawLines > kept.length);
  assert.ok(dropped > 0);
  const joined = kept.join("\n");
  assert.match(joined, /revvel-finishers/);
  assert.doesNotMatch(joined, /Ctrl\+K/);
  assert.doesNotMatch(joined, /Skip to content/);
});

test("classifyText and mapTarget route commerce and blockers", () => {
  assert.equal(classifyText("Gumroad live vault $99 packs $29"), "commerce_action");
  assert.equal(mapTarget("commerce_action", "Gumroad live vault $99"), "gumroad");
  assert.equal(classifyText("Issue create returned 403 permission gap"), "blocker");
  assert.equal(classifyText("daily-digest push + Vercel deploy"), "product_ship");
  assert.equal(mapTarget("product_ship", "daily-digest push + Vercel"), "vercel-app");
});

test("organizeChat emits ordered Finisher deployment plan and WRs", () => {
  const result = organizeChat(SAMPLE_CHAT, { sourceName: "sample.txt" });
  assert.equal(result.pipeline.length, FINISHER_PIPELINE.length);
  assert.equal(result.deploymentPlan.length, 8);
  assert.equal(result.workRequests.length, 8);

  // Money path must stay ordered 0..7
  for (let i = 0; i < result.deploymentPlan.length; i += 1) {
    assert.equal(result.deploymentPlan[i].order, i);
    assert.equal(result.workRequests[i].order, i);
  }

  assert.ok(result.stats.droppedLines > 0);
  assert.ok(result.stats.segmentCount >= 1);
  assert.ok(result.blockers.length >= 1, "403 permission gap should surface as blocker");
  assert.match(result.workRequests[0].title, /\[WR\] Finisher-0/);
  assert.match(result.workRequests[2].body, /\$99|Gumroad|gumroad/i);

  const md = toMarkdown(result);
  assert.match(md, /Ordered deployment plan/);
  assert.match(md, /Monetization path/);
  assert.match(md, /Marketing \/ SEO keywords/);
});

test("CLI --input --format markdown exits 0 and prints plan", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cdo-"));
  const input = path.join(dir, "chat.txt");
  fs.writeFileSync(input, SAMPLE_CHAT, "utf8");

  const result = spawnSync(process.execPath, [CLI, "--input", input, "--format", "markdown"], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });

  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /Chat → Deployment Plan/);
  assert.match(result.stdout, /Finisher-0/);
});

test("CLI rejects missing args with exit 2", () => {
  const result = spawnSync(process.execPath, [CLI], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});
