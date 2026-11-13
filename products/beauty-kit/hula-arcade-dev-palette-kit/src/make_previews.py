#!/usr/bin/env python3
"""Renders code-window previews of both themes from the real theme JSON files (so previews always match the shipped colours)."""
import json, os, sys, html
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); B = os.path.join(ROOT, "build", "themes")
sys.path.insert(0, os.path.join(HERE, "..", "..", "_shared"))
from render import html_to_png
def tokmap(theme):
    m = {}
    for tc in theme["tokenColors"]:
        for sc in tc["settings"] and tc["scope"]:
            m[sc] = tc["settings"]["foreground"]
    return m
SAMPLE = [  # (text, class) lines of a small, harmless sample program
    [("# Collect pellets, avoid the glitch blobs", "comment")],
    [("import", "keyword"), (" random", "variable")],
    [],
    [("PELLET_VALUE", "constant"), (" = ", "variable"), ("10", "number")],
    [],
    [("class", "keyword"), (" ", "variable"), ("Dancer", "type"), (":", "punct")],
    [("    ", "variable"), ("def", "keyword"), (" ", "variable"), ("sway", "function"), ("(", "punct"), ("self", "variable"), (", ", "punct"), ("beats", "variable"), (")", "punct"), (":", "punct")],
    [("        ", "variable"), ("return", "keyword"), (" ", "variable"), ("f\"", "string"), ("Aloha x{beats}", "string"), ("\"", "string")],
    [],
    [("score", "variable"), (" = ", "variable"), ("sum", "function"), ("(", "punct"), ("PELLET_VALUE", "constant"), (" for ", "keyword"), ("_", "variable"), (" in ", "keyword"), ("range", "function"), ("(", "punct"), ("5", "number"), ("))", "punct")],
    [("print", "function"), ("(", "punct"), ("Dancer", "type"), ("()", "punct"), (".", "punct"), ("sway", "function"), ("(", "punct"), ("4", "number"), ("))", "punct"), ("  # ", "comment"), ("score: 50", "comment")],
]
def pv(fn, out, name, ui):
    t = json.load(open(os.path.join(B, fn))); c = t["colors"]; tm = tokmap(t)
    col = dict(comment=tm["comment"], keyword=tm["keyword"], string=tm["string"], number=tm["constant.numeric"], function=tm["entity.name.function"],
               type=tm["entity.name.type"], variable=tm["variable"], constant=tm["constant.language"], punct=tm["punctuation"])
    lines = ""
    for i, ln in enumerate(SAMPLE, 1):
        spans = "".join(f'<span style="color:{col[k]};{"font-style:italic;" if k=="comment" else ""}">{html.escape(tx)}</span>' for tx, k in ln) or "&nbsp;"
        cur = c["editor.lineHighlightBackground"] if i == 7 else "transparent"
        lines += f'<div style="display:flex;background:{cur}"><span style="width:44px;text-align:right;padding-right:16px;color:{c["editorLineNumber.activeForeground"] if i==7 else c["editorLineNumber.foreground"]}">{i}</span><span>{spans}</span></div>'
    page = f'''<html><body style="margin:0;background:{c["editor.background"]}"><div style="width:760px;height:430px;font-family:'JetBrains Mono',monospace;font-size:17px;line-height:25px;position:relative;overflow:hidden;background:{c["editor.background"]};color:{c["editor.foreground"]}">
<div style="position:absolute;left:0;top:0;bottom:0;width:48px;background:{c["activityBar.background"]};border-right:1px solid {c["activityBar.border"] if "activityBar.border" in c else "transparent"}"><div style="width:30px;height:30px;margin:10px;background:{c["activityBar.foreground"]};opacity:.9;border-radius:4px"></div><div style="width:26px;height:4px;margin:8px 11px;background:{c["activityBar.inactiveForeground"]}"></div><div style="width:26px;height:4px;margin:8px 11px;background:{c["activityBar.inactiveForeground"]}"></div></div>
<div style="position:absolute;left:48px;top:0;right:0;height:36px;background:{c["editorGroupHeader.tabsBackground"]};display:flex;font-family:'Nunito',sans-serif;font-size:14px"><div style="padding:8px 18px;background:{c["tab.activeBackground"]};color:{c["tab.activeForeground"]};border-top:3px solid {c["tab.activeBorderTop"]}">dance.py</div><div style="padding:8px 18px;background:{c["tab.inactiveBackground"]};color:{c["tab.inactiveForeground"]}">README.md</div></div>
<div style="position:absolute;left:48px;top:48px;right:0;white-space:pre">{lines}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:28px;background:{c["statusBar.background"]};color:{c["statusBar.foreground"]};font-family:'Nunito',sans-serif;font-size:13px;line-height:28px;padding-left:14px;font-weight:700">{name} &nbsp;&middot;&nbsp; Python &nbsp;&middot;&nbsp; Ln 7, Col 5</div></div></body></html>'''
    p = os.path.join(ROOT, "build", "_pv.html"); open(p, "w", encoding="utf-8").write(page)
    html_to_png(p, out, 760, 430); os.remove(p)
os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
pv("hula-arcade-night-color-theme.json", os.path.join(ROOT, "assets", "preview-night.png"), "Hula Arcade Night", "dark")
pv("aloha-day-color-theme.json", os.path.join(ROOT, "assets", "preview-day.png"), "Aloha Day", "light")
print("ok")
