# [WR] P2 — Duplicate WR/issue files defeat the dedupe process (issue-13863 not enforcing)

## Title
[WR] Dedupe wr/issues (14450, 14705, 14723, 14931, 15041) + wire duplicate-flagger to file layer

## Description
**Problem.** Five issue numbers each have two files in wr/issues/. issue-13863 created a duplicate-WR/PR flagger, but it evidently watches GitHub issues, not the wr/issues/ file mirror — the wiring gap the flagger was meant to close reappeared one layer down.

**Fix.** Merge each pair into the canonical filename (keep richer content, per files-never-deleted rule: append superseded copy's unique content, then remove the extra file in the same PR with the merge documented). Add a 5-line CI test: fail if `ls wr/issues | grep -oE 'issue-[0-9]+' | sort | uniq -d` is non-empty.

**Acceptance.** uniq -d returns empty; CI guard in place.

## Agent learning note
Dedupe must run at every layer where duplication can occur. A guard at the source (GitHub) does not protect the mirror (files). Guard the *invariant*, not the *entry point*.

Assignee: Coder | Labels: P2, hygiene
