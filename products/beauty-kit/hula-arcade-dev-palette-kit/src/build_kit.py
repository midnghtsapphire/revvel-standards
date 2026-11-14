#!/usr/bin/env python3
"""Generates every theme/config file of the Hula Arcade Dev Palette Kit from palette.py.
Outputs into ../build/ (not committed).  Usage: python3 build_kit.py"""
import json, os, re, sys
from palette import ALL as A, BRAND as B, check, PAIRS
from contrast import ratio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "build")
rows, bad = check(verbose=False)
assert not bad, bad

def ok(fg, bg, m=4.5):
    r = ratio(fg[1:], bg[1:]); assert r >= m, (fg, bg, r); return fg

def alpha(c, a): return c + a

# ---------------------------------------------------------------- VS Code themes
def dark_theme():
    ink, navy, hi = A["ink"], A["navy"], A["night_hi"]
    cream, yellow, teal, lav, hib, hibl = A["cream"], A["yellow"], A["teal"], A["lavender"], A["hibiscus"], A["hib_light"]
    muted, sky, line = A["night_muted"], A["sky"], A["night_line"]
    colors = {
        "foreground": cream, "focusBorder": yellow, "descriptionForeground": muted, "errorForeground": hibl,
        "icon.foreground": cream, "selection.background": alpha(lav, "66"), "widget.shadow": "#0A0B24AA",
        "editor.background": ink, "editor.foreground": cream,
        "editor.lineHighlightBackground": navy, "editor.selectionBackground": alpha(lav, "55"),
        "editor.inactiveSelectionBackground": alpha(lav, "33"), "editor.selectionHighlightBackground": alpha(teal, "33"),
        "editor.wordHighlightBackground": alpha(lav, "33"), "editor.findMatchBackground": alpha(yellow, "66"),
        "editor.findMatchHighlightBackground": alpha(yellow, "33"), "editor.rangeHighlightBackground": alpha(lav, "1A"),
        "editorCursor.foreground": yellow, "editorLineNumber.foreground": muted, "editorLineNumber.activeForeground": yellow,
        "editorIndentGuide.background1": hi, "editorIndentGuide.activeBackground1": line,
        "editorWhitespace.foreground": hi, "editorRuler.foreground": hi,
        "editorBracketMatch.background": alpha(teal, "33"), "editorBracketMatch.border": teal,
        "editorBracketHighlight.foreground1": yellow, "editorBracketHighlight.foreground2": hibl, "editorBracketHighlight.foreground3": teal,
        "editorBracketHighlight.foreground4": lav, "editorBracketHighlight.foreground5": sky, "editorBracketHighlight.foreground6": cream,
        "editorError.foreground": hibl, "editorWarning.foreground": yellow, "editorInfo.foreground": sky, "editorHint.foreground": teal,
        "editorGutter.background": ink, "editorGutter.addedBackground": teal, "editorGutter.modifiedBackground": lav, "editorGutter.deletedBackground": hib,
        "editorWidget.background": navy, "editorWidget.border": line, "editorSuggestWidget.background": navy,
        "editorSuggestWidget.selectedBackground": hi, "editorHoverWidget.background": navy, "editorHoverWidget.border": line,
        "diffEditor.insertedTextBackground": alpha(teal, "26"), "diffEditor.removedTextBackground": alpha(hib, "33"),
        "sideBar.background": navy, "sideBar.foreground": cream, "sideBar.border": ink,
        "sideBarTitle.foreground": yellow, "sideBarSectionHeader.background": ink, "sideBarSectionHeader.foreground": cream,
        "activityBar.background": ink, "activityBar.foreground": yellow, "activityBar.inactiveForeground": muted,
        "activityBar.activeBorder": yellow, "activityBar.border": navy,
        "activityBarBadge.background": hib, "activityBarBadge.foreground": cream,
        "titleBar.activeBackground": ink, "titleBar.activeForeground": cream, "titleBar.inactiveBackground": ink, "titleBar.inactiveForeground": muted, "titleBar.border": navy,
        "tab.activeBackground": ink, "tab.activeForeground": cream, "tab.inactiveBackground": navy, "tab.inactiveForeground": muted,
        "tab.activeBorderTop": yellow, "tab.border": ink, "tab.hoverBackground": hi, "editorGroupHeader.tabsBackground": navy,
        "statusBar.background": teal, "statusBar.foreground": ink, "statusBar.noFolderBackground": hib, "statusBar.noFolderForeground": cream,
        "statusBar.debuggingBackground": hib, "statusBar.debuggingForeground": cream, "statusBarItem.hoverBackground": alpha(ink, "33"),
        "statusBarItem.remoteBackground": yellow, "statusBarItem.remoteForeground": ink,
        "list.activeSelectionBackground": hi, "list.activeSelectionForeground": cream, "list.inactiveSelectionBackground": hi,
        "list.inactiveSelectionForeground": cream, "list.hoverBackground": alpha(lav, "22"), "list.highlightForeground": yellow, "list.focusBackground": hi,
        "tree.indentGuidesStroke": line,
        "input.background": ink, "input.foreground": cream, "input.border": line, "input.placeholderForeground": muted,
        "inputOption.activeBorder": yellow, "dropdown.background": navy, "dropdown.foreground": cream, "dropdown.border": line,
        "button.background": yellow, "button.foreground": ink, "button.hoverBackground": "#FFE27A",
        "button.secondaryBackground": lav, "button.secondaryForeground": ink,
        "badge.background": hib, "badge.foreground": cream,
        "scrollbarSlider.background": alpha(lav, "33"), "scrollbarSlider.hoverBackground": alpha(lav, "55"), "scrollbarSlider.activeBackground": alpha(lav, "77"),
        "progressBar.background": yellow, "textLink.foreground": teal, "textLink.activeForeground": sky,
        "panel.background": ink, "panel.border": navy, "panelTitle.activeForeground": yellow, "panelTitle.inactiveForeground": muted, "panelTitle.activeBorder": yellow,
        "peekViewEditor.background": navy, "peekViewResult.background": ink, "peekViewTitle.background": navy,
        "menu.background": navy, "menu.foreground": cream, "menu.selectionBackground": hi, "menu.selectionForeground": cream,
        "notifications.background": navy, "notifications.foreground": cream,
        "breadcrumb.foreground": muted, "breadcrumb.focusForeground": yellow, "breadcrumb.activeSelectionForeground": yellow,
        "gitDecoration.modifiedResourceForeground": lav, "gitDecoration.untrackedResourceForeground": teal, "gitDecoration.deletedResourceForeground": hibl,
        "gitDecoration.ignoredResourceForeground": muted, "gitDecoration.conflictingResourceForeground": yellow,
        "terminal.background": ink, "terminal.foreground": cream, "terminalCursor.foreground": yellow, "terminal.selectionBackground": alpha(lav, "55"),
        "terminal.ansiBlack": "#2A2F6E", "terminal.ansiRed": hibl, "terminal.ansiGreen": A["mint"], "terminal.ansiYellow": yellow,
        "terminal.ansiBlue": A["blue_dk"], "terminal.ansiMagenta": lav, "terminal.ansiCyan": teal, "terminal.ansiWhite": cream,
        "terminal.ansiBrightBlack": muted, "terminal.ansiBrightRed": "#FF9EBC", "terminal.ansiBrightGreen": "#B4F2BC", "terminal.ansiBrightYellow": "#FFE27A",
        "terminal.ansiBrightBlue": "#B3CCFF", "terminal.ansiBrightMagenta": "#D3C4FF", "terminal.ansiBrightCyan": sky, "terminal.ansiBrightWhite": "#FFFFFF",
    }
    tokens = [
        (["comment", "punctuation.definition.comment"], muted, "italic"),
        (["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new", "keyword.operator.expression"], hibl, ""),
        (["keyword.operator", "punctuation.separator", "punctuation.terminator", "punctuation.accessor"], cream, ""),
        (["string", "string.quoted", "markup.inline.raw"], teal, ""),
        (["constant.character.escape", "string.regexp"], sky, ""),
        (["constant.numeric", "constant.language", "constant.other", "support.constant"], yellow, ""),
        (["entity.name.function", "support.function", "meta.function-call", "entity.name.method"], lav, ""),
        (["entity.name.type", "entity.name.class", "support.class", "support.type", "entity.other.inherited-class"], sky, ""),
        (["variable", "variable.other", "meta.definition.variable"], cream, ""),
        (["variable.parameter", "meta.parameters"], cream, "italic"),
        (["variable.language", "variable.other.constant"], yellow, ""),
        (["entity.name.tag", "meta.tag"], hibl, ""),
        (["entity.other.attribute-name"], lav, "italic"),
        (["support.type.property-name", "meta.object-literal.key", "entity.name.tag.yaml"], lav, ""),
        (["punctuation", "meta.brace"], muted, ""),
        (["markup.heading", "entity.name.section"], yellow, "bold"),
        (["markup.bold"], cream, "bold"), (["markup.italic"], cream, "italic"),
        (["markup.underline.link", "string.other.link"], teal, "underline"),
        (["markup.quote"], muted, "italic"), (["markup.inserted"], A["mint"], ""), (["markup.deleted"], hibl, ""), (["markup.changed"], lav, ""),
        (["invalid", "invalid.illegal"], hibl, "underline"),
    ]
    return "Hula Arcade Night", "vs-dark", colors, tokens

def light_theme():
    cream, side, hi, ink = A["cream"], A["day_side"], A["day_hi"], A["ink"]
    hib, hibd, muted, line = A["hibiscus"], A["day_hib"], A["day_muted"], A["day_line"]
    teal, vio, gold, blue, green = A["day_teal"], A["day_violet"], A["day_gold"], A["day_blue"], A["day_green"]
    lav, yellow, tealb = A["lavender"], A["yellow"], A["teal"]
    colors = {
        "foreground": ink, "focusBorder": hib, "descriptionForeground": muted, "errorForeground": hibd,
        "icon.foreground": ink, "selection.background": alpha(lav, "88"), "widget.shadow": "#14163A22",
        "editor.background": cream, "editor.foreground": ink,
        "editor.lineHighlightBackground": side, "editor.selectionBackground": alpha(lav, "77"),
        "editor.inactiveSelectionBackground": alpha(lav, "44"), "editor.selectionHighlightBackground": alpha(tealb, "33"),
        "editor.wordHighlightBackground": alpha(lav, "44"), "editor.findMatchBackground": alpha(yellow, "AA"),
        "editor.findMatchHighlightBackground": alpha(yellow, "66"), "editor.rangeHighlightBackground": alpha(lav, "26"),
        "editorCursor.foreground": hib, "editorLineNumber.foreground": muted, "editorLineNumber.activeForeground": hibd,
        "editorIndentGuide.background1": hi, "editorIndentGuide.activeBackground1": line, "editorWhitespace.foreground": line, "editorRuler.foreground": hi,
        "editorBracketMatch.background": alpha(tealb, "33"), "editorBracketMatch.border": teal,
        "editorBracketHighlight.foreground1": hibd, "editorBracketHighlight.foreground2": gold, "editorBracketHighlight.foreground3": teal,
        "editorBracketHighlight.foreground4": vio, "editorBracketHighlight.foreground5": blue, "editorBracketHighlight.foreground6": ink,
        "editorError.foreground": hibd, "editorWarning.foreground": gold, "editorInfo.foreground": blue, "editorHint.foreground": teal,
        "editorGutter.background": cream, "editorGutter.addedBackground": tealb, "editorGutter.modifiedBackground": lav, "editorGutter.deletedBackground": hib,
        "editorWidget.background": side, "editorWidget.border": line, "editorSuggestWidget.background": side,
        "editorSuggestWidget.selectedBackground": hi, "editorHoverWidget.background": side, "editorHoverWidget.border": line,
        "diffEditor.insertedTextBackground": alpha(tealb, "2E"), "diffEditor.removedTextBackground": alpha(hib, "26"),
        "sideBar.background": side, "sideBar.foreground": ink, "sideBar.border": line,
        "sideBarTitle.foreground": hibd, "sideBarSectionHeader.background": hi, "sideBarSectionHeader.foreground": ink,
        "activityBar.background": A["navy"], "activityBar.foreground": yellow, "activityBar.inactiveForeground": "#C9C8EA",
        "activityBar.activeBorder": yellow, "activityBarBadge.background": hib, "activityBarBadge.foreground": cream,
        "titleBar.activeBackground": side, "titleBar.activeForeground": ink, "titleBar.inactiveBackground": side, "titleBar.inactiveForeground": muted, "titleBar.border": line,
        "tab.activeBackground": cream, "tab.activeForeground": ink, "tab.inactiveBackground": side, "tab.inactiveForeground": muted,
        "tab.activeBorderTop": hib, "tab.border": line, "tab.hoverBackground": hi, "editorGroupHeader.tabsBackground": side,
        "statusBar.background": hib, "statusBar.foreground": cream, "statusBar.noFolderBackground": vio, "statusBar.noFolderForeground": cream,
        "statusBar.debuggingBackground": teal, "statusBar.debuggingForeground": cream, "statusBarItem.hoverBackground": alpha(ink, "33"),
        "statusBarItem.remoteBackground": A["navy"], "statusBarItem.remoteForeground": cream,
        "list.activeSelectionBackground": hi, "list.activeSelectionForeground": ink, "list.inactiveSelectionBackground": hi, "list.inactiveSelectionForeground": ink,
        "list.hoverBackground": alpha(lav, "33"), "list.highlightForeground": hibd, "list.focusBackground": hi, "tree.indentGuidesStroke": line,
        "input.background": "#FFFFFF", "input.foreground": ink, "input.border": line, "input.placeholderForeground": muted,
        "inputOption.activeBorder": hib, "dropdown.background": "#FFFFFF", "dropdown.foreground": ink, "dropdown.border": line,
        "button.background": hib, "button.foreground": cream, "button.hoverBackground": hibd,
        "button.secondaryBackground": lav, "button.secondaryForeground": ink,
        "badge.background": hib, "badge.foreground": cream,
        "scrollbarSlider.background": alpha(vio, "33"), "scrollbarSlider.hoverBackground": alpha(vio, "55"), "scrollbarSlider.activeBackground": alpha(vio, "77"),
        "progressBar.background": hib, "textLink.foreground": teal, "textLink.activeForeground": hibd,
        "panel.background": cream, "panel.border": line, "panelTitle.activeForeground": hibd, "panelTitle.inactiveForeground": muted, "panelTitle.activeBorder": hib,
        "peekViewEditor.background": side, "peekViewResult.background": cream, "peekViewTitle.background": side,
        "menu.background": cream, "menu.foreground": ink, "menu.selectionBackground": hi, "menu.selectionForeground": ink,
        "notifications.background": side, "notifications.foreground": ink,
        "breadcrumb.foreground": muted, "breadcrumb.focusForeground": hibd, "breadcrumb.activeSelectionForeground": hibd,
        "gitDecoration.modifiedResourceForeground": vio, "gitDecoration.untrackedResourceForeground": teal, "gitDecoration.deletedResourceForeground": hibd,
        "gitDecoration.ignoredResourceForeground": muted, "gitDecoration.conflictingResourceForeground": gold,
        "terminal.background": cream, "terminal.foreground": ink, "terminalCursor.foreground": hib, "terminal.selectionBackground": alpha(lav, "77"),
        "terminal.ansiBlack": ink, "terminal.ansiRed": hibd, "terminal.ansiGreen": green, "terminal.ansiYellow": gold,
        "terminal.ansiBlue": blue, "terminal.ansiMagenta": vio, "terminal.ansiCyan": teal, "terminal.ansiWhite": muted,
        "terminal.ansiBrightBlack": muted, "terminal.ansiBrightRed": hib, "terminal.ansiBrightGreen": "#237A44", "terminal.ansiBrightYellow": "#7D4A00",
        "terminal.ansiBrightBlue": "#0B5F8C", "terminal.ansiBrightMagenta": vio, "terminal.ansiBrightCyan": teal, "terminal.ansiBrightWhite": ink,
    }
    tokens = [
        (["comment", "punctuation.definition.comment"], muted, "italic"),
        (["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new", "keyword.operator.expression"], hibd, ""),
        (["keyword.operator", "punctuation.separator", "punctuation.terminator", "punctuation.accessor"], ink, ""),
        (["string", "string.quoted", "markup.inline.raw"], teal, ""),
        (["constant.character.escape", "string.regexp"], blue, ""),
        (["constant.numeric", "constant.language", "constant.other", "support.constant"], gold, ""),
        (["entity.name.function", "support.function", "meta.function-call", "entity.name.method"], vio, ""),
        (["entity.name.type", "entity.name.class", "support.class", "support.type", "entity.other.inherited-class"], blue, ""),
        (["variable", "variable.other", "meta.definition.variable"], ink, ""),
        (["variable.parameter", "meta.parameters"], ink, "italic"),
        (["variable.language", "variable.other.constant"], gold, ""),
        (["entity.name.tag", "meta.tag"], hibd, ""),
        (["entity.other.attribute-name"], vio, "italic"),
        (["support.type.property-name", "meta.object-literal.key", "entity.name.tag.yaml"], vio, ""),
        (["punctuation", "meta.brace"], muted, ""),
        (["markup.heading", "entity.name.section"], hibd, "bold"),
        (["markup.bold"], ink, "bold"), (["markup.italic"], ink, "italic"),
        (["markup.underline.link", "string.other.link"], teal, "underline"),
        (["markup.quote"], muted, "italic"), (["markup.inserted"], green, ""), (["markup.deleted"], hibd, ""), (["markup.changed"], vio, ""),
        (["invalid", "invalid.illegal"], hibd, "underline"),
    ]
    return "Aloha Day", "vs", colors, tokens

def to_json(theme):
    name, ui, colors, tokens = theme
    return {
        "$schema": "vscode://schemas/color-theme", "name": name, "type": "dark" if ui == "vs-dark" else "light",
        "semanticHighlighting": True, "colors": colors,
        "tokenColors": [{"scope": sc, "settings": ({"foreground": fg, **({"fontStyle": fs} if fs else {})})} for sc, fg, fs in tokens],
    }

# --------------------------------------------------------------- Windows Terminal
def wt_schemes():
    dk = dict(name="Hula Arcade Night", background=A["ink"], foreground=A["cream"], cursorColor=A["yellow"], selectionBackground="#3A4090",
              black="#2A2F6E", red=A["hib_light"], green=A["mint"], yellow=A["yellow"], blue=A["blue_dk"], purple=A["lavender"], cyan=A["teal"], white=A["cream"],
              brightBlack=A["night_muted"], brightRed="#FF9EBC", brightGreen="#B4F2BC", brightYellow="#FFE27A", brightBlue="#B3CCFF",
              brightPurple="#D3C4FF", brightCyan=A["sky"], brightWhite="#FFFFFF")
    lt = dict(name="Hula Arcade Aloha Day", background=A["cream"], foreground=A["ink"], cursorColor=A["hibiscus"], selectionBackground="#D9CBFF",
              black=A["ink"], red=A["day_hib"], green=A["day_green"], yellow=A["day_gold"], blue=A["day_blue"], purple=A["day_violet"], cyan=A["day_teal"], white=A["day_muted"],
              brightBlack=A["day_muted"], brightRed=A["hibiscus"], brightGreen="#237A44", brightYellow="#7D4A00", brightBlue="#0B5F8C",
              brightPurple=A["day_violet"], brightCyan=A["day_teal"], brightWhite=A["ink"])
    for s in (dk, lt):   # contrast gate for every colour used as text
        for k, v in s.items():
            if k in ("name", "background", "foreground", "cursorColor", "selectionBackground", "black") or (s is dk and k == "black"): continue
            ok(v, s["background"])
        ok(s["foreground"], s["background"])
    return {"schemes": [dk, lt]}

# --------------------------------------------------------------- Starship
def starship_toml():
    n, d = A, A
    def pal(name, c): 
        return f"[palettes.{name}]\n" + "\n".join(f'{k} = "{v}"' for k, v in c.items()) + "\n"
    night = dict(pellet=n["yellow"], lagoon=n["teal"], hibiscus=n["hib_light"], lei=n["lavender"], sand=n["cream"], ink=n["ink"], muted=n["night_muted"], sky=n["sky"], mint=n["mint"])
    day = dict(pellet=d["day_gold"], lagoon=d["day_teal"], hibiscus=d["day_hib"], lei=d["day_violet"], sand=d["ink"], ink=d["cream"], muted=d["day_muted"], sky=d["day_blue"], mint=d["day_green"])
    for pn, c in (("night", night), ("day", day)):
        for k in ("pellet", "lagoon", "hibiscus", "lei", "sand", "muted", "sky", "mint"):
            ok(c[k], night["ink"] if pn == "night" else d["cream"])
    return f'''# Hula Arcade for Starship  (c) 2026 AudreyBuildsAI, see LICENSE
# Copy to ~/.config/starship.toml, or point STARSHIP_CONFIG at this file.
# Dark terminal: keep palette = "hula_arcade_night".  Light terminal: change it to "hula_arcade_day".
# Works with any font. Nerd Font glyphs are NOT required.
"$schema" = "https://starship.rs/config-schema.json"

palette = "hula_arcade_night"
add_newline = true

format = """
[▌](bold lei)$username$hostname$directory$git_branch$git_status$nodejs$python$rust$golang$docker_context$cmd_duration
$character"""

[character]
success_symbol = "[●](bold pellet) [❯](bold lagoon)"
error_symbol = "[✖](bold hibiscus) [❯](bold hibiscus)"
vimcmd_symbol = "[❮](bold lei)"

[username]
show_always = false
style_user = "bold sand"
style_root = "bold hibiscus"
format = "[$user]($style) "

[hostname]
ssh_only = true
format = "[@$hostname]($style) "
style = "bold lei"

[directory]
style = "bold lagoon"
truncation_length = 3
truncation_symbol = "…/"
read_only = " (ro)"
format = "[$path]($style)[$read_only](hibiscus) "

[git_branch]
symbol = "⎇ "
style = "bold hibiscus"
format = "[$symbol$branch]($style) "

[git_status]
style = "bold pellet"
format = '([\\[$all_status$ahead_behind\\]]($style) )'

[cmd_duration]
min_time = 2000
style = "muted"
format = "[took $duration]($style) "

[nodejs]
symbol = "node "
style = "bold mint"
format = "[$symbol($version)]($style) "

[python]
symbol = "py "
style = "bold pellet"
format = '[$symbol$pyenv_prefix($version)( \\($virtualenv\\))]($style) '

[rust]
symbol = "rs "
style = "bold hibiscus"
format = "[$symbol($version)]($style) "

[golang]
symbol = "go "
style = "bold sky"
format = "[$symbol($version)]($style) "

[docker_context]
symbol = "docker "
style = "bold sky"
format = "[$symbol$context]($style) "

{pal("hula_arcade_night", night)}
{pal("hula_arcade_day", day)}'''

# --------------------------------------------------------------- oh-my-posh
def omp(mode):
    if mode == "night":
        bg, fg = A["ink"], A["cream"]
        p = dict(path_bg=A["teal"], path_fg=A["ink"], git_bg=A["hibiscus"], git_fg=A["cream"], lang_bg=A["lavender"], lang_fg=A["ink"],
                 dur=A["night_muted"], ok=A["yellow"], bad=A["hib_light"], user_bg=A["yellow"], user_fg=A["ink"])
    else:
        bg, fg = A["cream"], A["ink"]
        p = dict(path_bg=A["day_teal"], path_fg=A["cream"], git_bg=A["hibiscus"], git_fg=A["cream"], lang_bg=A["day_violet"], lang_fg=A["cream"],
                 dur=A["day_muted"], ok=A["day_gold"], bad=A["day_hib"], user_bg=A["navy"], user_fg=A["cream"])
    for a, b in (("path_fg", "path_bg"), ("git_fg", "git_bg"), ("lang_fg", "lang_bg"), ("user_fg", "user_bg")): ok(p[a], p[b])
    ok(p["dur"], bg); ok(p["ok"], bg); ok(p["bad"], bg)
    ps = "\ue0b0"
    return {
        "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
        "version": 3, "final_space": True,
        "console_title_template": "{{ .Shell }} in {{ .Folder }}",
        "blocks": [
            {"type": "prompt", "alignment": "left", "segments": [
                {"type": "session", "style": "powerline", "powerline_symbol": ps, "foreground": p["user_fg"], "background": p["user_bg"],
                 "template": " {{ if .SSHSession }}{{ .UserName }}@{{ .HostName }}{{ else }}{{ .UserName }}{{ end }} "},
                {"type": "path", "style": "powerline", "powerline_symbol": ps, "foreground": p["path_fg"], "background": p["path_bg"],
                 "properties": {"style": "folder", "max_depth": 3}, "template": " {{ .Path }} "},
                {"type": "git", "style": "powerline", "powerline_symbol": ps, "foreground": p["git_fg"], "background": p["git_bg"],
                 "properties": {"fetch_status": True, "branch_icon": "\ue0a0 "},
                 "template": " {{ .HEAD }}{{ if .Working.Changed }} \u25cf{{ .Working.String }}{{ end }}{{ if .Staging.Changed }} +{{ .Staging.String }}{{ end }} "},
                {"type": "node", "style": "powerline", "powerline_symbol": ps, "foreground": p["lang_fg"], "background": p["lang_bg"],
                 "template": " node {{ .Full }} ", "properties": {"fetch_version": True}},
                {"type": "python", "style": "powerline", "powerline_symbol": ps, "foreground": p["lang_fg"], "background": p["lang_bg"],
                 "template": " py {{ .Full }} ", "properties": {"fetch_version": True}},
            ]},
            {"type": "rprompt", "alignment": "right", "segments": [
                {"type": "executiontime", "style": "plain", "foreground": p["dur"], "template": " {{ .FormattedMs }} ", "properties": {"threshold": 2000, "style": "round"}},
            ]},
            {"type": "prompt", "alignment": "left", "newline": True, "segments": [
                {"type": "status", "style": "plain", "foreground": p["ok"], "foreground_templates": ["{{ if gt .Code 0 }}%s{{ end }}" % p["bad"]],
                 "template": "{{ if gt .Code 0 }}\u2716{{ else }}\u25cf{{ end }} \u276f", "properties": {"always_enabled": True}},
            ]},
        ],
    }

def w(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(data if isinstance(data, str) else json.dumps(data, indent=2, ensure_ascii=False) + "\n")

if __name__ == "__main__":
    for t, fn in ((dark_theme(), "hula-arcade-night-color-theme.json"), (light_theme(), "aloha-day-color-theme.json")):
        w(os.path.join(OUT, "themes", fn), to_json(t))
    w(os.path.join(OUT, "windows-terminal", "hula-arcade.schemes.json"), wt_schemes())
    w(os.path.join(OUT, "starship", "hula-arcade.starship.toml"), starship_toml())
    w(os.path.join(OUT, "oh-my-posh", "hula-arcade-night.omp.json"), omp("night"))
    w(os.path.join(OUT, "oh-my-posh", "hula-arcade-day.omp.json"), omp("day"))
    pal = {"brand": B, "derived": {k: v for k, v in A.items() if k not in B}}
    w(os.path.join(OUT, "palette", "palette.json"), pal)
    print("built OK; %d contrast pairs asserted" % len(PAIRS))
