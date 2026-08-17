import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTitle, normalizeSubject, suggestTitle } from "../lib/titles";

describe("wr-title-studio titles", () => {
  it("normalizes double spaces and noise", () => {
    const subject = normalizeSubject("[WR]  add https://github.com/a/b /dragnet");
    assert.doesNotMatch(subject, /\/dragnet/i);
    assert.doesNotMatch(subject, /https?:/i);
    assert.match(subject, /b/i);
  });

  it("suggests add-feature for need-ability titles", () => {
    const result = suggestTitle({
      title:
        "[WR] Need ability to autocreate generic WR titles so I do not have to retype",
      force: true,
    });
    assert.equal(result.templateKey, "add-feature");
    assert.match(result.title, /^\[WR\] Add /);
  });

  it("formats with prefix and max length", () => {
    const titled = formatTitle("x".repeat(200), 40);
    assert.ok(titled.length <= 40);
    assert.match(titled, /^\[WR\] /);
  });
});
