# Work Request Templates

Two templates are available. **Pick one.**

## 🟢 BASIC (Recommended)

**File:** [`WR_TEMPLATE_BASIC.md`](./WR_TEMPLATE_BASIC.md) — 65 lines

- Just fill **Title** and **Description**
- Research engine fills everything else
- Use for **95% of WRs**

```text
cp WR_TEMPLATE_BASIC.md wr/WR-XXX.md
```

## 🔴 FULL (Advanced)

**File:** [`WR_TEMPLATE_FULL.md`](./WR_TEMPLATE_FULL.md) — 767 lines

- Full control over every detail
- Use only if you are very picky about outcomes
- Required fields: phase, revenue impact, acceptance criteria, tech approach, dependencies, risk, metrics, etc.

```text
cp WR_TEMPLATE_FULL.md wr/WR-XXX.md
```

---

## Which to use

| Situation | Template |
|-----------|----------|
| "I want X built" — trust the engine | **BASIC** |
| Quick idea, exploratory | **BASIC** |
| Standard feature/fix | **BASIC** |
| You have strict requirements | FULL |
| Compliance / regulated work | FULL |
| You want to override engine defaults | FULL |

---

## Mission Alignment

Every WR — basic or full — is evaluated against the **PRIME DIRECTIVE**:

> **$10k/month → $10M in 3 years**

WRs that do not advance Phase goals or Focus Areas (Polar.sh, OSINT, automated pipeline) will be rejected or reshaped by the research engine.
