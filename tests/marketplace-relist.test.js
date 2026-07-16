"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const relist = require("../scripts/marketplace-relist");

// ── Parsing ────────────────────────────────────────────────────────────────

test("parseOrdersCsv maps Amazon order-history headers and skips empty rows", () => {
  const csv = [
    '"Website","Order ID","Order Date","Product Name","ASIN","Unit Price","Quantity"',
    '"Amazon.com","111-222","2026-01-05","Ninja Air Fryer, 4 Qt","B07FDJMC9Q","89.99","1"',
    '"Amazon.com","111-224","2026-03-01","Not Available","","",""',
  ].join("\n");
  const { items, warnings } = relist.parseOrdersCsv(csv);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Ninja Air Fryer, 4 Qt");
  assert.equal(items[0].asin, "B07FDJMC9Q");
  assert.equal(items[0].pricePaid, 89.99);
  assert.equal(items[0].link, "https://www.amazon.com/dp/B07FDJMC9Q");
  assert.equal(warnings.length, 1);
});

test("parseOrdersCsv handles quoted commas and $ prices", () => {
  const csv = 'Title,Purchase Price Per Unit\n"Widget, Deluxe","$12.50"';
  const { items } = relist.parseOrdersCsv(csv);
  assert.equal(items[0].title, "Widget, Deluxe");
  assert.equal(items[0].pricePaid, 12.5);
});

test("itemsFromLinks extracts ASIN from dp links", () => {
  const items = relist.itemsFromLinks(
    "https://www.amazon.com/dp/B07FDJMC9Q not-a-link",
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].asin, "B07FDJMC9Q");
  assert.equal(items[0].source, "link");
});

// ── Guardrails live in the prompts ─────────────────────────────────────────

test("image prompt encodes accuracy + staging guardrails and image-to-image", () => {
  const item = { title: "Ninja Air Fryer", asin: "B07FDJMC9Q" };
  const prompt = relist.buildImagePrompt(item, 1, 3);
  assert.ok(prompt.includes(relist.GUARDRAILS.accuracy));
  assert.ok(prompt.includes(relist.GUARDRAILS.stagingScope));
  assert.ok(/image-to-image/i.test(prompt));
  assert.ok(/NOT a pro studio/i.test(prompt));
});

test("listing copy prompt forbids price research and auto-posting", () => {
  const prompt = relist.buildListingCopyPrompt(
    { title: "Widget", pricePaid: 20 },
    "Used",
    12,
  );
  assert.ok(/do NOT research or change it/i.test(prompt));
  assert.ok(prompt.includes(relist.GUARDRAILS.noAutoPost));
  assert.ok(prompt.includes(relist.GUARDRAILS.humanReview));
});

test("enrichment prompt forbids account scraping", () => {
  const prompt = relist.buildEnrichmentPrompt({
    title: "Widget",
    link: "https://example.com/p",
  });
  assert.ok(prompt.includes(relist.GUARDRAILS.noAccountScraping));
});

test("video storyboard prompt targets 30-40 seconds", () => {
  const prompt = relist.buildVideoStoryboardPrompt({ title: "Widget" });
  assert.ok(/30–40 second/.test(prompt));
});

// ── Pricing + spend cap ────────────────────────────────────────────────────

test("suggestPrice = paid × margin, deterministic, no research", () => {
  assert.equal(relist.suggestPrice(100, 0.6), 60);
  assert.equal(relist.suggestPrice(null), null);
  assert.equal(relist.suggestPrice(1, 0.5), 1); // floor at $1
});

test("SpendTracker enforces the per-batch cap", () => {
  const t = new relist.SpendTracker({ capUsd: 0.1, costPerImageUsd: 0.04 });
  assert.ok(t.canSpend());
  t.record();
  assert.ok(t.canSpend());
  t.record();
  assert.ok(!t.canSpend(), "third image would exceed the $0.10 cap");
});

// ── Pack generation ────────────────────────────────────────────────────────

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "relist-test-"));
}

test("dry-run pack for a USED item forbids AI images (real photos only)", async () => {
  const outDir = tmpDir();
  const item = { id: "001-widget", title: "Widget", asin: null, pricePaid: 20 };
  const listing = await relist.buildListingPack(item, {
    outDir,
    condition: "used",
    spendTracker: new relist.SpendTracker(),
    live: false,
  });
  assert.match(listing.images.policy, /real-photographs-only/);
  assert.equal(
    listing.images.prompts.length,
    0,
    "no AI prompts for used items",
  );
  assert.ok(Array.isArray(listing.images.checklist));
  assert.equal(listing.status, "pending-review");
  assert.ok(fs.existsSync(path.join(outDir, "001-widget", "listing.json")));
});

test("dry-run pack for a NEW item records image prompts (3 or 5)", async () => {
  const outDir = tmpDir();
  const item = {
    id: "001-widget",
    title: "Widget",
    asin: "B000000000",
    pricePaid: 20,
  };
  const listing = await relist.buildListingPack(item, {
    outDir,
    condition: "new",
    photos: 5,
    video: true,
    spendTracker: new relist.SpendTracker(),
    live: false,
  });
  assert.equal(listing.images.prompts.length, 5);
  assert.equal(listing.images.policy, "ai-staged-from-real-photos");
  assert.equal(listing.suggestedPrice, 12); // 20 × 0.6 default margin
  assert.ok(listing.video?.prompt);
});

test("live pack stops generating images at the spend cap", async () => {
  const outDir = tmpDir();
  let imageCalls = 0;
  const fakeRequest = async (body) => {
    if (body.modalities) {
      imageCalls++;
      return {
        choices: [
          {
            message: {
              images: [
                {
                  image_url: {
                    url:
                      "data:image/png;base64," +
                      Buffer.from("x").toString("base64"),
                  },
                },
              ],
            },
          },
        ],
      };
    }
    return {
      choices: [
        {
          message: {
            content:
              '{"title":"Widget","officialImageUrls":["https://e.com/a.jpg"],"listingTitle":"Widget","description":"d","condition":"New"}',
          },
        },
      ],
    };
  };
  const item = { id: "001-widget", title: "Widget", asin: null, pricePaid: 20 };
  const listing = await relist.buildListingPack(item, {
    outDir,
    condition: "new",
    photos: 5,
    live: true,
    request: fakeRequest,
    spendTracker: new relist.SpendTracker({
      capUsd: 0.08,
      costPerImageUsd: 0.04,
    }),
  });
  assert.equal(imageCalls, 2, "cap of $0.08 allows exactly 2 images");
  assert.equal(listing.images.status, "skipped:spend-cap");
  assert.equal(listing.images.files.length, 2);
});

// ── Dashboard + decisions ──────────────────────────────────────────────────

test("renderDashboard embeds packs and the human-review banner", async () => {
  const outDir = tmpDir();
  const listing = await relist.buildListingPack(
    { id: "001-widget", title: "Widget <b>", pricePaid: 20 },
    {
      outDir,
      condition: "used",
      spendTracker: new relist.SpendTracker(),
      live: false,
    },
  );
  const html = relist.renderDashboard([listing], outDir);
  assert.ok(html.includes("Human-review gate"));
  assert.ok(html.includes("001-widget"));
  assert.ok(
    !html.includes("Widget <b>"),
    "titles are HTML-escaped in embedded JSON",
  );
  assert.ok(html.includes("apply-decisions"));
});

test("applyDecisions records approve/reject/retry onto listing.json", async () => {
  const outDir = tmpDir();
  for (const id of ["001-a", "002-b", "003-c"]) {
    await relist.buildListingPack(
      { id, title: id, pricePaid: 10 },
      {
        outDir,
        condition: "used",
        spendTracker: new relist.SpendTracker(),
        live: false,
      },
    );
  }
  const applied = relist.applyDecisions(outDir, {
    "001-a": { decision: "approve" },
    "002-b": { decision: "reject", note: "nah" },
    "003-c": { decision: "retry", note: "redo photos" },
    "999-missing": { decision: "approve" },
  });
  assert.equal(applied.length, 3);
  const read = (id) =>
    JSON.parse(fs.readFileSync(path.join(outDir, id, "listing.json"), "utf8"));
  assert.equal(read("001-a").status, "approved");
  assert.equal(read("002-b").status, "rejected");
  assert.equal(read("003-c").status, "retry-requested");
  assert.equal(read("003-c").review.retries.length, 1);
});

// ── Lane config stays in sync with agent-models.yml ───────────────────────

test("image_gen lane matches the agent-models.yml profile", () => {
  const yaml = fs.readFileSync(
    path.join(__dirname, "..", ".github", "agent-models.yml"),
    "utf8",
  );
  assert.ok(
    yaml.includes("image_gen:"),
    "agent-models.yml must define image_gen",
  );
  assert.ok(yaml.includes(relist.LANES.image_gen.primary));
  assert.ok(yaml.includes(relist.LANES.image_gen.fallback));
  assert.ok(
    /profile:\s*image_gen/.test(yaml),
    "routing_tree needs an image_gen leaf",
  );
});
