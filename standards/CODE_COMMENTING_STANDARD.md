# Code Commenting Standard — Write for the Human Who Troubleshoots Next

**Version:** 1.0.0
**Date:** 2026-06-17
**Status:** Active
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Why This Exists

Agents can read a whole file in a second and infer intent from the code. **A
human under pressure cannot.** When something breaks at 2 a.m. and the person
debugging is *not* the author — maybe not even the repo owner — the comments are
what save them. Comments are a gift to that future human.

So in this repo we comment **robustly and with detail**. Verbose, plain-English
"why" comments are a feature, not clutter.

---

## 2. The Rules

### 2.1 Explain WHY, not just WHAT

The code already says what it does. Comments must add what the code cannot:

- the **intent** ("we cascade so triage never dead-ends"),
- the **root cause** a line guards against,
- the **non-obvious fact** that makes the code correct.

### 2.2 Document external-service gotchas at the call site

Any time behaviour depends on a quirk of an outside service, **write the quirk
down next to the code**. Example we hit in this repo:

> OpenRouter is **not** free-for-all — its key must belong to a **funded/verified
> account**; even `:free` models need credits, so a missing/unfunded key returns
> `401 / 402 / 403 / 429`, not a completion.

A human who doesn't know that will waste hours. The comment hands it to them.

### 2.3 Always document the fallback / "what to do if it fails

Per the fleet rule (every failure cascades to a working fallback — never
dead-end), each failure path should say, in words:

1. what was tried,
2. what runs next (the fallback),
3. what the human should check if everything failed.

Put that same guidance into the **user-facing failure signal** (the issue
comment, the log line), not only the source — the troubleshooter may start from
the GitHub issue, not the code.

### 2.4 Use a header block on workflows and standards

Per `standards/SELF_HEALING_STANDARDS.md` §2.2, every workflow/standard change
carries a Who / When / Why / What header so the history is legible in the file
itself.

### 2.5 Comment out, don't delete

Per `standards/COMMENT-DONT-DELETE.md`, disable with a documented header instead
of deleting, so the history and the reasoning survive.

---

## 3. Good vs Sparse

Sparse (rejected):

```js
// fallback
if (!key) return noKey();
```

Robust (required):

```js
// OpenRouter needs a FUNDED key (even ":free" models need credits), so a
// missing/unfunded key 401/402/403/429s rather than answering. Per the
// always-fall-back rule we cut over to the keyless lane instead of dead-ending.
// Troubleshooting: check the key AND the balance at openrouter.ai/credits.
if (!key) return callKeylessLane();
```

---

## 4. Verification

A change is well-commented when a competent human who has **never seen the file**
can answer, from the comments alone:

- Why does this code exist?
- What outside facts/quirks does it depend on?
- What happens when it fails, and what should I check first?

---

## 5. Related

- `standards/SELF_HEALING_STANDARDS.md` — header blocks, runbooks, fallbacks
- `standards/COMMENT-DONT-DELETE.md` — disable with documentation, never delete
- `standards/ERROR_REPORTING_STANDARD.md` — surfacing failures to humans
