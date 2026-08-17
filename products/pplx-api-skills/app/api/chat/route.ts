import { guardRequest, jsonError, jsonOk } from "../../lib/http";
import { recordRequest } from "../../lib/logger";
import {
  createPerplexityClient,
  PerplexityApiError,
} from "../../lib/perplexity-client";
import type { ChatRequestBody } from "../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = guardRequest(req);
  if (!gate.ok) return gate.response;

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return jsonError(400, "Invalid JSON body", { requestId: gate.requestId });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError(400, "messages[] is required", {
      requestId: gate.requestId,
    });
  }

  const client = createPerplexityClient();

  try {
    const result = await client.chat(body, gate.requestId);
    recordRequest({
      mode: result.mode,
      durationMs: Date.now() - gate.started,
      skills: result.skillInvocations.map((s) => String(s.skillId)),
    });
    return jsonOk({
      requestId: gate.requestId,
      ...result,
      // Avoid dumping huge raw payloads to browsers by default
      raw: undefined,
      hasRaw: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof PerplexityApiError ? err.status : 500;
    recordRequest({
      mode: "live",
      durationMs: Date.now() - gate.started,
      error: message,
    });
    return jsonError(status >= 400 && status < 600 ? status : 502, message, {
      requestId: gate.requestId,
      body: err instanceof PerplexityApiError ? err.body : undefined,
    });
  }
}
