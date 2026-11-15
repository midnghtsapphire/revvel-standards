#!/usr/bin/env node
"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const engine = require("../scripts/research-engine.js");
const pot = require("../scripts/pot-research");
const { applyGroupUpdate, groupRelativeAdvantages } = require("../scripts/pot-research/grpo");
const { puctScore, uctScore } = require("../scripts/pot-research/mcts");
const { StubPolicy, TransientAdapter } = require("../scripts/pot-research/policy");
const { inspectEvaluationSet, main: runBenchmark } = require("../scripts/pot-research/benchmark");
const { runPotOverLanes } = require("../scripts/pot-research/strategy");

const TOY_OPTIONS = { iterations: 40, seed: 18341, learningRate: 0.1 };

describe("pot-research", () => {
  test("MCTS finds the toy optimum and the linear walk keeps the trap", () => {
    const problem = pot.toyTrapProblem();
    const searched = pot.runStrategy("pot", problem, TOY_OPTIONS);
    const linear = pot.runStrategy("linear", problem);
    const defaulted = pot.runStrategy(undefined, problem);

    assert.deepStrictEqual(searched.best.path, problem.optimum.path);
    assert.strictEqual(searched.best.reward, problem.optimum.reward);
    assert.strictEqual(searched.strategy, "pot");
    assert.strictEqual(searched.potTrace.selection, "uct");

    assert.deepStrictEqual(linear.best.path, problem.linearTrap.path);
    assert.strictEqual(linear.best.reward, problem.linearTrap.reward);
    assert.strictEqual(linear.strategy, "linear");
    assert.strictEqual(linear.potTrace, null);
    assert.strictEqual(defaulted.strategy, "linear");
    assert.deepStrictEqual(defaulted.best.path, problem.linearTrap.path);
  });

  test("PUCT with uniform priors also reaches the toy optimum", () => {
    const problem = pot.toyTrapProblem();
    const searched = pot.runStrategy("pot", problem, { ...TOY_OPTIONS, selection: "puct" });
    assert.deepStrictEqual(searched.best.path, problem.optimum.path);
    assert.strictEqual(searched.potTrace.selection, "puct");
  });

  test("a seeded rollout can reach a suffix the first legal action never takes", () => {
    const { search } = require("../scripts/pot-research/mcts");
    const problem = {
      root: "S",
      legalActions(state) {
        if (state === "S") return ["0", "1"];
        if (state === "0" || state === "1") return ["0", "1"];
        if (state === "00" || state === "01" || state === "10" || state === "11") return ["0", "1"];
        return [];
      },
      next(state, action) {
        return state === "S" ? action : `${state}${action}`;
      },
      isTerminal(state) {
        return state.length === 3;
      },
      reward(state) {
        return state === "111" ? 5 : 0;
      },
    };
    let foundSeed = null;
    for (let seed = 1; seed <= 200 && foundSeed == null; seed += 1) {
      const run = search(problem, { iterations: 24, seed, selection: "uct" });
      if (run.best.reward === 5) foundSeed = seed;
    }
    assert.ok(foundSeed, "a seeded sample should reach path 111 within 200 seeds");
    const first = search(problem, { iterations: 24, seed: foundSeed, selection: "uct" });
    const second = search(problem, { iterations: 24, seed: foundSeed, selection: "uct" });
    assert.strictEqual(first.best.reward, 5);
    assert.deepStrictEqual(second.trajectories.map((item) => item.path.join("")), first.trajectories.map((item) => item.path.join("")));
    const other = search(problem, { iterations: 24, seed: foundSeed + 997, selection: "uct" });
    const samePaths = other.trajectories.every((item, index) => item.path.join("") === first.trajectories[index].path.join(""));
    assert.strictEqual(samePaths, false);
  });

  test("PUCT expansion follows the prior instead of legal order", async () => {
    const { search } = require("../scripts/pot-research/mcts");
    const problem = {
      root: "S",
      legalActions() {
        return ["low", "mid", "high"];
      },
      next(_state, action) {
        return action;
      },
      isTerminal(state) {
        return state !== "S";
      },
      reward() {
        return 1;
      },
    };
    const priorFor = (_state, action) => ({ low: 0.05, mid: 0.1, high: 0.85 })[action];
    const run = search(problem, {
      iterations: 1,
      seed: 1,
      selection: "puct",
      priorFor,
    });
    assert.deepStrictEqual(run.best.path, ["high"]);

    const throughStrategy = pot.runStrategy("pot", problem, {
      iterations: 1,
      seed: 1,
      selection: "puct",
      priorFor,
    });
    assert.deepStrictEqual(throughStrategy.best.path, ["high"]);

    const laneRun = await runPotOverLanes(
      {
        query: "prior",
        dryRun: true,
        depth: "standard",
        potIterations: 1,
        potSelection: "puct",
        seed: 1,
        potPriorFor: (_state, action) => (action === "high" ? 0.9 : 0.05),
      },
      async () => "Mocked prior output with source https://example.com/prior",
      {
        lanes: [{ id: "low" }, { id: "high" }],
        runLane: engine.runLane,
        maxIterations: 1,
      },
    );
    assert.strictEqual(laneRun.potTrace.chosenLaneIds[0], "high");
  });

  test("UCT prefers an unvisited child and PUCT increases with the prior", () => {
    const parent = { visits: 8 };
    const visited = { visits: 2, valueSum: 4, parent, prior: 0.2 };
    const unvisited = { visits: 0, valueSum: 0, parent, prior: 0.2 };
    assert.strictEqual(uctScore(unvisited, Math.SQRT2), Number.POSITIVE_INFINITY);
    assert.ok(uctScore(visited, Math.SQRT2) > 4 / 2);

    const low = { visits: 2, valueSum: 4, parent, prior: 0.1 };
    const high = { visits: 2, valueSum: 4, parent, prior: 0.9 };
    assert.ok(puctScore(high, 1.5) > puctScore(low, 1.5));
  });

  test("GRPO advantages sum to about 0 and move the adapter toward higher rewards", () => {
    const adapter = new TransientAdapter(["low", "mid", "high"]);
    const updated = applyGroupUpdate(
      adapter,
      [
        { id: "low", reward: 1 },
        { id: "mid", reward: 3 },
        { id: "high", reward: 5 },
      ],
      { learningRate: 0.1 },
    );
    assert.ok(Math.abs(updated.sum) < 1e-9, `advantage sum ${updated.sum}`);
    assert.ok(adapter.get("high") > 0);
    assert.ok(adapter.get("low") < 0);
    assert.ok(adapter.get("high") > adapter.get("low"));

    const flat = groupRelativeAdvantages([4, 4, 4]);
    assert.deepStrictEqual(flat.advantages, [0, 0, 0]);
    const flatAdapter = new TransientAdapter(["a"]);
    const flatUpdate = applyGroupUpdate(flatAdapter, [{ id: "a", reward: 4 }], { learningRate: 1 });
    assert.strictEqual(flatUpdate.sum, 0);
    assert.strictEqual(flatAdapter.get("a"), 0);
  });

  test("a full PoT run keeps the base hash, discards the adapter, and centers advantages", () => {
    const input = [0.11, 0.23, 0.37, 0.41];
    const policy = new StubPolicy(input);
    const before = policy.baseHash();
    input[0] = 999;
    assert.strictEqual(policy.baseHash(), before, "caller input must not alias the frozen base");

    const first = pot.runStrategy("pot", pot.toyTrapProblem(), { ...TOY_OPTIONS, policy });
    const copy = policy.baseValues();
    copy[0] = -12345;
    assert.strictEqual(policy.baseHash(), before);
    assert.strictEqual(first.potTrace.baseHashBefore, before);
    assert.strictEqual(first.potTrace.baseHashAfter, before);
    assert.strictEqual(first.potTrace.adapterDiscarded, true);
    assert.strictEqual(policy.activeAdapter, null);
    assert.strictEqual(first.adapter.discarded, true);
    assert.throws(() => first.adapter.get("R1"), /discarded/);
    assert.ok(Math.abs(first.potTrace.advantageSum) < 1e-8);
    const high = first.potTrace.deltas.find((delta) => delta.reward === pot.toyTrapProblem().optimum.reward);
    const low = first.potTrace.deltas.reduce((worst, delta) => (delta.reward < worst.reward ? delta : worst));
    assert.ok(high, "the optimum terminal must appear in the GRPO group");
    assert.ok(high.advantage > low.advantage);
    assert.ok(high.delta > low.delta);

    const second = pot.runStrategy("pot", pot.toyTrapProblem(), { ...TOY_OPTIONS, policy });
    assert.notStrictEqual(second.adapter, first.adapter);
    assert.strictEqual(second.adapter.discarded, true);
    assert.strictEqual(policy.activeAdapter, null);
    assert.strictEqual(policy.baseHash(), before);
  });

  test("the strategy switch rejects unknown names", () => {
    assert.throws(() => pot.resolveResearchStrategy("beam"), /Unknown research strategy/);
    assert.strictEqual(pot.resolveResearchStrategy("POT"), "pot");
    assert.strictEqual(pot.resolveResearchStrategy(""), "linear");
  });

  test("the research orchestrator defaults to linear and selects PoT when asked", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pot-engine-"));
    const callerLog = [];
    const caller = async ({ model }) => {
      callerLog.push(model);
      return `Mocked ${model} output with source https://example.com/${callerLog.length}`;
    };
    const base = {
      apiKey: "test-key",
      githubToken: "",
      repository: "midnghtsapphire/revvel-standards",
      issueNumber: "",
      prNumber: "",
      query: "Order the research lanes",
      issueTitle: "",
      issueBody: "",
      depth: "standard",
      extraContext: "",
      dryRun: true,
    };
    const linear = await engine.runResearchEngine(
      { ...base, outputFile: path.join(tmpDir, "linear.md") },
      caller,
    );
    const afterLinear = callerLog.length;
    assert.strictEqual(linear.strategy, "linear");
    assert.strictEqual(linear.potTrace, null);
    assert.strictEqual(linear.status, "complete");
    assert.deepStrictEqual(
      linear.laneReports.map((report) => report.id),
      engine.LANE_DEFINITIONS.map((lane) => lane.id),
    );

    const target = engine.LANE_DEFINITIONS[engine.LANE_DEFINITIONS.length - 1].id;
    const potRun = await engine.runResearchEngine(
      {
        ...base,
        strategy: "pot",
        outputFile: path.join(tmpDir, "pot.md"),
        potReward: (lanePath) => (lanePath[0] === target ? 1 : 0),
      },
      caller,
    );
    assert.strictEqual(potRun.strategy, "pot");
    assert.strictEqual(potRun.potTrace.rewardConfigured, true);
    assert.strictEqual(potRun.context.iterationHistory.length, 1);
    assert.strictEqual(potRun.potTrace.adapterDiscarded, true);
    assert.strictEqual(potRun.potTrace.baseHashBefore, potRun.potTrace.baseHashAfter);
    assert.ok(Math.abs(potRun.potTrace.advantageSum) < 1e-8);
    assert.strictEqual(potRun.potTrace.chosenLaneIds[0], target);
    assert.strictEqual(potRun.potTrace.chosenLaneIds.length, engine.LANE_DEFINITIONS.length);
    assert.strictEqual(new Set(potRun.potTrace.chosenLaneIds).size, engine.LANE_DEFINITIONS.length);
    assert.strictEqual(potRun.laneReports[0].id, target);
    assert.strictEqual(callerLog.length - afterLinear, engine.LANE_DEFINITIONS.length + 1);

    const again = await engine.runResearchEngine(
      {
        ...base,
        strategy: "PoT",
        query: "Order the research lanes",
        outputFile: path.join(tmpDir, "pot-again.md"),
        potReward: (lanePath) => (lanePath[0] === target ? 1 : 0),
      },
      caller,
    );
    assert.deepStrictEqual(again.potTrace.chosenLaneIds, potRun.potTrace.chosenLaneIds);

    let called = false;
    await assert.rejects(
      () => engine.runResearchEngine(
        { ...base, strategy: "beam", outputFile: path.join(tmpDir, "bad.md") },
        async () => {
          called = true;
          return "should not run";
        },
      ),
      /Unknown research strategy/,
    );
    assert.strictEqual(called, false);

    const blocked = await engine.runResearchEngine({
      ...base,
      apiKey: "",
      strategy: "pot",
      outputFile: path.join(tmpDir, "blocked.md"),
    });
    assert.strictEqual(blocked.status, "blocked");
    assert.strictEqual(blocked.strategy, "pot");
    assert.strictEqual(blocked.potTrace, null);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("pot without a reward is a stable seeded sample, overlaps lane calls, and retries weak lanes", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pot-noreward-"));
    const lanes = engine.LANE_DEFINITIONS;
    const plain = await engine.runResearchEngine(
      {
        apiKey: "test-key",
        githubToken: "",
        repository: "midnghtsapphire/revvel-standards",
        issueNumber: "",
        prNumber: "",
        query: "No reward configured",
        issueTitle: "",
        issueBody: "",
        outputFile: path.join(tmpDir, "plain.md"),
        depth: "standard",
        extraContext: "",
        dryRun: true,
        strategy: "pot",
      },
      async ({ model }) => `Mocked ${model} output with source https://example.com/plain`,
    );
    assert.strictEqual(plain.potTrace.rewardConfigured, false);
    assert.strictEqual(plain.potTrace.chosenLaneIds.length, lanes.length);
    assert.strictEqual(new Set(plain.potTrace.chosenLaneIds).size, lanes.length);
    const plainAgain = await engine.runResearchEngine(
      {
        apiKey: "test-key",
        githubToken: "",
        repository: "midnghtsapphire/revvel-standards",
        issueNumber: "",
        prNumber: "",
        query: "No reward configured",
        issueTitle: "",
        issueBody: "",
        outputFile: path.join(tmpDir, "plain-again.md"),
        depth: "standard",
        extraContext: "",
        dryRun: true,
        strategy: "pot",
      },
      async ({ model }) => `Mocked ${model} output with source https://example.com/plain`,
    );
    assert.deepStrictEqual(plainAgain.potTrace.chosenLaneIds, plain.potTrace.chosenLaneIds);
    assert.strictEqual(plain.context.iterationHistory.length, 1);
    fs.rmSync(tmpDir, { recursive: true, force: true });

    let started = 0;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const parallelContext = { query: "parallel", dryRun: true, depth: "standard" };
    const parallel = runPotOverLanes(
      parallelContext,
      async () => {
        started += 1;
        if (started === lanes.length) release();
        await gate;
        return "Mocked parallel output with source https://example.com/parallel";
      },
      {
        lanes,
        runLane: engine.runLane,
        maxIterations: engine.RALPH_LOOP_MAX_ITERATIONS,
        checkLanesNeedRetry: engine.checkLanesNeedRetry,
        mergeLaneReports: engine.mergeLaneReports,
      },
    );
    const overlapped = await Promise.race([
      parallel,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("lane calls did not overlap")), 500);
      }),
    ]);
    assert.strictEqual(overlapped.laneReports.length, lanes.length);
    assert.strictEqual(parallelContext.iterationHistory.length, 1);

    const retryContext = { query: "retry", dryRun: false, depth: "standard" };
    let calls = 0;
    const retried = await runPotOverLanes(
      retryContext,
      async () => {
        calls += 1;
        return "Mocked retry output with source https://example.com/retry";
      },
      {
        lanes,
        runLane: engine.runLane,
        maxIterations: engine.RALPH_LOOP_MAX_ITERATIONS,
        checkLanesNeedRetry: engine.checkLanesNeedRetry,
        mergeLaneReports: engine.mergeLaneReports,
      },
    );
    // First pass is one call per lane. Confidence is absent, so only
    // repo-web-search is retried, once per remaining Ralph iteration.
    assert.strictEqual(calls, lanes.length + (engine.RALPH_LOOP_MAX_ITERATIONS - 1));
    assert.strictEqual(retried.laneReports.length, lanes.length);
    assert.strictEqual(retryContext.iterationHistory.length, engine.RALPH_LOOP_MAX_ITERATIONS);
    assert.deepStrictEqual(
      retried.laneReports.map((report) => report.id),
      retried.potTrace.chosenLaneIds,
    );
  });

  test("the benchmark harness does not invent a quality delta", () => {
    const repoRoot = path.join(__dirname, "..");
    const report = inspectEvaluationSet(repoRoot);
    assert.strictEqual(report.found, true);
    assert.strictEqual(report.exampleCount, 6);
    assert.strictEqual(report.hasAcceptanceLabels, false);
    assert.strictEqual(report.status, "NOT_MEASURED");
    assert.strictEqual(report.qualityDelta, null);
    assert.strictEqual(report.compared, false);
    assert.match(report.reason, /has not been measured/);

    const missing = inspectEvaluationSet(path.join(repoRoot, "does-not-exist"));
    assert.strictEqual(missing.found, false);
    assert.strictEqual(missing.status, "NOT_MEASURED");
    assert.strictEqual(missing.qualityDelta, null);

    const code = runBenchmark(repoRoot);
    assert.strictEqual(code, 0);
  });
});
