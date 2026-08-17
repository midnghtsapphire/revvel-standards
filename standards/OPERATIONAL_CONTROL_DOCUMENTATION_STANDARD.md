# Operational Control Documentation Standard

**Version:** 1.0.0
**Date:** 2026-04-29
**Status:** Mandatory Policy

---

## 1. Purpose

This standard defines how to document operational controls (gates, switches, feature flags, automation toggles) to ensure clarity for humans and AI agents.

---

## 2. Core Principles

### 2.1 Clarity Over Cleverness

Documentation must be immediately understandable by someone unfamiliar with the system.

**Example of unclear:**
> "This issue manages workflow state"

**Example of clear:**
> "Open this issue to enable scheduled workflows. Close it to disable them."

### 2.2 Show What TO Do (Positive Framing)

Always document the intended action, not what to avoid.

**Avoid negative framing:**
> "This does NOT create new cron jobs"
> "This does NOT schedule automation"

**Use positive framing:**
> "This enables existing scheduled workflows"
> "Workflows run on their normal schedule when this gate is open"

### 2.3 No Nested Information Architecture

Critical operational information must be at the top level, not buried in FAQs or sub-documents.

**Avoid:**
```text
spec.md → "See FAQ for details"
FAQ.md → "See workflow files for examples"
workflow.yml → "See spec for documentation"
```

**Prefer:**
```text
spec.md → Complete specification with examples inline
workflow.yml → Reference to spec.md only
```

---

## 3. Required Sections

Every operational control document must include:

### 3.1 Purpose Statement

One-sentence explanation of what this control does.

**Template:**
```markdown
[Control Name] enables/disables [specific behavior] by [mechanism].
```

**Example:**
```markdown
Quiet Mode disables scheduled automation by requiring an open gate signal.
```

### 3.2 How It Works

Implementation details with working code examples.

**Requirements:**
- Show actual code from the repository
- Explain technical behavior accurately
- Include edge cases (e.g., "listForRepo returns PRs too")
- Provide copy-pasteable examples

**Template:**
```markdown
## How It Works

[Brief description]

**Implementation:**

\```yaml
[Working code example from actual file]
\```

**Technical notes:**
- [Any edge cases or gotchas]
- [Limitations or caveats]
```

### 3.3 Operational Procedures

Step-by-step instructions for each control operation.

**Template:**
```markdown
## To Enable [Feature]

1. [Action 1]
2. [Action 2]
3. [Expected result]

## To Disable [Feature]

1. [Action 1]
2. [Action 2]
3. [Expected result]
```

### 3.4 Inventory

List all affected systems, workflows, or components.

**Template:**
```markdown
## [Affected Systems] Inventory

| Component | Details | Location |
|-----------|---------|----------|
| [Name] | [Description] | [File path] |
```

---

## 4. AI Agent Considerations

Agents copy examples literally. Documentation must be:

### 4.1 Precise

**Avoid vague language:**
> "The issue should be titled something like 'exit-quiet-mode'"

**Use exact requirements:**
> "The issue must have the exact title: `exit-quiet-mode` (case-insensitive)"

### 4.2 Explicit About Edge Cases

If implementation has surprising behavior, document it upfront.

**Example:**
```markdown
**Technical note:** `github.rest.issues.listForRepo` returns both issues and 
pull requests. An open PR titled `exit-quiet-mode` will also satisfy the gate.
```

### 4.3 Complete

Agents should not need to reference external documentation to implement the control.

**Include:**
- Complete code examples
- All required configuration
- Expected inputs and outputs
- Error conditions and handling

---

## 5. Issue Template Requirements

Operational control issue templates must:

### 5.1 Have Descriptive Names

**Avoid:**
```yaml
name: Exit Quiet Mode
```

**Prefer:**
```yaml
name: "🔓 Wake Automation (Exit Quiet Mode)"
```

### 5.2 Include Visual Indicators

Use emoji or symbols to quickly convey purpose:
- 🔓 Enable/unlock
- 🔒 Disable/lock
- ⚠️ Warning/caution
- ✅ Approval/confirmation

### 5.3 State Expected Outcome Upfront

First section should answer: "What happens when I open this issue?"

**Template:**
```markdown
# [Emoji] This Issue [Action]

**What happens when you open this issue:**
[Immediate, concrete outcome]

**What happens when you close this issue:**
[Immediate, concrete outcome]
```

---

## 6. Common Patterns

### 6.1 Gate Pattern (Issue-Based Control)

Use when: Manual human control is required for automation

**Key components:**
1. Issue template with clear title requirement
2. Workflow gate check using github-script
3. Conditional execution based on gate status
4. Skip logging when gate is closed

**Reference implementation:** `wr/specs/01-quiet-mode.md`

### 6.2 Feature Flag Pattern (Code-Based Control)

Use when: Programmatic or environment-based control is needed

**Key components:**
1. Environment variable or config file
2. Runtime check in application code
3. Default value (safe by default)
4. Documentation of all flag states

### 6.3 Killswitch Pattern (Emergency Stop)

Use when: Immediate halt of all operations is required

**Key components:**
1. Multiple trigger mechanisms (issue, API, manual)
2. Aggressive checking (every operation, not just scheduled)
3. Clear recovery procedure
4. Audit logging of killswitch events

---

## 7. Validation Checklist

Before merging operational control documentation:

- [ ] Purpose stated in one sentence at the top
- [ ] No negative framing ("this does NOT...")
- [ ] Working code examples from actual repository files
- [ ] Technical edge cases documented
- [ ] Step-by-step operational procedures
- [ ] Complete inventory of affected systems
- [ ] Issue template uses descriptive name with emoji
- [ ] No nested information architecture (FAQ → main doc → workflow)
- [ ] AI agents can implement from this doc alone
- [ ] Tested with actual workflow execution

---

## 8. Anti-Patterns

### 8.1 Claimed Automation That Doesn't Exist

**Wrong:**
> "Open issue `enter-quiet-mode` and the system will automatically close `exit-quiet-mode`"

If the automation doesn't exist, do not document it.

**Correct:**
> "To re-enter Quiet Mode, close the `exit-quiet-mode` issue manually."

### 8.2 Metaphors Without Technical Details

**Wrong:**
> "Think of it like alarm clocks - workflows exist, this unmutes them"

Metaphors are supplementary, not primary documentation.

**Correct:**
> "Workflows check for an open issue titled `exit-quiet-mode` before executing. [Then optionally add metaphor]"

### 8.3 Scattered Information

**Wrong:**
- Issue template: "See spec for details"
- Spec: "See FAQ for examples"
- FAQ: "See workflow files"

**Correct:**
- Issue template: Complete working example
- Spec: Complete specification with all details
- Workflows: Reference to spec only

---

## 9. Review Guidelines

When reviewing operational control documentation:

### For Technical Accuracy
- [ ] Code examples match actual repository files
- [ ] Edge cases are documented
- [ ] No promised features that don't exist
- [ ] API behavior is correctly described

### For Clarity
- [ ] First-time reader can understand immediately
- [ ] No jargon without explanation
- [ ] Positive framing throughout
- [ ] Step-by-step procedures are actionable

### For Agent Safety
- [ ] Examples are safe to copy literally
- [ ] Exact requirements are specified
- [ ] Error conditions are documented
- [ ] No ambiguous language

---

## 10. Reference Examples

### Excellent
- `wr/specs/01-quiet-mode.md` (after revision)
- `.github/ISSUE_TEMPLATE/exit-quiet-mode.md` (after revision)

### Needs Improvement
- Documents that rely on FAQs for critical information
- Templates with vague "see spec" references
- Specs with negative framing

---

## 11. Enforcement

This standard is enforced through:

1. **Code review:** Agents reject PRs with operational docs that violate this standard
2. **Template checking:** CI validates issue templates meet requirements
3. **Documentation audits:** Quarterly review of all operational control docs

---

**Related Standards:**
- `docs/Master_Inventory/AUTO_DOCUMENTATION_STANDARD.md`
- `wr/NORTH_STAR.md` § The Durability Rule
