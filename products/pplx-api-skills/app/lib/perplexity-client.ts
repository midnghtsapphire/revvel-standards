import { getPerplexityApiKey, shouldUseMock, type EnvMap } from "./auth";
import { log } from "./logger";
import { parsePerplexityResponse } from "./parse-response";
import { executeLocalSkillCalls } from "./skills/executor";
import { skillsToToolSchemas } from "./skills/registry";
import type {
  ChatMessage,
  ChatRequestBody,
  ParsedPerplexityResponse,
  SkillId,
} from "./types";

export interface PerplexityClientOptions {
  apiKey?: string | null;
  baseUrl?: string;
  defaultModel?: string;
  fetchImpl?: typeof fetch;
  env?: EnvMap;
}

export class PerplexityApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "PerplexityApiError";
    this.status = status;
    this.body = body;
  }
}

export function createPerplexityClient(opts: PerplexityClientOptions = {}) {
  const env = opts.env ?? process.env;
  const baseUrl = (
    opts.baseUrl ||
    env.PPLX_API_BASE_URL ||
    "https://api.perplexity.ai"
  ).replace(/\/$/, "");
  const defaultModel = opts.defaultModel || env.PPLX_DEFAULT_MODEL || "sonar-pro";
  const fetchImpl = opts.fetchImpl ?? fetch;

  async function chat(
    body: ChatRequestBody,
    requestId?: string
  ): Promise<ParsedPerplexityResponse> {
    const started = Date.now();
    const mock = shouldUseMock(body.mock, env);
    const model = body.model || defaultModel;
    const messages = body.messages?.length
      ? body.messages
      : ([{ role: "user", content: "Hello" }] as ChatMessage[]);

    if (mock) {
      const parsed = await mockChat(messages, body.skills, model);
      log(
        "info",
        "pplx.chat.mock",
        { model, skills: body.skills },
        { requestId, durationMs: Date.now() - started }
      );
      return parsed;
    }

    const apiKey = opts.apiKey ?? getPerplexityApiKey(env);
    if (!apiKey) {
      throw new PerplexityApiError("PERPLEXITY_API_KEY is not configured", 401, null);
    }

    const tools = skillsToToolSchemas(body.skills);
    const payload: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      temperature: body.temperature ?? 0.2,
      max_tokens: body.max_tokens ?? 2048,
    };

    if (tools.length) payload.tools = tools;
    if (body.return_citations !== false) {
      // Sonar models return citations by default; keep flag for callers.
      payload.return_citations = true;
    }

    const authScheme = "Bearer";
    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: authScheme + " " + apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw_text: text };
    }

    if (!res.ok) {
      log(
        "error",
        "pplx.chat.error",
        { status: res.status, body: json },
        { requestId, durationMs: Date.now() - started }
      );
      throw new PerplexityApiError(
        `Perplexity API error ${res.status}`,
        res.status,
        json
      );
    }

    const parsed = parsePerplexityResponse(json, "live");

    // Run any local skill tool_calls the model requested.
    const localCalls = parsed.toolCalls
      .filter((tc) => {
        try {
          // local skills only — remote builtins won't appear as client tool_calls
          // when using Sonar chat; custom tools will.
          return true;
        } catch {
          return false;
        }
      })
      .map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = { _raw: tc.function.arguments };
        }
        return { name: tc.function.name, arguments: args, callId: tc.id };
      });

    if (localCalls.length) {
      const localResults = await executeLocalSkillCalls(localCalls);
      // Merge: prefer local completed status over "requested"
      for (const inv of localResults) {
        const idx = parsed.skillInvocations.findIndex(
          (s) => s.callId === inv.callId || s.skillId === inv.skillId
        );
        if (idx >= 0) parsed.skillInvocations[idx] = inv;
        else parsed.skillInvocations.push(inv);
      }
    }

    log(
      "info",
      "pplx.chat.ok",
      {
        model: parsed.model || model,
        citations: parsed.citations.length,
        skills: parsed.skillInvocations.map((s) => s.skillId),
      },
      { requestId, durationMs: Date.now() - started }
    );

    return parsed;
  }

  return { chat, baseUrl, defaultModel };
}

async function mockChat(
  messages: ChatMessage[],
  skills: SkillId[] | undefined,
  model: string
): Promise<ParsedPerplexityResponse> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser?.content || "";

  // Optionally execute requested local skills so the demo is interactive offline.
  const requested = skills?.length ? skills : ["bom_lookup", "skill_classify"];
  const localResults = await executeLocalSkillCalls(
    requested.map((id) => ({
      name: id,
      arguments:
        id === "bom_lookup"
          ? { query: prompt || "perplexity" }
          : id === "skill_classify"
            ? { text: prompt || "web_search bom_lookup" }
            : id === "repo_context"
              ? {}
              : { query: prompt },
    }))
  );

  const skillNarrative = localResults
    .map((s) => `Using skill: ${s.skillId} (${s.category}) → ${s.status}`)
    .join("\n");

  const content = [
    `[mock:${model}] Perplexity skills demo response.`,
    "",
    "What you noticed in the Perplexity chat window as “skills” maps to Agent API tools:",
    "1) Built-in tools (web_search, fetch_url, finance_search, people_search, sandbox)",
    "2) MCP servers",
    "3) Custom functions you execute locally",
    "",
    skillNarrative,
    "",
    `Prompt echo: ${prompt.slice(0, 400) || "(empty)"}`,
    "",
    "Good fits: citation-backed research, competitor scans, BOM-assisted tool selection.",
    "Bad fits: private data without MCP/custom tools, bulk scraping, hard real-time SLAs without caching.",
    "",
    "Set PERPLEXITY_API_KEY to switch this route to live Sonar/Agent calls.",
  ].join("\n");

  const raw = {
    id: `mock-${Date.now()}`,
    model,
    choices: [
      {
        message: {
          role: "assistant",
          content,
          tool_calls: localResults.map((s, i) => ({
            id: s.callId || `mock_call_${i}`,
            type: "function",
            function: {
              name: s.skillId,
              arguments: JSON.stringify(s.arguments ?? {}),
            },
          })),
        },
      },
    ],
    citations: [
      "https://docs.perplexity.ai",
      "https://docs.perplexity.ai/docs/agent-api/tools/custom-functions",
    ],
    usage: { prompt_tokens: 32, completion_tokens: 128, total_tokens: 160 },
  };

  const parsed = parsePerplexityResponse(raw, "mock");
  // Attach execution results
  parsed.skillInvocations = localResults.map((s) => ({
    ...s,
    status: s.status === "failed" ? "failed" : "completed",
  }));
  return parsed;
}
