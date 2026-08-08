import { NextRequest, NextResponse } from "next/server";
import {
  buildCsvExport,
  buildMarkdownReport,
  getResearchEvaluation,
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
  });

  return NextResponse.json({
    status: tick.status,
    metrics: tick.metrics,
    markdown: buildMarkdownReport(tick),
    csv: buildCsvExport(tick),
    research: getResearchEvaluation(),
  });
}

export async function GET() {
  return NextResponse.json({
    research: getResearchEvaluation(),
    scenarios: listScenarios(),
  });
}
