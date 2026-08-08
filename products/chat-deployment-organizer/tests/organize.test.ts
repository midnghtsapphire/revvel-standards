import assert from "node:assert/strict";
import {
  DEMO_CHAT,
  FINISHER_PIPELINE,
  classifyText,
  filterChatLines,
  isNoiseLine,
  mapTarget,
  organizeChat,
  toMarkdown,
  toWrPackMarkdown,
} from "../app/data/organize";

{
  assert.equal(isNoiseLine("Ctrl+J"), true);
  assert.equal(isNoiseLine("Worked for 15m 55s"), true);
  assert.equal(isNoiseLine("Create Gumroad SKUs at $99"), false);
}

{
  const filtered = filterChatLines(DEMO_CHAT);
  assert.ok(filtered.dropped > 0);
  assert.ok(filtered.kept.join("\n").includes("revvel-finishers"));
  assert.ok(!filtered.kept.join("\n").includes("Skip to content"));
}

{
  assert.equal(classifyText("Gumroad vault $99 packs $29"), "commerce_action");
  assert.equal(mapTarget("commerce_action", "Gumroad vault $99"), "gumroad");
  assert.equal(classifyText("daily-digest Vercel deploy"), "product_ship");
  assert.equal(classifyText("returned 403 permission gap"), "blocker");
}

{
  const result = organizeChat(DEMO_CHAT, { sourceName: "demo.txt" });
  assert.equal(result.deploymentPlan.length, FINISHER_PIPELINE.length);
  assert.equal(result.workRequests.length, 8);
  for (let i = 0; i < result.deploymentPlan.length; i += 1) {
    assert.equal(result.deploymentPlan[i].order, i);
  }
  assert.ok(result.stats.blockerCount >= 1);
  assert.ok(result.deploymentPlan.some((lane) => lane.status === "ready"));
  assert.ok(result.deploymentPlan.some((lane) => lane.status === "deferred"));

  const md = toMarkdown(result);
  assert.match(md, /Ordered deployment plan/);
  assert.match(md, /Monetization path/);
  assert.match(md, /Marketing \/ SEO keywords/);

  const pack = toWrPackMarkdown(result);
  assert.match(pack, /\[WR\] Finisher-0/);
  assert.match(pack, /REVENUE_GATE/);
}

console.log("✅ chat-deployment-organizer tests passed.");
