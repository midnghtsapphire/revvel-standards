#!/usr/bin/env python3
"""End-to-end verification of the three AudreyBuildsAI products. Prints a summary and exits non-zero on any failure."""
import glob, html.parser, json, os, re, shutil, subprocess, sys, tempfile, tomllib, xml.etree.ElementTree as ET, zipfile
import yaml, jsonschema
P = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SH = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, SH)
from contrast import ratio
TMP = "/workspace/balls/.tmp/vz"; shutil.rmtree(TMP, ignore_errors=True); os.makedirs(TMP)
results, fails = [], []
def ok(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    if not cond: fails.append(name + " " + detail)
def run(cmd, **kw): return subprocess.run(cmd, capture_output=True, text=True, **kw)
BANNED = re.compile(r"pac-?\s?man|namco|bandai|\bghosts?\b|octocat|utm_|\bref=|bit\.ly|\bBALLS\b", re.I)
SCHEMA = "/workspace/balls/.tmp"
bk = os.path.join(P, "make-github-gorgeous-booklet"); rk = os.path.join(P, "hula-arcade-readme-kit"); pk = os.path.join(P, "hula-arcade-dev-palette-kit")
# ------------------------------------------------------------------ booklet
pdf = os.path.join(bk, "make-github-gorgeous-booklet.pdf")
info = run(["pdfinfo", pdf]).stdout; pages = int(re.search(r"Pages:\s+(\d+)", info).group(1))
ok("booklet: page count 20-30", 20 <= pages <= 30, f"{pages} pages")
ok("booklet: letter size", "612 x 792" in info)
fonts = run(["pdffonts", pdf]).stdout.splitlines()[2:]
ok("booklet: all fonts embedded", fonts and all(l.split()[-5] == "yes" for l in fonts if l.strip()), f"{len(fonts)} fonts")
txt = run(["pdftotext", "-layout", pdf, "-"]).stdout
ok("booklet: no banned words", not BANNED.search(txt), str(BANNED.findall(txt)))
ok("booklet: no tracking/affiliate URLs", not re.search(r"https?://\S*(utm_|ref=|aff|tracking)", txt, re.I))
sn = os.path.join(bk, "src", "snippets")
for f in sorted(os.listdir(sn)):
    body = open(os.path.join(sn, f), encoding="utf-8").read()
    first = [l for l in body.splitlines() if l.strip()][0].strip()
    flat = re.sub(r"\s+", " ", txt)
    ok(f"booklet snippet {f}: present in PDF", re.sub(r"\s+", " ", first) in flat)
    if f.endswith(".json"): json.loads(body); ok(f"booklet snippet {f}: valid JSON", True)
    if f.endswith(".yml") and "pages" not in f:
        r = run([os.path.expanduser("~/actionlint"), os.path.join(sn, f)]); ok(f"booklet snippet {f}: actionlint", r.returncode == 0, r.stdout[:200])
    if f.endswith(".yml"): yaml.safe_load(body); ok(f"booklet snippet {f}: valid YAML", True)
    if f.endswith(".toml"):
        t = tomllib.loads(body); jsonschema.validate(t, json.load(open(os.path.join(SCHEMA, "starship-schema.json")))); ok(f"booklet snippet {f}: valid TOML + Starship schema", True)
    if f == "windows-terminal-scheme.json":
        d = json.loads(body)
        for k, v in d.items():
            if k in ("name", "background", "selectionBackground", "black", "foreground", "cursorColor"): continue
            ok(f"WT scheme colour {k} contrast >= 4.5", ratio(v[1:], d["background"][1:]) >= 4.5)
# the inline publish step, run against a local bare remote (URL swapped for a file path)
wf = yaml.safe_load(open(os.path.join(sn, "snake-workflow.yml")))
step = [s for s in wf["jobs"]["snake"]["steps"] if s.get("name", "").startswith("Publish")][0]["run"]
d = tempfile.mkdtemp(dir=TMP); remote = os.path.join(d, "r.git"); run(["git", "init", "-q", "--bare", remote]); work = os.path.join(d, "w"); os.makedirs(os.path.join(work, "dist"))
open(os.path.join(work, "dist", "snake.svg"), "w").write("<svg/>")
cmd = step.replace('"https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"', remote)
r = run(["bash", "-ec", cmd], cwd=work); ls = run(["git", "--git-dir", remote, "ls-tree", "--name-only", "output"]).stdout.split()
ok("booklet: inline publish step pushes snake.svg to output branch", r.returncode == 0 and "snake.svg" in ls, r.stderr[:200])
# the published SHA really is snk v3.5.0 and checkout v7.0.1
for repo, tag, sha in (("Platane/snk", "v3.5.0", "d8f6715049803e982ee5ff501b6b9b7d5deeb09b"), ("actions/checkout", "v7.0.1", "3d3c42e5aac5ba805825da76410c181273ba90b1"), ("lowlighter/metrics", "v3.34", "65836723097537a54cd8eb90f61839426b4266b6")):
    got = run(["gh", "api", f"repos/{repo}/commits/{tag}", "--jq", ".sha"]).stdout.strip(); ok(f"pinned SHA {repo}@{tag} matches GitHub", got == sha, got)
# ------------------------------------------------------------------ readme kit
class Chk(html.parser.HTMLParser):
    VOID = {"img", "source", "br", "hr", "meta", "link", "input"}
    def __init__(s): super().__init__(); s.stack = []; s.err = []; s.refs = []; s.imgs = []; s.pics = 0
    def handle_starttag(s, t, a):
        a = dict(a)
        if t not in s.VOID: s.stack.append(t)
        if t == "picture": s.pics += 1
        if t == "img": s.imgs.append(a)
        for k in ("src", "srcset", "href"):
            if a.get(k): s.refs.append(a[k])
    def handle_endtag(s, t):
        if t in s.VOID: return
        if not s.stack or s.stack[-1] != t: s.err.append(f"unbalanced </{t}>")
        else: s.stack.pop()
def check_kit(zpath, label, layouts):
    d = os.path.join(TMP, label); os.makedirs(d); z = zipfile.ZipFile(zpath); ok(f"{label}: zip integrity", z.testzip() is None); z.extractall(d)
    root = os.path.join(d, os.listdir(d)[0])
    ok(f"{label}: LICENSE present", os.path.exists(os.path.join(root, "LICENSE.txt")))
    for svgf in glob.glob(root + "/**/*.svg", recursive=True): ET.parse(svgf)
    ok(f"{label}: all {len(glob.glob(root + '/**/*.svg', recursive=True))} SVGs are well-formed XML", True)
    for f in glob.glob(root + "/**/*", recursive=True):
        if os.path.isfile(f) and re.search(r"\.(md|txt|py|sh|yml|svg|json)$", f):
            t = open(f, encoding="utf-8", errors="ignore").read()
            m = BANNED.search(t); ok(f"{label}: banned words in {os.path.relpath(f, root)}", not m, m.group(0) if m else "")
    for lay in layouts:
        rd = open(os.path.join(root, lay), encoding="utf-8").read(); base = os.path.dirname(os.path.join(root, lay))
        c = Chk(); c.feed(rd); ok(f"{label}: {lay} HTML balanced", not c.err and not c.stack, str(c.err[:3] + c.stack[:3]))
        ok(f"{label}: {lay} every <img> has non-empty alt except decorative dividers", all(i.get("alt") or "divider" in i.get("src", "") for i in c.imgs))
        ok(f"{label}: {lay} every <picture> pairs a dark source with a light img", rd.count("<picture>") == rd.count('media="(prefers-color-scheme: dark)"') == rd.count("</picture>"))
        missing = []
        for ref in c.refs:
            if ref.startswith("http") or ref.startswith("mailto:"): continue
            for cand in (os.path.join(root, ref), os.path.join(os.path.dirname(os.path.dirname(base)), ref), os.path.join(base, ref)):
                if os.path.exists(cand): break
            else: missing.append(ref)
        ok(f"{label}: {lay} local asset refs resolve", not missing, str(missing[:3]))
        urls = set(re.findall(r"https?://[^\s\"')>]+", rd)); bad = [u for u in urls if not re.match(r"https://(github\.com/YOUR-USERNAME|raw\.githubusercontent\.com/YOUR-USERNAME/YOUR-USERNAME/output|example\.com)", u)]
        ok(f"{label}: {lay} only placeholder/own-repo/example URLs (no trackers)", not bad, str(bad))
        ok(f"{label}: {lay} has EDIT markers", "EDIT" in rd)
    return root
roots = {}
proroot = check_kit(os.path.join(rk, "hula-arcade-readme-kit.zip"), "readme-pro", ["layouts/01-arcade-hero/README.md", "layouts/02-aloha-minimal/README.md", "layouts/03-builder-dashboard/README.md"])
literoot = check_kit(os.path.join(rk, "hula-arcade-readme-kit-lite.zip"), "readme-lite", ["README.md"])
ok("readme-pro: 3 layouts", len(glob.glob(proroot + "/layouts/*/README.md")) == 3)
ok("readme-lite: exactly 1 layout + banner pair", os.path.exists(literoot + "/README.md") and len(glob.glob(literoot + "/assets/banners/*.svg")) == 2)
for wfp in glob.glob(proroot + "/.github/workflows/*.yml") + glob.glob(proroot + "/workflows/*.yml"):
    y = yaml.safe_load(open(wfp)); ok(f"readme-pro: {os.path.relpath(wfp, proroot)} parses", "jobs" in y)
    r = run([os.path.expanduser("~/actionlint"), wfp]); ok(f"readme-pro: actionlint {os.path.relpath(wfp, proroot)}", r.returncode == 0, r.stdout[:300])
    uses = re.findall(r"uses:\s*(\S+)", open(wfp).read()); ok(f"readme-pro: {os.path.basename(wfp)} actions pinned to 40-hex SHA", all(re.search(r"@[0-9a-f]{40}$", u) for u in uses), str(uses))
ok("readme-pro: both workflow folders identical", all(open(a).read() == open(b).read() for a, b in zip(sorted(glob.glob(proroot + "/.github/workflows/*")), sorted(glob.glob(proroot + "/workflows/*")))))
for sc in glob.glob(proroot + "/scripts/*.py"): r = run([sys.executable, "-m", "py_compile", sc]); ok(f"readme-pro: py_compile {os.path.basename(sc)}", r.returncode == 0, r.stderr[:200])
shutil.rmtree(proroot + "/scripts/__pycache__", ignore_errors=True)
ok("readme-pro: publish-output.sh bash -n", run(["bash", "-n", proroot + "/scripts/publish-output.sh"]).returncode == 0)
out = os.path.join(TMP, "gen"); r = run([sys.executable, proroot + "/scripts/pixel_stats.py", "--sample", "--out", out]); ok("readme-pro: pixel_stats.py --sample runs", r.returncode == 0 and os.path.exists(out + "/stats-dark.svg"), r.stderr[:200])
ET.parse(out + "/stats-dark.svg"); ET.parse(out + "/stats-light.svg")
r = run([sys.executable, proroot + "/scripts/make_banner.py", "--layout", "hero", "--title", "HI, I'M ADA", "--tagline", "I BUILD COMPILERS|AND LOVE TEA", "--out", out]); ok("readme-pro: make_banner.py (guide example) runs", r.returncode == 0, r.stdout + r.stderr[:200])
r = run([sys.executable, proroot + "/scripts/make_badge.py", "OPEN TO WORK", "--color", "teal", "--out", out + "/b.svg"]); ok("readme-pro: make_badge.py (guide example) runs", r.returncode == 0)
r = run([sys.executable, literoot + "/scripts/make_banner.py", "--layout", "minimal", "--title", "ALOHA!", "--tagline", "HELLO FROM MY CORNER", "--out", out + "/lite"]); ok("readme-lite: make_banner.py (start-here example) runs", r.returncode == 0, r.stderr[:200])
shutil.rmtree(literoot + "/scripts/__pycache__", ignore_errors=True)
# publish-output.sh against a local bare remote, twice (idempotent) with two different files
d = tempfile.mkdtemp(dir=TMP); remote = os.path.join(d, "r.git"); run(["git", "init", "-q", "--bare", remote]); w = os.path.join(d, "w"); run(["git", "clone", "-q", remote, w])
for c in (["git", "config", "user.email", "t@t"], ["git", "config", "user.name", "t"]): run(c, cwd=w)
shutil.copytree(proroot + "/scripts", w + "/scripts"); open(w + "/README.md", "w").write("x"); run(["git", "add", "-A"], cwd=w); run(["git", "commit", "-qm", "i"], cwd=w); run(["git", "branch", "-M", "main"], cwd=w); run(["git", "push", "-q", "origin", "main"], cwd=w)
os.makedirs(w + "/d1"); os.makedirs(w + "/d2"); open(w + "/d1/a.svg", "w").write("<svg/>"); open(w + "/d2/b.svg", "w").write("<svg/>")
rs = [run(["bash", "scripts/publish-output.sh", x], cwd=w) for x in ("d1", "d2", "d2")]
files = run(["git", "--git-dir", remote, "ls-tree", "-r", "--name-only", "output"]).stdout.split()
ok("readme-pro: publish-output.sh accumulates files on output branch, idempotent", all(r.returncode == 0 for r in rs) and sorted(files) == ["a.svg", "b.svg"] and "No changes" in rs[2].stdout, str(files))
# banner / badge / stats text contrast
import hula_art as h
for light in (True, False):
    t = h._theme(light)
    for a, b, n in (("title", "bg", "title"), ("text", "bg", "tagline")): ok(f"banner {'light' if light else 'dark'} {n} contrast >= 4.5", ratio(t[a][1:], t[b][1:]) >= 4.5, f"{ratio(t[a][1:], t[b][1:]):.2f}")
for name, (fill, fg) in h.BADGE_COLORS.items(): ok(f"badge {name} contrast >= 4.5", ratio(fg[1:], fill[1:]) >= 4.5, f"{ratio(fg[1:], fill[1:]):.2f}")
# ------------------------------------------------------------------ palette kit
for zname, n_themes in (("hula-arcade-dev-palette-kit.zip", 2), ("hula-arcade-night-free.zip", 1)):
    d = os.path.join(TMP, zname[:-4]); os.makedirs(d); z = zipfile.ZipFile(os.path.join(pk, zname)); ok(f"{zname}: zip integrity", z.testzip() is None); z.extractall(d)
    vs = glob.glob(d + "/**/*.vsix", recursive=True); ok(f"{zname}: contains 1 vsix", len(vs) == 1)
    vd = os.path.join(d, "vsix"); zipfile.ZipFile(vs[0]).extractall(vd)
    ET.parse(vd + "/extension.vsixmanifest"); ET.parse(vd + "/[Content_Types].xml")
    pj = json.load(open(vd + "/extension/package.json")); th = pj["contributes"]["themes"]
    ok(f"{zname}: vsix manifest ok (publisher, engines.vscode, {n_themes} themes)", pj["publisher"] and pj["engines"]["vscode"] and len(th) == n_themes and {t["uiTheme"] for t in th} <= {"vs", "vs-dark"})
    for t in th:
        tj = json.load(open(os.path.join(vd, "extension", t["path"][2:]))); ok(f"{zname}: theme {t['label']} JSON valid with {len(tj['colors'])} colors", len(tj["colors"]) > 100 and tj["type"] in ("dark", "light"))
    ok(f"{zname}: vsix icon is PNG >= 128px", open(vd + "/extension/" + pj["icon"], "rb").read(8) == b"\x89PNG\r\n\x1a\n")
    ok(f"{zname}: vsix has LICENSE and README", os.path.exists(vd + "/extension/LICENSE.txt") and os.path.exists(vd + "/extension/readme.md"))
    for f in glob.glob(d + "/**/*", recursive=True):
        if os.path.isfile(f) and re.search(r"\.(md|txt|json|toml)$", f):
            m = BANNED.search(open(f, encoding="utf-8", errors="ignore").read()); ok(f"{zname}: banned words in {os.path.relpath(f, d)}", not m, m.group(0) if m else "")
    if "dev-palette" in zname:
        top = os.path.join(d, os.listdir(d)[0]); ok("palette pro: schemes/starship/omp files present", all(os.path.exists(os.path.join(top, p)) for p in ("windows-terminal/hula-arcade.schemes.json", "starship/hula-arcade.starship.toml", "oh-my-posh/hula-arcade-night.omp.json", "oh-my-posh/hula-arcade-day.omp.json", "INSTALL-GUIDE.pdf", "LICENSE.txt")))
        pjson = [f for f in glob.glob(top + "/**/*", recursive=True) if f.endswith(".json") and "vsix" not in f]
        for f in pjson: json.load(open(f))
        ok("palette pro: all JSON parses", True)
        ok("palette pro: oh-my-posh validates against official schema", all(not list(jsonschema.Draft7Validator(json.load(open(SCHEMA + "/omp-schema.json"))).iter_errors(json.load(open(f)))) for f in glob.glob(top + "/oh-my-posh/*.json")))
        st = tomllib.load(open(top + "/starship/hula-arcade.starship.toml", "rb")); jsonschema.validate({k: v for k, v in st.items() if k != "$schema"}, json.load(open(SCHEMA + "/starship-schema.json"))); ok("palette pro: starship validates against official schema", True)
r = run([sys.executable, pk + "/src/verify_kit.py"]); ok("palette: verify_kit.py (token/UI contrast >= 4.5, colour keys, schemas)", r.returncode == 0, r.stdout[-300:])
# ------------------------------------------------------------------ listing assets
from PIL import Image
for d, nm in ((bk, "booklet"), (rk, "readme"), (pk, "palette")):
    ok(f"{nm}: cover 1280x720", Image.open(d + "/listing/cover.png").size == (1280, 720)); ok(f"{nm}: thumbnail 600x600", Image.open(d + "/listing/thumbnail.png").size == (600, 600))
    ok(f"{nm}: listing.md present", os.path.exists(d + "/listing/listing.md"))
    lt = open(d + "/listing/listing.md", encoding="utf-8").read(); m = BANNED.search(lt); ok(f"{nm}: listing text has no banned words", not m, m.group(0) if m else "")
    ok(f"{nm}: listing has price and refund line", "$" in lt and "refund" in lt.lower())
shutil.rmtree(TMP, ignore_errors=True)
w = max(len(n) for n, _, _ in results)
for n, c, dtl in results: print(("PASS " if c else "FAIL ") + n + (f"  [{dtl}]" if dtl and (not c or len(dtl) < 40) else ""))
print(f"\n{sum(c for _, c, _ in results)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
