import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMentionedSkills,
  parsePerplexityResponse,
} from "../app/lib/parse-response";

describe("parsePerplexityResponse", () => {
  it("parses chat completions with citations and tool_calls", () => {
    const raw = {
      id: "chat-1",
      model: "sonar-pro",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Using web_search to answer.\nResult ready.",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "bom_lookup",
                  arguments: '{"query":"perplexity"}',
                },
              },
            ],
          },
        },
      ],
      citations: ["https://docs.perplexity.ai", "https://docs.perplexity.ai"],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    const parsed = parsePerplexityResponse(raw, "live");
    assert.equal(parsed.model, "sonar-pro");
    assert.match(parsed.content, /Using web_search/);
    assert.deepEqual(parsed.citations, ["https://docs.perplexity.ai"]);
    assert.equal(parsed.toolCalls.length, 1);
    assert.equal(parsed.toolCalls[0].function.name, "bom_lookup");
    assert.ok(
      parsed.skillInvocations.some((s) => s.skillId === "bom_lookup")
    );
    assert.ok(
      parsed.skillInvocations.some((s) => s.skillId === "web_search")
    );
    assert.equal(parsed.usage?.total_tokens, 30);
    assert.equal(parsed.mode, "live");
  });

  it("parses Agent API function_call output arrays", () => {
    const raw = {
      output_text: "Order is in transit.",
      output: [
        {
          type: "function_call",
          call_id: "call_abc",
          name: "get_order_status",
          arguments: '{"order_id":"ORD-1"}',
        },
        {
          type: "message",
          content: [{ type: "output_text", text: "Order is in transit." }],
        },
      ],
    };

    const parsed = parsePerplexityResponse(raw, "mock");
    assert.equal(parsed.content, "Order is in transit.");
    assert.equal(parsed.toolCalls[0].id, "call_abc");
    assert.equal(parsed.skillInvocations[0].skillId, "get_order_status");
    assert.equal(parsed.skillInvocations[0].category, "custom");
    assert.equal(parsed.skillInvocations[0].arguments.order_id, "ORD-1");
  });
});

describe("extractMentionedSkills", () => {
  it("extracts skill ids from chat-style narration", () => {
    const skills = extractMentionedSkills(
      "Calling skill: finance_search then using fetch_url on the 10-K."
    );
    assert.ok(skills.includes("finance_search"));
    assert.ok(skills.includes("fetch_url"));
  });

  it("ignores common english words", () => {
    const skills = extractMentionedSkills("Using the tool with your data now");
    assert.equal(skills.length, 0);
  });
});
