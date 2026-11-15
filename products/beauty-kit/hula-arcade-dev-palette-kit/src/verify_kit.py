#!/usr/bin/env python3
"""Verification for the Dev Palette Kit: JSON/TOML validity, schema checks, VS Code colour keys, and WCAG contrast of every token colour."""
import json, os, sys, tomllib, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_shared"))
import jsonschema
from contrast import ratio
HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(HERE, "..", "build")
SCH = os.environ.get("SCHEMA_DIR", os.path.join(HERE, "..", "..", "..", ".tmp"))
fails = []
def chk(c, msg):
    if not c: fails.append(msg); print("FAIL", msg)
valid_keys = set(open(os.path.join(SCH, "vsc-keys.txt")).read().split()) if os.path.exists(os.path.join(SCH, "vsc-keys.txt")) else None
for fn in ("hula-arcade-night-color-theme.json", "aloha-day-color-theme.json"):
    t = json.load(open(os.path.join(B, "themes", fn)))
    bg = t["colors"]["editor.background"][:7]; side = t["colors"]["sideBar.background"][:7]
    for tc in t["tokenColors"]:
        fg = tc["settings"]["foreground"]
        for b in (bg, t["colors"]["editor.lineHighlightBackground"][:7]):
            chk(ratio(fg[1:], b[1:]) >= 4.5, f"{fn} token {tc['scope'][0]} {fg} on {b} = {ratio(fg[1:], b[1:]):.2f}")
    # key text/bg pairs in UI
    c = t["colors"]
    for fgk, bgk in [("editor.foreground","editor.background"),("sideBar.foreground","sideBar.background"),("statusBar.foreground","statusBar.background"),
                     ("statusBar.noFolderForeground","statusBar.noFolderBackground"),("tab.activeForeground","tab.activeBackground"),("tab.inactiveForeground","tab.inactiveBackground"),
                     ("activityBarBadge.foreground","activityBarBadge.background"),("button.foreground","button.background"),("badge.foreground","badge.background"),
                     ("titleBar.activeForeground","titleBar.activeBackground"),("titleBar.inactiveForeground","titleBar.inactiveBackground"),
                     ("list.activeSelectionForeground","list.activeSelectionBackground"),("input.foreground","input.background"),("menu.foreground","menu.background"),
                     ("editorLineNumber.foreground","editor.background"),("activityBar.foreground","activityBar.background"),("activityBar.inactiveForeground","activityBar.background"),
                     ("panelTitle.inactiveForeground","panel.background"),("breadcrumb.foreground","editor.background"),("sideBarTitle.foreground","sideBar.background"),
                     ("statusBar.debuggingForeground","statusBar.debuggingBackground"),("statusBarItem.remoteForeground","statusBarItem.remoteBackground"),
                     ("button.secondaryForeground","button.secondaryBackground"),("notifications.foreground","notifications.background"),("terminal.foreground","terminal.background")]:
        r = ratio(c[fgk][1:7], c[bgk][1:7]); chk(r >= 4.5, f"{fn} {fgk} on {bgk} = {r:.2f}")
    for k in [k for k in c if k.startswith("terminal.ansi") and "Black" not in k]:
        r = ratio(c[k][1:7], c["terminal.background"][1:7]); chk(r >= 4.5, f"{fn} {k} = {r:.2f}")
    if valid_keys:
        unk = [k for k in c if k not in valid_keys]; chk(not unk, f"{fn} unknown colour keys {unk}")
    for k, v in c.items(): chk(re.fullmatch(r"#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?", v) is not None, f"{fn} bad colour {k}={v}")
    print(fn, "ok:", len(c), "colour keys,", len(t["tokenColors"]), "token rules")
ws = json.load(open(os.path.join(B, "windows-terminal", "hula-arcade.schemes.json")))
need = "name background foreground cursorColor selectionBackground black red green yellow blue purple cyan white brightBlack brightRed brightGreen brightYellow brightBlue brightPurple brightCyan brightWhite".split()
for s in ws["schemes"]:
    chk(set(need) == set(s), f"WT {s['name']} keys"); [chk(re.fullmatch(r"#[0-9A-F]{6}", s[k], re.I) is not None, f"WT bad {k}") for k in need[1:]]
print("windows terminal ok:", [s["name"] for s in ws["schemes"]])
st = tomllib.load(open(os.path.join(B, "starship", "hula-arcade.starship.toml"), "rb"))
schema = json.load(open(os.path.join(SCH, "starship-schema.json")))
sch2 = dict(schema); 
try:
    jsonschema.validate({k: v for k, v in st.items() if k != "$schema"}, schema); print("starship toml validates against official config-schema.json")
except jsonschema.ValidationError as e: chk(False, "starship schema: " + e.message[:200])
chk(st["palette"] in st["palettes"], "starship palette missing")
for pn, pv in st["palettes"].items():
    for name in re.findall(r"(?:bold |fg:|bg:)?\b(pellet|lagoon|hibiscus|lei|sand|muted|sky|mint)\b", open(os.path.join(B, "starship", "hula-arcade.starship.toml")).read()):
        chk(name in pv, f"palette {pn} lacks {name}")
osc = json.load(open(os.path.join(SCH, "omp-schema.json")))
for m in ("night", "day"):
    d = json.load(open(os.path.join(B, "oh-my-posh", f"hula-arcade-{m}.omp.json")))
    try: jsonschema.validate(d, osc); print(f"oh-my-posh {m} validates against official schema.json")
    except jsonschema.ValidationError as e: chk(False, f"omp {m}: {e.message[:300]} @ {list(e.absolute_path)}")
print("FAILURES:", len(fails)); sys.exit(1 if fails else 0)
