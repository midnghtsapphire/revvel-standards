const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const productPublic = path.join(
  __dirname,
  "..",
  "products",
  "caspian-channel-console",
  "public"
);
const docsPublic = path.join(__dirname, "..", "docs", "caspian-channel-console");

const engine = require(path.join(productPublic, "caspian-engine.js"));

test("research packet includes stars, keywords, and citations fields", () => {
  const r = engine.getResearch();
  assert.equal(r.repo, "TryCaspian/caspian-sdk");
  assert.ok(r.stars >= 1);
  assert.equal(r.starsConfidence, "observed");
  assert.ok(Array.isArray(r.keywords) && r.keywords.length >= 5);
  assert.match(r.url, /github\.com\/TryCaspian\/caspian-sdk/);
  assert.match(r.gateway, /trycaspianai\.com/);
});

test("channel catalog covers core free and paid transports", () => {
  const channels = engine.listChannels();
  assert.ok(channels.length >= 10);
  const ids = channels.map((c) => c.id);
  for (const id of ["email", "slack", "discord", "telegram", "x", "whatsapp"]) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
  const email = engine.getChannel("email");
  assert.equal(email.costTier, "free");
  assert.equal(email.liveOnGateway, true);
  assert.throws(() => engine.getChannel("nope"), /Unknown channel/);
});

test("normalizeAgentName sanitizes and validates", () => {
  assert.equal(engine.normalizeAgentName("Revvel Scout"), "revvel-scout");
  assert.equal(engine.normalizeAgentName("  A1  "), "a1");
  assert.throws(() => engine.normalizeAgentName(""), /required/);
  assert.throws(() => engine.normalizeAgentName("x"), /at least 2/);
});

test("buildBlueprint wires email address and warnings for paid channels", () => {
  const bp = engine.buildBlueprint({
    agentName: "Nova Bot",
    channels: ["email", "x", "slack"],
    persona: "Support",
    language: "python",
  });
  assert.equal(bp.agentName, "nova-bot");
  assert.equal(bp.emailAddress, "nova-bot@agents.trycaspianai.com");
  assert.equal(bp.stats.channelCount, 3);
  assert.ok(bp.warnings.some((w) => /prepaid credit|account sign-in/i.test(w)));
  assert.throws(
    () => engine.buildBlueprint({ agentName: "ok", channels: [] }),
    /at least one channel/
  );
});

test("estimateCost sums channel base + variable and applies plan", () => {
  const est = engine.estimateCost({
    channels: ["email", "sms"],
    messagesPerMonth: 10000,
    planId: "starter",
  });
  assert.equal(est.plan.id, "starter");
  assert.equal(est.planUsd, 29);
  assert.ok(est.channelTotalUsd >= 0);
  assert.equal(est.perChannel.length, 2);
  assert.ok(est.totalUsd >= est.planUsd);
  assert.throws(
    () => engine.estimateCost({ channels: ["email"], messagesPerMonth: -1 }),
    /non-negative/
  );
});

test("buildBehaviorPrompt includes each selected channel", () => {
  const prompt = engine.buildBehaviorPrompt(["email", "telegram"]);
  assert.match(prompt, /Email:/);
  assert.match(prompt, /Telegram:/);
  assert.match(prompt, /single agent identity/i);
});

test("generateIntegrationCode emits python and typescript handlers", () => {
  const py = engine.generateIntegrationCode({
    agentName: "scout",
    channels: ["email", "telegram"],
    language: "python",
  });
  assert.match(py, /from caspian_sdk import CommClient/);
  assert.match(py, /connect_email\(username="scout"\)/);
  assert.match(py, /@client\.on_message/);
  assert.match(py, /message\.reply/);

  const ts = engine.generateIntegrationCode({
    agentName: "scout",
    channels: ["email", "discord"],
    language: "typescript",
  });
  assert.match(ts, /from "caspian-sdk"/);
  assert.match(ts, /connectEmail/);
  assert.match(ts, /onMessage/);
});

test("simulateConversation replies on the inbound channel thread", () => {
  const sim = engine.simulateConversation({
    agentName: "scout",
    channels: ["email", "slack"],
    persona: "Helpful",
    inbound: [
      { channel: "email", sender: "a@b.com", text: "Hello" },
      { channel: "slack", sender: "U1", text: "Status?" },
    ],
  });
  assert.equal(sim.summary.inbound, 2);
  assert.equal(sim.summary.outbound, 2);
  assert.equal(sim.events[0].direction, "inbound");
  assert.equal(sim.events[1].direction, "outbound");
  assert.equal(sim.events[1].channel, "email");
  assert.match(sim.events[1].text, /Hello/);
  assert.equal(sim.events[3].channel, "slack");
  assert.throws(
    () =>
      engine.simulateConversation({
        agentName: "scout",
        channels: ["email"],
        inbound: [{ channel: "slack", text: "nope" }],
      }),
    /not in blueprint/
  );
});

test("exportBlueprintMarkdown and JSON include monetization + citations", () => {
  const md = engine.exportBlueprintMarkdown({
    agentName: "scout",
    channels: ["email", "discord"],
    language: "python",
    messagesPerMonth: 5000,
    planId: "pro",
  });
  assert.match(md, /Agent blueprint: scout/);
  assert.match(md, /527/);
  assert.match(md, /Behavior prompt/);
  assert.match(md, /Integration code/);
  assert.match(md, /trycaspianai\.com/);

  const json = engine.exportBlueprintJson({
    agentName: "scout",
    channels: ["email"],
    language: "typescript",
  });
  assert.equal(json.research.stars, engine.getResearch().stars);
  assert.ok(json.code.includes("CommClient"));
  assert.ok(json.cost.totalUsd >= 0);
});

test("recommendChannels maps use cases and rejects unknown", () => {
  const support = engine.recommendChannels("support");
  assert.ok(support.some((c) => c.id === "email"));
  assert.ok(support.some((c) => c.id === "slack"));
  assert.throws(() => engine.recommendChannels("nope"), /Unknown use case/);
});

test("pricing tiers and gateway checklist are complete", () => {
  const tiers = engine.listPricingTiers();
  assert.equal(tiers.length, 3);
  assert.ok(tiers.every((t) => t.priceUsd > 0 && t.features.length >= 3));
  const steps = engine.gatewayChecklist();
  assert.ok(steps.length >= 5);
  assert.ok(steps.some((s) => /sandbox/i.test(s.command)));
});

test("competitors list supports research checklist", () => {
  const comps = engine.listCompetitors();
  assert.ok(comps.length >= 3);
  assert.ok(comps.every((c) => c.name && c.weakness && c.ourEdge));
});

test("docs deploy copy stays in sync with products/public SPA assets", () => {
  for (const file of ["caspian-engine.js", "app.js", "styles.css", "index.html"]) {
    const a = fs.readFileSync(path.join(productPublic, file), "utf8");
    const b = fs.readFileSync(path.join(docsPublic, file), "utf8");
    assert.equal(a, b, `${file} diverged between products/public and docs/`);
  }
});
