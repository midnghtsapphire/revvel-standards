import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CellularSheaf,
  cohomologyOfGraph,
  computeCohomology,
  fingerprintFromWorkers,
  proofTable,
  sheafFromWorkers,
} from "../lib/sheaf-math";

test("proof table matches WR-16909 verified identities", () => {
  const rows = proofTable();
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));

  assert.equal(byName["Path (tree)"].dimH0, 1);
  assert.equal(byName["Path (tree)"].dimH1, 0);
  assert.equal(byName["Path (tree)"].rankDelta, 2);
  assert.equal(byName["Path (tree)"].gluing, "yes");

  assert.equal(byName.Cycle.dimH0, 1);
  assert.equal(byName.Cycle.dimH1, 1);
  assert.equal(byName.Cycle.rankDelta, 2);
  assert.equal(byName.Cycle.gluing, "obstruction");

  assert.equal(byName["2 components"].dimH0, 2);
  assert.equal(byName["2 components"].dimH1, 0);
  assert.equal(byName["2 components"].rankDelta, 2);

  assert.ok(byName["Constant section"].energy < 1e-12);
  assert.equal(byName["Constant section"].gluing, "in H⁰");
});

test("healthy workers fingerprint is consistent", () => {
  const fp = fingerprintFromWorkers({
    sentinel: { status: "healthy" },
    medic: { status: "healthy" },
    homeostat: { status: "healthy" },
  });
  assert.equal(fp.consistent, true);
  assert.equal(fp.credit_free, true);
  assert.ok(fp.dim_H0 >= 1);
  assert.equal(fp.energy, 0);
});

test("down worker raises energy and obstruction list", () => {
  const fp = fingerprintFromWorkers({
    sentinel: { status: "healthy" },
    medic: { status: "down" },
  });
  assert.equal(fp.consistent, false);
  assert.ok(fp.energy > 0);
  assert.ok(fp.obstructions.length >= 1);
});

test("cohomologyOfGraph path rank-nullity", () => {
  const r = cohomologyOfGraph(
    ["a", "b", "c"],
    [
      { u: "a", v: "b" },
      { u: "b", v: "c" },
    ]
  );
  assert.equal(r.dimH0, 1);
  assert.equal(r.dimH1, 0);
});

test("sheafFromWorkers builds complete graph on worker names", () => {
  const sheaf = sheafFromWorkers({
    a: { status: "healthy" },
    b: { status: "healthy" },
    c: { status: "healthy" },
  });
  assert.equal(sheaf.edges.length, 3);
  assert.equal(computeCohomology(sheaf).inH0, true);
});

test("non-identity restriction can restore a global section", () => {
  const sheaf = new CellularSheaf({
    stalks: { a: [1], b: [2] },
    edges: [{ u: "a", v: "b", ru: [[2]] }],
  });
  assert.equal(sheaf.laplacianEnergy(), 0);
  assert.equal(sheaf.isGlobalSection(), true);
});
