import assert from "node:assert/strict";
import { balanceTableColumns, demoteExtraH1s, healMarkdown } from "../lib/heal";

{
  const out = demoteExtraH1s("# One\n\n# Two\n");
  assert.equal(out, "# One\n\n## Two\n");
}

{
  const out = balanceTableColumns("| A | B |\n| --- | --- |\n| 1 |\n");
  assert.equal(out, "| A | B |\n| --- | --- |\n| 1 |  |\n");
}

{
  const { text, changed } = healMarkdown("# A\n\n# B\n\n| X | Y |\n| --- | --- |\n| z |\n");
  assert.equal(changed, true);
  assert.match(text, /^## B/m);
  assert.match(text, /\|\s*z\s*\|\s*\|\s*$/m);
}

console.log("heal.test.ts: ok");
