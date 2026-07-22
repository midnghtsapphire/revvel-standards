# AI Tax Integration Standard

> **Status:** Research Complete
> **Last Updated:** 2026-04-25

---

## Finding: No Dedicated Tax-Specific LLMs on OpenRouter

After comprehensive research, **there are NO dedicated tax-specific LLM models available on OpenRouter**. The industry does not offer tax-only models - instead, tax AI applications are built using a **RAG (Retrieval-Augmented Generation) + Tool Calling** architecture.

---

## Approach: General LLM + Tax Knowledge Base

### Recommended Architecture

```text
┌─────────────────────────────────────────────────────┐
│                  Tax AI System                       │
├─────────────────────────────────────────────────────┤
│  1. Foundation Model (OpenRouter)                   │
│     → Claude, GPT-4, DeepSeek R1, or QwQ-32B       │
│                                                     │
│  2. Vector Database (Tax Law Knowledge)            │
│     → IRS publications, state codes, regulations     │
│                                                     │
│  3. Tool Calling (TaxCalc Python)                │
│     → Actual calculations and form generation         │
└─────────────────────────────────────────────────────┘
```

### Recommended Models (OpenRouter)

| Model | Context | Strengths | Best For |
|-------|---------|----------|---------|
| `anthropic/claude-sonnet-4.6` | 200K | Reasoning, tool use | Complex tax analysis |
| `deepseek/deepseek-r1` | 64K | Chain-of-thought | Statutory reasoning |
| `qwen/qwQ-32b-preview` | 32K | Coding + math | Calculations |
| `google/gemini-2.5-pro` | 1M | Long context | Document analysis |

---

## Required Components

### 1. Tax Knowledge RAG System

Must include:
- IRS Publication 17 (Federal Income Tax)
- State tax codes (by jurisdiction)
- Latest tax court decisions
- Form instructions (1040, 1120, 1065, etc.)

### 2. TaxCalc Python Library

```python
from taxcalc import Policy, Records, Calculator

# Example calculation
policy = Policy()
records = Records(data=client_data)
calc = Calculator(policy=policy, records=records)
calc.calc_all()
```

### 3. Validation Layer

- **Never trust LLM calculations directly**
- Always verify with TaxCalc or equivalent
- Human review required for final returns

---

## Integration Points

### Accounting Software

| Software | Integration Method | Status |
|----------|-----------------|--------|
| QuickBooks | API | Available |
| Xero | API | Available |
| FreshBooks | API | Available |
| Wave | API | Available |

### E-Filing

| Service | API | Notes |
|---------|-----|-------|
| TaxSlayer Pro | REST | Direct API |
| Drake Software | Local | No API |
| UltraTax CS | Proprietary | Vendor agreement |

---

## Risk Considerations

### Hallucination Risk (Critical)

> **WARNING:** General LLMs can "hallucinate" tax rules. Always cite sources.

Mitigation:
1. Require source citations in all responses
2. Validate against authoritative databases
3. Block claims without citations

### Liability

- AI can assist but NOT replace tax professionals
- Final returns require CPA/signatory review
- Compliance: CIRC-230 (if in US)

---

## External Services (Alternatives)

### Tax-Specific AI Platforms

| Service | Description | API |
|---------|------------|-----|
| Taxfyle TXF Intelligence | AI tax prep automation | Enterprise |
| Thomson Reuters AI | Checkpoint | Enterprise |
| Bloomberg Tax | AI research | Enterprise |

---

## Conclusion

Building a tax LLM requires:
1. **General model** + **Tax knowledge base** (no special model needed)
2. **TaxCalc** for actual calculations
3. **Validation layer** for accuracy
4. **Human review** for liability
