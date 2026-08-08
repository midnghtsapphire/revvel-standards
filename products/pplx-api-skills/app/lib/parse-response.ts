import type {
  ParsedPerplexityResponse,
  SkillCategory,
  SkillId,
  SkillInvocation,
  ToolCall,
} from "./types";
import { classifySkill } from "./skills/registry";

/**
 * Normalize Perplexity Chat Completions + Agent/Responses payloads into one shape.
 * Handles:
 *  - OpenAI-compatible chat.completions
 *  - Agent API `output` arrays with function_call items
 *  - Citation arrays (search grounding)
 */
export function parsePerplexityResponse(
  raw: unknown,
  mode: "live" | "mock" = "live"
): ParsedPerplexityResponse {
  if (!raw || typeof raw !== "object") {
    return emptyParsed(raw, mode);
  }

  const obj = raw as Record<string, unknown>;
  const content = extractContent(obj);
  const citations = extractCitations(obj);
  const toolCalls = extractToolCalls(obj);
  const skillInvocations = toolCallsToSkills(toolCalls);

  // Also surface skills mentioned in content (chat-window style "calling skill X").
  for (const mentioned of extractMentionedSkills(content)) {
    if (!skillInvocations.some((s) => s.skillId === mentioned)) {
      skillInvocations.push({
        skillId: mentioned,
        category: classifySkill(mentioned).category,
        arguments: {},
        status: "completed",
      });
    }
  }

  const usage =
    obj.usage && typeof obj.usage === "object"
      ? (obj.usage as ParsedPerplexityResponse["usage"])
      : undefined;

  return {
    id: typeof obj.id === "string" ? obj.id : undefined,
    model: typeof obj.model === "string" ? obj.model : undefined,
    content,
    citations,
    toolCalls,
    skillInvocations,
    usage,
    raw,
    mode,
  };
}

function emptyParsed(
  raw: unknown,
  mode: "live" | "mock"
): ParsedPerplexityResponse {
  return {
    content: "",
    citations: [],
    toolCalls: [],
    skillInvocations: [],
    raw,
    mode,
  };
}

function extractContent(obj: Record<string, unknown>): string {
  // Chat completions
  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const choice = choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === "string") return message.content;
    if (typeof choice.text === "string") return choice.text;
  }

  // Agent API convenience field
  if (typeof obj.output_text === "string") return obj.output_text;

  // Agent API output array
  if (Array.isArray(obj.output)) {
    const parts: string[] = [];
    for (const item of obj.output) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (row.type === "message" && Array.isArray(row.content)) {
        for (const c of row.content) {
          if (c && typeof c === "object") {
            const chunk = c as Record<string, unknown>;
            if (typeof chunk.text === "string") parts.push(chunk.text);
          }
        }
      }
      if (typeof row.text === "string") parts.push(row.text);
    }
    if (parts.length) return parts.join("\n").trim();
  }

  if (typeof obj.content === "string") return obj.content;
  if (typeof obj.answer === "string") return obj.answer;
  return "";
}

function extractCitations(obj: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push(v.trim());
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.url === "string") out.push(o.url);
      else if (typeof o.link === "string") out.push(o.link);
    }
  };

  if (Array.isArray(obj.citations)) obj.citations.forEach(push);
  if (Array.isArray(obj.search_results)) obj.search_results.forEach(push);

  // Dedupe preserve order
  return [...new Set(out)];
}

function extractToolCalls(obj: Record<string, unknown>): ToolCall[] {
  const calls: ToolCall[] = [];

  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as Record<string, unknown>).message as
      | Record<string, unknown>
      | undefined;
    const tc = message?.tool_calls;
    if (Array.isArray(tc)) {
      for (const item of tc) {
        const normalized = normalizeToolCall(item);
        if (normalized) calls.push(normalized);
      }
    }
  }

  if (Array.isArray(obj.output)) {
    for (const item of obj.output) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (row.type === "function_call") {
        const id =
          (typeof row.call_id === "string" && row.call_id) ||
          (typeof row.id === "string" && row.id) ||
          `call_${calls.length + 1}`;
        const name = typeof row.name === "string" ? row.name : "unknown";
        const args =
          typeof row.arguments === "string"
            ? row.arguments
            : JSON.stringify(row.arguments ?? {});
        calls.push({
          id,
          type: "function",
          function: { name, arguments: args },
        });
      }
    }
  }

  return calls;
}

function normalizeToolCall(item: unknown): ToolCall | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const fn = row.function as Record<string, unknown> | undefined;
  const name =
    (fn && typeof fn.name === "string" && fn.name) ||
    (typeof row.name === "string" && row.name) ||
    null;
  if (!name) return null;
  const args =
    (fn && typeof fn.arguments === "string" && fn.arguments) ||
    (typeof row.arguments === "string" && row.arguments) ||
    "{}";
  const id =
    (typeof row.id === "string" && row.id) ||
    (typeof row.call_id === "string" && row.call_id) ||
    `call_${name}`;
  return {
    id,
    type: "function",
    function: { name, arguments: args },
  };
}

function toolCallsToSkills(toolCalls: ToolCall[]): SkillInvocation[] {
  return toolCalls.map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
    } catch {
      args = { _raw: tc.function.arguments };
    }
    const meta = classifySkill(tc.function.name);
    return {
      skillId: tc.function.name as SkillId,
      category: meta.category as SkillCategory,
      arguments: args,
      callId: tc.id,
      status: "requested" as const,
    };
  });
}

/**
 * Heuristic: Perplexity chat UI often narrates skill use as
 * "Using web_search…" / "Calling skill: finance_search".
 */
export function extractMentionedSkills(content: string): SkillId[] {
  if (!content) return [];
  const found = new Set<SkillId>();
  const patterns = [
    /\b(?:using|calling|invoking|running)\s+(?:skill[:\s]+)?([a-z][a-z0-9_]{2,40})/gi,
    /\bskill[:\s]+([a-z][a-z0-9_]{2,40})/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const id = m[1].toLowerCase();
      // Filter common English verbs that aren't skills
      if (STOP_WORDS.has(id)) continue;
      found.add(id);
    }
  }
  return [...found];
}

const STOP_WORDS = new Set([
  "the",
  "this",
  "that",
  "with",
  "from",
  "into",
  "your",
  "our",
  "and",
  "for",
  "tool",
  "tools",
  "function",
  "functions",
  "now",
  "next",
  "step",
  "code",
  "data",
]);
