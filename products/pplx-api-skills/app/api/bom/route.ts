import { BOM_ITEMS, getBomMatches, listBomCategories } from "../../lib/bom";
import { guardRequest, jsonOk } from "../../lib/http";
import { recordRequest } from "../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = guardRequest(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
  const category = url.searchParams.get("category") || undefined;

  const items = q || category ? getBomMatches(q, category) : BOM_ITEMS;

  recordRequest({
    mode: "mock",
    durationMs: Date.now() - gate.started,
    skills: ["bom_lookup"],
  });

  return jsonOk({
    requestId: gate.requestId,
    categories: listBomCategories(),
    count: items.length,
    items,
  });
}
