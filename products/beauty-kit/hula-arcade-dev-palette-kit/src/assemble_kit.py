#!/usr/bin/env python3
"""Stages and zips the Pro and Free packages of the Dev Palette Kit into ../dist/."""
import os, shutil, sys, zipfile, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); B = os.path.join(ROOT, "build"); DIST = os.path.join(ROOT, "dist")
sys.path.insert(0, os.path.join(HERE, "..", "..", "_shared")); sys.path.insert(0, HERE)
from md2pdf import md_to_pdf
from palette import check, ALL
def contrast_md():
    rows, _ = check(verbose=False)
    out = ["# Hula Arcade contrast table", "", "WCAG 2.x contrast ratios for every text/background pair used by the themes. AA needs 4.5:1 for normal text.", "",
           "| Text | On | Ratio | Result |", "|---|---|---|---|"]
    for f, b, r, m in rows: out.append(f"| {f} `{ALL[f]}` | {b} `{ALL[b]}` | {r:.2f}:1 | {'pass' if r >= 4.5 else 'fail'} |")
    out += ["", "Derived shades (`night_hi`, `hib_light`, `day_*`, `mint`, `blue_dk`) exist only to keep text at 4.5:1 or better.", ""]
    return "\n".join(out)
def zipdir(src, dst, top):
    if os.path.exists(dst): os.remove(dst)
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
        for base, _, files in os.walk(src):
            for fn in sorted(files):
                p = os.path.join(base, fn); z.write(p, os.path.join(top, os.path.relpath(p, src)))
def stage(name):
    d = os.path.join(B, "stage", name); shutil.rmtree(d, ignore_errors=True); os.makedirs(d); return d
os.makedirs(DIST, exist_ok=True)
# ---- Pro
top = "hula-arcade-dev-palette-kit-pro"; d = os.path.join(stage(top), "x"); os.makedirs(d)
for sub in ("windows-terminal", "starship", "oh-my-posh"): shutil.copytree(os.path.join(B, sub), os.path.join(d, sub))
os.makedirs(os.path.join(d, "vscode")); shutil.copy(os.path.join(B, "vscode", "hula-arcade-dev-palette-1.0.0.vsix"), os.path.join(d, "vscode"))
os.makedirs(os.path.join(d, "palette")); shutil.copy(os.path.join(B, "palette", "palette.json"), os.path.join(d, "palette"))
open(os.path.join(d, "palette", "CONTRAST.md"), "w").write(contrast_md())
for f in ("preview-night.png", "preview-day.png"):
    if os.path.exists(os.path.join(ROOT, "assets", f)): shutil.copy(os.path.join(ROOT, "assets", f), os.path.join(d, "palette"))
shutil.copy(os.path.join(HERE, "licenses", "LICENSE-PRO.txt"), os.path.join(d, "LICENSE.txt"))
shutil.copy(os.path.join(HERE, "INSTALL-GUIDE.md"), d)
md_to_pdf(os.path.join(HERE, "INSTALL-GUIDE.md"), os.path.join(d, "INSTALL-GUIDE.pdf"), "Dev Palette Kit", "Install guide: VS Code, Cursor, Windows Terminal, Starship, oh-my-posh")
zipdir(d, os.path.join(DIST, "hula-arcade-dev-palette-kit-pro.zip"), top)
# ---- Free
top = "hula-arcade-night-free"; d = os.path.join(stage(top), "x"); os.makedirs(d)
shutil.copy(os.path.join(B, "vscode", "hula-arcade-night-1.0.0.vsix"), d)
shutil.copy(os.path.join(HERE, "licenses", "LICENSE-MIT.txt"), os.path.join(d, "LICENSE.txt"))
open(os.path.join(d, "README.txt"), "w").write("""Hula Arcade Night (free) by AudreyBuildsAI

1. Open VS Code or Cursor, Extensions view, "..." menu, Install from VSIX..., pick hula-arcade-night-1.0.0.vsix.
2. Press Ctrl+K Ctrl+T (Cmd+K Cmd+T on a Mac) and choose "Hula Arcade Night".

Every text color clears WCAG AA contrast (4.5:1). MIT licensed, see LICENSE.txt.
Want the light theme "Aloha Day", the Windows Terminal scheme, the Starship preset, and the oh-my-posh themes? They are in the Pro bundle from AudreyBuildsAI.
Not affiliated with Microsoft or GitHub.
""")
zipdir(d, os.path.join(DIST, "hula-arcade-night-free.zip"), top)
for f in os.listdir(DIST): print(f, os.path.getsize(os.path.join(DIST, f)))
