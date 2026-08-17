export type WorldState = Record<string, boolean | number | string>;

export interface GoapAction {
  id: string;
  name: string;
  preconditions: WorldState;
  effects: WorldState;
  cost: number;
  role?: string;
}

export interface GoapGoal {
  id: string;
  name: string;
  desired: WorldState;
  priority: number;
}

export interface SwarmAgent {
  id: string;
  name: string;
  roles: string[];
  capacity: number;
}

export interface PlanResult {
  ok: boolean;
  plan: GoapAction[];
  cost: number;
  expanded: number;
  reason?: string;
}

export interface SwarmTick {
  engineVersion: string;
  status: string;
  world: WorldState;
  goal: GoapGoal;
  plan: PlanResult;
  awareness: {
    anomalies: Array<{
      atom: string;
      expected: unknown;
      actual: unknown;
      severity: string;
    }>;
    healthy: boolean;
    awarenessScore: number;
    sensedAt: string;
  };
  guilt: {
    guiltScore: number;
    escalate: boolean;
    threshold: number;
    openGoals: Array<{
      goalId: string;
      name: string;
      priority: number;
      missingAtoms: number;
      penalty: number;
    }>;
    multiplier: number;
    action: string;
  };
  precog: {
    successProbability: number;
    residualUnsatisfied: number;
    finalState: WorldState;
    failedAt: string | null;
    steps: Array<{ actionId: string; name: string; preconditionsMet: boolean }>;
    recommendation: string;
  };
  swarm: {
    topology: string;
    assignments: Array<{
      actionId: string;
      actionName: string;
      role: string;
      agentId: string;
      agentName: string;
      lease: { agentId: string; ttl: number };
    }>;
    leases: Record<string, { agentId: string; ttl: number }>;
    load: Record<string, number>;
    agentsUsed: number;
  };
  trails: Record<string, number>;
  metrics: {
    planLength: number;
    planCost: number | null;
    expanded: number;
    successProbability: number;
    guiltScore: number;
    awarenessScore: number;
    agentsUsed: number;
  };
}

export const ENGINE_VERSION: string;
export const DEFAULT_ACTIONS: GoapAction[];
export const DEFAULT_GOALS: GoapGoal[];
export const DEFAULT_AGENTS: SwarmAgent[];
export const DEFAULT_WORLD: WorldState;
export const RESEARCH_EVALUATION: Record<string, unknown>;

export function normalizeState(input?: unknown): WorldState;
export function planGoap(
  worldState: WorldState,
  goal: GoapGoal,
  actions?: GoapAction[],
  options?: Record<string, unknown>,
): PlanResult;
export function runAwareness(worldState: WorldState, options?: Record<string, unknown>): SwarmTick["awareness"];
export function runPrecog(
  worldState: WorldState,
  plan: GoapAction[],
  goal: GoapGoal,
  options?: Record<string, unknown>,
): SwarmTick["precog"];
export function runGuilt(
  worldState: WorldState,
  goals?: GoapGoal[],
  options?: Record<string, unknown>,
): SwarmTick["guilt"];
export function updateTrails(
  trails: Record<string, number>,
  deposits?: Record<string, number>,
  options?: Record<string, unknown>,
): Record<string, number>;
export function assignSwarm(
  plan: GoapAction[],
  agents?: SwarmAgent[],
  options?: Record<string, unknown>,
): SwarmTick["swarm"];
export function runSwarmTick(input?: Record<string, unknown>): SwarmTick;
export function buildMarkdownReport(tick: SwarmTick): string;
export function buildCsvExport(tick: SwarmTick): string;
export function getResearchEvaluation(): {
  sourceDoc: string;
  evaluatedAt: string;
  summary: string;
  validated: Array<{
    id: string;
    claim: string;
    verdict: string;
    confidence: string;
    evidence: string;
    starsOrSource: string;
  }>;
  bugsAndRisks: Array<{
    id: string;
    severity: string;
    issue: string;
    mitigation: string;
    confidence?: string;
  }>;
  betterTech: Array<{
    id: string;
    title: string;
    why: string;
    monetization: string;
    starsOrSource?: string;
  }>;
  marketingKeywords: string[];
  monetizationPath: string;
  citations: Array<{ label: string; url: string; note: string }>;
};
export function getDefaults(): {
  world: WorldState;
  actions: GoapAction[];
  goals: GoapGoal[];
  agents: SwarmAgent[];
  engineVersion: string;
};
export function listScenarios(): Array<{
  id: string;
  name: string;
  description: string;
  world: WorldState;
  goalId: string;
};
