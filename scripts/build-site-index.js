#!/usr/bin/env node
// Generate public/index.html - the oaudrey.com engine-hub landing page.
// Cards for every project (from hub-registry.json) + every docs/<slug>/ dir.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public");

let registry = { entries: [] };
try {
  registry = JSON.parse(fs.readFileSync(path.join(ROOT, "hub-registry.json"), "utf8"));
} catch {}

// docs/<slug>/ dirs become browsable sections
const docsDir = path.join(ROOT, "docs");
const docSlugs = fs.existsSync(docsDir)
  ? fs.readdirSync(docsDir).filter(d => {
      try { return fs.statSync(path.join(docsDir, d)).isDirectory(); } catch { return false; }
    }).sort()
  : [];

const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

const projectCards = registry.entries.map(e => `
  <a class="card" href="${esc(e.hub_url || `/projects/${e.slug}/`)}">
    <div class="card-title">${esc(e.title)}</div>
    <div class="card-desc">${esc(e.description || "")}</div>
    <div class="card-meta"><span class="status ${esc(e.status)}">${esc(e.status)}</span>
    <span class="strat">${esc(e.domain_strategy)}</span></div>
  </a>`).join("\n");

const docLinks = docSlugs.map(s =>
  `  <li><a href="/docs/${encodeURIComponent(s)}/">${esc(s)}</a></li>`).join("\n");

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>OAudrey Engine Hub</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#080a24; color:#f0ece0; }
  header { padding:4rem 2rem 2rem; max-width:1100px; margin:0 auto; }
  h1 { font-size:2.4rem; letter-spacing:.04em; margin:0 0 .4rem; }
  .tag { color:#d4af37; font-size:1rem; letter-spacing:.12em; text-transform:uppercase; }
  main { max-width:1100px; margin:0 auto; padding:1rem 2rem 4rem; }
  h2 { color:#d4af37; font-size:1.1rem; letter-spacing:.1em; text-transform:uppercase;
       border-bottom:1px solid #2a2f5a; padding-bottom:.5rem; margin-top:3rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1rem; margin-top:1.2rem; }
  .card { display:block; background:#10143a; border:1px solid #232a5e; border-radius:10px;
          padding:1.2rem 1.3rem; text-decoration:none; color:inherit; transition:border-color .15s; }
  .card:hover { border-color:#d4af37; }
  .card-title { font-size:1.15rem; margin-bottom:.4rem; }
  .card-desc { font-size:.9rem; color:#b9b4a3; line-height:1.45; min-height:2.5em; }
  .card-meta { margin-top:.8rem; display:flex; gap:.6rem; font-size:.75rem; letter-spacing:.06em; }
  .status { padding:.15rem .55rem; border-radius:99px; text-transform:uppercase; }
  .status.live { background:#143d24; color:#7de2a8; }
  .status.building { background:#3d3414; color:#e2c97d; }
  .status.retired { background:#3d1414; color:#e27d7d; }
  .strat { color:#7d84b8; padding:.15rem 0; }
  ul.docs { columns:3; list-style:none; padding:0; margin-top:1rem; }
  ul.docs a { color:#b9c0f0; text-decoration:none; line-height:2; }
  ul.docs a:hover { color:#d4af37; }
  footer { max-width:1100px; margin:0 auto; padding:0 2rem 3rem; color:#5a5f8a; font-size:.8rem; }
  @media (max-width:640px){ ul.docs{columns:2} header{padding-top:2.5rem} }
</style></head><body>
<header>
  <div class="tag">OAudrey Engine Hub</div>
  <h1>One hub. Every engine.</h1>
  <p>Projects, tools, and generators. Business &amp; payments live at
     <a style="color:#d4af37" href="https://freedomangelcorps.com">freedomangelcorps.com</a>.</p>
</header>
<main>
  <h2>Projects (${registry.entries.length})</h2>
  <div class="grid">
${projectCards || "  <p>No projects yet.</p>"}
  </div>
  <h2>Docs Library (${docSlugs.length} sections)</h2>
  <ul class="docs">
${docLinks}
  </ul>
</main>
<footer>Generated ${new Date().toISOString().slice(0,10)} · revvel-standards · one build, whole site</footer>
</body></html>`;

fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log(`[+] index.html: ${registry.entries.length} project cards, ${docSlugs.length} doc sections`);
