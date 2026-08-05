# AI Research Module Standard

**Version:** 1.0.0
**Date:** April 14, 2026
**Status:** Mandatory Policy
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

A research request is not satisfied by a single LLM response. Deep research — competitive analysis, architectural decisions, integration comparisons, market surveys — requires:

1. **Decomposition**: breaking one complex question into many focused sub-questions
2. **Parallel execution**: running multiple specialized agents simultaneously
3. **Synthesis**: aggregating, cross-checking, and summarizing all findings
4. **Documentation**: converting the synthesis into structured Revvel Standard documents

This standard defines the **AI Research Module** — the repeatable process, agent roles, tooling stack, and output templates that every Revvel research task must follow.

---

## 2. When to Use the Research Module

Invoke the AI Research Module whenever:

- A question cannot be answered from existing Revvel standards or docs
- A decision has multiple viable options that need objective comparison
- A new technology, service, or integration is being evaluated
- A market or competitive landscape needs to be mapped
- An architectural choice will affect more than one project

**Do NOT** invoke the Research Module for:

- Questions already answered in existing standards (look there first)
- Simple how-to questions answerable in 1–2 searches
- Tasks that are implementation work, not research

---

## 3. Research Architecture: Sub-Agent Model

### 3.1 How an LLM Handles Deep Research

A single LLM prompt cannot produce reliable deep research for several reasons:

- Context window limits mean it cannot hold all sources simultaneously
- A single pass cannot catch contradictions across sources
- Hallucination risk increases as topics become more nuanced

The solution is **sub-agents**: specialized LLM instances that each own a focused slice of the research and report structured findings back to a coordinator.

```text
User / Orchestrator
       │
       ├── Sub-Agent 1: Official documentation & specs
       ├── Sub-Agent 2: Community knowledge (forums, GitHub issues, HN)
       ├── Sub-Agent 3: Competitive alternatives & trade-offs
       ├── Sub-Agent 4: Security & compliance implications
       ├── Sub-Agent 5: Cost & operational considerations
       └── Synthesizer Agent: merge all reports → final document
```

Each sub-agent:

1. Receives a **focused prompt** (one role, one question domain)
2. Has access to **web search** or a curated knowledge base
3. Returns a **structured report** (not raw text) in a defined schema
4. Is **independent** — does not see other sub-agents' work until synthesis

### 3.2 Agent Roles

| Agent                 | Responsibility                                           | Model Preference                         |
| --------------------- | -------------------------------------------------------- | ---------------------------------------- |
| **Orchestrator**      | Decomposes the question, assigns tasks, drives synthesis | High-reasoning (GPT-5, Claude Opus)      |
| **Spec Agent**        | Official docs, GitHub repos, API references              | Fast + accurate (Claude Sonnet, GPT-4.1) |
| **Community Agent**   | Forums, Reddit, GitHub Issues, Hacker News               | Fast + broad (Gemini Flash, GPT-4o-mini) |
| **Competitive Agent** | Alternatives, comparisons, market positioning            | Balanced (Claude Sonnet, GPT-4.1)        |
| **Security Agent**    | CVEs, compliance, threat model, best practices           | High-reasoning (Claude Opus, GPT-5)      |
| **Cost/Ops Agent**    | Pricing, operational burden, scaling limits              | Fast + precise (GPT-4o-mini, Gemini Pro) |
| **Synthesizer**       | Merge findings, resolve conflicts, produce final doc     | High-reasoning (Claude Opus, GPT-5)      |

---

## 4. OpenRouter Integration

[OpenRouter](https://openrouter.ai) is the recommended gateway for accessing multiple LLMs through a single API endpoint. It normalizes the OpenAI API interface so any LLM can be called with the same code.

### 4.1 Why OpenRouter

- **Single API key** for 200+ models including GPT-5, Claude Opus/Sonnet, Gemini, Llama, Mistral, and more
- **Cost optimization**: automatically route to cheapest model that meets quality requirements
- **Fallback routing**: if one model is down, OpenRouter retries with the next
- **Unified billing**: one invoice instead of separate subscriptions to each provider

### 4.2 Recommended Research LLM Stack (5 Models)

These five models cover the full spectrum of research tasks:

| #   | Model (OpenRouter ID)       | Strengths                                       | Best For                                    |
| --- | --------------------------- | ----------------------------------------------- | ------------------------------------------- |
| 1   | `anthropic/claude-opus-4`   | Deep reasoning, nuance, long context            | Orchestration, synthesis, security analysis |
| 2   | `anthropic/claude-sonnet-4` | Fast + high quality, great at structured output | Spec research, writing standards docs       |
| 3   | `openai/gpt-4.1`            | Code understanding, tool use, broad knowledge   | Competitive analysis, technical docs        |
| 4   | `google/gemini-2.5-pro`     | Massive context window (1M tokens), multi-modal | Processing large docs, PDFs, repo analysis  |
| 5   | `openai/gpt-4o-mini`        | Ultra-fast and cheap                            | Community/forum scanning, quick lookups     |

### 4.3 Environment Configuration

```bash
# .env (stored in Vault at revvel/apps/openrouter/prod)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 4.4 API Call Pattern (Node.js)

> **For illustration only.** Do **not** paste this example into a CI workflow where stdout/stderr is logged. Always call OpenRouter via `scripts/openrouter-routing.js` (or another wrapper) so the key never appears in user-controlled contexts. — Octopus audit 2026-05-28

```javascript
import OpenAI from "openai";

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/midnghtsapphire",
    "X-Title": "Revvel Research Module",
  },
});

async function runSubAgent({ model, systemPrompt, userPrompt }) {
  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" }, // structured output
  });
  return JSON.parse(response.choices[0].message.content);
}
```

### 4.5 Parallel Sub-Agent Execution

```javascript
async function runResearchModule(question) {
  const subAgentConfigs = [
    {
      model: "anthropic/claude-sonnet-4",
      systemPrompt: "You are a technical specification researcher...",
      userPrompt: `Research official documentation for: ${question}`,
    },
    {
      model: "openai/gpt-4o-mini",
      systemPrompt: "You are a community knowledge aggregator...",
      userPrompt: `Summarize community discussions about: ${question}`,
    },
    {
      model: "openai/gpt-4.1",
      systemPrompt: "You are a competitive analysis expert...",
      userPrompt: `Compare alternatives and trade-offs for: ${question}`,
    },
    {
      model: "anthropic/claude-opus-4",
      systemPrompt: "You are a security and compliance expert...",
      userPrompt: `Analyze security implications of: ${question}`,
    },
    {
      model: "google/gemini-2.5-pro",
      systemPrompt: "You are a cost and operations analyst...",
      userPrompt: `Evaluate cost and operational factors for: ${question}`,
    },
  ];

  // Run all sub-agents in parallel
  const reports = await Promise.all(
    subAgentConfigs.map((config) => runSubAgent(config)),
  );

  // Synthesize with the most capable model
  const synthesis = await runSubAgent({
    model: "anthropic/claude-opus-4",
    systemPrompt:
      "You are a research synthesizer. Merge findings from multiple sub-agents into a coherent Revvel Standard document...",
    userPrompt: `Synthesize these research reports into a final recommendation:\n${JSON.stringify(reports, null, 2)}`,
  });

  return synthesis;
}
```

---

## 5. Research Output Schema

Every sub-agent must return structured JSON. The synthesizer must produce the final Revvel Standard document.

### 5.1 Sub-Agent Report Schema

```json
{
  "agent": "spec|community|competitive|security|cost",
  "question_answered": "The specific sub-question this agent addressed",
  "confidence": "high|medium|low",
  "findings": [
    {
      "finding": "Statement of fact or observation",
      "source": "URL or document title",
      "relevance": "high|medium|low"
    }
  ],
  "pros": ["..."],
  "cons": ["..."],
  "unknowns": ["Things that couldn't be determined"],
  "recommendation": "One-sentence recommendation from this angle"
}
```

### 5.2 Synthesis Output Schema

```json
{
  "title": "Research Document Title",
  "question": "The original research question",
  "executive_summary": "2-3 sentences summarizing the answer",
  "recommendation": "The recommended approach",
  "confidence": "high|medium|low",
  "trade_offs": {
    "option_a": { "pros": [], "cons": [], "best_for": "" },
    "option_b": { "pros": [], "cons": [], "best_for": "" }
  },
  "security_considerations": [],
  "cost_estimate": "",
  "implementation_path": [],
  "open_questions": [],
  "sources": []
}
```

---

## 6. Research Workflow

### Step 1: Define the Research Question

Write a clear, specific research question. Bad: "How do I use GitHub?" Good: "Should midnghtsapphire use a GitHub App or GitHub Enterprise Managed Users to manage API access across the Freedom Angel Corps organization and personal repositories?"

### Step 2: Decompose into Sub-Questions

Break the question into 5–8 focused sub-questions, one per agent:

```text
Q: Should midnghtsapphire use GitHub App vs. GitHub EMU?

Sub-questions:
1. (Spec) What do GitHub App and EMU officially support in terms of cross-account access?
2. (Community) What do practitioners say about maintaining GitHub Apps across personal + org accounts?
3. (Competitive) What are alternatives (GitLab CI, Bitbucket Pipelines, self-hosted Gitea)?
4. (Security) What are the security implications of each approach for token management?
5. (Cost) What does GitHub Enterprise cost vs. using free GitHub Apps on a free org?
```

### Step 3: Run Sub-Agents in Parallel

Use the `runResearchModule` function. All sub-agents run concurrently. Total time ≈ time for the slowest single agent (typically 15–30 seconds).

### Step 4: Synthesize

Feed all sub-agent reports to the Synthesizer. The Synthesizer:

- Identifies agreements across agents (high confidence)
- Flags contradictions (low confidence — needs human review)
- Produces a final recommendation with reasoning

### Step 5: Document

Convert the synthesis output into a Revvel Standard document following this repo's conventions. Store in:

- Root level as `<TOPIC>_RESEARCH.md` for cross-cutting topics
- `docs/<TOPIC>_RESEARCH.md` for project-specific research
- Update `docs/PROJECT_CATALOG.md` to reference the new document

### Step 6: Create GitHub Issues

For each actionable finding, create a GitHub Issue with label `New Project`:

```bash
gh issue create \
  --repo midnghtsapphire/revvel-standards \
  --title "[Research] Implement recommended GitHub App integration" \
  --label "New Project" \
  --body "Based on research in docs/GITHUB_ENTERPRISE_RESEARCH.md ..."
```

---

## 7. GitHub Actions Workflow for Research Module

```yaml
# .github/workflows/research-module.yml
name: AI Research Module
on:
  workflow_dispatch:
    inputs:
      question:
        description: "Research question to investigate"
        required: true
        type: string
      output_file:
        description: "Output filename (e.g., docs/MY_RESEARCH.md)"
        required: true
        type: string

jobs:
  research:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: Generate App Token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Install dependencies
        run: npm install openai

      - name: Run Research Module
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          QUESTION: ${{ inputs.question }}
          OUTPUT_FILE: ${{ inputs.output_file }}
        run: node scripts/research-module.js

      - name: Commit research output
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          git config user.name "revvel-automation[bot]"
          git config user.email "revvel-automation[bot]@users.noreply.github.com"
          git add "${{ inputs.output_file }}"
          git commit -m "research: add ${{ inputs.output_file }}" || echo "No changes"
          git push
```

---

## 8. Quality Gates

Research output must pass these checks before being committed as a Revvel Standard:

- [ ] At least 3 sub-agents ran (minimum viable research set: spec + competitive + security)
- [ ] Each finding has a source URL or document reference
- [ ] The synthesis explicitly states confidence level (high/medium/low)
- [ ] Contradictions between agents are flagged as "open questions"
- [ ] Actionable recommendations are linked to GitHub Issues
- [ ] The document follows Revvel Standard formatting (see `AGENT_FACTORY_STANDARD.md` for style)

---

## 9. Agent Trigger Words

When the Revvel Agent Factory detects these keywords in a task, it should route to the Research Module:

```text
research, investigate, compare, evaluate, analyze options,
which is better, pros and cons, deep dive, survey,
should we use, what are the alternatives, trade-offs
```

See `AGENT_FACTORY_STANDARD.md` for the full trigger matrix.

---

## 10. Secret Management

| Secret                 | Vault Path                                    | GitHub Secret Name   |
| ---------------------- | --------------------------------------------- | -------------------- |
| OpenRouter API key     | `revvel/apps/openrouter/prod/api_key`         | `OPENROUTER_API_KEY` |
| GitHub App ID          | `revvel/apps/github-app/prod/app_id`          | `APP_ID`             |
| GitHub App Private Key | `revvel/apps/github-app/prod/private_key_pem` | `APP_PRIVATE_KEY`    |

---

## 11. References

- OpenRouter documentation: <https://openrouter.ai/docs>
- OpenRouter model list: <https://openrouter.ai/models>
- Anthropic Claude models: <https://docs.anthropic.com/en/docs/about-claude/models>
- OpenAI models: <https://platform.openai.com/docs/models>
- Google Gemini: <https://ai.google.dev/gemini-api/docs/models>
- Related Revvel Standards:
  - `AGENT_FACTORY_STANDARD.md` — agent routing and orchestration
  - `GITHUB_APP_INTEGRATION_STANDARD.md` — GitHub App setup for automation
  - `VAULT_AGENT_STANDARD.md` — secret management for API keys
  - `docs/GITHUB_ENTERPRISE_RESEARCH.md` — example output from this module
