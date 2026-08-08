const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const engine = require(path.join(__dirname, "..", "lib", "goap-engine.js"));

test("defaults expose catalog + version", () => {
  const d = engine.getDefaults();
  assert.equal(d.engineVersion, engine.ENGINE_VERSION);
  assert.ok(d.actions.length >= 10);
  assert.ok(d.goals.length >= 3);
  assert.ok(d.agents.length >= 3);
});

test("planGoap finds green-main path from fresh world", () => {
  const goal = engine.DEFAULT_GOALS.find((g) => g.id === "repo-green");
  const result = engine.planGoap(engine.DEFAULT_WORLD, goal, engine.DEFAULT_ACTIONS);
  assert.equal(result.ok, true);
  assert.ok(result.plan.length >= 5);
  const ids = result.plan.map((a) => a.id);
  assert.ok(ids.includes("clone-repo"));
  assert.ok(ids.includes("install-deps"));
  assert.ok(ids.includes("merge-pr"));
  assert.ok(result.cost > 0);
});

test("planGoap returns empty plan when goal satisfied", () => {
  const world = {
    ...engine.DEFAULT_WORLD,
    testsPassing: true,
    lintClean: true,
    merged: true,
    repoGreen: true,
  };
  const goal = engine.DEFAULT_GOALS.find((g) => g.id === "repo-green");
  const result = engine.planGoap(world, goal, engine.DEFAULT_ACTIONS);
  assert.equal(result.ok, true);
  assert.equal(result.plan.length, 0);
  assert.equal(result.reason, "goal-already-satisfied");
});

test("awareness flags failing tests and blocked work", () => {
  const a = engine.runAwareness({
    ...engine.DEFAULT_WORLD,
    testsPassing: false,
    blocked: true,
  });
  assert.equal(a.healthy, false);
  assert.ok(a.anomalies.some((x) => x.atom === "testsPassing"));
  assert.ok(a.anomalies.some((x) => x.atom === "blocked"));
  assert.ok(a.awarenessScore < 100);
});

test("precog recommends execute for valid complete plan", () => {
  const goal = engine.DEFAULT_GOALS.find((g) => g.id === "ship-preview");
  const world = {
    ...engine.DEFAULT_WORLD,
    workspaceReady: true,
    depsInstalled: true,
    testsPassing: true,
    lintClean: true,
  };
  const planned = engine.planGoap(world, goal, engine.DEFAULT_ACTIONS);
  const precog = engine.runPrecog(world, planned.plan, goal);
  assert.equal(planned.ok, true);
  assert.equal(precog.recommendation, "execute");
  assert.ok(precog.successProbability >= 0.8);
  assert.equal(precog.finalState.deployed, true);
});

test("guilt escalates on high-priority open goals", () => {
  const guilt = engine.runGuilt(engine.DEFAULT_WORLD, engine.DEFAULT_GOALS, {
    threshold: 40,
  });
  assert.ok(guilt.guiltScore >= 40);
  assert.equal(guilt.escalate, true);
  assert.equal(guilt.action, "spawn-recovery-swarm");
  assert.ok(guilt.openGoals.length > 0);
});

test("assignSwarm leases actions to role-capable agents", () => {
  const plan = [
    { id: "run-tests", name: "Run tests", role: "tester", cost: 1, preconditions: {}, effects: {} },
    { id: "open-pr", name: "Open PR", role: "builder", cost: 1, preconditions: {}, effects: {} },
  ];
  const swarm = engine.assignSwarm(plan, engine.DEFAULT_AGENTS);
  assert.equal(swarm.assignments.length, 2);
  assert.equal(swarm.topology, "centralized-allocator-decentralized-executors");
  const tester = swarm.assignments[0];
  assert.ok(tester.agentId);
  assert.equal(tester.lease.agentId, tester.agentId);
  assert.ok(Object.keys(swarm.leases).length >= 2);
});

test("runSwarmTick blocked scenario self-heals via research/swarm actions", () => {
  const scenario = engine.listScenarios().find((s) => s.id === "blocked-research");
  const tick = engine.runSwarmTick({
    world: scenario.world,
    goalId: scenario.goalId,
  });
  assert.ok(["ready", "watch", "blocked"].includes(tick.status));
  assert.equal(tick.goal.id, "self-heal");
  assert.equal(tick.plan.ok, true);
  const ids = tick.plan.plan.map((a) => a.id);
  assert.ok(ids.includes("deep-research") || ids.includes("spawn-swarm"));
  assert.ok(tick.metrics.planLength >= 1);
  assert.match(engine.buildMarkdownReport(tick), /GOAP Swarm Run Report/);
  assert.match(engine.buildCsvExport(tick), /action_id/);
});

test("research evaluation includes keywords, monetization, citations", () => {
  const r = engine.getResearchEvaluation();
  assert.ok(r.marketingKeywords.length >= 5);
  assert.ok(r.bugsAndRisks.some((b) => b.id === "b-perf-claim"));
  assert.ok(r.betterTech.some((t) => t.id === "t-symbolic-first"));
  assert.ok(r.monetizationPath.length > 20);
  assert.ok(r.citations.length >= 3);
  assert.ok(r.validated.every((v) => v.confidence));
});

test("stigmergy decay reduces trails and bias lowers plan cost", () => {
  const trails = engine.updateTrails({ "run-tests": 50 }, {}, { decay: 0.2 });
  assert.ok(trails["run-tests"] < 50);
  const goal = {
    id: "t",
    name: "t",
    priority: 50,
    desired: { testsPassing: true },
  };
  const world = {
    ...engine.DEFAULT_WORLD,
    workspaceReady: true,
    depsInstalled: true,
    testsObserved: true,
  };
  const plain = engine.planGoap(world, goal, engine.DEFAULT_ACTIONS, { trailBias: {} });
  const biased = engine.planGoap(world, goal, engine.DEFAULT_ACTIONS, {
    trailBias: { "fix-failing-tests": 80, "run-tests": 80 },
  });
  assert.equal(plain.ok, true);
  assert.equal(biased.ok, true);
  assert.ok(biased.cost <= plain.cost);
});
