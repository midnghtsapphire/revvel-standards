/**
 * GOAP Swarm Engine — symbolic Goal-Oriented Action Planning + swarm coordination.
 *
 * Implements the validated subset of the Grok "goap swarm new rules" proposal
 * (WR-16500): world-state GOAP with A*, centralized allocator + decentralized
 * executors, awareness / precog / guilt modules, and stigmergic trail bias.
 *
 * Pure CommonJS so product tests, root tests, and the Next.js app can share it.
 */

"use strict";

/** @typedef {Record<string, boolean|number|string>} WorldState */
/** @typedef {{ id: string, name: string, preconditions: WorldState, effects: WorldState, cost: number, role?: string }} GoapAction */
/** @typedef {{ id: string, name: string, desired: WorldState, priority: number }} GoapGoal */
/** @typedef {{ id: string, name: string, roles: string[], capacity: number }} SwarmAgent */

const ENGINE_VERSION = "1.0.0";

const DEFAULT_ACTIONS = Object.freeze([
  {
    id: "clone-repo",
    name: "Clone repository workspace",
    role: "builder",
    preconditions: { workspaceReady: false },
    effects: { workspaceReady: true },
    cost: 2,
  },
  {
    id: "install-deps",
    name: "Install dependencies",
    role: "builder",
    preconditions: { workspaceReady: true, depsInstalled: false },
    effects: { depsInstalled: true },
    cost: 3,
  },
  {
    id: "run-tests",
    name: "Run test suite",
    role: "tester",
    preconditions: { depsInstalled: true, testsPassing: false },
    effects: { testsPassing: true, testsObserved: true },
    cost: 4,
  },
  {
    id: "fix-failing-tests",
    name: "Fix failing tests",
    role: "builder",
    preconditions: { depsInstalled: true, testsPassing: false, testsObserved: true },
    effects: { testsPassing: true, codeChanged: true },
    cost: 8,
  },
  {
    id: "lint-code",
    name: "Lint and typecheck",
    role: "tester",
    preconditions: { depsInstalled: true, lintClean: false },
    effects: { lintClean: true },
    cost: 3,
  },
  {
    id: "open-pr",
    name: "Open pull request",
    role: "builder",
    preconditions: { testsPassing: true, lintClean: true, prOpen: false },
    effects: { prOpen: true, codeChanged: true },
    cost: 2,
  },
  {
    id: "request-review",
    name: "Request automated review",
    role: "reviewer",
    preconditions: { prOpen: true, reviewRequested: false },
    effects: { reviewRequested: true },
    cost: 1,
  },
  {
    id: "address-review",
    name: "Address review comments",
    role: "builder",
    preconditions: { reviewRequested: true, reviewClean: false },
    effects: { reviewClean: true, codeChanged: true },
    cost: 5,
  },
  {
    id: "merge-pr",
    name: "Merge pull request",
    role: "builder",
    preconditions: { prOpen: true, reviewClean: true, testsPassing: true, merged: false },
    effects: { merged: true, repoGreen: true },
    cost: 2,
  },
  {
    id: "deep-research",
    name: "Deep research blockers",
    role: "scout",
    preconditions: { blocked: true, researched: false },
    effects: { researched: true, blocked: false },
    cost: 6,
  },
  {
    id: "spawn-swarm",
    name: "Spawn recovery swarm",
    role: "coordinator",
    preconditions: { guiltHigh: true, swarmSpawned: false },
    effects: { swarmSpawned: true, blocked: false },
    cost: 4,
  },
  {
    id: "write-learnings",
    name: "Append learnings.md reflection",
    role: "coordinator",
    preconditions: { codeChanged: true, learningsWritten: false },
    effects: { learningsWritten: true },
    cost: 1,
  },
  {
    id: "deploy-preview",
    name: "Deploy preview environment",
    role: "builder",
    preconditions: { testsPassing: true, deployed: false },
    effects: { deployed: true },
    cost: 3,
  },
]);

const DEFAULT_GOALS = Object.freeze([
  {
    id: "repo-green",
    name: "All repos green",
    priority: 95,
    desired: { testsPassing: true, lintClean: true, repoGreen: true, merged: true },
  },
  {
    id: "ship-preview",
    name: "Ship preview deployment",
    priority: 70,
    desired: { testsPassing: true, deployed: true },
  },
  {
    id: "self-heal",
    name: "Self-heal blocked work",
    priority: 90,
    desired: { blocked: false, researched: true, swarmSpawned: true },
  },
  {
    id: "close-loop",
    name: "Close reflection loop",
    priority: 55,
    desired: { learningsWritten: true },
  },
]);

const DEFAULT_AGENTS = Object.freeze([
  { id: "goap", name: "Goap", roles: ["coordinator", "builder"], capacity: 3 },
  { id: "scout", name: "Scout", roles: ["scout"], capacity: 2 },
  { id: "forge", name: "Forge", roles: ["builder"], capacity: 3 },
  { id: "sentinel", name: "Sentinel", roles: ["tester", "reviewer"], capacity: 2 },
  { id: "auditor", name: "Auditor", roles: ["reviewer", "coordinator"], capacity: 2 },
]);

const DEFAULT_WORLD = Object.freeze({
  workspaceReady: false,
  depsInstalled: false,
  testsPassing: false,
  testsObserved: false,
  lintClean: false,
  prOpen: false,
  reviewRequested: false,
  reviewClean: false,
  merged: false,
  repoGreen: false,
  blocked: false,
  researched: false,
  guiltHigh: false,
  swarmSpawned: false,
  codeChanged: false,
  learningsWritten: false,
  deployed: false,
});

/** Research evaluation of the attached Grok GOAP/swarm proposal (WR-16500). */
const RESEARCH_EVALUATION = Object.freeze({
  sourceDoc: "goap.swarm.new.rules.pdf (Grok export + architecture exploration)",
  evaluatedAt: "2026-08-08",
  summary:
    "The Grok doc correctly describes classical GOAP (world state, goals, actions, A* planner) and useful swarm patterns (central allocator, stigmergy, hierarchical GOAP). Several claims need hardening before production use.",
  validated:
    [
      {
        id: "v-goap-core",
        claim: "GOAP uses world state + preconditions/effects + A* with unsatisfied-atom heuristic",
        verdict: "sound",
        confidence: "high",
        evidence: "Jeff Orkin F.E.A.R. GOAP; standard STRIPS-style planning",
        starsOrSource: "F.E.A.R. AI (Orkin 2006); academic GOAP literature",
      },
      {
        id: "v-central-allocator",
        claim: "Centralized coordinator + decentralized executors is a workable swarm topology",
        verdict: "sound",
        confidence: "high",
        evidence: "Common MAS pattern; matches openrouter-swarms skill decision tree",
        starsOrSource: "skills/openrouter-swarms/SKILL.md",
      },
      {
        id: "v-stigmergy",
        claim: "Stigmergic labels/trails reduce direct messaging overhead",
        verdict: "sound",
        confidence: "medium",
        evidence: "GitHub labels already act as stigmergic markers in this repo's workflows",
        starsOrSource: "Grassé 1959; repo stuck-label / wr label patterns",
      },
      {
        id: "v-self-heal-loop",
        claim: "Sense → Plan → Execute → Reflect → Escalate loop",
        verdict: "sound",
        confidence: "high",
        evidence: "Matches learnings.md + GOAP_AGENT_STANDARD self-healing mandate",
        starsOrSource: "docs/Master_Inventory/GOAP_AGENT_STANDARD.md",
      },
    ],
  bugsAndRisks: [
    {
      id: "b-bitmask-overclaim",
      severity: "medium",
      issue:
        "Bitmask world state only works for small boolean atom sets; string/number atoms and sparse keys need dictionaries. Bitmask collision risk if atom count grows.",
      mitigation: "Use ordered dictionary hashing (this engine). Cap atom cardinality; never silently coerce strings into bits.",
    },
    {
      id: "b-perf-claim",
      severity: "high",
      issue:
        "Claim that 200 agents plan in 1–2ms/frame is game-engine context (Core Keeper thesis), not LLM/agent API latency. Misapplied, it under-budgets real swarm cost.",
      mitigation:
        "Separate symbolic plan latency from LLM action latency. Budget OpenRouter calls independently; keep symbolic GOAP hot-path under 50ms for ≤64 actions.",
      confidence: "high",
    },
    {
      id: "b-guilt-as-emotion",
      severity: "low",
      issue:
        "Framing 'guilt.md' as emotion invites non-deterministic policy. Without a numeric penalty schedule it becomes untestable vibes.",
      mitigation: "Model guilt as a bounded cost multiplier + escalation threshold (implemented).",
    },
    {
      id: "b-no-reservation",
      severity: "high",
      issue:
        "Doc mentions reservation systems but does not specify lock semantics. Two builders can claim the same PR/file without leases.",
      mitigation: "Per-resource leases with TTL + agent id (implemented in swarm assign step).",
    },
    {
      id: "b-llm-precondition-inference",
      severity: "medium",
      issue:
        "Using LLMs to invent preconditions/effects without validation can produce unsafe plans (effects that never hold).",
      mitigation:
        "Keep planner symbolic. LLM may propose candidate actions; a schema validator must accept them before catalog insertion.",
    },
    {
      id: "b-kafka-default",
      severity: "low",
      issue:
        "Suggesting Kafka/NATS as default bus is overkill for GitHub-label stigmergy and adds ops cost before revenue.",
      mitigation: "Default bus = in-process + GitHub labels/issues. Promote to NATS only after multi-host scale.",
    },
    {
      id: "b-deep-web",
      severity: "medium",
      issue:
        "Instruction to 'research even deep web' is legally/operationally risky and conflicts with safe automation policy.",
      mitigation: "Constrain research to public indexed sources + allowed APIs (GitHub, docs, academic).",
    },
  ],
  betterTech: [
    {
      id: "t-symbolic-first",
      title: "Symbolic GOAP + optional LLM decomposition",
      why: "Deterministic plans are testable and cheap; LLMs only for goal parsing and novel action proposals.",
      monetization: "SaaS planner console + API metering on plan runs and export packs.",
    },
    {
      id: "t-htn-hybrid",
      title: "HTN methods for recurring workflows, GOAP for recovery",
      why: "Most Revvel WRs are method-shaped (research→build→test→PR). GOAP shines when methods fail.",
      monetization: "Sell method packs (compliance swarm, payout research swarm) on Gumroad/Polar.",
    },
    {
      id: "t-label-stigmergy",
      title: "GitHub labels as first-class pheromone field",
      why: "Already in-repo; zero new infra; auditable; fits wr:* lifecycle labels.",
      monetization: "Ops product: swarm health dashboard for label fields.",
    },
    {
      id: "t-openrouter-ladder",
      title: "OpenRouter cascade with keyless Perplexity fallback",
      why: "Matches fleet policy; avoids 401/402 stalling the coordinator.",
      monetization: "Usage-based routing markup; free tier stays keyless.",
      starsOrSource: "scripts/openrouter-triage.js; OpenRouter ecosystem",
    },
    {
      id: "t-wasm-later",
      title: "Defer Rust/WASM planner until JS path proves product-market fit",
      why: "Grok suggests Rust harness early; JS A* is enough for SaaS MVP and ships this week.",
      monetization: "Premium 'edge planner' SKU later if customers hit multi-k action catalogs.",
    },
  ],
  marketingKeywords: [
    "goal oriented action planning",
    "multi agent swarm orchestration",
    "GOAP agent planner",
    "self healing AI agents",
    "stigmergy multi agent systems",
    "autonomous agent coordination SaaS",
    "OpenRouter swarm routing",
    "AI agent task allocator",
  ],
  monetizationPath:
    "Freemium SaaS: free interactive planner (this app) → Pro plan exports + API → Polar/Gumroad method packs ($47–$197) for vertical swarms (repo green, research fleet, revenue scout).",
  citations: [
    {
      label: "Orkin GOAP / F.E.A.R.",
      url: "https://alumni.media.mit.edu/~jorkin/goap.html",
      note: "Canonical GOAP design notes",
    },
    {
      label: "Revvel GOAP agent standard",
      url: "docs/Master_Inventory/GOAP_AGENT_STANDARD.md",
      note: "In-repo operational contract",
    },
    {
      label: "OpenRouter swarms skill",
      url: "skills/openrouter-swarms/SKILL.md",
      note: "Topology decision tree already shipped",
    },
    {
      label: "Stigmergy (Grassé)",
      url: "https://en.wikipedia.org/wiki/Stigmergy",
      note: "Indirect coordination via environment",
    },
  ],
});

function cloneState(state) {
  return { ...state };
}

function normalizeState(input) {
  const base = cloneState(DEFAULT_WORLD);
  if (!input || typeof input !== "object") return base;
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      base[key] = value;
    }
  }
  return base;
}

function stateKey(state) {
  return Object.keys(state)
    .sort()
    .map((k) => `${k}:${String(state[k])}`)
    .join("|");
}

function satisfies(state, required) {
  if (!required) return true;
  return Object.entries(required).every(([k, v]) => state[k] === v);
}

function applyEffects(state, effects) {
  const next = cloneState(state);
  for (const [k, v] of Object.entries(effects || {})) {
    next[k] = v;
  }
  return next;
}

function unsatisfiedCount(state, goalDesired) {
  let n = 0;
  for (const [k, v] of Object.entries(goalDesired || {})) {
    if (state[k] !== v) n += 1;
  }
  return n;
}

function normalizeActions(actions) {
  const list = Array.isArray(actions) && actions.length ? actions : DEFAULT_ACTIONS;
  return list.map((a, i) => ({
    id: String(a.id || `action-${i}`),
    name: String(a.name || a.id || `Action ${i}`),
    role: String(a.role || "builder"),
    preconditions: { ...(a.preconditions || {}) },
    effects: { ...(a.effects || {}) },
    cost: Math.max(0.1, Number(a.cost) || 1),
  }));
}

function normalizeGoals(goals) {
  const list = Array.isArray(goals) && goals.length ? goals : DEFAULT_GOALS;
  return list
    .map((g, i) => ({
      id: String(g.id || `goal-${i}`),
      name: String(g.name || g.id || `Goal ${i}`),
      priority: Math.max(1, Math.min(100, Number(g.priority) || 50)),
      desired: { ...(g.desired || {}) },
    }))
    .sort((a, b) => b.priority - a.priority);
}

function normalizeAgents(agents) {
  const list = Array.isArray(agents) && agents.length ? agents : DEFAULT_AGENTS;
  return list.map((a, i) => ({
    id: String(a.id || `agent-${i}`),
    name: String(a.name || a.id || `Agent ${i}`),
    roles: Array.isArray(a.roles) && a.roles.length ? a.roles.map(String) : ["builder"],
    capacity: Math.max(1, Number(a.capacity) || 1),
  }));
}

/**
 * A* GOAP planner. Heuristic = count of unsatisfied goal atoms.
 * @returns {{ ok: boolean, plan: GoapAction[], cost: number, expanded: number, reason?: string }}
 */
function planGoap(worldState, goal, actions, options = {}) {
  const start = normalizeState(worldState);
  const desired = goal && goal.desired ? goal.desired : {};
  const catalog = normalizeActions(actions);
  const maxExpanded = Math.max(32, Number(options.maxExpanded) || 2500);
  const trailBias = options.trailBias || {};

  if (satisfies(start, desired)) {
    return { ok: true, plan: [], cost: 0, expanded: 0, reason: "goal-already-satisfied" };
  }

  /** @type {Map<string, { state: WorldState, g: number, plan: GoapAction[] }>} */
  const best = new Map();
  const startNode = { state: start, g: 0, plan: [] };
  best.set(stateKey(start), startNode);

  /** @type {{ key: string, f: number }[]} */
  const open = [{ key: stateKey(start), f: unsatisfiedCount(start, desired) }];

  let expanded = 0;

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const currentMeta = open.shift();
    const current = best.get(currentMeta.key);
    if (!current) continue;
    expanded += 1;
    if (expanded > maxExpanded) {
      return {
        ok: false,
        plan: current.plan,
        cost: current.g,
        expanded,
        reason: "max-expanded",
      };
    }

    if (satisfies(current.state, desired)) {
      return { ok: true, plan: current.plan, cost: current.g, expanded };
    }

    for (const action of catalog) {
      if (!satisfies(current.state, action.preconditions)) continue;
      const nextState = applyEffects(current.state, action.effects);
      const bias = Number(trailBias[action.id] || 0);
      // Stronger stigmergic trail lowers effective cost (min floor 0.1).
      const stepCost = Math.max(0.1, action.cost * (1 - Math.min(0.6, bias / 100)));
      const g = current.g + stepCost;
      const key = stateKey(nextState);
      const prev = best.get(key);
      if (prev && prev.g <= g) continue;
      const plan = current.plan.concat([action]);
      best.set(key, { state: nextState, g, plan });
      const h = unsatisfiedCount(nextState, desired);
      open.push({ key, f: g + h });
    }
  }

  return { ok: false, plan: [], cost: Infinity, expanded, reason: "no-plan" };
}

/**
 * Awareness: detect anomalies / missing critical atoms vs healthy baseline.
 */
function runAwareness(worldState, options = {}) {
  const state = normalizeState(worldState);
  const healthy = {
    testsPassing: true,
    lintClean: true,
    blocked: false,
    ...(options.healthy || {}),
  };
  const anomalies = [];
  for (const [k, v] of Object.entries(healthy)) {
    if (state[k] !== v) {
      anomalies.push({
        atom: k,
        expected: v,
        actual: state[k],
        severity: k === "blocked" || k === "testsPassing" ? "high" : "medium",
      });
    }
  }
  const score = Math.max(0, 100 - anomalies.length * 12 - anomalies.filter((a) => a.severity === "high").length * 8);
  return {
    anomalies,
    healthy: anomalies.length === 0,
    awarenessScore: score,
    sensedAt: new Date(0).toISOString(), // stable in pure tests; UI may overwrite
  };
}

/**
 * Precog: forward-simulate a plan and estimate success probability + residual risk.
 */
function runPrecog(worldState, plan, goal, options = {}) {
  let state = normalizeState(worldState);
  const steps = [];
  let failedAt = null;
  for (const action of plan || []) {
    const ready = satisfies(state, action.preconditions);
    steps.push({
      actionId: action.id,
      name: action.name,
      preconditionsMet: ready,
    });
    if (!ready) {
      failedAt = action.id;
      break;
    }
    state = applyEffects(state, action.effects);
  }
  const residual = unsatisfiedCount(state, goal?.desired || {});
  const base = failedAt ? 0.15 : residual === 0 ? 0.92 : Math.max(0.25, 0.85 - residual * 0.12);
  const noise = Number(options.riskPenalty) || 0;
  const successProbability = Math.max(0.01, Math.min(0.99, base - noise));
  return {
    successProbability,
    residualUnsatisfied: residual,
    finalState: state,
    failedAt,
    steps,
    recommendation:
      successProbability >= 0.8
        ? "execute"
        : successProbability >= 0.45
          ? "execute-with-watch"
          : "replan-or-spawn-swarm",
  };
}

/**
 * Guilt: numeric penalty + escalation when high-priority goals remain unsatisfied.
 */
function runGuilt(worldState, goals, options = {}) {
  const state = normalizeState(worldState);
  const list = normalizeGoals(goals);
  const threshold = Math.max(1, Number(options.threshold) || 40);
  const open = [];
  let raw = 0;
  for (const goal of list) {
    const missing = unsatisfiedCount(state, goal.desired);
    if (missing === 0) continue;
    const weight = (goal.priority / 100) * missing * 10;
    raw += weight;
    open.push({
      goalId: goal.id,
      name: goal.name,
      priority: goal.priority,
      missingAtoms: missing,
      penalty: Number(weight.toFixed(2)),
    });
  }
  const guiltScore = Math.min(100, Number(raw.toFixed(2)));
  const escalate = guiltScore >= threshold;
  return {
    guiltScore,
    escalate,
    threshold,
    openGoals: open,
    multiplier: escalate ? 1 + guiltScore / 100 : 1,
    action: escalate ? "spawn-recovery-swarm" : "continue",
  };
}

/**
 * Deposit / evaporate stigmergic trails keyed by action id or goal id.
 */
function updateTrails(trails, deposits, options = {}) {
  const decay = Math.min(0.95, Math.max(0, Number(options.decay) || 0.15));
  const next = {};
  const prev = trails && typeof trails === "object" ? trails : {};
  for (const [k, v] of Object.entries(prev)) {
    const decayed = Number(v) * (1 - decay);
    if (decayed >= 0.5) next[k] = Number(decayed.toFixed(2));
  }
  for (const [k, v] of Object.entries(deposits || {})) {
    next[k] = Number(((next[k] || 0) + Number(v || 0)).toFixed(2));
  }
  return next;
}

/**
 * Assign plan steps to agents by role with resource leases.
 */
function assignSwarm(plan, agents, options = {}) {
  const roster = normalizeAgents(agents);
  const load = Object.fromEntries(roster.map((a) => [a.id, 0]));
  const leases = {};
  const assignments = [];
  const ttl = Math.max(1, Number(options.leaseTtl) || 5);

  for (const action of plan || []) {
    const candidates = roster
      .filter((a) => a.roles.includes(action.role || "builder") && load[a.id] < a.capacity)
      .sort((a, b) => load[a.id] - load[b.id] || a.id.localeCompare(b.id));

    let agent = candidates[0];
    if (!agent) {
      // Fallback: least-loaded agent regardless of role.
      agent = [...roster].sort((a, b) => load[a.id] - load[b.id])[0];
    }
    load[agent.id] += 1;
    const resource = `action:${action.id}`;
    leases[resource] = { agentId: agent.id, ttl };
    assignments.push({
      actionId: action.id,
      actionName: action.name,
      role: action.role || "builder",
      agentId: agent.id,
      agentName: agent.name,
      lease: leases[resource],
    });
  }

  return {
    topology: "centralized-allocator-decentralized-executors",
    assignments,
    leases,
    load,
    agentsUsed: Object.values(load).filter((n) => n > 0).length,
  };
}

/**
 * Full orchestration tick: awareness → guilt → pick goal → plan → precog → assign → trails.
 */
function runSwarmTick(input = {}) {
  const world = normalizeState(input.world);
  const goals = normalizeGoals(input.goals);
  const actions = normalizeActions(input.actions);
  const agents = normalizeAgents(input.agents);
  const trails = updateTrails(input.trails || {}, input.deposits || {}, {
    decay: input.trailDecay,
  });

  const awareness = runAwareness(world, { healthy: input.healthy });
  // Make sensedAt dynamic for live runs.
  awareness.sensedAt = new Date().toISOString();

  const guilt = runGuilt(world, goals, { threshold: input.guiltThreshold });
  // If guilt escalates, force guiltHigh atom so spawn-swarm action can unlock.
  const planningWorld = guilt.escalate ? { ...world, guiltHigh: true } : world;

  const goalId = input.goalId;
  let goal = goalId ? goals.find((g) => g.id === goalId) : null;
  if (!goal) {
    goal =
      goals.find((g) => unsatisfiedCount(planningWorld, g.desired) > 0) ||
      goals[0] ||
      normalizeGoals()[0];
  }

  const planned = planGoap(planningWorld, goal, actions, {
    maxExpanded: input.maxExpanded,
    trailBias: trails,
  });

  const precog = runPrecog(planningWorld, planned.plan, goal, {
    riskPenalty: guilt.escalate ? 0.08 : 0,
  });

  const swarm = assignSwarm(planned.plan, agents, { leaseTtl: input.leaseTtl });

  const deposits = {};
  for (const step of planned.plan) {
    deposits[step.id] = (deposits[step.id] || 0) + 8;
  }
  if (guilt.escalate) deposits["spawn-swarm"] = (deposits["spawn-swarm"] || 0) + 20;
  const nextTrails = updateTrails(trails, deposits, { decay: 0 });

  const finalState = precog.finalState;
  const status =
    planned.ok && precog.recommendation === "execute"
      ? "ready"
      : planned.ok
        ? "watch"
        : "blocked";

  return {
    engineVersion: ENGINE_VERSION,
    status,
    world: planningWorld,
    goal,
    plan: planned,
    awareness,
    guilt,
    precog,
    swarm,
    trails: nextTrails,
    metrics: {
      planLength: planned.plan.length,
      planCost: planned.ok ? Number(planned.cost.toFixed(2)) : null,
      expanded: planned.expanded,
      successProbability: precog.successProbability,
      guiltScore: guilt.guiltScore,
      awarenessScore: awareness.awarenessScore,
      agentsUsed: swarm.agentsUsed,
    },
  };
}

function buildMarkdownReport(tick) {
  const lines = [
    `# GOAP Swarm Run Report`,
    ``,
    `- Engine: v${tick.engineVersion}`,
    `- Status: **${tick.status}**`,
    `- Goal: ${tick.goal.name} (\`${tick.goal.id}\`, priority ${tick.goal.priority})`,
    `- Plan length: ${tick.metrics.planLength}`,
    `- Plan cost: ${tick.metrics.planCost ?? "n/a"}`,
    `- Success probability: ${(tick.metrics.successProbability * 100).toFixed(1)}%`,
    `- Awareness score: ${tick.metrics.awarenessScore}`,
    `- Guilt score: ${tick.metrics.guiltScore}${tick.guilt.escalate ? " (escalate)" : ""}`,
    `- Agents used: ${tick.metrics.agentsUsed}`,
    ``,
    `## Plan`,
  ];
  if (!tick.plan.plan.length) {
    lines.push(tick.plan.ok ? `- (empty — goal already satisfied)` : `- (no plan: ${tick.plan.reason})`);
  } else {
    tick.plan.plan.forEach((step, i) => {
      const asg = tick.swarm.assignments[i];
      lines.push(
        `${i + 1}. **${step.name}** (\`${step.id}\`, cost ${step.cost}, role ${step.role}) → ${asg ? asg.agentName : "unassigned"}`,
      );
    });
  }
  lines.push(``, `## Awareness anomalies`);
  if (!tick.awareness.anomalies.length) lines.push(`- none`);
  else {
    for (const a of tick.awareness.anomalies) {
      lines.push(`- \`${a.atom}\`: expected \`${a.expected}\`, actual \`${a.actual}\` (${a.severity})`);
    }
  }
  lines.push(``, `## Open goals (guilt)`);
  if (!tick.guilt.openGoals.length) lines.push(`- none`);
  else {
    for (const g of tick.guilt.openGoals) {
      lines.push(`- ${g.name}: missing ${g.missingAtoms}, penalty ${g.penalty}`);
    }
  }
  lines.push(``, `## Precog`);
  lines.push(`- Recommendation: **${tick.precog.recommendation}**`);
  lines.push(`- Residual unsatisfied atoms: ${tick.precog.residualUnsatisfied}`);
  lines.push(``, `## Research keywords`);
  for (const kw of RESEARCH_EVALUATION.marketingKeywords) lines.push(`- ${kw}`);
  lines.push(``, `## Monetization`);
  lines.push(RESEARCH_EVALUATION.monetizationPath);
  lines.push(``);
  return lines.join("\n");
}

function buildCsvExport(tick) {
  const rows = [
    ["step", "action_id", "action_name", "role", "cost", "agent_id", "agent_name"],
  ];
  tick.plan.plan.forEach((step, i) => {
    const asg = tick.swarm.assignments[i] || {};
    rows.push([
      String(i + 1),
      step.id,
      step.name,
      step.role || "",
      String(step.cost),
      asg.agentId || "",
      asg.agentName || "",
    ]);
  });
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function getResearchEvaluation() {
  return RESEARCH_EVALUATION;
}

function getDefaults() {
  return {
    world: cloneState(DEFAULT_WORLD),
    actions: DEFAULT_ACTIONS.map((a) => ({ ...a, preconditions: { ...a.preconditions }, effects: { ...a.effects } })),
    goals: DEFAULT_GOALS.map((g) => ({ ...g, desired: { ...g.desired } })),
    agents: DEFAULT_AGENTS.map((a) => ({ ...a, roles: [...a.roles] })),
    engineVersion: ENGINE_VERSION,
  };
}

function listScenarios() {
  return [
    {
      id: "fresh-repo",
      name: "Fresh repo → green main",
      description: "Nothing installed; goal is merge green PR.",
      world: { ...DEFAULT_WORLD },
      goalId: "repo-green",
    },
    {
      id: "tests-failing",
      name: "Tests failing mid-flight",
      description: "Deps installed, tests observed failing; heal and merge.",
      world: {
        ...DEFAULT_WORLD,
        workspaceReady: true,
        depsInstalled: true,
        testsObserved: true,
        testsPassing: false,
        lintClean: true,
      },
      goalId: "repo-green",
    },
    {
      id: "blocked-research",
      name: "Blocked → research + swarm",
      description: "Work is blocked; guilt should escalate recovery swarm.",
      world: {
        ...DEFAULT_WORLD,
        workspaceReady: true,
        depsInstalled: true,
        blocked: true,
        testsPassing: false,
      },
      goalId: "self-heal",
    },
    {
      id: "preview-only",
      name: "Ship preview only",
      description: "Green tests path to deployment without merge.",
      world: {
        ...DEFAULT_WORLD,
        workspaceReady: true,
        depsInstalled: true,
        testsPassing: true,
        lintClean: true,
      },
      goalId: "ship-preview",
    },
  ];
}

module.exports = {
  ENGINE_VERSION,
  DEFAULT_ACTIONS,
  DEFAULT_GOALS,
  DEFAULT_AGENTS,
  DEFAULT_WORLD,
  RESEARCH_EVALUATION,
  normalizeState,
  normalizeActions,
  normalizeGoals,
  normalizeAgents,
  satisfies,
  applyEffects,
  unsatisfiedCount,
  planGoap,
  runAwareness,
  runPrecog,
  runGuilt,
  updateTrails,
  assignSwarm,
  runSwarmTick,
  buildMarkdownReport,
  buildCsvExport,
  getResearchEvaluation,
  getDefaults,
  listScenarios,
};
