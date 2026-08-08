"use client";

import { useMemo, useState } from "react";
import {
  fingerprintFromWorkers,
  proofTable,
  type WorkerStatus,
} from "../lib/sheaf-math";

type WorkerName = "sentinel" | "homeostat" | "medic" | "sheaf";

const WORKERS: WorkerName[] = ["sentinel", "homeostat", "medic", "sheaf"];
const STATUSES: WorkerStatus[] = ["healthy", "degraded", "down"];

const INITIAL: Record<WorkerName, WorkerStatus> = {
  sentinel: "healthy",
  homeostat: "healthy",
  medic: "healthy",
  sheaf: "healthy",
};

export default function Home() {
  const [workers, setWorkers] = useState(INITIAL);
  const proofs = useMemo(() => proofTable(), []);
  const fp = useMemo(() => {
    const input: Record<string, { status: WorkerStatus }> = {};
    for (const name of WORKERS) input[name] = { status: workers[name] };
    return fingerprintFromWorkers(input);
  }, [workers]);

  const setStatus = (name: WorkerName, status: WorkerStatus) => {
    setWorkers((prev) => ({ ...prev, [name]: status }));
  };

  const degradeHomeostat = () => {
    setWorkers((prev) => ({ ...prev, homeostat: "down" }));
  };

  const resetHealthy = () => setWorkers(INITIAL);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="card p-6 sm:p-8">
        <p className="badge">BNAT · Knowledge Sheaf</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Sheaf Observatory
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Live cellular-sheaf cohomology for multi-agent fleets. Stalks are BIOME
          workers; restriction maps are identity severity overlaps;{" "}
          <strong className="text-sky-300">E(x) = 0 ⇔ x ∈ H⁰</strong>. Non-zero
          energy or long-lived H¹ is an obstruction — escalate, never silently
          glue. Core path is credit-free pure TypeScript (no Ripser/GUDHI).
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">BIOME worker stalks</h2>
            <div className="flex gap-2">
              <button type="button" className="primary" onClick={resetHealthy}>
                All healthy
              </button>
              <button type="button" className="primary" onClick={degradeHomeostat}>
                Tear homeostat
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {WORKERS.map((name) => (
              <label key={name} className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-300">{name}</span>
                <select
                  value={workers[name]}
                  onChange={(event) =>
                    setStatus(name, event.target.value as WorkerStatus)
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Topological fingerprint</h2>
            <span className={fp.consistent ? "badge badge-ok" : "badge badge-bad"}>
              {fp.consistent ? "consistent" : "obstruction"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="metric">
              <span>dim H⁰</span>
              <strong>{fp.dim_H0}</strong>
            </div>
            <div className="metric">
              <span>dim H¹</span>
              <strong>{fp.dim_H1}</strong>
            </div>
            <div className="metric">
              <span>rank δ</span>
              <strong>{fp.rank_delta}</strong>
            </div>
            <div className="metric">
              <span>energy E(x)</span>
              <strong>{fp.energy.toFixed(3)}</strong>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Schema <code className="text-sky-300">{fp.schema}</code> · credit-free ·{" "}
            {fp.workers} workers
          </p>
          {fp.obstructions.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-rose-200">
              {fp.obstructions.map((o) => (
                <li key={o.edge.join("-")}>
                  edge {o.edge.join("—")}: residual [{o.residual.join(", ")}],
                  patch [{o.transitionPatch.join(", ")}]
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-300">
              Global section: every overlap agrees under identity restrictions.
            </p>
          )}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Executable proof table</h2>
        <p className="mt-2 text-sm text-slate-400">
          Rank-nullity identities from{" "}
          <code className="text-sky-300">docs/bnatsheaf/SHEAF_COHOMOLOGY_PROOFS.md</code>
          . Same numbers as <code className="text-sky-300">npm test</code> in the monorepo.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Complex</th>
                <th>dim H⁰</th>
                <th>dim H¹</th>
                <th>rank δ</th>
                <th>Energy</th>
                <th>Gluing</th>
              </tr>
            </thead>
            <tbody>
              {proofs.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.dimH0}</td>
                  <td>{row.dimH1}</td>
                  <td>{row.rankDelta}</td>
                  <td>{row.energy.toFixed(3)}</td>
                  <td>{row.gluing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5 text-sm text-slate-400 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-200">Harness (monorepo)</h2>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-sky-100">
{`node scripts/bnatsheaf/cli.js consistency_check
node scripts/bnatsheaf/cli.js imprint_agent --agent sentinel
node scripts/bnatsheaf/cli.js cohomology
node scripts/bnatsheaf/cli.js fingerprint --out docs/biome/bnat-fingerprint.json`}
        </pre>
      </section>
    </main>
  );
}
