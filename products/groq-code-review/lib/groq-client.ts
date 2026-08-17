import { DEFAULT_MAX_NEW_TOKENS, DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_TOP_P } from "./types";

export interface GroqChatOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxNewTokens?: number;
  topP?: number;
  systemPrompt?: string;
  userPrompt: string;
  /** Injected for tests */
  fetchImpl?: typeof fetch;
}

export interface GroqChatResult {
  text: string;
  model: string;
  provider: "groq";
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Thin Groq Chat Completions client.
 *
 * Secrets must arrive via env / workflow secrets (never argv). On any non-2xx
 * or network failure we throw so the caller can fall back to the local reviewer.
 */
export async function callGroqChat(options: GroqChatOptions): Promise<GroqChatResult> {
  const apiKey = (options.apiKey || "").trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is empty");
  }

  const model = options.model || process.env.GROQ_MODEL || DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxNewTokens ?? DEFAULT_MAX_NEW_TOKENS,
      top_p: options.topP ?? DEFAULT_TOP_P,
      messages: [
        {
          role: "system",
          content:
            options.systemPrompt ??
            [
              "You are a senior code reviewer for production engineering teams.",
              "Review the unified diff. Focus on bugs, security, secrets, missing tests,",
              "and maintainability. Reply with concise bullet findings using this format:",
              "- [severity] title :: detail (file optional)",
              "Severity must be one of: critical, high, medium, low, info.",
              "If nothing material, reply exactly: NO_FINDINGS",
            ].join(" "),
        },
        { role: "user", content: options.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq API ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("Groq API returned empty content");
  }

  return { text, model: json.model || model, provider: "groq" };
}

/** Parse Groq bullet output into structured findings-ish rows. */
export function parseGroqFindings(
  text: string,
  chunkIndex: number,
): Array<{ severity: string; title: string; detail: string }> {
  if (!text || /NO_FINDINGS/i.test(text.trim())) {
    return [];
  }

  const rows: Array<{ severity: string; title: string; detail: string }> = [];
  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^\s*[-*•]\s*/, "").trim();
    if (!cleaned) continue;
    const match = cleaned.match(
      /^\[?\s*(critical|high|medium|low|info)\s*\]?\s*[:\-]?\s*(.+?)(?:\s*::\s*(.+))?$/i,
    );
    if (!match) {
      rows.push({
        severity: "info",
        title: cleaned.slice(0, 80),
        detail: cleaned,
      });
      continue;
    }
    rows.push({
      severity: match[1].toLowerCase(),
      title: (match[2] || "Finding").trim().slice(0, 120),
      detail: (match[3] || match[2] || cleaned).trim(),
    });
  }

  // Attach chunk index only for debugging callers; id assigned upstream.
  void chunkIndex;
  return rows;
}
