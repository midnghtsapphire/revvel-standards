import { NextRequest, NextResponse } from "next/server";
import {
  getDefaults,
  listScenarios,
  runSwarmTick,
} from "../../../lib/goap-engine.js";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tick = runSwarmTick({
    world: body.world,
    goalId: typeof body.goalId === "string" ? body.goalId : undefined,
    goals: body.goals,
    actions: body.actions,
    agents: body.agents,
    trails: body.trails,
    deposits: body.deposits,
    guiltThreshold: body.guiltThreshold,
    maxExpanded: body.maxExpanded,
    leaseTtl: body.leaseTtl,
  });

  return NextResponse.json({
    status: tick.status,
    goal: tick.goal,
    plan: tick.plan,
    metrics: tick.metrics,
    swarm: tick.swarm,
    awareness: tick.awareness,
    guilt: tick.guilt,
    precog: tick.precog,
    trails: tick.trails,
    engineVersion: tick.engineVersion,
  });
}

export async function GET() {
  const defaults = getDefaults();
  return NextResponse.json({
    engineVersion: defaults.engineVersion,
    scenarios: listScenarios(),
    goals: defaults.goals,
    agents: defaults.agents,
    actionCount: defaults.actions.length,
  });
}
