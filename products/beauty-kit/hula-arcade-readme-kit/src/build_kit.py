#!/usr/bin/env python3
"""Builds the Hula Arcade GitHub Profile README Kit (Pro) and the free Lite version into ../build/ and ../dist/."""
import os, shutil, sys, zipfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); B = os.path.join(ROOT, "build"); DIST = os.path.join(ROOT, "dist")
SH = os.path.join(HERE, "..", "..", "_shared"); sys.path.insert(0, SH); sys.path.insert(0, os.path.join(HERE, "template", "scripts"))
import hula_art as h
from md2pdf import md_to_pdf
TPL = os.path.join(HERE, "template")

SKILLS = [("PYTHON", "teal"), ("TYPESCRIPT", "lavender"), ("JAVASCRIPT", "yellow"), ("RUST", "hibiscus"), ("GO", "teal"), ("REACT", "lavender"),
          ("NODE", "yellow"), ("DOCKER", "navy"), ("SQL", "hibiscus"), ("LINUX", "yellow"), ("GIT", "teal"), ("AI", "lavender"), ("DESIGN", "hibiscus"), ("OPEN SOURCE", "navy")]
STATUS = [("BUILDING IN PUBLIC", "yellow"), ("OPEN TO COLLAB", "teal"), ("LEARNING", "lavender"), ("COFFEE POWERED", "hibiscus"), ("SHIPPING", "navy"), ("ALOHA", "yellow")]
def slug(t): return t.lower().replace(" ", "-")
def w(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8", newline="\n").write(data)

def make_assets(dst, only_lite=False):
    A = os.path.join(dst, "assets")
    layouts = ["minimal"] if only_lite else ["hero", "minimal", "dashboard"]
    for lay in layouts:
        for light in (True, False):
            w(os.path.join(A, "banners", f"banner-{lay}-{'light' if light else 'dark'}.svg"), h.banner(lay, light))
    for kind in (["wave"] if only_lite else ["pellets", "wave"]):
        for light in (True, False):
            w(os.path.join(A, "dividers", f"divider-{kind}-{'light' if light else 'dark'}.svg"), h.divider(kind, light))
    skills = SKILLS[:4] if only_lite else SKILLS
    for t, c in skills: w(os.path.join(A, "badges", f"skill-{slug(t)}.svg"), h.badge(t, c))
    if not only_lite:
        for t, c in STATUS: w(os.path.join(A, "badges", f"status-{slug(t)}.svg"), h.badge(t, c))
        for name, rows, leg in (("lil-aud-bod-hula", h.HULA, h.HULA_L), ("auky", h.AUKY, h.AUKY_L), ("hibiscus", h.HIBISCUS, h.HIB_L), ("palm", h.PALM, h.PALM_L), ("pellet", h.PELLET, h.PELLET_L), ("glitch-blob", h.GLITCH, h.GLITCH_L)):
            w(os.path.join(A, "sprites", f"{name}.svg"), h.sprite(rows, leg, s=8, title=name.replace("-", " ")))
    return layouts

def pic(path_base, alt, extra=""):
    return f'''<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{path_base}-dark.svg">
  <img alt="{alt}" src="{path_base}-light.svg" {extra}>
</picture>'''
OUT = "https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-USERNAME/output"
def badge_img(t, prefix="skill", alt=None):
    return f'<img alt="{alt or t.title()}" src="assets/badges/{prefix}-{slug(t)}.svg" height="28">'

def layout_hero():
    skills = " ".join(badge_img(t) for t, _ in SKILLS[:8])
    status = " ".join(badge_img(t, "status") for t, _ in STATUS[:3])
    return f'''<!-- Hula Arcade README Kit, Layout 01: Arcade Hero.  Search this file for "EDIT" and swap in your own words.
     Also replace YOUR-USERNAME (3 places below) with your GitHub username. -->

<div align="center">

{pic("assets/banners/banner-hero", "Aloha, world! Shipping with aloha, one pellet at a time.", 'width="100%"')}

<!-- EDIT: your name and one-line pitch -->
## Hi, I'm YOUR NAME

**I build YOUR THING and I love YOUR OTHER THING.**

{status}

{pic("assets/dividers/divider-pellets", "", 'width="100%"')}

</div>

### About me

| | |
|---|---|
| **Now building** | EDIT: the project you are into this month |
| **Now learning** | EDIT: a language, tool, or skill |
| **Ask me about** | EDIT: three topics you enjoy |
| **Fun fact** | EDIT: something that makes people smile |

> [!TIP]
> EDIT: a friendly note, like how you like to collaborate or the best way to reach you.

### Toolbox

{skills}

<div align="center">

{pic("assets/dividers/divider-wave", "", 'width="100%"')}

### Contribution snake

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{OUT}/snake-dark.svg">
  <img alt="A snake eating my contribution graph" src="{OUT}/snake.svg" width="100%">
</picture>

### Pixel stats

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{OUT}/stats-dark.svg">
  <img alt="My public GitHub stats: stars, repositories, followers, and top languages" src="{OUT}/stats-light.svg" width="100%">
</picture>

{pic("assets/dividers/divider-pellets", "", 'width="100%"')}

<!-- EDIT: links. Keep only the ones you use. Plain links, no trackers. -->
[GitHub](https://github.com/YOUR-USERNAME) &nbsp;|&nbsp; [Website](https://example.com) &nbsp;|&nbsp; [Email](mailto:you@example.com)

</div>
'''

def layout_minimal(lite=False):
    skills = " ".join(badge_img(t) for t, _ in (SKILLS[:4] if lite else SKILLS[:6]))
    return f'''<!-- Hula Arcade README Kit, Layout 02: Aloha Minimal.  Search this file for "EDIT" and swap in your own words. -->

{pic("assets/banners/banner-minimal", "Aloha! This is my corner of the internet.", 'width="100%"')}

<!-- EDIT: a short, warm intro -->
Hi, I'm **YOUR NAME**. I make YOUR THING. Come say aloha.

> [!NOTE]
> EDIT: one sentence about what you are working on right now.

### What I use

{skills}

### Say hello

- EDIT: [your website](https://example.com)
- EDIT: [your email](mailto:you@example.com)

{pic("assets/dividers/divider-wave", "", 'width="100%"')}
'''

def layout_dashboard():
    skills = " ".join(badge_img(t) for t, _ in SKILLS[:10])
    return f'''<!-- Hula Arcade README Kit, Layout 03: Builder Dashboard.  Search this file for "EDIT". Replace YOUR-USERNAME (3 places). -->

{pic("assets/banners/banner-dashboard", "Build log. Ship, learn, repeat.", 'width="100%"')}

<!-- EDIT: who you are, in one line -->
**YOUR NAME** builds YOUR THING in public. This page is my scoreboard.

### Scoreboard

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{OUT}/stats-dark.svg">
  <img alt="My public GitHub stats: stars, repositories, followers, and top languages" src="{OUT}/stats-light.svg" width="100%">
</picture>

<!-- OPTIONAL: richer card from the metrics workflow (see SETUP-GUIDE). Remove the comment markers once metrics.yml has run once.
<img alt="Detailed GitHub metrics" src="assets/generated/metrics.svg" width="100%">
-->

### Featured projects

| Project | What it does | Status |
|---|---|---|
| [project-one](https://github.com/YOUR-USERNAME/project-one) | EDIT: one line | {badge_img("SHIPPING", "status", "Shipping")} |
| [project-two](https://github.com/YOUR-USERNAME/project-two) | EDIT: one line | {badge_img("BUILDING IN PUBLIC", "status", "Building in public")} |
| [project-three](https://github.com/YOUR-USERNAME/project-three) | EDIT: one line | {badge_img("LEARNING", "status", "Learning")} |

### How I work

```mermaid
flowchart LR
    A[Idea] --> B[Prototype]
    B --> C[Ship]
    C --> D[Learn]
    D --> A
```

<details>
<summary><b>Toolbox</b></summary>

{skills}

</details>

<details>
<summary><b>Contribution snake</b></summary>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{OUT}/snake-dark.svg">
  <img alt="A snake eating my contribution graph" src="{OUT}/snake.svg" width="100%">
</picture>

</details>

{pic("assets/dividers/divider-pellets", "", 'width="100%"')}

<!-- EDIT: links -->
[GitHub](https://github.com/YOUR-USERNAME) | [Website](https://example.com) | [Email](mailto:you@example.com)
'''

if __name__ == "__main__":
    shutil.rmtree(B, ignore_errors=True); os.makedirs(DIST, exist_ok=True)
    # ---------------- PRO
    top = "hula-arcade-readme-kit-pro"; d = os.path.join(B, "pro", top)
    make_assets(d)
    for name, fn in (("01-arcade-hero", layout_hero), ("02-aloha-minimal", layout_minimal), ("03-builder-dashboard", layout_dashboard)):
        w(os.path.join(d, "layouts", name, "README.md"), fn())
    shutil.copytree(os.path.join(TPL, "scripts"), os.path.join(d, "scripts"))
    shutil.copytree(os.path.join(TPL, "workflows"), os.path.join(d, "workflows"))
    # workflows also staged in the real GitHub path so the buyer can copy one folder
    shutil.copytree(os.path.join(TPL, "workflows"), os.path.join(d, ".github", "workflows"))
    shutil.copy(os.path.join(HERE, "licenses", "LICENSE-PRO.txt"), os.path.join(d, "LICENSE.txt"))
    shutil.copy(os.path.join(HERE, "SETUP-GUIDE.md"), d)
    md_to_pdf(os.path.join(HERE, "SETUP-GUIDE.md"), os.path.join(d, "SETUP-GUIDE.pdf"), "README Kit", "Setup guide: three profile layouts, pixel banners, and free-GitHub Actions")
    for pv in ("preview-hero.png", "preview-minimal.png", "preview-dashboard.png"):
        p = os.path.join(ROOT, "assets", pv)
        if os.path.exists(p): os.makedirs(os.path.join(d, "previews"), exist_ok=True); shutil.copy(p, os.path.join(d, "previews"))
    # ---------------- LITE
    top2 = "hula-arcade-readme-kit-lite"; d2 = os.path.join(B, "lite", top2)
    make_assets(d2, only_lite=True)
    w(os.path.join(d2, "README.md"), layout_minimal(lite=True))
    shutil.copytree(os.path.join(TPL, "scripts"), os.path.join(d2, "scripts"), ignore=shutil.ignore_patterns("pixel_stats.py", "publish-output.sh", "make_badge.py"))
    shutil.copy(os.path.join(HERE, "licenses", "LICENSE-MIT.txt"), os.path.join(d2, "LICENSE.txt"))
    w(os.path.join(d2, "START-HERE.md"), open(os.path.join(HERE, "LITE-START-HERE.md"), encoding="utf-8").read())
    for src, dst in ((d, os.path.join(DIST, top + ".zip")), (d2, os.path.join(DIST, top2 + ".zip"))):
        if os.path.exists(dst): os.remove(dst)
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
            for base, _, files in os.walk(src):
                for fn in sorted(files):
                    if fn.endswith(".pyc"): continue
                    p = os.path.join(base, fn); z.write(p, os.path.join(os.path.basename(src), os.path.relpath(p, src)))
    for f in sorted(os.listdir(DIST)): print(f, os.path.getsize(os.path.join(DIST, f)))
