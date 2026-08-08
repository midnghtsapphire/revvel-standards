import { getPerplexityApiKey } from "../../lib/auth";
import { getMonitorSnapshot } from "../../lib/logger";
import { jsonOk } from "../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasKey = Boolean(getPerplexityApiKey());
  const monitor = getMonitorSnapshot();
  return jsonOk({
    ok: true,
    service: "pplx-api-skills",
    version: "1.0.0",
    mode: hasKey ? "live-ready" : "mock-default",
    hasPerplexityKey: hasKey,
    monitor,
    endpoints: [
      "GET /api/health",
      "GET /api/skills",
      "POST /api/skills",
      "GET /api/bom",
      "POST /api/chat",
      "GET /api/monitor",
    ],
  });
}
