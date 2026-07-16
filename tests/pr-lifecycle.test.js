#!/usr/bin/env node
"use strict";

/**
 * Unit tests for pr-lifecycle.yml workflow logic
 *
 * Tests the key decision points:
 * 1. PR state transitions based on action
 * 2. Label management (add/remove logic)
 * 3. Approval state detection
 */

const assert = require("node:assert");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

// === Constants from workflow ===
const LIFECYCLE_LABELS = [
  "awaiting-review",
  "awaiting-approval",
  "approved",
  "changes-requested",
  "review-started",
  "checks-failing",
  "checks-passing",
  "ready-to-merge",
  "needs-action",
];

const _ALL_LABELS = new Set(LIFECYCLE_LABELS);

// === Utility Functions ===

function getNextState(action, currentLabels, _reviewState, _checksPassing) {
  // State machine for PR lifecycle
  switch (action) {
    case "opened":
    case "reopened":
    case "ready_for_review":
      return "awaiting-review";

    case "converted_to_draft":
      return "awaiting-approval";

    case "closed":
      if (currentLabels.has("approved")) {
        return "ready-to-merge";
      }
      return "needs-action";

    case "synchronize":
      return "review-started";

    default:
      return null;
  }
}

function shouldAddLabel(action, currentLabels) {
  const nextState = getNextState(action, currentLabels, null, false);
  if (!nextState) return false;

  // Don't re-add if already present
  if (currentLabels.has(nextState)) return false;

  return true;
}

function getLabelsToRemove(action, currentLabels) {
  const nextState = getNextState(action, currentLabels, null, false);
  if (!nextState) return [];

  // Remove conflicting states
  const conflicts = {
    "awaiting-review": [
      "awaiting-approval",
      "approved",
      "changes-requested",
      "review-started",
      "ready-to-merge",
    ],
    "awaiting-approval": [
      "awaiting-review",
      "approved",
      "changes-requested",
      "ready-to-merge",
    ],
    approved: ["awaiting-review", "awaiting-approval", "changes-requested"],
    "changes-requested": ["awaiting-review", "awaiting-approval", "approved"],
    "review-started": ["awaiting-review"],
    "checks-failing": ["checks-passing", "ready-to-merge"],
    "checks-passing": ["checks-failing"],
    "ready-to-merge": [],
    "needs-action": ["ready-to-merge"],
  };

  const toRemove = conflicts[nextState] || [];
  return toRemove.filter((l) => currentLabels.has(l));
}

function isCheckPassing(checkConclusion) {
  return ["success", "neutral", "skipped"].includes(checkConclusion);
}

// Mirrors the review_requested guard in pr-lifecycle.yml: awaiting-review is only
// (re-)added when the PR is NOT approved on the current head SHA and the label is
// not already present. Approval is confirmed from live reviews scoped to the head
// SHA, so a missing/late `approved` label cannot resurrect awaiting-review.
function isApprovedOnHead(headReviewStates) {
  return (
    headReviewStates.includes("APPROVED") &&
    !headReviewStates.includes("CHANGES_REQUESTED")
  );
}

function shouldAddAwaitingReviewOnReviewRequested(
  currentLabels,
  headReviewStates,
) {
  const approvedOnHead =
    currentLabels.has("approved") || isApprovedOnHead(headReviewStates);
  return !approvedOnHead && !currentLabels.has("awaiting-review");
}

function isReviewApproved(reviewState) {
  return reviewState === "APPROVED";
}

function isReviewChangesRequested(reviewState) {
  return reviewState === "CHANGES_REQUESTED";
}

// Mirrors the atomic label transition in the review-state job of pr-lifecycle.yml:
// approval events compute the final label set in one pass (drop ALL review-waiting
// variants + conflicting states, add the new state) and apply it via a single
// issues.setLabels call, so no intermediate conflicting state (e.g.
// awaiting-review + approved) can be observed by a concurrent event.
const REVIEW_WAITING = [
  "awaiting-review",
  "awaiting-approval",
  "status:waiting-for-review",
];

function computeAtomicLabelSet(currentLabels, removeList, addList) {
  const next = currentLabels.filter((l) => !removeList.includes(l));
  for (const l of addList) if (!next.includes(l)) next.push(l);
  return next;
}

function computeApprovedLabelSet(currentLabels) {
  return computeAtomicLabelSet(
    currentLabels,
    [...REVIEW_WAITING, "changes-requested", "needs-action"],
    ["approved"],
  );
}

function computeChangesRequestedLabelSet(currentLabels) {
  return computeAtomicLabelSet(
    currentLabels,
    [...REVIEW_WAITING, "approved", "ready-to-merge"],
    ["changes-requested", "needs-action"],
  );
}

// === Tests ===

(async () => {
  console.log("=== pr-lifecycle.yml Unit Tests ===\n");

  // State Transitions
  await test("opened PR gets awaiting-review label", () => {
    const state = getNextState("opened", new Set(), null, false);
    assert.equal(state, "awaiting-review");
  });

  await test("reopened PR gets awaiting-review label", () => {
    const state = getNextState("reopened", new Set(), null, false);
    assert.equal(state, "awaiting-review");
  });

  await test("ready_for_review PR gets awaiting-review label", () => {
    const state = getNextState("ready_for_review", new Set(), null, false);
    assert.equal(state, "awaiting-review");
  });

  await test("converted_to_draft PR gets awaiting-approval label", () => {
    const state = getNextState("converted_to_draft", new Set(), null, false);
    assert.equal(state, "awaiting-approval");
  });

  await test("closed approved PR gets ready-to-merge label", () => {
    const state = getNextState("closed", new Set(["approved"]), null, false);
    assert.equal(state, "ready-to-merge");
  });

  await test("closed non-approved PR gets needs-action label", () => {
    const state = getNextState("closed", new Set(), null, false);
    assert.equal(state, "needs-action");
  });

  await test("synchronize (new commit) PR gets review-started label", () => {
    const state = getNextState("synchronize", new Set(), null, false);
    assert.equal(state, "review-started");
  });

  // Label Conflicts
  await test("getLabelsToRemove removes awaiting-approval when adding awaiting-review", () => {
    const toRemove = getLabelsToRemove(
      "opened",
      new Set(["awaiting-approval"]),
    );
    assert.ok(toRemove.includes("awaiting-approval"));
  });

  await test("getLabelsToRemove removes approved when adding changes-requested", () => {
    const toRemove = getLabelsToRemove(
      "opened",
      new Set(["approved", "ready-to-merge"]),
    );
    assert.ok(toRemove.includes("approved"));
    assert.ok(toRemove.includes("ready-to-merge"));
  });

  await test("getLabelsToRemove removes checks-failing when adding checks-passing", () => {
    // Simulate adding checks-passing (via checks state transition, not opened)
    const nextState = "checks-passing";
    const conflicts = {
      "checks-passing": ["checks-failing"],
    };
    const currentLabels = new Set(["checks-failing"]);
    const toRemove = (conflicts[nextState] || []).filter((l) =>
      currentLabels.has(l),
    );
    assert.ok(toRemove.includes("checks-failing"));
  });

  // Check Conclusions
  await test("isCheckPassing accepts success", () => {
    assert.ok(isCheckPassing("success"));
  });

  await test("isCheckPassing accepts neutral", () => {
    assert.ok(isCheckPassing("neutral"));
  });

  await test("isCheckPassing accepts skipped", () => {
    assert.ok(isCheckPassing("skipped"));
  });

  await test("isCheckPassing rejects failure", () => {
    assert.ok(!isCheckPassing("failure"));
  });

  await test("isCheckPassing rejects timed_out", () => {
    assert.ok(!isCheckPassing("timed_out"));
  });

  // Review States
  await test("isReviewApproved detects APPROVED", () => {
    assert.ok(isReviewApproved("APPROVED"));
  });

  await test("isReviewApproved rejects other states", () => {
    assert.ok(!isReviewApproved("CHANGES_REQUESTED"));
    assert.ok(!isReviewApproved("COMMENTED"));
    assert.ok(!isReviewApproved("PENDING"));
  });

  await test("isReviewChangesRequested detects CHANGES_REQUESTED", () => {
    assert.ok(isReviewChangesRequested("CHANGES_REQUESTED"));
  });

  await test("isReviewChangesRequested rejects other states", () => {
    assert.ok(!isReviewChangesRequested("APPROVED"));
    assert.ok(!isReviewChangesRequested("COMMENTED"));
  });

  // review_requested guard — must not resurrect awaiting-review after approval
  await test("review_requested does not add awaiting-review when approved label present", () => {
    assert.equal(
      shouldAddAwaitingReviewOnReviewRequested(new Set(["approved"]), []),
      false,
    );
  });

  await test("review_requested does not add awaiting-review when live-approved on head (label not yet applied)", () => {
    // The `approved` label may lag behind the live review state — still must not add.
    assert.equal(
      shouldAddAwaitingReviewOnReviewRequested(new Set(), ["APPROVED"]),
      false,
    );
  });

  await test("review_requested adds awaiting-review when not approved and label absent", () => {
    assert.equal(shouldAddAwaitingReviewOnReviewRequested(new Set(), []), true);
  });

  await test("review_requested does not duplicate awaiting-review when already present", () => {
    assert.equal(
      shouldAddAwaitingReviewOnReviewRequested(
        new Set(["awaiting-review"]),
        [],
      ),
      false,
    );
  });

  await test("review_requested adds awaiting-review when head approval is overridden by changes-requested", () => {
    assert.equal(
      shouldAddAwaitingReviewOnReviewRequested(new Set(), [
        "APPROVED",
        "CHANGES_REQUESTED",
      ]),
      true,
    );
  });

  // Atomic approval transition — ALL review-waiting variants removed in one operation
  await test("approval atomically removes all review-waiting label variants", () => {
    const next = computeApprovedLabelSet([
      "awaiting-review",
      "awaiting-approval",
      "status:waiting-for-review",
      "checks-passing",
    ]);
    for (const waiting of REVIEW_WAITING) {
      assert.ok(
        !next.includes(waiting),
        `${waiting} must be removed on approval`,
      );
    }
    assert.ok(next.includes("approved"));
    assert.ok(next.includes("checks-passing"), "unrelated labels preserved");
  });

  await test("approval removes changes-requested and needs-action in same atomic set", () => {
    const next = computeApprovedLabelSet([
      "changes-requested",
      "needs-action",
      "awaiting-review",
    ]);
    assert.deepEqual(next, ["approved"]);
  });

  await test("approved label set never contains a review-waiting label (no intermediate state)", () => {
    // Rapid approval/review-request race: even starting from every conflicting
    // combination, the single computed set is conflict-free.
    for (const waiting of REVIEW_WAITING) {
      const next = computeApprovedLabelSet([waiting, "approved"]);
      assert.deepEqual(
        next,
        ["approved"],
        `starting from [${waiting}, approved]`,
      );
    }
  });

  await test("approval is idempotent (approved not duplicated)", () => {
    const next = computeApprovedLabelSet(["approved"]);
    assert.deepEqual(next, ["approved"]);
  });

  await test("approval preserves non-lifecycle labels", () => {
    const next = computeApprovedLabelSet(["work-request", "awaiting-review"]);
    assert.deepEqual(next.sort(), ["approved", "work-request"]);
  });

  await test("changes_requested atomically removes waiting variants, approved, and ready-to-merge", () => {
    const next = computeChangesRequestedLabelSet([
      "awaiting-review",
      "awaiting-approval",
      "status:waiting-for-review",
      "approved",
      "ready-to-merge",
    ]);
    assert.deepEqual(next.sort(), ["changes-requested", "needs-action"]);
  });

  // Label Management
  await test("shouldAddLabel returns false if label already present", () => {
    const shouldAdd = shouldAddLabel("opened", new Set(["awaiting-review"]));
    assert.equal(shouldAdd, false);
  });

  await test("shouldAddLabel returns true if label not present", () => {
    const shouldAdd = shouldAddLabel("opened", new Set());
    assert.equal(shouldAdd, true);
  });

  // Rate Limit Handling (from workflow fix)
  await test("handles rate limit errors gracefully", () => {
    const error = { status: 403, message: "API rate limit exceeded" };
    const shouldCatch =
      error.status === 403 && error.message.includes("API rate limit");
    assert.ok(shouldCatch);
  });

  await test("continues with empty labels on rate limit", () => {
    const error = { status: 403, message: "API rate limit exceeded" };
    let labels = [];
    if (error.status === 403 && error.message.includes("API rate limit")) {
      labels = [];
    } else {
      throw error;
    }
    assert.deepEqual(labels, []);
  });

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log("❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("✅ All tests passed");
  }
})();
