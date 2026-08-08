"use client";

import { useMemo, useState } from "react";
import { healMarkdown } from "../lib/heal";
import { validateRegistryManifest, type RegistryManifest } from "../lib/registry";
import { OAUTH_PROVIDERS, listSecretNames } from "../lib/oauth";

const SAMPLE_MD = `# WR Title

# Nested Title That Breaks MD025

| Col A | Col B | Col C |
| --- | --- | --- |
| only one cell |
| ok | row | here |
`;

const SAMPLE_REGISTRY: RegistryManifest = {
  version: "1.0",
  files: [
    { path: "docs/guide.md", role: "doc" },
    { path: "scripts/run.js", role: "script" },
    { path: "missing.md", role: "doc", required: false },
  ],
};

const SAMPLE_FS: Record<string, string | null> = {
  "docs/guide.md": "# Guide\n\nContent.\n",
  "scripts/run.js": "console.log('ok');\n",
  "missing.md": null,
};

const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem 4rem" } as const,
  h1: { fontSize: "1.75rem", margin: "0 0 0.35rem", fontWeight: 750 } as const,
  lead: { color: "var(--muted)", margin: "0 0 1.75rem", maxWidth: 720, lineHeight: 1.5 } as const,
  tabs: { display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: "1.25rem" },
  tab: (active: boolean) =>
    ({
      border: "1px solid var(--border)",
      background: active ? "var(--accent)" : "var(--panel)",
      color: active ? "#fff" : "var(--text)",
      borderRadius: 999,
      padding: "0.45rem 0.9rem",
      cursor: "pointer",
      fontWeight: 600,
    }) as const,
  card: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1.1rem 1.2rem",
    marginBottom: "1rem",
  } as const,
  label: { display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: 6 } as const,
  ta: {
    width: "100%",
    minHeight: 180,
    background: "#0b0f14",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "0.75rem",
    fontFamily: "var(--mono)",
    fontSize: "0.85rem",
    lineHeight: 1.45,
  } as const,
  btn: {
    marginTop: 10,
    background: "var(--accent)",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "0.55rem 1rem",
    fontWeight: 700,
    cursor: "pointer",
  } as const,
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const,
  badge: (ok: boolean) =>
    ({
      display: "inline-block",
      background: ok ? "var(--ok)" : "var(--bad)",
      color: "#04110a",
      fontWeight: 800,
      borderRadius: 6,
      padding: "2px 8px",
      fontSize: "0.75rem",
    }) as const,
  pre: {
    whiteSpace: "pre-wrap" as const,
    fontFamily: "var(--mono)",
    fontSize: "0.82rem",
    background: "#0b0f14",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "0.75rem",
    overflow: "auto",
  } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.9rem" },
  th: {
    textAlign: "left" as const,
    borderBottom: "1px solid var(--border)",
    padding: "0.45rem 0.35rem",
    color: "var(--muted)",
  },
  td: { borderBottom: "1px solid var(--border)", padding: "0.5rem 0.35rem", verticalAlign: "top" as const },
  mono: { fontFamily: "var(--mono)", fontSize: "0.82rem" } as const,
};

type Tab = "heal" | "registry" | "oauth";

export default function Page() {
  const [tab, setTab] = useState<Tab>("heal");
  const [mdIn, setMdIn] = useState(SAMPLE_MD);
  const healed = useMemo(() => healMarkdown(mdIn), [mdIn]);

  const [regJson, setRegJson] = useState(JSON.stringify(SAMPLE_REGISTRY, null, 2));
  const [fsJson, setFsJson] = useState(JSON.stringify(SAMPLE_FS, null, 2));
  const registryReport = useMemo(() => {
    try {
      const manifest = JSON.parse(regJson) as RegistryManifest;
      const fsMap = JSON.parse(fsJson) as Record<string, string | null>;
      return { report: validateRegistryManifest(manifest, fsMap), error: null as string | null };
    } catch (e) {
      return { report: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [regJson, fsJson]);

  const secrets = listSecretNames();

  return (
    <main style={S.page}>
      <h1 style={S.h1}>Orchestration Console</h1>
      <p style={S.lead}>
        Production SaaS surface for the multi-persona engine: heal Markdown structure
        (MD025/MD056), validate the file registry, and copy n8n OAuth 2.0 parameters
        for Gmail, Outlook, and Yahoo.
      </p>

      <div style={S.tabs}>
        {(
          [
            ["heal", "Structural heal"],
            ["registry", "File registry"],
            ["oauth", "n8n OAuth"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" style={S.tab(tab === id)} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "heal" && (
        <section style={S.card}>
          <div style={S.grid} className="heal-grid">
            <div>
              <label style={S.label} htmlFor="md-in">
                Broken Markdown
              </label>
              <textarea id="md-in" style={S.ta} value={mdIn} onChange={(e) => setMdIn(e.target.value)} />
            </div>
            <div>
              <label style={S.label} htmlFor="md-out">
                Healed output {healed.changed ? "(changed)" : "(unchanged)"}
              </label>
              <textarea id="md-out" style={S.ta} value={healed.text} readOnly />
            </div>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 12 }}>
            Same transforms as <code>scripts/heal-markdown.js</code> — setext→ATX, demote extra
            H1s, balance table columns. CI uses the Node path; this panel is the interactive demo.
          </p>
        </section>
      )}

      {tab === "registry" && (
        <section style={S.card}>
          <div style={S.grid}>
            <div>
              <label style={S.label} htmlFor="reg">
                Registry JSON
              </label>
              <textarea id="reg" style={S.ta} value={regJson} onChange={(e) => setRegJson(e.target.value)} />
            </div>
            <div>
              <label style={S.label} htmlFor="fs">
                Virtual filesystem map
              </label>
              <textarea id="fs" style={S.ta} value={fsJson} onChange={(e) => setFsJson(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            {registryReport.error ? (
              <span style={S.badge(false)}>parse error: {registryReport.error}</span>
            ) : registryReport.report ? (
              <>
                <span style={S.badge(registryReport.report.ok)}>
                  {registryReport.report.ok ? "VALID" : "INVALID"}
                </span>
                <span style={{ marginLeft: 10, color: "var(--muted)" }}>
                  checked {registryReport.report.checked}
                </span>
                <pre style={{ ...S.pre, marginTop: 10 }}>
                  {JSON.stringify(registryReport.report, null, 2)}
                </pre>
              </>
            ) : null}
          </div>
        </section>
      )}

      {tab === "oauth" && (
        <section>
          {OAUTH_PROVIDERS.map((p) => (
            <article key={p.id} style={S.card}>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>{p.name}</h2>
              <table style={S.table}>
                <tbody>
                  <tr>
                    <th style={S.th}>Authorization URL</th>
                    <td style={{ ...S.td, ...S.mono }}>{p.authorizationUrl}</td>
                  </tr>
                  <tr>
                    <th style={S.th}>Access Token URL</th>
                    <td style={{ ...S.td, ...S.mono }}>{p.accessTokenUrl}</td>
                  </tr>
                  <tr>
                    <th style={S.th}>Scopes</th>
                    <td style={{ ...S.td, ...S.mono }}>{p.scopes.join(" ")}</td>
                  </tr>
                  {p.authUriQueryParameters ? (
                    <tr>
                      <th style={S.th}>Auth URI query</th>
                      <td style={{ ...S.td, ...S.mono }}>{p.authUriQueryParameters}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th style={S.th}>Secret names</th>
                    <td style={{ ...S.td, ...S.mono }}>
                      {p.secretNames.clientId}, {p.secretNames.clientSecret}
                    </td>
                  </tr>
                </tbody>
              </table>
              <ul style={{ color: "var(--muted)", margin: "0.75rem 0 0", paddingLeft: "1.2rem" }}>
                {p.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </article>
          ))}
          <div style={S.card}>
            <h3 style={{ marginTop: 0 }}>All OAuth secret names</h3>
            <pre style={S.pre}>{secrets.join("\n")}</pre>
          </div>
        </section>
      )}

      <footer style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "2rem" }}>
        Port 3012 · docs in <code>docs/n8n/OAUTH_PROVIDERS.md</code> · workflow{" "}
        <code>structural-auto-heal.yml</code>
      </footer>

      <style>{`
        @media (max-width: 860px) {
          .heal-grid, main section > div[style] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
