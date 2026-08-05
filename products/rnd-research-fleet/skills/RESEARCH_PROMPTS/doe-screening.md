# DOE 5-Point Screening Analysis

## Overview
The Department of Energy (DOE) 5-Point Screening Analysis is a rigorous evaluation framework used to ruthlessly eliminate ideas that fail technological, practical, or safety criteria.

## The 5 Points

### 1. Technological Feasibility
**Question:** Is it actually viable based on current science, working prototypes, or commercial products?

**Evaluation Criteria:**
- [ ] Is there scientific proof of concept?
- [ ] Are there working prototypes or commercial products demonstrating feasibility?
- [ ] What is the Technology Readiness Level (TRL 1-9)?
- [ ] What are the known technical risks and failure modes?

**Red Flags:**
- Claims that violate known laws of physics
- Technology below TRL 4 without clear development path
- Dependencies on unproven materials or processes

### 2. Practicability
**Question:** Can it actually be manufactured, installed, and serviced at scale?

**Evaluation Criteria:**
- [ ] Can the product be manufactured with current or near-future capabilities?
- [ ] What is the supply chain for critical components?
- [ ] What infrastructure is required for deployment?
- [ ] Can it be serviced and maintained in the field?
- [ ] What is the estimated production cost at scale?

**Red Flags:**
- Requires bespoke manufacturing processes
- Critical components have <3 suppliers
- Service requirements exceed customer capabilities

### 3. Utility Impacts
**Question:** Does the design negatively impact the end-user's experience or the product's core function?

**Evaluation Criteria:**
- [ ] Does it meet or exceed current user experience standards?
- [ ] What is the learning curve for adoption?
- [ ] Does it create new user problems or dependencies?
- [ ] What is the user retention/atisfaction risk?

**Red Flags:**
- Significantly degrades user experience in any dimension
- Requires users to change established workflows without clear benefit
- Creates vendor lock-in without compensating value

### 4. Safety
**Question:** Are there any adverse impacts on health or the environment?

**Evaluation Criteria:**
- [ ] What are the occupational health risks during manufacturing?
- [ ] What are the consumer safety risks during use?
- [ ] What are the end-of-life environmental impacts?
- [ ] Does it comply with relevant regulations (OSHA, EPA, FDA, etc.)?
- [ ] What is the liability exposure?

**Red Flags:**
- Any uncontrolled health or safety hazard
- Non-compliance with existing regulations
- Unacceptable environmental impact at any lifecycle stage

### 5. Proprietary Roadblocks
**Question:** Does the solution rely on a unique-pathway proprietary technology that we cannot legally use?

**Evaluation Criteria:**
- [ ] Are there blocking patents we cannot work around?
- [ ] Are there essential patents that require unavailable licensing?
- [ ] Are there export control or sanctions issues?
- [ ] Are there trade secrets that cannot be reverse-engineered?

**Red Flags:**
- Core technology protected by blocking patents
- Essential patents require licensing from competitors
- Export control restrictions on key components

## Scoring Matrix

| Point | Pass | Fail | Conditional Pass |
|-------|------|------|-----------------|
| 1. Feasibility | TRL ≥ 5 | TRL < 4 | TRL 4-5 with clear path |
| 2. Practicability | Cost < 2x incumbent | Cannot scale | Cost 1.5-2x with roadmap |
| 3. Utility | Net positive UX | Negative impact | Neutral with clear benefits |
| 4. Safety | Zero risk | Any uncontrolled risk | Mitigable with controls |
| 5. Proprietary | No blockers | Blocking IP | Workaround exists |

## Decision Tree

```text
                    ┌─────────────────┐
                    │  Pass all 5?    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
             YES                           NO
              │                             │
              ▼                             ▼
    ┌─────────────────┐         ┌──────────────────┐
    │ APPROVE for     │         │ Does it fail any  │
    │ development     │         │ mandatory point?  │
    └─────────────────┘         └────────┬─────────┘
                                          │
                            ┌─────────────┴─────────────┐
                            │                           │
                           YES                          NO
                            │                           │
                            ▼                           ▼
                  ┌─────────────────┐         ┌─────────────────┐
                  │ REJECT / PIVOT  │         │ CONDITIONAL:    │
                  │ Cannot proceed  │         │ Address gaps    │
                  └─────────────────┘         └─────────────────┘
```

## Report Template

```markdown
# DOE 5-Point Screening Report

## Technology: [Name]

### 1. Technological Feasibility: ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL
**TRL:** [1-9]
**Evidence:** [Sources, prototypes, papers]
**Risk Assessment:** [High/Medium/Low]

### 2. Practicability: ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL
**Manufacturing Readiness:** [1-9]
**Supply Chain:** [Assessment]
**Estimated Unit Cost:** [$X at Y units/year]
**Risk Assessment:** [High/Medium/Low]

### 3. Utility Impacts: ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL
**User Experience:** [Assessment]
**Adoption Barriers:** [List]
**Retention Risk:** [Assessment]
**Risk Assessment:** [High/Medium/Low]

### 4. Safety: ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL
**Health Risks:** [None/Low/Medium/High]
**Environmental:** [None/Low/Medium/High]
**Regulatory:** [Status]
**Risk Assessment:** [High/Medium/Low]

### 5. Proprietary Roadblocks: ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL
**Blocking Patents:** [Yes/No - Details]
**Licensing Required:** [Yes/No - From whom]
**Workarounds:** [Assessment]
**Risk Assessment:** [High/Medium/Low]

## VERDICT: APPROVE / CONDITIONAL / REJECT

**Rationale:** [Brief explanation]

**Required Actions:** [If conditional]
```

---

*Part of R&D Research Fleet*
*Built by Audrey Evans / MIDNGHTSAPPHIRE*
