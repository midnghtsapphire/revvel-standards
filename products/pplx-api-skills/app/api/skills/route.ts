import { guardRequest, jsonError, jsonOk } from "../../lib/http";
import { recordRequest } from "../../lib/logger";
import { executeLocalSkill } from "../../lib/skills/executor";
import { listSkills } from "../../lib/skills/registry";
import type { SkillCategory } from "../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = guardRequest(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as SkillCategory | null;
  const execution = url.searchParams.get("execution") as
    | "local"
    | "remote"
    | null;

  const skills = listSkills({
    category: category || undefined,
    execution: execution || undefined,
  });

  recordRequest({
    mode: "mock",
    durationMs: Date.now() - gate.started,
    skills: ["list"],
  });

  return jsonOk({
    requestId: gate.requestId,
    count: skills.length,
    skills,
  });
}

export async function POST(req: Request) {
  const gate = guardRequest(req);
  if (!gate.ok) return gate.response;

  let body: { name?: string; arguments?: Record<string, unknown> } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError(400, "Invalid JSON body", { requestId: gate.requestId });
  }

  if (!body.name || typeof body.name !== "string") {
    return jsonError(400, "Field 'name' is required", {
      requestId: gate.requestId,
    });
  }

  const invocation = await executeLocalSkill(
    body.name,
    body.arguments && typeof body.arguments === "object" ? body.arguments : {}
  );

  recordRequest({
    mode: "mock",
    durationMs: Date.now() - gate.started,
    skills: [invocation.skillId],
    error: invocation.status === "failed" ? invocation.error : undefined,
  });

  return jsonOk(
    { requestId: gate.requestId, invocation },
    { status: invocation.status === "failed" ? 422 : 200 }
  );
}
