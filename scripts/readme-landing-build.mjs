#!/usr/bin/env node
/**
 * Headless README → landing page builder (peacock-style, no UI, no pip).
 *   node scripts/readme-landing-build.mjs --readme README.md --out site/index.html --repo owner/name --template midnghtsapphire
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function args(argv) {
  const o = {
    readme: "README.md",
    out: "site/index.html",
    repo: "",
    template: "midnghtsapphire",
    title: "",
    ogImage: "",
    ref: "main",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--readme") o.readme = argv[++i];
    else if (a === "--out") o.out = argv[++i];
    else if (a === "--repo") o.repo = argv[++i];
    else if (a === "--template") o.template = argv[++i];
    else if (a === "--title") o.title = argv[++i];
    else if (a === "--og-image") o.ogImage = argv[++i];
    else if (a === "--ref") o.ref = argv[++i];
    else if (a === "--all") o.all = true;
  }
  return o;
}

// Compose the default OG image URL. jsDelivr proxies GitHub raw content with a
// correct image/* Content-Type, which is what Twitter/LinkedIn/Slack need.
// See products/covers/README.md for the vault cover pipeline.
function defaultOgImage(repo, ref) {
  if (!repo) return "";
  return `https://cdn.jsdelivr.net/gh/${repo}@${ref || "main"}/products/covers/cover-vault.jpg`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function extract(md) {
  const lines = md.split(/\r?\n/);
  let title = "";
  const badges = [];
  const bodyLines = [];
  for (const line of lines) {
    if (!title) {
      const m = line.match(/^#\s+(.+)/);
      if (m) {
        title = m[1].trim();
        continue; // hero owns H1
      }
    }
    const badgeRe = /!\[([^\]]*)\]\((https?:\/\/img\.shields\.io\/[^)]+)\)/g;
    let m;
    let hasBadge = false;
    let rest = line;
    while ((m = badgeRe.exec(line))) {
      badges.push({ alt: m[1], src: m[2] });
      rest = rest.replace(m[0], "");
      hasBadge = true;
    }
    // After stripping badge images, linked badges leave an empty link wrapper
    // like `[](https://example.com)`. Strip those too before deciding if the
    // line is badge-only (e.g. `[![img](shields)](link)`).
    if (hasBadge) {
      rest = rest.replace(/\[[^\]]*\]\([^)]*\)/g, "");
    }
    // Skip lines that contained only badges (shields.io images) to avoid
    // duplicating them in the body — they are already rendered in the hero.
    if (hasBadge && !rest.trim()) continue;
    bodyLines.push(line);
  }
  return { title: title || "Project", badges, body: bodyLines.join("\n") };
}

/** Minimal markdown → HTML (headings, lists, code, links, images, paras). */
function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false;
  let inUl = false;
  let inOl = false;
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };
  for (let raw of lines) {
    if (raw.startsWith("```")) {
      closeLists();
      if (!inCode) {
        out.push("<pre><code>");
        inCode = true;
      } else {
        out.push("</code></pre>");
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      out.push(esc(raw));
      continue;
    }
    if (/^---+$/.test(raw.trim())) {
      closeLists();
      out.push("<hr />");
      continue;
    }
    const h = raw.match(/^(#{1,3})\s+(.+)/);
    if (h) {
      closeLists();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const ul = raw.match(/^\s*[-*+]\s+(.+)/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = raw.match(/^\s*\d+\.\s+(.+)/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    if (!raw.trim()) {
      closeLists();
      continue;
    }
    closeLists();
    out.push(`<p>${inline(raw)}</p>`);
  }
  closeLists();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function safeHref(raw) {
  // Allow only safe URL schemes; reject javascript:, data:, vbscript:, etc.
  // Returns the raw (unescaped) URL — callers apply esc() exactly once when
  // embedding it in an attribute. Escaping here too would double-escape
  // query-param URLs (& -> &amp;amp;) and break the generated links.
  const url = raw.trim();
  if (/^(https?:|mailto:|#|\/)/i.test(url)) return url;
  // Relative paths without a scheme are safe (links to same origin).
  if (!/^[a-z][a-z0-9+\-.]*:/i.test(url)) return url;
  return "#";
}

function inline(s) {
  // Process links/images on the raw string before HTML-escaping, so URL
  // characters are not mangled by &quot; entities.
  // URL group: everything except `)` and whitespace.
  // Optional title group: whitespace + anything up to `)`.
  const TOKEN_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s[^)]*)?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s[^)]*)?\)/g;
  let result = "";
  let last = 0;
  let m;
  while ((m = TOKEN_RE.exec(s)) !== null) {
    // Escape the plain text preceding this token
    result += esc(s.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[0].startsWith("!")) {
      // Image: ![alt](url) or ![alt](url "title")
      // esc() is applied to the href/src after safeHref() to prevent attribute
      // injection — a URL like http://x.com/"onmouseover="alert(1) must have
      // the quote neutralised before it lands in the attribute value.
      result += `<img src="${esc(safeHref(m[2]))}" alt="${esc(m[1])}" loading="lazy" />`;
    } else {
      // Link: [text](url) or [text](url "title")
      result += `<a href="${esc(safeHref(m[4]))}" rel="noopener noreferrer">${esc(m[3])}<\/a>`;
    }
  }
  result += esc(s.slice(last));
  // Inline code, bold, italic (on already-escaped text; safe from entity conflicts)
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return result;
}

function themeCss(template) {
  if (template === "dark") {
    return `
:root{--bg:#0b0b0f;--fg:#f5f5f7;--muted:#a1a1aa;--card:rgba(24,24,27,.85);--accent:#f97316;--border:rgba(255,255,255,.08)}
body{background:var(--bg);color:var(--fg)}
.hero{background:linear-gradient(135deg,#18181b,#27272a 50%,#431407)}
`;
  }
  if (template === "glass") {
    return `
:root{--bg:#0f172a;--fg:#e2e8f0;--muted:#94a3b8;--card:rgba(255,255,255,.08);--accent:#38bdf8;--border:rgba(255,255,255,.12)}
body{background:radial-gradient(1200px 600px at 10% -10%,#1e3a5f,transparent),radial-gradient(900px 500px at 100% 0%,#312e81,transparent),#020617;color:var(--fg);animation:bgshift 18s ease infinite alternate}
@keyframes bgshift{from{filter:hue-rotate(0)}to{filter:hue-rotate(25deg)}}
.card{backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
`;
  }
  // midnghtsapphire default
  return `
:root{--bg:#070a12;--fg:#e8edf7;--muted:#9aa8c2;--card:#0d1220;--accent:#5b8fd4;--border:#1e2a42}
body{background:var(--bg);color:var(--fg)}
.hero{background:radial-gradient(ellipse 80% 60% at 20% 0%,rgba(91,143,212,.18),transparent 55%),var(--bg)}
a{color:var(--accent)}
`;
}

function buildPage({ title, badges, bodyHtml, repo, template, ogImage }) {
  const base = repo ? `https://github.com/${repo}` : "";
  const ogTags = ogImage
    ? `
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:alt" content="${esc(title)} — cover" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${esc(ogImage)}" />`
    : "";
  const links = repo
    ? [
        ["Star", `${base}`],
        ["Issues", `${base}/issues`],
        ["Pull Requests", `${base}/pulls`],
        ["Releases", `${base}/releases`],
        ["Wiki", `${base}/wiki`],
      ]
    : [];
  const badgeHtml = badges
    .map((b) => `<img class="badge" src="${esc(b.src)}" alt="${esc(b.alt)}" />`)
    .join("\n");
  const linkHtml = links
    .map(
      ([label, href]) =>
        `<a class="btn" href="${esc(href)}" rel="noopener noreferrer">${esc(label)}</a>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(title)} — README landing (MIDNGHTSAPPHIRE automation)" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:type" content="website" />${ogTags}
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6}
    ${themeCss(template)}
    .wrap{max-width:880px;margin:0 auto;padding:2rem 1.25rem 4rem}
    .hero{padding:3rem 0 2rem;border-bottom:1px solid var(--border)}
    .hero h1{font-size:clamp(1.75rem,4vw,2.5rem);margin:0 0 .75rem;letter-spacing:-.02em}
    .badges{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}
    .badge{height:20px}
    .links{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.25rem}
    .btn{display:inline-flex;align-items:center;height:2.5rem;padding:0 .9rem;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--fg);text-decoration:none;font-size:.875rem;font-weight:500}
    .btn:hover{border-color:var(--accent)}
    .card{margin-top:2rem;padding:1.5rem;border:1px solid var(--border);border-radius:16px;background:var(--card)}
    .card h1{font-size:1.35rem}
    .card h2{font-size:1.15rem;margin-top:1.75rem}
    .card h3{font-size:1.05rem}
    .card pre{overflow:auto;padding:1rem;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid var(--border);font-size:.8rem}
    .card code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}
    .card img{max-width:100%;height:auto;border-radius:8px}
    .card ul,.card ol{padding-left:1.25rem}
    .foot{margin-top:2.5rem;font-size:.75rem;color:var(--muted);text-align:center}
  </style>
</head>
<body>
  <header class="hero">
    <div class="wrap">
      <h1>${esc(title)}</h1>
      <p style="color:var(--muted);margin:0">Generated from README · automation-first · human merges only</p>
      <div class="badges">${badgeHtml}</div>
      <div class="links">${linkHtml}</div>
    </div>
  </header>
  <main class="wrap">
    <article class="card">
${bodyHtml}
    </article>
    <p class="foot">MIDNGHTSAPPHIRE · readme-landing · pattern inspired by readme-peacock · static / no third-party runtime</p>
  </main>
</body>
</html>
`;
}

function processOne(readmePath, outPath, opt) {
  const md = fs.readFileSync(readmePath, "utf8");
  const { title, badges, body } = extract(md);
  const ogImage = opt.ogImage || defaultOgImage(opt.repo, opt.ref);
  const html = buildPage({
    title: opt.title || title,
    badges,
    bodyHtml: mdToHtml(body),
    repo: opt.repo,
    template: opt.template,
    ogImage,
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  return { readmePath, outPath, title: opt.title || title, badges: badges.length };
}

const opt = args(process.argv);
const results = [];
if (opt.all) {
  const dir = process.cwd();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const outName =
      f.toLowerCase() === "readme.md"
        ? "index.html"
        : f.toLowerCase().replace(/\.md$/i, ".html");
    results.push(
      processOne(path.join(dir, f), path.join("site", outName), opt),
    );
  }
} else {
  results.push(processOne(opt.readme, opt.out, opt));
}
console.log(JSON.stringify({ ok: true, template: opt.template, results }, null, 2));
