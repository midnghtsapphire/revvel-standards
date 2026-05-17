# AI Research Module Standard

**Version:** 2.0.0
**Date:** May 17, 2026
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

As of v2.0.0, the module is a layered **search-research engine** for every WR:

1. **Retrieval readiness** checks Tavily, Firecrawl, and Perplexity credentials when present.
2. **OpenRouter model consensus** runs each research agent through up to three LLMs.
3. **Domain agents** cover source mapping, competitors, marketing/SEO, audience, chatter, security, cost/revenue, and implementation.
4. **Code-review-style research reviewers** inspect the synthesis and provide automatic fix recommendations.
5. **Automatic research-fix rewrite** applies reviewer feedback before the workflow commits the report.

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

```
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

| Agent | Responsibility | Model Preference |
|---|---|---|
| **Orchestrator** | Decomposes the question, assigns tasks, drives synthesis | High-reasoning (GPT-5, Claude Opus) |
| **Spec Agent** | Official docs, GitHub repos, API references | Fast + accurate (Claude Sonnet, GPT-4.1) |
| **Community / Chatter Agent** | Forums, Reddit, GitHub Issues, reviews, social complaints | Fast + broad (Gemini Flash, GPT-4o-mini) |
| **Competitive Agent** | Alternatives, comparisons, market positioning | Balanced (Claude Sonnet, GPT-4.1) |
| **Marketing / SEO Agent** | Keyword demand, offer framing, domain signals, ad hooks | Broad + current (Gemini Pro, GPT-4.1) |
| **Audience Agent** | Target users, buyer intent, objections, why this market matters | Balanced (Claude Sonnet, GPT-4.1) |
| **Security Agent** | CVEs, compliance, threat model, best practices | High-reasoning (Claude Opus, GPT-5) |
| **Cost/Ops Agent** | Pricing, operational burden, scaling limits | Fast + precise (GPT-4o-mini, Gemini Pro) |
| **Implementation Agent** | Labels, workflows, scripts, tests, acceptance gates | Code model (Claude Sonnet, Codex) |
| **Synthesizer** | Merge findings, resolve conflicts, produce final doc | High-reasoning (Claude Opus, GPT-5) |
| **Research Reviewers** | Evidence, code-readiness, security, and growth review | Claude Sonnet via OpenRouter |

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

| # | Model (OpenRouter ID) | Strengths | Best For |
|---|---|---|---|
| 1 | `anthropic/claude-opus-4` | Deep reasoning, nuance, long context | Orchestration, synthesis, security analysis |
| 2 | `anthropic/claude-sonnet-4` | Fast + high quality, great at structured output | Spec research, writing standards docs |
| 3 | `openai/gpt-4.1` | Code understanding, tool use, broad knowledge | Competitive analysis, technical docs |
| 4 | `google/gemini-2.5-pro` | Massive context window (1M tokens), multi-modal | Processing large docs, PDFs, repo analysis |
| 5 | `openai/gpt-4o-mini` | Ultra-fast and cheap | Community/forum scanning, quick lookups |

### 4.3 Environment Configuration

```bash
# .env (stored in Vault at revvel/apps/openrouter/prod)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
TAVILY_API_KEY=tvly-...        # Optional live web search
FIRECRAWL_API_KEY=fc-...       # Optional crawl/search extraction
PERPLEXITY_API_KEY=pplx-...    # Optional cited answer layer
```

### 4.4 API Call Pattern (Node.js)

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
    response_format: { type: "json_object" },  // structured output
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
    subAgentConfigs.map((config) => runSubAgent(config))
  );

  // Synthesize with the most capable model
  const synthesis = await runSubAgent({
    model: "anthropic/claude-opus-4",
    systemPrompt: "You are a research synthesizer. Merge findings from multiple sub-agents into a coherent Revvel Standard document...",
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

### 5.3 Required WR Research Areas

Every WR-grade run must include these areas in the final report:

| Area | Label | Required output |
| --- | --- | --- |
| Source map | `research:source-map` | Official docs, repos, APIs, standards, and citations |
| Competitors | `research:competitors` | Direct and adjacent alternatives, gaps, positioning |
| Marketing / SEO | `research:marketing-seo` | Keywords, search intent, ad hooks, domain/name signals |
| Audience | `research:audience` | Target user, buyer intent, why this audience matters |
| Chatter | `research:chatter` | Complaints, forum/review language, repeated pain points |
| Security / compliance | `security` plus `research:review` | Credential, privacy, abuse, and compliance risks |
| Cost / revenue | `research:review` | Cost, payability, lead economics, revenue path |
| Implementation | `research:review` | Scripts, workflows, labels, tests, acceptance gates |

### 5.4 Research Review and Auto-Fix Contract

The research engine must run review agents after synthesis:

| Reviewer | Scope | Required behavior |
| --- | --- | --- |
| Mirror | Evidence quality and contradictions | Flags unsupported claims and missing sources |
| Aria | Code-review readiness | Checks whether a coding agent can act on the report |
| Cipher | Security and credentials | Flags unsafe auth, secrets, data, or abuse assumptions |
| Quill | Growth completeness | Checks marketing, SEO, competitors, audience, and chatter |

Reviewer output is not the final artifact. The engine must run a fix pass that rewrites the research report with valid review feedback applied, then commit the reviewed output. If the fix pass fails, the report must still include the review comments and mark the automatic fix pass as failed in the workflow output.

---

## 6. Research Workflow

### Step 1: Define the Research Question

Write a clear, specific research question. Bad: "How do I use GitHub?" Good: "Should midnghtsapphire use a GitHub App or GitHub Enterprise Managed Users to manage API access across the Freedom Angel Corps organization and personal repositories?"

### Step 2: Decompose into Sub-Questions

Break the question into 5–8 focused sub-questions, one per agent:

```
Q: Should midnghtsapphire use GitHub App vs. GitHub EMU?

Sub-questions:
1. (Spec) What do GitHub App and EMU officially support in terms of cross-account access?
2. (Community) What do practitioners say about maintaining GitHub Apps across personal + org accounts?
3. (Competitive) What are alternatives (GitLab CI, Bitbucket Pipelines, self-hosted Gitea)?
4. (Security) What are the security implications of each approach for token management?
5. (Cost) What does GitHub Enterprise cost vs. using free GitHub Apps on a free org?
```

### Step 3: Run Sub-Agents in Parallel

Use `scripts/research-engine.js` or the compatibility entrypoint `scripts/research-module.js`. All domain agents run concurrently, and each domain agent can run up to three OpenRouter models for consensus.

### Step 4: Synthesize

Feed all sub-agent reports to the Synthesizer. The Synthesizer:
- Identifies agreements across agents (high confidence)
- Flags contradictions (low confidence — needs human review)
- Produces a final recommendation with reasoning

### Step 5: Document

Convert the synthesis output into a Revvel Standard document following this repo's conventions. Store in:
- Root level as `<TOPIC>_RESEARCH.md` for cross-cutting topics
- `docs/<TOPIC>_RESEARCH.md` for project-specific research
- `docs/wr/issue-<number>-research.md` for WR-triggered issue research
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
        run: node scripts/research-engine.js

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

- [ ] At least 8 domain agents ran (source-map, competitors, marketing/SEO, audience, chatter, security, cost/revenue, implementation)
- [ ] OpenRouter model consensus ran for each domain agent, unless `RESEARCH_MAX_MODELS_PER_AGENT=1` was intentionally set for a low-cost run
- [ ] Optional Tavily / Firecrawl / Perplexity provider readiness is documented
- [ ] Each finding has a source URL or document reference
- [ ] The synthesis explicitly states confidence level (high/medium/low)
- [ ] Contradictions between agents are flagged as "open questions"
- [ ] Research reviewers ran and comments are included
- [ ] Automatic research-fix rewrite was attempted before commit
- [ ] Actionable recommendations are linked to GitHub Issues
- [ ] The document follows Revvel Standard formatting (see `AGENT_FACTORY_STANDARD.md` for style)

## 8.1 Labels

The canonical labels for this engine are:

```text
search-research-engine
research:orchestrating
research:source-map
research:competitors
research:marketing-seo
research:audience
research:chatter
research:review
research:reviewed
research:autofix
research:fix-committed
```

WR automation applies these labels alongside existing `weekly-research`, `deep-research`, `openrouter`, and `wr:*` lifecycle labels.

---

## 9. Agent Trigger Words

When the Revvel Agent Factory detects these keywords in a task, it should route to the Research Module:

```
research, investigate, compare, evaluate, analyze options,
which is better, pros and cons, deep dive, survey,
should we use, what are the alternatives, trade-offs
```

See `AGENT_FACTORY_STANDARD.md` for the full trigger matrix.

---

## 10. Secret Management

| Secret | Vault Path | GitHub Secret Name |
|---|---|---|
| OpenRouter API key | `revvel/apps/openrouter/prod/api_key` | `OPENROUTER_API_KEY` |
| Tavily API key | `revvel/apps/research/tavily/api_key` | `TAVILY_API_KEY` |
| Firecrawl API key | `revvel/apps/research/firecrawl/api_key` | `FIRECRAWL_API_KEY` |
| Perplexity API key | `revvel/apps/research/perplexity/api_key` | `PERPLEXITY_API_KEY` |
| GitHub App ID | `revvel/apps/github-app/prod/app_id` | `APP_ID` |
| GitHub App Private Key | `revvel/apps/github-app/prod/private_key_pem` | `APP_PRIVATE_KEY` |

---

## 11. References

- OpenRouter documentation: https://openrouter.ai/docs
- OpenRouter model list: https://openrouter.ai/models
- Anthropic Claude models: https://docs.anthropic.com/en/docs/about-claude/models
- OpenAI models: https://platform.openai.com/docs/models
- Google Gemini: https://ai.google.dev/gemini-api/docs/models
- Related Revvel Standards:
  - `AGENT_FACTORY_STANDARD.md` — agent routing and orchestration
  - `GITHUB_APP_INTEGRATION_STANDARD.md` — GitHub App setup for automation
  - `VAULT_AGENT_STANDARD.md` — secret management for API keys
  - `docs/GITHUB_ENTERPRISE_RESEARCH.md` — example output from this module
