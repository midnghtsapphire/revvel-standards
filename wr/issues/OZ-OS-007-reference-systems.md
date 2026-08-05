# WR: Reference Systems Comparison

**WR ID:** OZ-OS-007
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Single file: `oz-os/tool-intelligence/reference-systems.md`

## Content Requirements
Document 8 reference systems that Oz OS benchmarks against. This is different from
tool-intelligence (tools we USE) — this is systems we STUDY to understand design tradeoffs.

For each system, document:
- What it optimizes for
- What it ignores
- What Oz OS borrows from it
- What Oz OS explicitly rejects
- The single feature worth stealing

## 8 Reference Systems

### 1. NotebookLM (Google)
- **Optimizes for:** Source-grounded synthesis
- **Ignores:** Multi-agent orchestration, adversarial review

### 2. OpenHands
- **Optimizes for:** Agent execution with tooling
- **Ignores:** Research accumulation, method diversity

### 3. n8n
- **Optimizes for:** Workflow automation with AI nodes
- **Ignores:** Intelligence compounding, research quality

### 4. LangGraph
- **Optimizes for:** Multi-step agent orchestration
- **Ignores:** Adversarial review, null-result handling

### 5. CrewAI
- **Optimizes for:** Specialized agent teams
- **Ignores:** Evidence gating, method divergence

### 6. AutoGen (Microsoft)
- **Optimizes for:** Multi-agent conversations
- **Ignores:** Research persistence, intel accumulation

### 7. GraphRAG (Microsoft)
- **Optimizes for:** Knowledge graph + retrieval augmented generation
- **Ignores:** Method discovery, contrarian analysis

### 8. Perplexity
- **Optimizes for:** Research-first retrieval with citations
- **Ignores:** Method divergence, reusable knowledge packs

## Key Insight
Most of these optimize for **Answer Quality**. Oz OS optimizes for **Method Discovery +
Research Accumulation + Reusable Knowledge**. That distinction drives every architectural
decision in the reference comparison.

## Acceptance
- All 8 systems documented with the 5-field format
- No raw tokens or bracket-placeholders
- Honest assessment — not promotional summaries
