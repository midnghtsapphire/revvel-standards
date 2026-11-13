#!/usr/bin/env python3
"""Builds the two .vsix files (Pro: both themes, Free: dark only) with @vscode/vsce."""
import json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(HERE, "..", "build")
VSCE = os.environ.get("VSCE", "vsce")
VERSION = "1.0.0"
THEMES = {
    "dark": dict(label="Hula Arcade Night", uiTheme="vs-dark", file="hula-arcade-night-color-theme.json"),
    "light": dict(label="Aloha Day", uiTheme="vs", file="aloha-day-color-theme.json"),
}
def build(slug, display, desc, keys, lic_file, lic_id, readme):
    d = os.path.join(B, "ext-" + slug)
    shutil.rmtree(d, ignore_errors=True); os.makedirs(os.path.join(d, "themes"))
    for k in keys: shutil.copy(os.path.join(B, "themes", THEMES[k]["file"]), os.path.join(d, "themes"))
    shutil.copy(os.path.join(HERE, "..", "assets", "icon.png"), d)
    shutil.copy(os.path.join(HERE, "licenses", lic_file), os.path.join(d, "LICENSE"))
    open(os.path.join(d, "README.md"), "w", encoding="utf-8").write(readme)
    open(os.path.join(d, "CHANGELOG.md"), "w").write(f"# Changelog\n\n## {VERSION}\n- First release.\n")
    pj = {
        "name": slug, "displayName": display, "description": desc, "version": VERSION, "publisher": "audreybuildsai",
        "license": lic_id, "engines": {"vscode": "^1.70.0"}, "categories": ["Themes"], "icon": "icon.png",
        "keywords": ["theme", "dark theme", "light theme", "retro", "arcade", "hawaiian", "accessible", "wcag"],
        "galleryBanner": {"color": "#1B1F4B", "theme": "dark"},
        "contributes": {"themes": [{"label": THEMES[k]["label"], "uiTheme": THEMES[k]["uiTheme"], "path": "./themes/" + THEMES[k]["file"]} for k in keys]},
    }
    json.dump(pj, open(os.path.join(d, "package.json"), "w"), indent=2)
    out = os.path.join(B, "vscode"); os.makedirs(out, exist_ok=True)
    target = os.path.join(out, f"{slug}-{VERSION}.vsix")
    r = subprocess.run([VSCE, "package", "--allow-missing-repository", "--no-dependencies", "--out", target], cwd=d, capture_output=True, text=True)
    print(r.stdout[-600:], r.stderr[-600:]); assert r.returncode == 0 and os.path.exists(target)
    print(slug, os.path.getsize(target), "bytes")

README_FREE = """# Hula Arcade Night

A retro-arcade, soft-Hawaiian dark theme for VS Code and Cursor. Deep ink background, pellet-yellow cursor, lagoon-teal strings, lei-lavender functions, hibiscus keywords.

- Every code and UI text pair clears WCAG AA contrast (4.5:1 or better).
- Includes a matching integrated-terminal ANSI palette.
- Free, MIT licensed. The light theme "Aloha Day" and the terminal/prompt files are in the Pro bundle by AudreyBuildsAI.

Install: Extensions view -> "..." menu -> **Install from VSIX...**, then **Preferences: Color Theme** -> Hula Arcade Night.
Not affiliated with Microsoft or GitHub.
"""
README_PRO = """# Hula Arcade Dev Palette (Pro)

Two matching themes from one measured palette: **Hula Arcade Night** (dark) and **Aloha Day** (light), for VS Code and Cursor.
Every code and UI text pair clears WCAG AA contrast (4.5:1 or better), including the integrated-terminal ANSI colors.

The full Pro bundle also includes a Windows Terminal color scheme, Starship presets, oh-my-posh themes, and an install guide.

Install: Extensions view -> "..." menu -> **Install from VSIX...**, then **Preferences: Color Theme**.
By AudreyBuildsAI (Freedom Angel Corp). Not affiliated with Microsoft or GitHub. See LICENSE.
"""
if __name__ == "__main__":
    build("hula-arcade-dev-palette", "Hula Arcade Dev Palette (Pro)", "Dark 'Hula Arcade Night' and light 'Aloha Day' themes. Retro arcade, soft Hawaiian, WCAG AA.", ["dark", "light"], "LICENSE-PRO.txt", "SEE LICENSE IN LICENSE", README_PRO)
    build("hula-arcade-night", "Hula Arcade Night", "Free retro-arcade, soft-Hawaiian dark theme. WCAG AA contrast.", ["dark"], "LICENSE-MIT.txt", "MIT", README_FREE)
