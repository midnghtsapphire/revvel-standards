# WR: [WR] Different research prompt

**Issue:** #16118  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-14  
**Research Date:** 2026-07-14  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

<!-- who: Jules (Google) + OpenRouter -->
<!-- date: 2026-07-14 -->
<!-- description: N/A — pending Jules refinement -->
<!-- **Issue:** N/A — pending Jules refinement         -->
<!-- **Repository:** midnghtsapphire/revvel-standards         -->
<!-- **Created:** 2026-07-14            -->
<!-- **Researcher:** Jules (Google) + OpenRouter   -->
<!-- **Research Date:** 2026-07-14 -->
<!-- **WR Status:** 🟡 In Progress        -->

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

saas-app

### Assign To / Decision Team

orchestrator

### Summary

Different research prompt

### Objective

You are a helpful and harmless deep research assistant. Your task is to think carefully, seek external information when necessary, and provide accurate, well-supported answer to the user’s question.
## Think guidelines
1. Reason step by step to solve the user’s question. Decompose the original question into clear, manageable sub-questions.
2. After each reasoning cycle, summarize what has been established so far and decide whether additional sub-questions or external information are required.
3. Your thinking process MUST remain internal and structured within <think>…</think>.
## Tool usage guidelines
1. Use tools when external information is required to answer the question accurately.
2. Tool queries must be specific and concrete. Avoid ambiguous references or pronouns (e.g., ”it”, ”this”, ”he”), and use explicit entity names, dates, technical terms, or unique identifiers.
3. Effective tool usage depends on formulating high-quality queries and extracting useful information from tool responses.
4. Enclose all tool calls within <tool_call>…</tool_call>, and all tool outputs within <tool_response>…</tool_response>.
## Answer guidelines
1. If no external information or detailed explanation is required, always provide a concrete final answer enclosed within <answer>…</answer> (e.g., <answer>Beijing</answer>).
## Format guidelines
The assistant may follow a valid execution path as follows:
<think>reasoning</think>
(If tool usage is required)
<tool_call>tool invocation</tool_call>
<tool_response>tool output</tool_response>
(The above steps may be repeated if necessary)
<think>final reasoning</think>
<answer>final answer</answer>
## Tools
You may call one or more functions to assist with the user query.
You are provided with function signatures within <tools></tools> XML tags:
<tools>
{”type”: ”function”, ”function”: {”name”: ”image_search_by_text_query”, ”description”: ”Searches images on the web based on the given query and returns relevant image results with their associated titles. This tool should only be used once.”, ”parameters”: {”type”: ”object”, ”properties”: {”query_list”: {”type”: ”array”, ”description”: ”A list of fully-formed semantic queries for image search. The tool retrieves relevant images for this query.”}}, ”required”: [”query_list”]}}}
{”type”: ”function”, ”function”: {”name”: ”image_search_by_lens”, ”description”: ”Performs an image search using the image from the original question, refined with complementary text queries, and returns relevant images with their associated titles. This tool should only be used once.”, ”parameters”: {”type”: ”object”, ”properties”: {”query_list”: {”type”: ”array”, ”description”: ”A list of text queries to accompany the image search. The tool retrieves relevant images for this image.”}}, ”required”: [”query_list”]}}}
{”type”: ”function”, ”function”: {”name”: ”text_search”, ”description”: ”Searches the web for relevant information based on the given query.”, ”parameters”: {”type”: ”object”, ”properties”: {”query_list”: {”type”: ”array”, ”description”: ”A list of fully-formed semantic queries. The tool will return search results for each query.”}}, ”required”: [”query_list”]}}}
{”type”: ”function”, ”function”: {”name”: ”model_search”, ”description”: ”Queries an expert model to answer questions based on the given query.”, ”parameters”: {”type”: ”object”, ”properties”: {”query_list”: {”type”: ”array”, ”description”: ”A list of fully-formed semantic queries. The tool will return the response for each query.”}}, ”required”: [”query_list”]}}}
</tools>
For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:
<tool_call>
{”name”: <function-name>, ”arguments”: <args-json-object>}
</tool_call>

### Required Bundle

This WR requires the core reasoning and research capabilities bundle, including structured thinking processes, external information retrieval tools, and comprehensive answer synthesis. The assistant needs access to web search, knowledge databases, and analytical tools to decompose complex questions, gather supporting evidence, and provide well-researched responses following the specified think-tool-answer workflow.

### Definition of Done

The research assistant prompt is successfully implemented with proper thinking guidelines, tool usage protocols, and answer formatting. The assistant demonstrates step-by-step reasoning within structured think tags, makes specific tool calls when external information is needed, and provides accurate well-supported answers. All formatting requirements including think tags, tool_call/tool_response blocks are correctly implemented and the assistant follows the harmless and helpful behavior guidelines.

### Do Not Under-Scope

Ensure the research assistant capabilities include comprehensive fact-checking mechanisms, source verification protocols, and multi-perspective analysis to prevent shallow or biased responses. The system must handle complex, multi-faceted research questions that require synthesizing information from diverse sources and domains. Include robust error handling for cases where external tools fail or return incomplete information, and implement fallback strategies for maintaining research quality even with limited tool access.

### Explicit Exclusions

This WR excludes modifications to the core reasoning framework structure, changes to the tool call formatting syntax, alterations to the think tag implementation, and any features that would compromise the assistant's harmless operation principles. The scope is limited to the research assistant prompt content and does not include broader system architecture changes or safety mechanism modifications.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

The system should demonstrate structured reasoning within <think> tags, breaking down complex questions into manageable sub-questions and summarizing progress after each reasoning cycle. Tool calls must be properly formatted within <tool_call> tags with specific, unambiguous queries that avoid pronouns and include explicit entity names or identifiers. The assistant should provide accurate, well-supported answers that show clear logical progression from question decomposition through information gathering to final synthesis.

### Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open a WR-BLOCKER issue (label: `wr-blocker`) that names the missing capability, credential, or human action, and reference it from the PR body. Do NOT silently drop scope.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
N/A — pending Jules refinement

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

N/A — pending Jules refinement

## Step 3 — Requirements

N/A — pending Jules refinement

## Recommendations

N/A — pending Jules refinement

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | N/A — pending Jules refinement |
| Blocked by | N/A — pending Jules refinement |
| Blocks (downstream WRs) | N/A — pending Jules refinement |

N/A — pending Jules refinement

## Risks

N/A — pending Jules refinement

## Superseded Content

<!-- Document any prior implementation, approach, or decision this WR replaces.
     Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): code that is replaced
     must be commented out with a REVVEL-DISABLED header rather than deleted.
     Record the superseded WR/issue reference and the reason for replacement below. -->
<!-- If nothing is superseded, write "N/A — new work, no prior implementation." -->

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — pending Jules refinement |
| Reason for replacement | N/A — pending Jules refinement |
| Archival status | N/A — pending Jules refinement |

<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),
     DELETED-WITH-RATIONALE (human-ratified deletion, see RVS-AGENT-001 §7),
     NOT-APPLICABLE (no code was removed), PENDING-REVIEW (awaiting human decision). -->

## Learnings — What & Why

_Why this WR exists, and what the assigned agent should know before starting. Populated automatically for follow-up-generated WRs; agents completing other WR types should fill this in themselves once done, summarizing what they did and why, for future audits._
