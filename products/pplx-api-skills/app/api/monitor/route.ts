import { guardRequest, jsonOk } from "../../lib/http";
import { getMonitorSnapshot, getRecentLogs } from "../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = guardRequest(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit") || 40) || 40)
  );

  return jsonOk({
    requestId: gate.requestId,
    snapshot: getMonitorSnapshot(),
    logs: getRecentLogs(limit),
  });
}
