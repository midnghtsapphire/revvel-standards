#!/usr/bin/env python3
"""Writes listing.md for each product, the booklet zip, moves final zips to product roots, and writes LISTINGS.md with real sizes."""
import os, re, shutil, subprocess, zipfile
P = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
bk = os.path.join(P, "make-github-gorgeous-booklet"); rk = os.path.join(P, "hula-arcade-readme-kit"); pk = os.path.join(P, "hula-arcade-dev-palette-kit")
REFUND = "14-day refund, no questions asked: if this isn't right for you, message me within 14 days of purchase and I'll refund you."
SELLER = "AudreyBuildsAI (legal entity: Freedom Angel Corp)"
DISC = "Independent product by AudreyBuildsAI. Not affiliated with, endorsed by, or sponsored by GitHub or Microsoft. All art is original."
def kb(p): n = os.path.getsize(p); return f"{n/1024/1024:.2f} MB" if n > 1024*1024 else f"{n/1024:.0f} KB"
# ---------------- booklet
os.chdir(bk)
z = "make-github-gorgeous-booklet.zip"
if os.path.exists(z): os.remove(z)
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write("make-github-gorgeous-booklet.pdf", "make-github-gorgeous-booklet/make-github-gorgeous-booklet.pdf")
    zf.writestr("make-github-gorgeous-booklet/LICENSE.txt", open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "BOOKLET-LICENSE.txt")).read())
    zf.writestr("make-github-gorgeous-booklet/README.txt", "Make GitHub Gorgeous (24-page PDF) by AudreyBuildsAI.\n\nOpen make-github-gorgeous-booklet.pdf. The 'snippets' folder has every code snippet from Appendix A as a plain file you can copy.\nLicense: see LICENSE.txt. Mahalo!\n")
    for f in sorted(os.listdir("src/snippets")): zf.write(os.path.join("src/snippets", f), "make-github-gorgeous-booklet/snippets/" + f)
pages = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", "make-github-gorgeous-booklet.pdf"], capture_output=True, text=True).stdout).group(1))
open("listing/listing.md", "w", encoding="utf-8").write(f"""# Listing: Make GitHub Gorgeous

- **Seller:** {SELLER}
- **Product title:** Make GitHub Gorgeous: a {pages}-page pixel guide to themes, profile READMEs and static SVG magic
- **Price:** $9
- **Cover image:** `listing/cover.png` (1280x720)
- **Thumbnail:** `listing/thumbnail.png` (600x600)
- **Deliverable:** `make-github-gorgeous-booklet.zip` ({kb('make-github-gorgeous-booklet.zip')}; contains the {pages}-page PDF, a license, and the snippets as plain files)
- **Refund policy line:** {REFUND}

## Short description (for the product summary)

A friendly {pages}-page PDF that shows you how to make GitHub beautiful using only free tools: built-in themes, browser extensions, profile README tricks, static SVGs from GitHub Actions, and copy-paste snippets.

## Long description

GitHub is black, white, and a little generic. This booklet shows you, step by step, how to make it yours without paying for anything and without breaking things.

**What is inside ({pages} pages, US Letter PDF)**

- **Chapter 1: GitHub's own settings.** Themes, dark dimmed, colorblind variants, the Increase contrast switch, and accessibility options.
- **Chapter 2: Extensions and userstyles.** Stylus, a pastel userstyle, Refined GitHub, Material Icons, with licenses and safety notes, plus a 5-minute install recipe.
- **Chapter 3: Your profile README.** What to put in it, and why popular hosted widgets break (two were down on the day this guide was researched).
- **Chapter 4: Static SVGs with GitHub Actions.** A tested workflow for a contribution snake that is saved in your own repository, pinned to an exact version, and free on public repos.
- **Chapter 5: Repository README design.** Light and dark banners, alert callouts, Mermaid diagrams, social preview, pinned repos.
- **Chapter 6: GitHub Pages themes.** Built-in themes, limits, and the rule about selling from Pages.
- **Chapter 7: Beyond GitHub.** The same idea for VS Code, Cursor, Windows Terminal, Starship, Notion, Linear, Gmail, Chrome and Windows.
- **Chapter 8: A palette that passes contrast.** The Hula Arcade palette with measured WCAG ratios, and how to check your own.
- **Appendices:** ten copy-paste snippets, a tools-and-licenses table, and a glow-up checklist.

**Good to know**

- Everything works on GitHub Free. No affiliate links, no trackers.
- Drawn illustrations instead of screenshots, so nothing goes out of date visually.
- All facts, links and licenses were checked on 2026-11-12.
- Includes a license page. You may use the code snippets in your own projects.

{DISC}

## Tags

github, github profile, readme, profile readme, developer tools, dark mode, github actions, accessibility, design guide, pixel art, ebook, themes

## Files and sizes

| File | Size |
|---|---|
| make-github-gorgeous-booklet.zip | {kb('make-github-gorgeous-booklet.zip')} |
| make-github-gorgeous-booklet.pdf ({pages} pages) | {kb('make-github-gorgeous-booklet.pdf')} |
""")
# ---------------- readme kit
os.chdir(rk)
shutil.move("dist/hula-arcade-readme-kit-pro.zip", "hula-arcade-readme-kit.zip") if os.path.exists("dist/hula-arcade-readme-kit-pro.zip") else None
shutil.move("dist/hula-arcade-readme-kit-lite.zip", "hula-arcade-readme-kit-lite.zip") if os.path.exists("dist/hula-arcade-readme-kit-lite.zip") else None
if os.path.isdir("dist") and not os.listdir("dist"): os.rmdir("dist")
open("listing/listing.md", "w", encoding="utf-8").write(f"""# Listing: Hula Arcade GitHub Profile README Kit

- **Seller:** {SELLER}
- **Product title:** Hula Arcade GitHub Profile README Kit: 3 layouts, pixel banners and free-GitHub Actions
- **Price:** $15 (a free Lite version is a separate $0 listing, see below)
- **Cover image:** `listing/cover.png` (1280x720)
- **Thumbnail:** `listing/thumbnail.png` (600x600)
- **Deliverable:** `hula-arcade-readme-kit.zip` ({kb('hula-arcade-readme-kit.zip')})
- **Refund policy line:** {REFUND}

## Short description

Three ready-to-paste GitHub profile README layouts with original pixel-art banners (light and dark), badges, dividers, and GitHub Actions that draw your snake and stats as static SVGs on free GitHub features.

## Long description

Give your GitHub profile a retro-arcade, soft-Hawaiian glow-up in an afternoon.

**What you get**

- **3 profile layouts:** Arcade Hero, Aloha Minimal, and Builder Dashboard. Copy one over your README and fill in the EDIT spots.
- **Light and dark `<picture>` banners** for every layout, drawn from scratch as crisp pixel SVGs, with alt text built in.
- **Pellet and wave dividers, 14 toolbox badges, 6 status badges, and 6 pixel sprites** (a hula dancer, a cheerful yellow friend, a hibiscus, a palm, pellets, and a glitch blob).
- **GitHub Actions that draw static SVGs:** a contribution snake (using the published Platane/snk Action, pinned to an exact version), a Hula Arcade stats card made by a small Python script that uses only the built-in token, and an optional lowlighter/metrics workflow.
- **Never-broken pictures:** everything is saved as static files in your own repository, so no hosted widget can go down on you.
- **Make-your-own tools:** small scripts to generate your own banner text and badges (Python 3, nothing to install).
- **Setup guide (PDF and Markdown)** with troubleshooting, plus a LICENSE.

**Good to know**

- Free on GitHub Free for a public profile repository. No hit counters, no trackers, no affiliate links.
- All text and background pairs have 4.5:1 contrast or better. Every image has alt text.
- Original art only. Not affiliated with GitHub or Microsoft.

{DISC}

## Tags

github, github profile, profile readme, readme template, pixel art, retro, github actions, developer tools, dark mode, svg, hawaii, template

## Free Lite listing ($0)

- **Title:** Hula Arcade README Kit (Lite): 1 free profile layout and pixel banner
- **Deliverable:** `hula-arcade-readme-kit-lite.zip` ({kb('hula-arcade-readme-kit-lite.zip')})
- **Short description:** One free profile README layout (Aloha Minimal) with a light and dark pixel banner, a wave divider, four badges, and a banner-text maker script. MIT licensed.
- **Long description:** A free taste of the Hula Arcade README Kit. You get the Aloha Minimal layout, its light and dark pixel banner, a wave divider in both modes, four skill badges, a setup note, and a small script that lets you change the banner text. It is MIT licensed. The Pro kit adds two more layouts, a pellet divider, 20 badges, six sprites, and the GitHub Actions for a snake and a stats card. {DISC}
- **Tags:** github profile, readme template, free, pixel art, retro, developer tools
- **Refund policy line:** Free download, nothing to refund.

## Files and sizes

| File | Size |
|---|---|
| hula-arcade-readme-kit.zip (Pro) | {kb('hula-arcade-readme-kit.zip')} |
| hula-arcade-readme-kit-lite.zip (free) | {kb('hula-arcade-readme-kit-lite.zip')} |
""")
# ---------------- palette kit
os.chdir(pk)
for src, dst in (("dist/hula-arcade-dev-palette-kit-pro.zip", "hula-arcade-dev-palette-kit.zip"), ("dist/hula-arcade-night-free.zip", "hula-arcade-night-free.zip")):
    if os.path.exists(src): shutil.move(src, dst)
if os.path.isdir("dist") and not os.listdir("dist"): os.rmdir("dist")
open("listing/listing.md", "w", encoding="utf-8").write(f"""# Listing: Hula Arcade Dev Palette Kit

- **Seller:** {SELLER}
- **Product title:** Hula Arcade Dev Palette Kit (Pro): VS Code and Cursor themes, Windows Terminal, Starship and oh-my-posh
- **Price:** $19 Pro bundle (the dark theme alone is a separate free $0 listing, see below)
- **Cover image:** `listing/cover.png` (1280x720)
- **Thumbnail:** `listing/thumbnail.png` (600x600)
- **Deliverable:** `hula-arcade-dev-palette-kit.zip` ({kb('hula-arcade-dev-palette-kit.zip')})
- **Refund policy line:** {REFUND}

## Short description

One measured retro-arcade, soft-Hawaiian palette for your editor, terminal, and prompt: dark and light VS Code/Cursor themes, a Windows Terminal scheme, a Starship preset, oh-my-posh themes, and an install guide.

## Long description

Make your whole dev setup match, and make it readable.

**What is inside the Pro bundle**

- **VS Code and Cursor themes (.vsix):** **Hula Arcade Night** (dark) and **Aloha Day** (light), with matching integrated-terminal colors. Install with "Install from VSIX", or from the command line.
- **Windows Terminal:** a color scheme file with both a night and a day scheme.
- **Starship:** a prompt preset with a night palette and a day palette. No Nerd Font needed.
- **oh-my-posh:** two themes, one for dark and one for light terminals.
- **Install guide (PDF and Markdown)** with day/night auto-switching, troubleshooting and undo steps, plus the palette as JSON and a contrast table.
- **A LICENSE** you can read in one minute.

**Why it is easy on the eyes:** every text color in every file clears WCAG AA contrast (4.5:1 or better), checked by script. Brand colors that are too faint for small text have darker or lighter derived shades.

**Good to know**

- The dark theme on its own is free, see the free listing. The Pro bundle adds the light theme and all the terminal and prompt files.
- No fonts are included. Nerd Font is only needed for oh-my-posh.
- No tracking, no affiliate links. Original palette and art.

{DISC}

## Tags

vs code theme, cursor theme, color theme, windows terminal, starship, oh-my-posh, dark theme, light theme, developer tools, accessibility, retro, pixel art

## Free listing: Hula Arcade Night (dark theme, $0)

- **Title:** Hula Arcade Night: free retro-arcade dark theme for VS Code and Cursor
- **Deliverable:** `hula-arcade-night-free.zip` ({kb('hula-arcade-night-free.zip')}; contains `hula-arcade-night-1.0.0.vsix`, MIT license)
- **Short description:** A free dark theme with a deep ink background, pellet-yellow cursor, lagoon-teal strings and lei-lavender functions. Every color passes WCAG AA contrast. MIT licensed.
- **Long description:** Hula Arcade Night is the free dark theme from the Hula Arcade Dev Palette Kit. It includes matching integrated-terminal colors and passes WCAG AA contrast (4.5:1 or better) for every text color. Install with "Install from VSIX". It is MIT licensed. The Pro bundle adds the light theme Aloha Day, a Windows Terminal scheme, a Starship preset, oh-my-posh themes, and an install guide. {DISC}
- **Tags:** vs code theme, cursor theme, dark theme, free, retro, accessibility
- **Refund policy line:** Free download, nothing to refund.

## Files and sizes

| File | Size |
|---|---|
| hula-arcade-dev-palette-kit.zip (Pro) | {kb('hula-arcade-dev-palette-kit.zip')} |
| hula-arcade-night-free.zip (free) | {kb('hula-arcade-night-free.zip')} |
""")
print("listings written")
# ---------------- LISTINGS.md
os.chdir(P)
from PIL import Image
def pdfpages(p): return int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", p], capture_output=True, text=True).stdout).group(1))
rows = [
 ("Make GitHub Gorgeous (booklet)", "$9", "make-github-gorgeous-booklet", ["make-github-gorgeous-booklet.zip", "make-github-gorgeous-booklet.pdf"]),
 ("Hula Arcade GitHub Profile README Kit", "$15 (Lite free)", "hula-arcade-readme-kit", ["hula-arcade-readme-kit.zip", "hula-arcade-readme-kit-lite.zip"]),
 ("Hula Arcade Dev Palette Kit", "$19 Pro (dark theme free)", "hula-arcade-dev-palette-kit", ["hula-arcade-dev-palette-kit.zip", "hula-arcade-night-free.zip"]),
]
out = ["# AudreyBuildsAI product listings (Gumroad-ready)", "", "Seller brand: **AudreyBuildsAI**. Legal entity: **Freedom Angel Corp**. Style: Hula Arcade (retro pixel arcade plus soft Hawaiian).",
       "Nothing here is published or listed. These are ready-to-paste assets and copy. Each folder's `listing/listing.md` has the full title, short and long description, tags, price, and refund line.", "",
       f"Refund-policy line used on every paid listing: _{REFUND}_", "", "| Product | Price | Final deliverables (size) | Listing assets |", "|---|---|---|---|"]
for name, price, slug, files in rows:
    d = "products/" + slug
    fl = "<br>".join(f"`{d}/{f}` ({kb(os.path.join(slug, f))})" for f in files)
    out.append(f"| {name} | {price} | {fl} | `{d}/listing/cover.png` (1280x720), `{d}/listing/thumbnail.png` (600x600), `{d}/listing/listing.md` |")
out += ["", "## Details", "",
        f"- **Booklet:** {pdfpages('make-github-gorgeous-booklet/make-github-gorgeous-booklet.pdf')} pages, US Letter, fonts embedded. Zip adds a license and the snippets as plain files.",
        "- **README Kit (Pro):** 3 layouts, 6 banners (light and dark), 4 dividers, 20 badges, 6 sprites, 3 workflows, 4 scripts, setup guide PDF and Markdown, previews, LICENSE. **Lite (free):** 1 layout, 1 light and dark banner pair, wave divider pair, 4 badges, banner script, MIT license.",
        "- **Dev Palette Kit (Pro):** two themes in one .vsix (Hula Arcade Night, Aloha Day), Windows Terminal schemes (night and day), Starship preset (night and day palettes), 2 oh-my-posh themes, install guide PDF and Markdown, palette JSON, contrast table, previews, LICENSE. **Free:** the dark theme alone as its own .vsix, MIT license.",
        "- **Public naming:** product copy uses AudreyBuildsAI, \"Lil Aud-Bod\" for the hula mascot, and \"Auky\". The internal nickname is not used in listings.",
        "- **Sources:** `products/beauty-kit/<slug>/` in the revvel-standards repository. See `VERIFICATION.md` for the checks that were run.", ""]
open("LISTINGS.md", "w", encoding="utf-8").write("\n".join(out))
print("LISTINGS.md written")
