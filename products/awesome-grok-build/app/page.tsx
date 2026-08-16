"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildInstallPlan,
  getCatalog,
  getMonetizationPath,
  getOfficialResources,
  listCategories,
  listStackPresets,
  searchSkills,
  type Skill,
  type InstallPlan,
} from "./data/client-api";

type Tab = "bash" | "powershell" | "markdown" | "prompt";

export default function HomePage() {
  const catalog = useMemo(() => getCatalog(), []);
  const categories = useMemo(() => listCategories(), []);
  const stacks = useMemo(() => listStackPresets(), []);
  const monetization = useMemo(() => getMonetizationPath(), []);
  const resources = useMemo(() => getOfficialResources(), []);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stack, setStack] = useState("nextjs");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [target, setTarget] = useState(".");
  const [planTab, setPlanTab] = useState<Tab>("bash");
  const [copyStatus, setCopyStatus] = useState("");

  const skills = useMemo(
    () => searchSkills({ query, category, sort }),
    [query, category, sort],
  );

  const selected: Skill | null = useMemo(() => {
    if (!selectedId) return skills[0] || null;
    return skills.find((s) => s.id === selectedId) || skills[0] || null;
  }, [selectedId, skills]);

  useEffect(() => {
    if (selected && selectedId !== selected.id) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  const plan: InstallPlan = useMemo(
    () =>
      buildInstallPlan({
        stack,
        extraSkillIds: extraIds,
        target,
      }),
    [stack, extraIds, target],
  );

  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ||
    "mailto:audrey@midnghtsapphire.com?subject=Awesome%20Grok%20Build%20Pro";

  function toggleExtra(id: string) {
    setExtraIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`Copied ${label}`);
      setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed — select text manually");
    }
  }

  const planBody =
    planTab === "bash"
      ? plan.bash
      : planTab === "powershell"
        ? plan.powershell
        : planTab === "markdown"
          ? plan.markdown
          : plan.grokPrompt;

  return (
    <main>
      <div className="container hero">
        <div className="hero-grid">
          <div>
            <div className="badge-row">
              <span className="badge">production-app</span>
              <span className="badge">saas · freemium</span>
              <span className="badge">upstream MIT · awesome-grok-build</span>
            </div>
            <h1>Awesome Grok Build</h1>
            <p className="lead">
              Browse the curated xAI Grok Build skill library, filter by stack,
              and generate ready-to-run install plans (bash, PowerShell, Markdown,
              and a Grok prompt). Vendored into revvel-standards from{" "}
              <a
                href="https://github.com/DominikTobureto/awesome-grok-build"
                target="_blank"
                rel="noreferrer"
              >
                DominikTobureto/awesome-grok-build
              </a>
              .
            </p>
          </div>
          <div className="panel">
            <div className="stat-grid">
              <div className="stat">
                <strong>{catalog.skillCount}</strong>
                <span>skills vendored</span>
              </div>
              <div className="stat">
                <strong>{stacks.length}</strong>
                <span>stack presets</span>
              </div>
              <div className="stat">
                <strong>MIT</strong>
                <span>upstream license</span>
              </div>
            </div>
            <div className="pro-cta">
              <strong>Pro install profiles</strong>
              <ul className="checklist">
                {monetization.pro.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <a className="btn" href={checkoutUrl}>
                Get Pro / contact
              </a>
            </div>
          </div>
        </div>

        <div className="toolbar" role="search">
          <div className="field">
            <label htmlFor="q">Search skills</label>
            <input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="security, nextjs, tdd…"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="cat">Category</label>
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sort">Sort</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="version">Version</option>
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="clear">
              Clear
            </label>
            <button
              id="clear"
              type="button"
              className="btn secondary"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setSort("name");
              }}
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="container layout">
        <section aria-label="Skill catalog">
          <h2 className="section-title">
            Skill catalog ({skills.length}
            {skills.length !== catalog.skillCount
              ? ` of ${catalog.skillCount}`
              : ""}
            )
          </h2>
          <div className="skill-list">
            {skills.length === 0 ? (
              <div className="empty">No skills match that filter.</div>
            ) : (
              skills.map((skill) => {
                const active = selected?.id === skill.id;
                const extra = extraIds.includes(skill.id);
                return (
                  <article
                    key={skill.id}
                    className={`skill-card${active ? " active" : ""}`}
                  >
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ width: "100%", textAlign: "left", marginBottom: "0.55rem" }}
                      onClick={() => setSelectedId(skill.id)}
                      aria-pressed={active}
                    >
                      <h3>{skill.name}</h3>
                      <div className="meta">
                        <span className="chip accent">{skill.category}</span>
                        <span className="chip">v{skill.version}</span>
                        <span className="chip">{skill.author}</span>
                      </div>
                      <p className="desc">{skill.description}</p>
                    </button>
                    <button
                      type="button"
                      className={`btn${extra ? "" : " secondary"}`}
                      onClick={() => toggleExtra(skill.id)}
                    >
                      {extra ? "In install plan ✓" : "Add to install plan"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="detail panel" aria-label="Skill detail and install plan">
          {selected ? (
            <>
              <h2>{selected.name}</h2>
              <div className="meta">
                <span className="chip accent">{selected.category}</span>
                <span className="chip ok">v{selected.version}</span>
                <span className="chip">{selected.path}</span>
              </div>
              <p className="desc">{selected.description}</p>
              <h3 className="section-title" style={{ marginTop: "1rem" }}>
                Skill body (excerpt)
              </h3>
              <pre>{selected.bodyMarkdown.slice(0, 1600)}</pre>
            </>
          ) : (
            <div className="empty">Select a skill to inspect it.</div>
          )}

          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--border)",
              margin: "1.1rem 0",
            }}
          />

          <div className="plan">
            <h2 className="section-title">Install planner</h2>
            <div className="field" style={{ marginBottom: "0.55rem" }}>
              <label htmlFor="stack">Stack preset</label>
              <select
                id="stack"
                value={stack}
                onChange={(e) => setStack(e.target.value)}
              >
                {stacks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: "0.55rem" }}>
              <label htmlFor="target">Target directory</label>
              <input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="."
              />
            </div>
            <p className="desc">
              Plan includes <strong>{plan.skillCount}</strong> skills · template{" "}
              <code>{plan.stack.agentsTemplate}</code> · ignore{" "}
              <code>{plan.stack.grokignore}</code>
              {plan.missing.length > 0
                ? ` · missing: ${plan.missing.join(", ")}`
                : ""}
            </p>
            <div className="plan-actions" role="tablist" aria-label="Plan format">
              {(
                [
                  ["bash", "Bash"],
                  ["powershell", "PowerShell"],
                  ["markdown", "Markdown"],
                  ["prompt", "Grok prompt"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`btn${planTab === id ? "" : " secondary"}`}
                  role="tab"
                  aria-selected={planTab === id}
                  onClick={() => setPlanTab(id)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="btn secondary"
                onClick={() => copyText(planBody, planTab)}
              >
                Copy
              </button>
            </div>
            {copyStatus ? (
              <p className="desc" role="status">
                {copyStatus}
              </p>
            ) : null}
            <pre aria-live="polite">{planBody}</pre>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <h3 className="section-title">Official & community links</h3>
            <ul className="checklist">
              {resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>{" "}
                  <span className="chip">{r.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <footer className="container footer">
        <p>
          Independent community integration. Not affiliated with xAI. Skills and
          templates © upstream authors under MIT — see{" "}
          <code>UPSTREAM_LICENSE</code>. Monetization path: freemium SaaS via Polar
          checkout when configured. SEO keywords:{" "}
          {monetization.keywords.join(", ")}.
        </p>
      </footer>
    </main>
  );
}
