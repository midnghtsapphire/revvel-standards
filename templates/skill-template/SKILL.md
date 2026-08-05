# Skill: [Skill Name]

**Skill Name:** `[skill-name]`  
**Version:** 1.0.0  
**Date:** [DATE]  
**Status:** Beta  
**Category:** [Category]  
**LLM:** Claude Sonnet 4 (primary)  
**Type:** Ephemeral  
**Persona:** [Persona Name and Emoji or None]

---

## Purpose

[One paragraph: what this skill does and why it matters. Write for a non-technical user.]

---

## What This Skill Does

| Task | Description |
|---|---|
| **[Task 1]** | [Plain-language description] |
| **[Task 2]** | [Plain-language description] |
| **[Task 3]** | [Plain-language description] |

---

## Trigger Keywords

This skill activates when these phrases appear:

```text
[keyword1], [keyword2], [keyword3]
```

---

## Workflow

1. [Step 1 — describe what happens first]
2. [Step 2 — describe what happens next]
3. [Step 3 — describe the output]

---

## Agent Instructions (System Prompt)

```text
You are [Persona Name] — [role description].
Voice: [voice descriptors].

Rules:
1. [Rule 1]
2. [Rule 2]
3. [Rule 3]
4. Sign off with: "[Farewell message]"
```

---

## Examples

### Example 1: [Use case]

**Input:**
```text
[Example user input]
```

**Output:**
```text
[Example AI output]
```

---

## Dependencies

| Dependency | Required? | Purpose | Install |
|---|---|---|---|
| [Tool] | ✅ Required | [What it does] | [Install command] |
| [Tool] | ⭕ Optional | [What it does] | [Install command] |

---

## Testing

```bash
npm install -g promptfoo
cd skills/[skill-name]/tests
promptfoo eval --config promptfoo.yml
promptfoo view
```

---

## Related Skills

- **[related-skill]** — [why it's related]
