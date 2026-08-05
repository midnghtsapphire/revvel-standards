# PR Review Status Badge Examples

This document shows examples of the PR status badges that will be automatically posted on pull requests.

---

## Status Badge Styles

### Awaiting Approval (Yellow)
![Awaiting Approval](https://img.shields.io/badge/status-awaiting_approval-yellow?style=for-the-badge)

**Meaning:** PR has been opened and is waiting for initial review

---

### Review Started (Blue)
![Review Started](https://img.shields.io/badge/status-review_started-blue?style=for-the-badge)

**Meaning:** At least one reviewer has started reviewing (submitted comments)

---

### Changes Requested (Red)
![Changes Requested](https://img.shields.io/badge/status-changes_requested-red?style=for-the-badge)

**Meaning:** One or more reviewers have requested changes

---

### Approved (Green)
![Approved](https://img.shields.io/badge/status-approved-green?style=for-the-badge)

**Meaning:** All reviews are approvals, PR is ready to merge ✅

---

## Complete PR Status Comment Example

This is what the automated comment will look like on a PR:

> ## 📊 PR Review Status
>
> ![Status](https://img.shields.io/badge/status-approved-green?style=for-the-badge)
>
> **Current State:** PR has been approved ✅
>
> **Reviewers:**
> ✅ **@alice** — Approved
> ✅ **@bob** — Approved
> 💬 **@charlie** — Commented
>
> ---
> _This status is updated automatically by the PR Review Status Automation workflow._

---

## Alternative Badge Styles

### Flat Style
![Awaiting](https://img.shields.io/badge/status-awaiting_approval-yellow?style=flat)
![Review](https://img.shields.io/badge/status-review_started-blue?style=flat)
![Changes](https://img.shields.io/badge/status-changes_requested-red?style=flat)
![Approved](https://img.shields.io/badge/status-approved-green?style=flat)

### Flat-Square Style
![Awaiting](https://img.shields.io/badge/status-awaiting_approval-yellow?style=flat-square)
![Review](https://img.shields.io/badge/status-review_started-blue?style=flat-square)
![Changes](https://img.shields.io/badge/status-changes_requested-red?style=flat-square)
![Approved](https://img.shields.io/badge/status-approved-green?style=flat-square)

### Plastic Style
![Awaiting](https://img.shields.io/badge/status-awaiting_approval-yellow?style=plastic)
![Review](https://img.shields.io/badge/status-review_started-blue?style=plastic)
![Changes](https://img.shields.io/badge/status-changes_requested-red?style=plastic)
![Approved](https://img.shields.io/badge/status-approved-green?style=plastic)

---

## Label Colors

The labels match the badge colors for visual consistency:

| Label | Badge | Color |
|-------|-------|-------|
| awaiting-approval | ![awaiting-approval status badge](https://img.shields.io/badge/-awaiting__approval-fbca04) | Yellow (#fbca04) |
| review-started | ![review-started status badge](https://img.shields.io/badge/-review__started-0075ca) | Blue (#0075ca) |
| changes-requested | ![changes-requested status badge](https://img.shields.io/badge/-changes__requested-d93f0b) | Red (#d93f0b) |
| approved | ![approved status badge](https://img.shields.io/badge/-approved-0e8a16) | Green (#0e8a16) |

---

## Status Progression Example

Here's how the status progresses through a typical PR lifecycle:

```text
1. PR Opened
   ↓
   [awaiting-approval] 🟡

2. First Reviewer Comments
   ↓
   [review-started] 🔵

3. Reviewer Approves
   ↓
   [approved] 🟢

4. Ready to Merge! ✅
```

Or, if changes are needed:

```text
1. PR Opened
   ↓
   [awaiting-approval] 🟡

2. First Reviewer Comments
   ↓
   [review-started] 🔵

3. Reviewer Requests Changes
   ↓
   [changes-requested] 🔴

4. Author Pushes Updates
   ↓
   [awaiting-approval] 🟡
   (cycle repeats)

5. All Approve
   ↓
   [approved] 🟢
```

---

## Integration with Repository README

You can add these status indicators to your repository README:

### Example 1: Simple Status Section

```markdown
## Pull Request Status

- ![Awaiting](https://img.shields.io/badge/-awaiting_approval-yellow) — Needs review
- ![Review](https://img.shields.io/badge/-review_started-blue) — In progress
- ![Changes](https://img.shields.io/badge/-changes_requested-red) — Needs updates
- ![Approved](https://img.shields.io/badge/-approved-green) — Ready to merge
```

### Example 2: Dashboard Style

```markdown
## Repository Dashboard

### 📊 Pull Requests

![Open PRs](https://img.shields.io/github/issues-pr/midnghtsapphire/revvel-standards?style=for-the-badge)
![Closed PRs](https://img.shields.io/github/issues-pr-closed/midnghtsapphire/revvel-standards?style=for-the-badge&color=purple)

#### Review Status Legend
![Awaiting](https://img.shields.io/badge/awaiting-3-yellow?style=for-the-badge)
![Approved](https://img.shields.io/badge/approved-2-green?style=for-the-badge)
![Changes](https://img.shields.io/badge/changes-1-red?style=for-the-badge)
```

---

## Emoji Icons Used

The workflow uses these emoji icons in the comment:

| State | Emoji | Meaning |
|-------|-------|---------|
| Approved | ✅ | Reviewer approved |
| Changes Requested | 🔴 | Reviewer requested changes |
| Commented | 💬 | Reviewer left comments |
| Reviewed | 👁️ | General review (rare) |

---

## Testing

To see these badges in action:

1. Create a test PR
2. Wait for the automation to apply the `awaiting-approval` label
3. Check the PR comments for the status badge
4. Submit a review (approve, comment, or request changes)
5. Watch the badge and label update automatically

---

**Generated By:** PR Review Status Automation  
**Documentation:** [PR_REVIEW_STATUS_AUTOMATION.md](PR_REVIEW_STATUS_AUTOMATION.md)  
**Last Updated:** April 29, 2026
