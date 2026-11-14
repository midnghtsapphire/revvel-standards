#!/usr/bin/env python3
"""Builds 'Make GitHub Gorgeous' as HTML -> PDF with headless Chrome. Two passes so the contents page has real page numbers."""
import html, os, re, subprocess, sys, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); SH = os.path.join(HERE, "..", "..", "_shared")
sys.path.insert(0, SH)
import hula_art as h
from render import html_to_pdf
import base64
def b64(p): return base64.b64encode(open(p, "rb").read()).decode()
AVATAR = "data:image/jpeg;base64," + b64(os.path.join(SH, "mascots", "lil-aud-bod-avatar.jpg"))
AUKY = "data:image/jpeg;base64," + b64(os.path.join(SH, "mascots", "auky-hero.jpg"))
def code(name, lang=None):
    return "<pre>" + html.escape(open(os.path.join(HERE, "snippets", name), encoding="utf-8").read().rstrip()) + "</pre>"
def inline_svg(rows, leg, s): return h.svg(len(rows[0]) * s, len(rows) * s, h.grid_svg_body(rows, leg, s=s))
def callout(kind, title, text): return f'<div class="callout {kind}"><p><b class="t">{title}</b> {text}</p></div>'
def chapter(n, title, lead, body, anchor):
    return f'<section class="chap" id="{anchor}"><div class="chead"><div class="n">{n:02d}</div><h1>{title}</h1></div><p class="lead">{lead}</p>{body}</section>'

CHAPTERS = []   # (num, title, anchor)
def add(n, title, lead, body):
    anchor = f"c{n}"; CHAPTERS.append((n, title, anchor)); return chapter(n, title, lead, body, anchor)

# ------------------------------------------------------------------ chapter bodies
def ch1():
    return add(1, "Start with GitHub's own settings", "The fastest glow-up is already inside GitHub. It is free, instant, and it follows you to every browser you sign in on.", f'''
<h2>Pick a theme that fits your eyes</h2>
<p>Open your profile picture menu, choose <b>Settings</b>, then <b>Appearance</b>. You can choose one theme, or switch on <b>Sync with system</b> and pick a day theme and a night theme. Themes can also be changed from the command palette.</p>
<div class="fig"><div class="mock"><div class="bar"><i></i><i></i><i></i>&nbsp; Settings &rsaquo; Appearance (illustration)</div><div class="body">
<div class="cards">
<div class="tcard"><div class="sw" style="background:#fff;color:#1f2328">Aa</div><div class="lb">Light</div></div>
<div class="tcard sel"><div class="sw" style="background:#0d1117;color:#e6edf3">Aa</div><div class="lb"><b>Dark</b> (selected)</div></div>
<div class="tcard"><div class="sw" style="background:#22272e;color:#adbac7">Aa</div><div class="lb">Dark dimmed</div></div>
<div class="tcard"><div class="sw" style="background:#0a0c10;color:#fff">Aa</div><div class="lb">High contrast</div></div>
</div><p class="note-sm" style="margin-top:6pt">An illustration drawn for this booklet. Your Appearance page is the source of truth, because the exact list can change.</p></div></div></div>
<table><tr><th>Setting</th><th>What it does</th></tr>
<tr><td>Light default, Dark default</td><td>The baseline themes. Visitors who are signed out see these.</td></tr>
<tr><td>Dark dimmed</td><td>An intentionally softer, lower-contrast dark theme.</td></tr>
<tr><td>Light and Dark high contrast</td><td>More contrast for low vision.</td></tr>
<tr><td>Colorblind variants (Protanopia and Deuteranopia, Tritanopia)</td><td>Swap colors that are hard to tell apart for ones that are easier. Tritanopia is the blue/yellow variant.</td></tr>
<tr><td>Increase contrast switch</td><td>Added in June 2025. A separate toggle that raises contrast on any theme, and signed-out visitors can reach it from the top navigation Appearance button.</td></tr>
<tr><td>Accessibility settings</td><td>Link underlines, hovercards on or off, keyboard shortcut character keys, and autoplay of animated images (sync with system, on, or off).</td></tr></table>
{callout("warn", "Heads up:", "Theme and contrast are separate choices since the June 2025 change. If you later add a userstyle such as the Catppuccin GitHub style (Chapter 2), it asks for the <i>Light default</i> or <i>Dark default</i> theme with <i>Increase contrast</i> switched off. Pick one path: a userstyle look <b>or</b> a built-in accessibility theme.")}
<h2>Five-minute settings tour</h2>
<ol class="steps"><li>Settings, Appearance: choose <b>Sync with system</b> and pick a day theme and a night theme.</li><li>Try <b>Dark dimmed</b> at night. Many people find it easier on the eyes than full dark.</li><li>Open the <b>Accessibility</b> page and decide on link underlines and animated images.</li><li>Pin your six best repositories to your profile (Chapter 5).</li><li>Add a profile README (Chapter 3).</li></ol>
{callout("tip", "Free check:", "Nothing in this chapter needs a paid GitHub plan.")}
<p class="note-sm">Sources, checked 2026-11-12: GitHub Docs "Managing your theme settings"; GitHub Docs "Managing accessibility settings"; GitHub changelog, 5 June 2025, "Control contrast for all GitHub themes"; GitHub changelog, 19 April 2022, tritanopia colorblind theme.</p>
''')

def ch2():
    return add(2, "Extensions and userstyles", "A few small tools can make GitHub feel like a different site. All of these are free and open source, and none needs a paid GitHub plan.", f'''
<table><tr><th>Tool</th><th>What it does</th><th>License</th><th>Safety note</th></tr>
<tr><td><b>Stylus</b></td><td>Userstyle manager. Applies CSS themes to any site, including GitHub.</td><td>GPL-3.0</td><td>It needs access to the pages you style, so install styles only from sources you trust, and read the CSS if unsure.</td></tr>
<tr><td><b>Catppuccin userstyles for GitHub</b></td><td>Soothing pastel theme with four flavors (Latte, Frapp&eacute;, Macchiato, Mocha) and 15 accent colors, including Pink, Peach and Teal.</td><td>MIT</td><td>Needs GitHub's Default theme with Increase contrast off.</td></tr>
<tr><td><b>Dracula for GitHub</b></td><td>The dark Dracula userstyle.</td><td>MIT</td><td>Only the open Dracula theme is MIT. Dracula Pro is proprietary.</td></tr>
<tr><td><b>Refined GitHub</b></td><td>Cleans up the interface and adds many small features.</td><td>MIT</td><td>A browser extension with access to github.com. Chrome, Firefox and Safari.</td></tr>
<tr><td><b>Material Icons for GitHub</b></td><td>Swaps file and folder icons for the Material icon set.</td><td>MIT</td><td>Open source. Store listing says no data is collected.</td></tr>
<tr><td><b>Gitako</b></td><td>A file tree in the sidebar.</td><td>MIT</td><td>Needs a token for private repositories.</td></tr>
<tr><td><b>Isometric Contributions</b></td><td>Turns the contribution graph into a 3D isometric view.</td><td>MIT</td><td>Browser extension.</td></tr>
<tr><td><b>userstyles.world</b></td><td>A community library of userstyles.</td><td>Varies</td><td>Community content. Read each style's license and code first.</td></tr></table>
<h2>The 5-minute install recipe</h2>
<ol class="steps">
<li>Install <b>Stylus</b> from the Chrome Web Store or Firefox Add-ons.</li>
<li>Follow the Catppuccin usage guide and import the GitHub style.</li>
<li>In the Catppuccin customizer, choose light = Latte, dark = Mocha, accent = Pink or Peach.</li>
<li>In GitHub Settings, Appearance, choose <b>Light default</b> and <b>Dark default</b>, with <b>Increase contrast</b> off.</li>
<li>Add <b>Material Icons for GitHub</b> and <b>Refined GitHub</b>.</li></ol>
<div class="fig"><div class="flow"><div class="b"><b>Stylus</b>holds the CSS</div><div class="ar">&rarr;</div><div class="b"><b>Catppuccin</b>the pastel style</div><div class="ar">&rarr;</div><div class="b"><b>GitHub</b>Default theme, contrast off</div><div class="ar">&rarr;</div><div class="b"><b>You</b>a prettier site</div></div><div class="cap">How the pieces fit together.</div></div>
{callout("warn", "Be careful with Dark Reader.", "Dark Reader rewrites page colors and can fight with Stylus themes. GitHub already has real dark themes, so you do not need it there. If you use both, disable Dark Reader on sites you style with Stylus.")}
{callout("tip", "Skip the old one.", "The <code>catppuccin/github</code> repository is archived (last push 2023). Its replacement is <code>catppuccin/userstyles</code>.")}
<h2>Rules of thumb for any extension</h2>
<ul><li>Prefer open-source extensions you can read, with a recent update date.</li><li>Check which sites an extension can read. Optional permissions should stay optional.</li><li>Userstyles are CSS, and CSS can change how a page looks to you. Install only from sources you trust.</li><li>If GitHub changes its page structure, userstyles can break for a few days. That is normal.</li></ul>
<p class="note-sm">Sources, checked 2026-11-12: Chrome Web Store and Firefox Add-ons listings for Stylus; github.com/openstyles/stylus; userstyles.catppuccin.com; github.com/catppuccin/userstyles; github.com/refined-github/refined-github; github.com/material-extensions/material-icons-browser-extension; github.com/EnixCoda/Gitako; github.com/jasonlong/isometric-contributions; userstyles.world.</p>
''')

def ch3():
    return add(3, "Your profile README", "Your profile is the first page people see. A good README turns it from a list of repositories into a welcome mat.", f'''
<h2>How it works</h2>
<ol class="steps"><li>Create a <b>public</b> repository whose name is exactly your username. For <code>octo-fan</code> that is <code>octo-fan/octo-fan</code>.</li><li>Add a <code>README.md</code> to it.</li><li>GitHub shows that file at the top of your profile. It works on GitHub Free.</li></ol>
<div class="fig">{h.svg(0,0,"") if False else ""}
<div class="mock"><div class="bar"><i></i><i></i><i></i>&nbsp; your-username / your-username &mdash; README.md (illustration)</div><div class="body" style="background:#14163A;color:#FFF4E0;padding:0">
<div style="padding:8pt 10pt 4pt;font-family:'Pixelify Sans';font-size:15pt;color:#FFD23F">ALOHA, WORLD!</div>
<div style="padding:0 10pt 6pt;font-size:9pt">Hi, I'm Octo Fan. I build small tools and big smiles.</div>
<div style="padding:0 10pt 6pt"><span style="background:#FFD23F;color:#14163A;padding:1pt 5pt;font-size:8pt;font-weight:900">BUILDING IN PUBLIC</span> <span style="background:#19C3B1;color:#14163A;padding:1pt 5pt;font-size:8pt;font-weight:900">OPEN TO COLLAB</span></div>
<div class="pellets" style="background-image:radial-gradient(circle,#FFD23F 3pt,transparent 3.5pt);margin:0 10pt 8pt"></div>
</div></div><div class="cap">The anatomy of a friendly profile: banner, one-line pitch, status badges, divider, then the good stuff.</div></div>
<h2>The ingredients</h2>
<table><tr><th>Ingredient</th><th>Why it helps</th></tr>
<tr><td>A light and dark banner</td><td>Looks right in both modes. See the <code>&lt;picture&gt;</code> snippet in Appendix A.</td></tr>
<tr><td>A one-line pitch</td><td>Visitors decide in seconds. Say what you build and what you love.</td></tr>
<tr><td>Alert callouts</td><td><code>&gt; [!NOTE]</code> and friends are native Markdown. GitHub suggests one or two per article.</td></tr>
<tr><td>Skill and status badges</td><td>Quick to scan. Use words, not just colors.</td></tr>
<tr><td>A snake and a stats card</td><td>Drawn by GitHub Actions as static pictures (Chapter 4).</td></tr>
<tr><td>Alt text on every image</td><td>Screen readers cannot see the picture. Describe it in a short sentence.</td></tr></table>
<h2>Popular widgets, and the problem with them</h2>
<p>Many profile READMEs use pictures that are drawn by someone else's server each time a visitor loads the page. That is convenient until the server is busy. When this booklet was researched on <b>2026-11-12</b>, the public <code>github-readme-stats</code> endpoint answered with an HTTP 503 error and the public <code>github-readme-activity-graph</code> endpoint answered with HTTP 402. The first project's own README says the public instance is best-effort and can be unreliable. A broken-image icon at the top of your profile is the opposite of gorgeous.</p>
{callout("tip", "The fix:", "Have a GitHub Action draw the picture once a day, and save it as a static SVG file in your own repository. Chapter 4 shows how.")}
<table><tr><th>Tool</th><th>License</th><th>Notes</th></tr>
<tr><td>capsule-render (wave banners)</td><td>MIT</td><td>Hosted on vercel.app. Fine for decoration. For zero dependency, export a static SVG.</td></tr>
<tr><td>github-readme-streak-stats</td><td>MIT</td><td>Hosted endpoint answered 200 on test day. It documents a self-hosted or Action option.</td></tr>
<tr><td>skill-icons</td><td>MIT</td><td>Logos belong to their owners. Fine for "I use X", not for your own branding.</td></tr>
<tr><td>github-profile-summary-cards</td><td>MIT</td><td>Generates SVGs in your repo with an Action.</td></tr>
<tr><td>shields.io badges</td><td>Apache-2.0</td><td>Badge text is public URL data. Static badges are safest.</td></tr>
<tr><td>Profile view counters</td><td>MIT</td><td>A hit counter is third-party tracking of your visitors. This booklet recommends skipping it.</td></tr></table>
<p class="note-sm">Sources, checked 2026-11-12: GitHub Docs "Managing your profile README"; each project's GitHub repository and README; live endpoint tests on 2026-11-12.</p>
''')

def ch4():
    return add(4, "Static SVGs with GitHub Actions", "Let a robot draw your pictures once a day and save them in your own repository. They never break, they cost nothing, and nobody tracks your visitors.", f'''
<div class="fig"><div class="flow"><div class="b"><b>Schedule</b>once a day</div><div class="ar">&rarr;</div><div class="b"><b>Action</b>draws the SVG</div><div class="ar">&rarr;</div><div class="b"><b>output branch</b>in your repo</div><div class="ar">&rarr;</div><div class="b"><b>README</b>shows the picture</div></div><div class="cap">The whole idea in four boxes.</div></div>
<h2>Example: the contribution snake</h2>
<p>The <code>Platane/snk</code> project draws your contribution graph as a snake. Use it as a published Action. The repository has <b>no license file</b>, so use the Action as documented and do <b>not</b> copy its code into a product or into your own repository.</p>
<ol class="steps"><li>In your profile repository, create <code>.github/workflows/snake.yml</code> and paste the workflow from Appendix A.</li><li>Open the <b>Actions</b> tab, choose <b>Generate snake</b>, then <b>Run workflow</b>.</li><li>When the run is green, a new branch called <code>output</code> holds <code>snake.svg</code> and <code>snake-dark.svg</code>.</li><li>Add the snake snippet from Appendix A to your README, and replace <code>YOUR-USERNAME</code> twice.</li></ol>
<h2>Hardening rules for every Action</h2>
<ol><li><b>Prefer static SVG in your repo</b> over a hosted URL. The README never breaks when a free host hits its quota.</li><li><b>Pin third-party Actions to a full commit SHA</b>, not a moving tag. The SHA in the snippet is the v3.5.0 release of snk.</li><li><b>Give tokens the fewest scopes possible.</b> The built-in <code>GITHUB_TOKEN</code> is enough for most things.</li><li><b>Public-repository Actions are free.</b> A profile repository is public, so it costs nothing. Private repositories draw from your monthly free minutes.</li><li><b>Always add alt text</b> and keep animation modest.</li></ol>
<h3>How to find a full commit SHA</h3>
{code("find-sha.sh")}
<p>Or open the Action's repository, click the release tag, and copy the full 40-character commit hash.</p>
<h2>Troubleshooting</h2>
<table><tr><th>Symptom</th><th>Try this</th></tr>
<tr><td>Broken image in the README</td><td>Run the workflow once. Check the <code>output</code> branch exists and that <code>YOUR-USERNAME</code> is replaced.</td></tr>
<tr><td>The workflow fails with 403 when pushing</td><td>Settings, Actions, General, Workflow permissions: choose <i>Read and write permissions</i>.</td></tr>
<tr><td>Nothing updates for months</td><td>GitHub pauses scheduled workflows in public repositories after 60 days without repository activity. Re-enable them in the Actions tab.</td></tr>
<tr><td>You want your own colors</td><td>The snk <code>outputs</code> lines accept <code>color_snake</code>, <code>color_dots</code> (five colors) and <code>color_background</code>. Use <code>%23</code> for <code>#</code>.</td></tr></table>
{callout("tip", "Want it ready-made?", "The Hula Arcade GitHub Profile README Kit from AudreyBuildsAI (sold separately) ships three layouts, pixel banners, and tested workflows for the snake and a stats card.")}
<p class="note-sm">Sources, checked 2026-11-12: github.com/Platane/snk (README and action.yml); GitHub Docs "Secure use reference" and "Billing and usage".</p>
''')

def ch5():
    return add(5, "Repository README design", "Every repository is a tiny website. A few native Markdown tricks make yours look cared for.", f'''
<table><tr><th>Technique</th><th>How</th></tr>
<tr><td>Light and dark images</td><td>The <code>&lt;picture&gt;</code> element with a <code>prefers-color-scheme: dark</code> source. GitHub supports it.</td></tr>
<tr><td>Alert callouts</td><td><code>&gt; [!NOTE]</code>, <code>[!TIP]</code>, <code>[!IMPORTANT]</code>, <code>[!WARNING]</code>, <code>[!CAUTION]</code>. Use one or two per article.</td></tr>
<tr><td>Diagrams</td><td>Mermaid code blocks render natively in Markdown.</td></tr>
<tr><td>Color chips</td><td>In issues, pull requests and discussions, a color such as <code>#D81B60</code> in backticks shows a swatch. This does not work in repository Markdown files.</td></tr>
<tr><td>Banners</td><td>A README header SVG, and a 1280 &times; 640 social preview image for link cards.</td></tr>
<tr><td>GIF demos</td><td>Keep them short, compressed and captioned. Viewers can turn autoplay off.</td></tr>
<tr><td>Pinned repositories</td><td>Pin up to six on your profile.</td></tr>
<tr><td>Organization profile</td><td>An organization can have its own README and profile.</td></tr>
<tr><td>Rendered docs</td><td><code>github-markdown-css</code> (MIT) makes your own HTML docs look like GitHub Markdown.</td></tr></table>
<h2>A light and dark banner</h2>
{code("picture-banner.md")}
<p>Put two versions of the same banner in an <code>assets</code> folder. Visitors in dark mode see the dark file. Always fill in <code>alt</code>.</p>
<h2>Alert callouts</h2>
{code("alerts.md")}
<h2>A diagram</h2>
{code("mermaid.md")}
<p>GitHub draws this as a flow chart: Idea, Prototype, Ship, Learn, and back to Idea.</p>
{callout("tip", "Social preview:", "Open the repository Settings and upload a 1280 &times; 640 image under Social preview. Links you share then carry your banner.")}
<p class="note-sm">Sources, checked 2026-11-12: GitHub Docs "Basic writing and formatting syntax", "Creating diagrams", "Customizing your repository's social media preview", "Pinning items to your profile", "Customizing your organization's profile"; github.com/sindresorhus/github-markdown-css.</p>
''')

def ch6():
    return add(6, "GitHub Pages themes", "Pages turns a repository into a free website. Built-in themes make a good-looking docs site in minutes.", f'''
<h2>Built-in Jekyll themes</h2>
<p>GitHub Pages supports these themes: Architect, Cayman, Dinky, Hacker, Leap day, Merlot, Midnight, Minima, Minimal, Modernist, Slate, Tactile and Time machine.</p>
<ol class="steps"><li>Open your repository Settings and choose <b>Pages</b>.</li><li>Pick a source branch.</li><li>Add a <code>_config.yml</code> file with the theme name, like this:</li></ol>
{code("pages-config.yml")}
<p>Each built-in theme has the prefix <code>jekyll-theme-</code> in front of its name. The list and the exact names are on the Pages themes page.</p>
<table><tr><th>Question</th><th>Answer</th></tr>
<tr><td>Who can use Pages?</td><td>Public repositories on GitHub Free. Pages on private repositories needs Pro, Team or Enterprise (paid).</td></tr>
<tr><td>What are the limits?</td><td>A 1 GB site, a soft 100 GB per month of bandwidth, and a soft limit of 10 builds per hour (not for custom Actions deploys).</td></tr></table>
{callout("warn", "Do not sell from Pages.", "GitHub says Pages is not allowed as free hosting for a site that is primarily directed at facilitating commercial transactions. A portfolio and free documentation are fine. A storefront is not. Sell on a marketplace such as Gumroad, Etsy or Ko-fi.")}
<h2>Good uses for Pages</h2>
<ul><li>A project showcase with screenshots and a live demo.</li><li>Free documentation for an open-source tool.</li><li>A portfolio that links to your best work.</li></ul>
<p class="note-sm">Sources, checked 2026-11-12: pages.github.com/themes; GitHub Docs "About GitHub Pages" and "GitHub Pages limits".</p>
''')

def ch7():
    return add(7, "Beyond GitHub", "When something arrives black and generic, look for the supported way to make it yours first. These are the highest-impact tricks for the tools developers use most.", f'''
<table><tr><th>Tool</th><th>Highest-impact trick</th></tr>
<tr><td><b>VS Code and Cursor</b></td><td>Install one good color theme plus one icon theme, and set a matching font. The settings keys are <code>workbench.colorTheme</code>, <code>workbench.iconTheme</code> and <code>workbench.colorCustomizations</code>. Cursor is a VS Code fork and uses the Open VSX registry.</td></tr>
<tr><td><b>Code fonts</b></td><td>Cascadia Code or Fira Code. Both use open font licenses. Check each repository's license before bundling a font in anything you sell.</td></tr>
<tr><td><b>Windows Terminal</b></td><td>Add a scheme to the <code>schemes</code> list in <code>settings.json</code>, then set <code>colorScheme</code>. Install a Nerd Font for prompt glyphs.</td></tr>
<tr><td><b>Starship</b></td><td>A cross-shell prompt (ISC license). Presets and palettes make it look the way you like.</td></tr>
<tr><td><b>oh-my-posh</b></td><td>An alternative prompt engine (MIT) with many themes. Needs a Nerd Font.</td></tr>
<tr><td><b>Notion</b></td><td>No custom CSS or accent color. Beauty comes from covers, page icons, custom emoji, colored callouts, font choice and full-width pages.</td></tr>
<tr><td><b>Linear</b></td><td>Settings, Preferences, Interface and theme, Custom theme: pick a base color, an accent color and a contrast level. Linear builds the whole theme from those three.</td></tr>
<tr><td><b>Gmail</b></td><td>Settings gear, Themes, View all. Pick a theme or your own background image.</td></tr>
<tr><td><b>Chrome</b></td><td>New tab, Customize Chrome side panel: theme, browser color and background image.</td></tr>
<tr><td><b>Windows 11</b></td><td>Settings, Personalization, Colors and Themes. Accent color, dark mode, and accent color on Start and the taskbar.</td></tr></table>
<h2>VS Code settings, copy and paste</h2>
{code("vscode-settings.json")}
<p>This follows your operating system's day and night mode and tints the status bar hibiscus pink with cream text (contrast 4.54:1).</p>
<h2>A Windows Terminal color scheme</h2>
<p>Paste this object into the <code>schemes</code> list of your <code>settings.json</code>, then set <code>"colorScheme": "Hula Arcade Night"</code> in a profile.</p>
{code("windows-terminal-scheme.json")}
{callout("warn", "Safety defaults:", "Prefer supported settings over patchers. Never use anything that replaces Windows system files, and test system-level mods on a restore point or a throwaway virtual machine first.")}
<p class="note-sm">Sources, checked 2026-11-12: VS Code theme docs; Microsoft Learn Windows Terminal color schemes; starship.rs; ohmyposh.dev; Notion help center; Linear docs; Google support pages for Gmail and Chrome; Microsoft Support personalization pages.</p>
''')

def ch8():
    from palette_tbl import rows
    trs = "".join(f"<tr><td>{a}</td><td>{b}</td><td>{r:.2f}:1</td><td>{'pass' if r >= 4.5 else 'large text only'}</td></tr>" for a, b, r in rows)
    return add(8, "A palette that passes contrast", "Pretty is not enough. If people cannot read it, it is not gorgeous. This chapter shows the Hula Arcade palette and how to check any palette yourself.", f'''
<div class="sw-row">
<div style="background:#1B1F4B;color:#FFF4E0">NAVY<br>#1B1F4B</div><div style="background:#14163A;color:#FFF4E0">DEEP INK<br>#14163A</div><div style="background:#FFD23F;color:#14163A">PELLET YELLOW<br>#FFD23F</div><div style="background:#19C3B1;color:#14163A">LAGOON TEAL<br>#19C3B1</div><div style="background:#D81B60;color:#FFF4E0">HIBISCUS<br>#D81B60</div><div style="background:#FFF4E0;color:#14163A">SAND CREAM<br>#FFF4E0</div><div style="background:#B8A1FF;color:#14163A">LEI LAVENDER<br>#B8A1FF</div></div>
<h2>The rule</h2>
<p>The Web Content Accessibility Guidelines (WCAG 2.2) ask for a contrast ratio of at least <b>4.5:1</b> for normal text, and <b>3:1</b> for large text and user-interface parts. You can check any pair in the WebAIM contrast checker.</p>
<table><tr><th>Text color</th><th>On</th><th>Ratio</th><th>Result</th></tr>{trs}</table>
{callout("warn", "Teal and lavender are for fills.", "Lagoon teal and lei lavender are lovely backgrounds with dark text, and lovely accents on dark. They are too faint as small text on cream. Hibiscus on cream passes by a hair (4.54:1), so keep it for headings and bold words.")}
<h2>Design rules that keep it beautiful and kind</h2>
<ul><li>Never use color alone to carry meaning. Add an icon or a word. This also helps colorblind viewers.</li><li>Ship a dark and a light version of everything.</li><li>Keep any animation under three seconds and offer a still version.</li><li>Use original art. If your style is retro arcade, invent your own characters and shapes instead of borrowing famous ones.</li><li>If you show a living cultural tradition such as hula, show it respectfully: flowers, ocean and music, never a caricature.</li></ul>
<p class="note-sm">Contrast ratios were computed with the WCAG formula. Check again in a contrast checker before you ship.</p>
''')

def appendix_a():
    return '<section class="chap" id="appA"><div class="chead"><div class="n">A</div><h1>Snippets appendix</h1></div><p class="lead">Copy and paste. Every snippet in this booklet was checked: YAML with a workflow linter, JSON and TOML with parsers. If copying from the PDF adds a line break inside a long line, use the plain files in the <code>snippets</code> folder of your download instead.</p>' + f'''
<h2>A1. Light and dark banner</h2>{code("picture-banner.md")}
<h2>A2. The five alert callouts</h2>{code("alerts.md")}
<h2>A3. A Mermaid diagram</h2>{code("mermaid.md")}
<h2>A4. Snake workflow (.github/workflows/snake.yml)</h2>{code("snake-workflow.yml")}
<p class="note-sm">The last step force-pushes only the throwaway <code>output</code> branch that holds generated pictures. It never touches your main branch.</p>
<h2>A5. Snake in your README</h2>{code("snake-readme.md")}
<h2>A6. VS Code settings</h2>{code("vscode-settings.json")}
<h2>A7. Windows Terminal scheme</h2>{code("windows-terminal-scheme.json")}
<h2>A8. A tiny Starship preset (~/.config/starship.toml)</h2>{code("starship-mini.toml")}
<h2>A9. GitHub Pages theme (_config.yml)</h2>{code("pages-config.yml")}
<h2>A10. Find an Action's commit SHA</h2>{code("find-sha.sh")}
</section>'''

def appendix_b():
    return '<section class="chap" id="appB"><div class="chead"><div class="n">B</div><h1>Tools and licenses</h1></div><p class="lead">Licenses were read from each project on 2026-11-12. Always re-check before you redistribute anything.</p>' + '''
<table class="compact"><tr><th>Tool</th><th>License</th><th>Notes</th></tr>
<tr><td>Stylus</td><td>GPL-3.0</td><td>Userstyle manager</td></tr><tr><td>Catppuccin userstyles</td><td>MIT</td><td>Keep their notice if you remix</td></tr>
<tr><td>Dracula (open theme)</td><td>MIT</td><td>Dracula Pro is proprietary</td></tr><tr><td>Refined GitHub</td><td>MIT</td><td></td></tr>
<tr><td>Material Icons for GitHub</td><td>MIT</td><td></td></tr><tr><td>Gitako</td><td>MIT</td><td></td></tr><tr><td>Isometric Contributions</td><td>MIT</td><td></td></tr>
<tr><td>capsule-render</td><td>MIT</td><td></td></tr><tr><td>github-readme-stats</td><td>MIT</td><td>Public instance can be unreliable</td></tr>
<tr><td>github-readme-streak-stats</td><td>MIT</td><td></td></tr><tr><td>github-readme-activity-graph</td><td>MIT</td><td></td></tr>
<tr><td>skill-icons</td><td>MIT</td><td>Logos belong to their owners</td></tr><tr><td>readme-typing-svg</td><td>MIT</td><td></td></tr>
<tr><td>github-profile-summary-cards</td><td>MIT</td><td></td></tr><tr><td>shields.io</td><td>Apache-2.0</td><td></td></tr>
<tr><td>Simple Icons</td><td>CC0 (code)</td><td>Logos remain their owners' trademarks</td></tr>
<tr><td><b>Platane/snk</b></td><td><b>No license file</b></td><td>Use as an Action only. Do not copy its code.</td></tr>
<tr><td>lowlighter/metrics</td><td>MIT</td><td>Needs a personal access token</td></tr>
<tr><td>github-markdown-css</td><td>MIT</td><td></td></tr><tr><td>Starship</td><td>ISC</td><td></td></tr><tr><td>oh-my-posh</td><td>MIT</td><td></td></tr>
<tr><td>Cascadia Code, Fira Code</td><td>Open font licenses</td><td>Check before bundling</td></tr></table>
<h2>Appendix C. Glow-up checklist</h2>
<table><tr><td>&#9744; Sync GitHub with your system and pick day and night themes</td><td>&#9744; Pin six repositories</td></tr>
<tr><td>&#9744; Create the profile repository and README</td><td>&#9744; Light and dark banner with alt text</td></tr>
<tr><td>&#9744; Static SVG snake and stats via Actions</td><td>&#9744; Pin every Action to a full SHA</td></tr>
<tr><td>&#9744; Add Material Icons and Refined GitHub</td><td>&#9744; Check every text color at 4.5:1</td></tr>
<tr><td>&#9744; Social preview image on your best repo</td><td>&#9744; Skip hit counters and trackers</td></tr></table></section>'''

def license_page():
    return '''<section class="chap" id="lic"><div class="chead"><div class="n">&#9733;</div><h1>License and credits</h1></div>
<p><b>Make GitHub Gorgeous</b> &copy; 2026 Freedom Angel Corp, doing business as AudreyBuildsAI. All rights reserved except as stated here.</p>
<h2>Your license</h2>
<ul><li>You may read this booklet on any device you own and print it for your own use.</li><li>You may use the code snippets in Appendix A in your own projects, personal or commercial, under the MIT License (the snippets only; no warranty).</li><li>You may not resell, share, post, or give away this PDF or pages from it.</li><li>Teammates each need their own copy.</li></ul>
<h2>Credits</h2>
<ul><li>Pixel art, illustrations and the 5&times;7 pixel font were drawn from scratch for AudreyBuildsAI. Mascots: Lil Aud-Bod (the pixel hula dancer) and Auky (the yellow friend with the hibiscus).</li><li>Fonts used in this PDF, all under the SIL Open Font License 1.1: Pixelify Sans, Press Start 2P, Nunito, and JetBrains Mono (Google Fonts).</li><li>Third-party tools mentioned keep their own licenses. Appendix B lists them.</li></ul>
<h2>Trademarks and no affiliation</h2>
<p>GitHub is a trademark of GitHub, Inc. Visual Studio Code, Windows Terminal and Windows are trademarks of Microsoft. All other names belong to their owners. This booklet is independent and is not affiliated with, endorsed by, or sponsored by them. The interface pictures in this booklet are drawn illustrations, not screenshots.</p>
<h2>No warranty</h2>
<p>This booklet is provided as is, and websites change. Prices, settings and links were checked on 2026-11-12. This is not legal advice. Confirm license and trademark questions before you sell or redistribute anything.</p>
<h2>Refunds</h2><p>If this booklet is not right for you, ask for a refund within 14 days of purchase.</p>
<div class="pellets"></div><p>Thank you for supporting AudreyBuildsAI. Mahalo, and happy glow-ups!</p></section>'''

def meet_page():
    return f'''<section class="chap nb" id="meet"><div class="chead"><div class="n">&#9825;</div><h1>How to use this booklet</h1></div>
<p class="lead">You do not need to read it in order. Pick the chapter that matches the thing you want to make prettier today.</p>
<div class="two"><div>
<h2>Meet your guides</h2><p><b>Lil Aud-Bod</b> is the pixel hula dancer who keeps the arcade running. <b>Auky</b> is the cheerful yellow friend with a hibiscus. They will pop up to remind you of the three golden rules of this booklet.</p>
<div class="callout tip"><p><b class="t">Rule 1.</b> Free first. Everything here works on GitHub Free.</p></div>
<div class="callout"><p><b class="t">Rule 2.</b> Readable is beautiful. Every color pair passes 4.5:1.</p></div>
<div class="callout warn"><p><b class="t">Rule 3.</b> Be kind and original. No copied art, no trackers.</p></div></div>
<div style="width:1.8in"><img src="{AVATAR}" style="width:1.8in;border-radius:8pt;border:3px solid #1B1F4B"><p class="note-sm" style="text-align:center">Lil Aud-Bod</p><img src="{AUKY}" style="width:1.8in;border-radius:8pt;border:3px solid #1B1F4B;margin-top:4pt"><p class="note-sm" style="text-align:center">Auky</p></div></div>
<h2>How the chapters connect</h2>
<div class="flow"><div class="b"><b>1</b>GitHub settings</div><div class="ar">&rarr;</div><div class="b"><b>2</b>Extensions</div><div class="ar">&rarr;</div><div class="b"><b>3-4</b>Profile and Actions</div><div class="ar">&rarr;</div><div class="b"><b>5-6</b>Repos and Pages</div><div class="ar">&rarr;</div><div class="b"><b>7-8</b>Everywhere else</div></div>
<h2>Checked on 2026-11-12</h2>
<p>All the links, licenses and settings in this booklet were checked on 2026-11-12. Websites change, so if a button has moved, trust the live page over the picture. Nothing in this booklet contains affiliate links or tracking links.</p>
</section>'''

def cover():
    hula = inline_svg(h.HULA, h.HULA_L, 16); auky = inline_svg(h.AUKY, h.AUKY_L, 13)
    waves = "".join(h.sprite_g(h.WAVE_TILE, h.WAVE_L, i * 64, 0, 4) for i in range(14))
    return f'''<section class="cover"><div class="sun"></div><div class="brand">AUDREYBUILDSAI</div><h1>Make<br>GitHub<br>Gorgeous</h1>
<div class="sub">A friendly, step-by-step guide to themes, profile READMEs, static SVG magic, and a palette that passes contrast. Free tools only.</div><div class="price">PIXEL GUIDE &middot; 2026 EDITION</div>
<div class="art" style="display:flex;align-items:flex-end;gap:14pt">{auky}{hula}</div>
<div class="foot">By AudreyBuildsAI &middot; Freedom Angel Corp<br>Illustrations are original pixel art.</div>
<div class="waves"><svg width="100%" height="24" viewBox="0 0 900 24" preserveAspectRatio="none" shape-rendering="crispEdges">{waves}</svg></div></section>'''

def toc(pages):
    items = [(f"{n:02d}", t, a) for n, t, a in sorted(CHAPTERS)] + [("A", "Snippets appendix", "appA"), ("B", "Tools, licenses, and checklist", "appB"), ("&#9733;", "License and credits", "lic")]
    rows = "".join(f'<tr><td class="n">{n}</td><td>{t}</td><td class="pg">{pages.get(a, "")}</td></tr>' for n, t, a in items)
    return f'<section class="chap" id="toc"><div class="chead"><div class="n">&#9776;</div><h1>Contents</h1></div><table class="toc">{rows}</table><div class="pellets"></div><p class="note-sm">How to use this booklet is on page {pages.get("meet", "")}.</p></section>'

def page_numbers(pdf):
    out = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout.split("\f")
    starts = {}
    heads = {"c1": "Start with GitHub's own settings", "c2": "Extensions and userstyles", "c3": "Your profile README", "c4": "Static SVGs with GitHub Actions", "c5": "Repository README design",
             "c6": "GitHub Pages themes", "c7": "Beyond GitHub", "c8": "A palette that passes contrast", "appA": "Snippets appendix", "appB": "Tools and licenses", "lic": "License and credits", "meet": "How to use this booklet"}
    for i, pg in enumerate(out, 1):
        if i <= 2: continue
        for a, t in heads.items():
            if a not in starts and re.search(r"^\s*\S{0,3}\s*" + re.escape(t) + r"", pg, re.M): starts[a] = i
    return starts

def build(out_pdf):
    css = open(os.path.join(HERE, "book_css.css")).read()
    bodies = [ch1(), ch2(), ch3(), ch4(), ch5(), ch6(), ch7(), ch8(), appendix_a(), appendix_b(), license_page()]
    def doc(pages):
        return f"<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Make GitHub Gorgeous</title><style>{css}</style></head><body>{cover()}{toc(pages)}{meet_page()}{''.join(bodies)}</body></html>"
    tmp = os.path.join(HERE, "..", "build"); os.makedirs(tmp, exist_ok=True); hp = os.path.join(tmp, "booklet.html")
    pages = {}
    for _ in range(2):
        open(hp, "w", encoding="utf-8").write(doc(pages)); html_to_pdf(hp, out_pdf); pages = page_numbers(out_pdf)
    print("page map:", pages)
if __name__ == "__main__":
    sys.path.insert(0, HERE)
    build(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "build", "make-github-gorgeous.pdf"))
