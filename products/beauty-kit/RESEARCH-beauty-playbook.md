# BALLS Beauty Playbook: Making Ugly UIs Gorgeous

> Research and plan by **BALLS** (Lil Aud-Bod), brand ambassador of making everything beautiful for AudreyBuildsAI / Freedom Angel Corp.
> Research date: 2026-11-12 (America/Denver). Status: **incubating research, not a published product.** Nothing here posts, sells, or installs anything without Audrey's yes.
> Rules followed: no affiliate links, no tracking links, nothing paid on GitHub required. Every URL below was fetched and returned 200 unless it is labelled "not verified". Dead links were dropped.

## 0. TL;DR

- **GitHub's own settings come first.** Settings → Appearance has light and dark themes, colorblind variants, Dark dimmed, and (since June 2025) an "Increase contrast" switch that works on any theme. Free, instant, portable across browsers.
- **Biggest GitHub lesson from testing today:** the popular hosted widget endpoints are fragile. On 2026-11-12 the public `github-readme-stats` instance returned HTTP 503 and the public `github-readme-activity-graph` instance returned HTTP 402 `DEPLOYMENT_DISABLED`. The `github-readme-stats` README itself says the public instance is "best-effort and can be unreliable". **Generate static SVGs with GitHub Actions instead** (free on public repos) so Audrey's profile never shows a broken image.
- **Nothing in this playbook needs paid GitHub.** Pages on private repos, Octotree Pro, and private-repo Actions minutes are the only paid edges, and all are avoidable.
- **The market is real but price-compressed.** README templates sell for $0 to $19, Notion aesthetic templates for about $10 to $25, Windows theme packs for about $5 to $10, and premium multi-app theme suites reach $15 to $80 (Dracula Pro, $79.99).
- **Best bets for BALLS:** (1) a Hula Arcade GitHub Profile README Kit, $12 to $19; (2) a "Make GitHub Gorgeous" booklet, $7 to $12; (3) a one-palette dev kit (VS Code/Cursor theme, Windows Terminal, Starship), $9 to $29, with a free taste-test version.

---

## 1. GitHub beautification

### 1.1 GitHub's own themes and accessibility settings (free, no extension)

Path: profile picture → **Settings → Appearance** ([GitHub Docs: managing your theme settings](https://docs.github.com/en/get-started/accessibility/managing-your-theme-settings)). You can pick one theme, or "Sync with system" and choose a day theme and a night theme. You can also change themes from the command palette.

| Theme / setting | What it is | Source |
|---|---|---|
| Light default / Dark default | The baseline themes; logged-out visitors get these | [Primer color guidance](https://primer-docs-preview.github.com/accessibility/design-guidance/color-considerations/) |
| Dark dimmed | Intentionally lower-contrast dark theme | Primer color guidance (same page) |
| Light / Dark high contrast | Higher contrast for low vision | Primer color guidance (same page) |
| Light / Dark colorblind (Protanopia & Deuteranopia) | Swaps red/green cues for colors that are easier to tell apart | [GitHub changelog, Apr 2022](https://github.blog/changelog/2022-04-19-tritanopia-colorblind-theme-beta/) |
| Light / Dark Tritanopia | Blue/yellow colorblindness variant | [GitHub changelog, Apr 2022](https://github.blog/changelog/2022-04-19-tritanopia-colorblind-theme-beta/) and [roadmap #375](https://github.com/github/roadmap/issues/375) |
| "Increase contrast" switch | Separate toggle that raises contrast on any theme; also reachable by logged-out visitors from the top-nav Appearance button | [GitHub changelog, Jun 2025](https://github.blog/changelog/2025-06-05-control-contrast-for-all-github-themes/) |
| Accessibility settings | Link underlines, hovercards on/off, keyboard shortcut character keys, autoplay of animated images (sync with system, on, off) | [Managing accessibility settings](https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings) |

Notes:
- Cost: free. Paid GitHub features: none. Safe: first-party.
- The exact list in the dropdown can change; the Appearance page is the source of truth. Since the June 2025 contrast change, theme and contrast are separate choices.
- **Conflict to know about:** the Catppuccin GitHub userstyle (below) tells you to use **Light default or Dark default** and to **turn "Increase contrast" off**. Pick either a userstyle look or a built-in accessibility theme, not both.

### 1.2 Browser extensions and userstyles

| Tool | What it does for the look | Cost / free? | Safety notes | Needs paid GitHub? | Link |
|---|---|---|---|---|---|
| **Stylus** | Userstyle manager: lets you apply CSS themes to any site, including GitHub | Free, GPL-3.0, open source (7.0k stars, active Nov 2026) | Needs access to pages you style, so only install styles from sources you trust; read the CSS if unsure. Disable Dark Reader on sites you style with Stylus | No | [Chrome](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/styl-us/), [source](https://github.com/openstyles/stylus) |
| **Catppuccin userstyles (GitHub)** | Soothing pastel theme for GitHub with 4 flavors (Latte, Frappé, Macchiato, Mocha) and 15 accent colors including Pink, Peach, Teal | Free, MIT | Maintained, 1.1k stars. Install via Stylus import or the per-style badge. Requires GitHub Default theme with Increase contrast off | No | [GitHub style folder](https://github.com/catppuccin/userstyles/tree/main/styles/github), [usage guide](https://userstyles.catppuccin.com/getting-started/usage/), [customizer](https://github.com/uncenter/catppuccin-userstyles-customizer) |
| **Dracula for GitHub** | Dark Dracula userstyle | Free, MIT (small project, 37 stars, last push Sep 2025) | Same Stylus caveats. Only the open Dracula theme is MIT; Dracula **Pro** is proprietary | No | [repo](https://github.com/dracula/github), [Dracula theme repo](https://github.com/dracula/dracula-theme) |
| **userstyles.world** | Community library of userstyles (search "GitHub") | Free, no paid plans; donations via Open Collective | Community content, so read licenses and code before installing | No | [site](https://userstyles.world), [FAQ](https://userstyles.world/docs/faq) |
| **Refined GitHub** | Cleans up and adds features to the GitHub UI | Free, MIT, 32k stars, very active | Browser extension with access to github.com. Chrome, Firefox, Safari | No | [Chrome](https://chromewebstore.google.com/detail/refined-github/hlepfoohegkhhmjieoechaddaejaokhf), [repo](https://github.com/refined-github/refined-github) |
| **Material Icons for GitHub** | Replaces file and folder icons with VS Code Material Icon Theme icons (Chrome Web Store: 4.9 stars, v1.17.1 updated 2026-10-14) | Free, MIT, "no data collected" per store listing | Open source; also works on Bitbucket, GitLab, Azure DevOps, others. Optional all-sites permission is optional | No | [Chrome](https://chromewebstore.google.com/detail/material-icons-for-github/bggfcpfjbdkhfhfmkjpbhnkhnpjjeomc), [repo](https://github.com/material-extensions/material-icons-browser-extension/) |
| **Octotree** | IDE-style file tree sidebar | Free tier (core tree, private repos, 20 bookmarks). **Pro $35/yr** ($2.92/mo billed yearly) adds PR trees, code fonts, icon themes, docking | Its "Log in with GitHub" OAuth asks for read **and** write because GitHub has no read-only repo scope; its docs say you can paste a token instead. Prefer a fine-grained, read-only token. Free tier is enough for Audrey | No GitHub plan needed (Octotree's own Pro is optional) | [pricing](https://www.octotree.io/pricing), [features](https://www.octotree.io/features), [Chrome](https://chromewebstore.google.com/detail/octotree-github-code-tree/bkhaagjahfmjljalopjnoealnfndnagc) |
| **Gitako** | Free, MIT file-tree alternative to Octotree | Free, MIT, active Nov 2026 | Needs a token for private repos | No | [repo](https://github.com/EnixCoda/Gitako) |
| **Isometric Contributions** | Turns the contribution graph into an isometric 3D view | Free, MIT, active | Browser extension | No | [repo](https://github.com/jasonlong/isometric-contributions) |
| **Dark Reader** | Auto-darkens any site | Free, MIT | Can conflict with Stylus themes; it rewrites page colors. Not needed on GitHub since GitHub has real dark themes | No | [Chrome](https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh), [repo](https://github.com/darkreader/darkreader) |

Not recommended: `catppuccin/github` (archived, last push 2023; replaced by catppuccin/userstyles).

**Install recipe (5 minutes):** install Stylus → follow the [Catppuccin usage guide](https://userstyles.catppuccin.com/getting-started/usage/) → in the customizer set light = Latte, dark = Mocha, accent = Pink or Peach → in GitHub set Appearance to Light default and Dark default with Increase contrast off → add Material Icons for GitHub and Refined GitHub.

### 1.3 Profile README tricks

How the profile README works: create a **public** repo named exactly like the username and add `README.md` ([GitHub Docs](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)). Free on GitHub Free.

| Trick | Tool | Cost / license | Reliability and safety | Paid GitHub? | Link |
|---|---|---|---|---|---|
| Wave/slice/egg header and footer banners | **capsule-render** | Free, MIT, active (Nov 2026) | Hosted on vercel.app (HTTP 200 on test). Fine for decoration; for zero dependency, export a static SVG into the repo | No | [repo](https://github.com/kyechan99/capsule-render), [generator](https://capsule-render.vercel.app/) |
| Stats card (stars, commits, PRs) | **github-readme-stats** | Free, MIT, 79.8k stars | **Public instance returned 503 on 2026-11-12**; README recommends self-hosting or the GitHub Actions workflow. Private stats need your own token and instance | No | [repo](https://github.com/anuraghazra/github-readme-stats) |
| Streak stats | **github-readme-streak-stats** | Free, MIT, active | `streak-stats.demolab.com` returned 200. README recommends self-hosting and documents a GitHub Actions option that writes a static SVG | No | [repo](https://github.com/DenverCoder1/github-readme-streak-stats) |
| Activity graph | **github-readme-activity-graph** | Free, MIT | **Public instance returned 402 DEPLOYMENT_DISABLED on 2026-11-12.** Older Heroku/Cyclic hosts are gone per its README. Self-host or skip | No | [repo](https://github.com/Ashutosh00710/github-readme-activity-graph) |
| Skill/tool icons | **skill-icons** (skillicons.dev) | Free, MIT, 13k stars; icons have light/dark variants | Hosted endpoint returned 200. Tech logos belong to their owners; fine for "I use X", not for product branding | No | [repo](https://github.com/tandpfun/skill-icons) |
| Typing animation | **readme-typing-svg** | Free, MIT, active | `readme-typing-svg.demolab.com` returned 200. Keep text short; animated SVGs can distract, so use sparingly | No | [repo](https://github.com/DenverCoder1/readme-typing-svg) |
| Snake contribution animation | **Platane/snk** (GitHub Action) | **Repo has no license file** (API shows none), so use the Action as documented but do not copy its code into a product | Action runs on a schedule in your profile repo and commits SVGs to an `output` branch. Free on public repos. Pin the Action to a commit SHA | No (public repo Actions) | [repo](https://github.com/Platane/snk), [Marketplace](https://github.com/marketplace/actions/generate-snake-game-from-github-contribution-grid) |
| Self-generated SVG infographics | **lowlighter/metrics** (GitHub Action) | Free, MIT, 17k stars. 30+ plugins | Needs a PAT stored as an Actions secret for richer data; give it the minimum scopes. Output is a static SVG you own | No | [repo](https://github.com/lowlighter/metrics), [demo](https://metrics.lecoq.io/) |
| Stats cards via Action | **github-profile-summary-cards** | Free, MIT, active | Generates SVGs in your repo with an Action | No | [repo](https://github.com/vn7n24fzkq/github-profile-summary-cards) |
| Badges | **shields.io** | Free, Apache-2.0 | Hosted; badge text is public URL data. Static badges are safest | No | [site](https://shields.io), [repo](https://github.com/badges/shields) |
| Logos for badges | **Simple Icons** | Free, CC0 for the code; logos remain their owners' trademarks | Use for "built with", not as your brand | No | [site](https://simpleicons.org/), [repo](https://github.com/simple-icons/simple-icons) |
| Profile README generator | **github-profile-readme-generator** | Free, Apache-2.0, 24k stars | Client-side generator, a starting point only | No | [generator](https://rahuldkjain.github.io/gh-profile-readme-generator/), [repo](https://github.com/rahuldkjain/github-profile-readme-generator) |
| Inspiration | **awesome-github-profile-readme** | CC0 list, 31k stars | A gallery of real profiles; study layout, don't copy art | No | [repo](https://github.com/abhisheknaiidu/awesome-github-profile-readme) |
| Profile views counter | **github-profile-views-counter** | Free, MIT | A hit counter is third-party tracking of your visitors; skip it to honor "no tracking" | No | [repo](https://github.com/antonkomarev/github-profile-views-counter) |
| Trophies | **github-profile-trophy** | Free, MIT | Hosted endpoint, same fragility as other widgets | No | [repo](https://github.com/ryo-ma/github-profile-trophy) |

**Hardening rules for every Action and widget:**
1. Prefer **static SVG committed to the repo** over a hosted URL. The README never breaks when a free host hits quota.
2. Pin third-party Actions to a full commit SHA, not a moving tag ([GitHub secure-use guide](https://docs.github.com/en/actions/reference/security/secure-use)).
3. Give any token the fewest scopes possible; use `GITHUB_TOKEN` where it is enough.
4. Public-repo Actions are free; a private repo draws from the 2,000 free minutes per month on GitHub Free ([billing docs](https://docs.github.com/en/actions/concepts/billing-and-usage)). A profile repo is public, so it costs nothing.
5. Always add `alt` text to images and keep animation modest.

**Minimal static-SVG workflow sketch** (for `.github/workflows/snake.yml` in the profile repo; replace the placeholder SHA with the real commit of the latest tagged release before use):

```yaml
name: Generate snake
on:
  schedule: [{ cron: "0 4 * * *" }]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  snake:
    runs-on: ubuntu-latest
    steps:
      - uses: Platane/snk/svg-only@<PIN-FULL-COMMIT-SHA>   # v3
        with:
          github_user_name: ${{ github.repository_owner }}
          outputs: |
            dist/snake.svg
            dist/snake-dark.svg?palette=github-dark
      - uses: crazy-max/ghaction-github-pages@<PIN-FULL-COMMIT-SHA>
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

(The snk README documents `Platane/snk/svg-only@v3` and the `outputs` syntax; the second step shown is a common way to publish the files. Test in a throwaway repo first.)

### 1.4 Repo README design

| Technique | How | Cost / paid? | Link |
|---|---|---|---|
| Light/dark images | `<picture>` with `<source media="(prefers-color-scheme: dark)" srcset="dark.svg">` and a light `<img>`; GitHub supports the `<picture>` element | Free | [GitHub Docs: basic formatting](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), snk README shows the exact pattern |
| Alert callouts | `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`; GitHub says use one or two per article | Free | [GitHub Docs](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) |
| Diagrams | Mermaid fenced code blocks render natively in Markdown | Free | [Creating diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams), [mermaid](https://github.com/mermaid-js/mermaid) (MIT) |
| Color chips | In issues, PRs, and discussions, `` `#0969DA` `` shows a color swatch (not in repo Markdown files) | Free | GitHub Docs formatting page |
| Banners | A 1280x640 social preview image plus a README header SVG | Free | [Social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview) |
| GIF demos | Short, compressed, captioned; viewers can set "Autoplay animated images" off | Free | Accessibility settings page above |
| Org profile | Org-level README and profile | Free | [Customizing your organization's profile](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile) |
| Pinned repos | Pin up to six to the profile | Free | [Pinning items](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile) |
| Rendered-docs CSS | `github-markdown-css` makes your own HTML docs look like GitHub Markdown | Free, MIT | [repo](https://github.com/sindresorhus/github-markdown-css) |

### 1.5 GitHub Pages themes

| Item | Detail | Cost / paid? | Link |
|---|---|---|---|
| Built-in Jekyll themes | Architect, Cayman, Dinky, Hacker, Leap day, Merlot, Midnight, Minima, Minimal, Modernist, Slate, Tactile, Time machine | Free | [Supported themes](https://pages.github.com/themes/), [how to add](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-a-theme-to-your-github-pages-site-using-jekyll), [source org](https://github.com/pages-themes) |
| Who can use Pages | **Public repos on GitHub Free.** Private-repo Pages needs Pro, Team, or Enterprise | Free for public; **paid for private** | [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) |
| Limits | 1 GB site, 100 GB/month soft bandwidth, 10 builds/hour soft limit (not for custom Actions deploys) | n/a | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| **Commercial use** | GitHub says Pages is **not allowed** as free hosting for a site "primarily directed at facilitating commercial transactions". A portfolio and free docs are fine; a storefront is not | n/a | [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |

Rule for Audrey: use Pages for free demos, documentation, and a showcase of the kits; **sell on Gumroad, Etsy, Ko-fi, or Notion Marketplace**, not on Pages.

---

## 2. Same idea for other dark or generic tools (highest impact only)

| Tool | Highest-impact trick | Cost | Notes and link |
|---|---|---|---|
| **VS Code / Cursor themes** | Install one good color theme plus one icon theme and set a matching font. Verified on the VS Code Marketplace: [Catppuccin for VSCode](https://marketplace.visualstudio.com/items?itemName=Catppuccin.catppuccin-vsc) (1.49M installs), [Catppuccin Icons](https://marketplace.visualstudio.com/items?itemName=Catppuccin.catppuccin-vsc-icons) (677k), [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) (36.2M), [GitHub Theme](https://marketplace.visualstudio.com/items?itemName=GitHub.github-vscode-theme) (20.6M), [Dracula Theme Official](https://marketplace.visualstudio.com/items?itemName=Dracula-Theme.theme-dracula) (11.1M), [Night Owl](https://marketplace.visualstudio.com/items?itemName=sdras.night-owl) (3.6M), [Tokyo Night](https://marketplace.visualstudio.com/items?itemName=enkia.tokyo-night) (3.0M), [Rosé Pine](https://marketplace.visualstudio.com/items?itemName=mvllow.rose-pine) (351k), [vscode-icons](https://marketplace.visualstudio.com/items?itemName=vscode-icons-team.vscode-icons) (24.8M) | Free | Cursor is a VS Code fork and pulls from Open VSX; I confirmed Catppuccin on [Open VSX](https://open-vsx.org/extension/Catppuccin/catppuccin-vsc). Settings keys: `workbench.colorTheme`, `workbench.iconTheme`, `workbench.colorCustomizations`. How themes work: [VS Code themes docs](https://code.visualstudio.com/docs/getstarted/themes) |
| **Fonts for code** | Cascadia Code (ligatures, Microsoft) or Fira Code | Free | [Cascadia Code](https://github.com/microsoft/cascadia-code), [Fira Code](https://github.com/tonsky/FiraCode). Both are open font licenses; check each repo's LICENSE before bundling in a sold kit |
| **Windows Terminal** | Add a custom scheme to `schemes` in `settings.json`, then set `colorScheme`; install a Nerd Font such as Cascadia Code NF for prompt glyphs | Free | [Color schemes](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes), [themes](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/themes), [theme gallery](https://learn.microsoft.com/en-us/windows/terminal/custom-terminal-gallery/theme-gallery), [custom prompt tutorial](https://learn.microsoft.com/en-us/windows/terminal/tutorials/custom-prompt-setup) |
| **Starship prompt** | Cross-shell prompt; `winget install Starship.Starship`, then add `Invoke-Expression (&starship init powershell)` to `$PROFILE` | Free, ISC license | [starship.rs](https://starship.rs/), [presets](https://starship.rs/presets/), [repo](https://github.com/starship/starship) |
| **oh-my-posh** | Alternative prompt engine with many themes | Free, MIT | [ohmyposh.dev](https://ohmyposh.dev/), [themes](https://ohmyposh.dev/docs/themes), [repo](https://github.com/JanDeDobbeleer/oh-my-posh). Needs a [Nerd Font](https://www.nerdfonts.com/) |
| **Notion** | Notion has no custom CSS or custom accent color; beauty comes from covers, page icons, custom emoji uploads, colored callouts and blocks, font choice, and full-width pages. Dark mode via Settings → Preferences → Appearance | Free | [Style & customize your page](https://www.notion.com/help/customize-and-style-your-content), [icons & covers](https://www.notion.com/help/guides/page-icons-and-covers), [account settings](https://www.notion.com/help/account-settings). Unofficial CSS injectors exist; I did not verify their terms, so I do not recommend them |
| **Linear** | Settings → Preferences → Interface and theme → **Custom theme**: pick base color, accent color, and contrast. Linear generates the whole theme from those three | Free | [Linear Preferences](https://linear.app/docs/account-preferences), [design refresh note](https://linear.app/now/behind-the-latest-design-refresh) |
| **Gmail** | Settings gear → Themes → View all → pick a theme or your own background image; choose dark or default | Free | [Change your Gmail background](https://support.google.com/mail/answer/112508) |
| **Chrome** | New tab → **Customize Chrome** side panel → theme, browser color, background image; pick a Chrome color that matches the brand | Free | [Customize your New Tab page](https://support.google.com/chrome/answer/11032183), [Web Store themes](https://chromewebstore.google.com/category/themes) |
| **Windows 11 desktop** | Settings → Personalization → **Colors** (accent color, Dark mode, "Show accent color on Start and taskbar", Transparency effects) and **Themes** | Free | [Personalize your colors](https://support.microsoft.com/en-us/windows/experience/personalization/personalize-your-colors-in-windows), [Themes](https://support.microsoft.com/en-us/windows/experience/personalization/personalize-your-windows-experience-with-themes) |
| **Animated wallpapers** | Lively Wallpaper (GPL-3.0) for animated or interactive wallpapers | Free | [Microsoft Store](https://apps.microsoft.com/detail/9ntm2qc6qws7), [repo](https://github.com/rocksdanister/lively) |
| **Desktop widgets** | Rainmeter skins (GPL-2.0) | Free | [rainmeter.net](https://www.rainmeter.net/), [repo](https://github.com/rainmeter/rainmeter) |
| **Utilities** | Microsoft PowerToys (MIT) for window layouts and quality of life | Free | [PowerToys docs](https://learn.microsoft.com/en-us/windows/powertoys/), [repo](https://github.com/microsoft/PowerToys) |
| **System-level mods** | Windhawk (GPL-3.0) injects mods into Windows apps | Free | [repo](https://github.com/ramensoftware/windhawk). Advanced: it changes how system components behave, so restore points first, and keep it out of any product that promises a safe install |

Safety defaults for this section: prefer supported settings over patchers; never ship a product that replaces Windows system files; test on a throwaway VM or restore point first.

---

## 3. Sellable products: market research

### 3.1 What similar items actually sell for (prices read from the live listing unless marked)

| Category | Product | Price | Where | URL | Check |
|---|---|---|---|---|---|
| Multi-app theme suite | Dracula Pro (themes for many editors and terminals, wallpapers, fonts, book) | **$79.99** one-time; free updates; 3 devices | Gumroad | <https://draculatheme.gumroad.com/l/dracula-pro> | Price read from Gumroad page. The brand's 2020 blog says 1,143 copies sold in the first 6 months |
| Multi-app theme suite | Dancheong PRO, one Korean palette for editor, terminal, multiplexer, notes | **$15** | Gumroad | <https://dancheong.gumroad.com/l/dancheong-pro> | Live page |
| VS Code theme pack | 12 VS Code Themes, WCAG-measured (8 dark, 4 light) | **$39.99** | Gumroad | <https://launchcrateperfect.gumroad.com/l/bwzzz> | Live page |
| VS Code theme (freemium) | Retro Power-Up Themes: 1 free theme + 5 premium, license key verified via Gumroad | **$6.99** premium | VS Code Marketplace (free download) + Gumroad key | <https://marketplace.visualstudio.com/items?itemName=nextgencode.mario-bros-theme> | Live page. Release notes say themes were **renamed "trademark-safe"**, a useful lesson for retro-game styling. 143 installs |
| README template | GitHub Profile README Generator Template (HTML + Astro source) | **$19** | Gumroad | <https://thecalmdeskco.gumroad.com/l/github-profile-readme-template> | Live page |
| README template | Digital Product README Template Pack | **$9** | Gumroad | <https://lootydrips.gumroad.com/l/digital-product-readme-template-pack> | Live page |
| README template | README Generator Pro | **$3** | Gumroad | <https://kylendenis.gumroad.com/l/ypvqzr> | Live page |
| README template | 5 Professional GitHub README Templates | **$0+** (pay what you want) | Gumroad | <https://303117924.gumroad.com/l/awgpnp> | Live page |
| README template | Ultimate Developer GitHub Profile README Template | **$3** | Whop | <https://whop.com/humanely-yours/ultimate-developer-github-profile-readme-template-73/> | Live page |
| README builder | GitSkins: free tier, **$1.99** one-time premium export, Pro subscription | $0 to $1.99+ | gitskins.com | <https://www.gitskins.com/pricing> | Live page. Shows the "tiny price" floor |
| How-to ebook | Standing Out In Tech (LinkedIn + GitHub profile, résumé) | **$15** | Gumroad | <https://crushingdigital.gumroad.com/l/soit-book> | Live page |
| How-to ebook | AI Engineer Roadmap Week 20: GitHub portfolio and profile README | **$13.50** | Gumroad | <https://yinnattha.gumroad.com/l/qstoln> | Live page |
| Notion aesthetic | Pastel Blossom Aesthetic | **$19.99** | Gumroad | <https://sugarbun.gumroad.com/l/pastelblossom> | Live page |
| Notion aesthetic | Pink Student Dashboard | **$9.99** | Gumroad | <https://peachiesuga.gumroad.com/l/pinkstudent> | Live page |
| Notion aesthetic | Dark Aesthetic Life Dashboard | **$24.95** | Notion Marketplace | <https://www.notion.com/templates/dark-aesthetic-life-dashboard> | Price per search listing, **not verified** on the fetched page text |
| Notion aesthetic | Soft pink kawaii Notion dashboard | about **$10** | Etsy | <https://www.etsy.com/listing/1308980755> | Per search listing; Etsy blocks scrapers, **not verified** |
| Windows theme pack | ETERNALS Premium SkinPack for Win11 (theme, cursors, icons, wallpapers, sounds, Rainmeter) | **$9.99** | Gumroad | <https://skinpack.gumroad.com/l/ETERNALS_win11> | Live page |
| Windows theme pack | CORVETTE Premium SkinPack for Win11 and 10 | **$9.99** | Gumroad | <https://skinpack.gumroad.com/l/CORVETTE> | Live page |
| Desktop icon + wallpaper sets | Cozy Fall ($6.79), Froggy Plants ($6.50), Fantasy Land ($10.98), Witchy Aesthetic ($11.13) | **$6.50 to $11.13** | Etsy | <https://www.etsy.com/listing/1530101394>, <https://www.etsy.com/listing/1755602188>, <https://www.etsy.com/listing/1730847456>, <https://www.etsy.com/listing/1297211214> | Per search listing; Etsy blocks scrapers, **not verified** |

Dropped as dead: two Gumroad Windows-theme listings that returned 404, an Etsy-linked tracking URL, and several GitHub guess-URLs that 404ed.

**Read of the market:**
- Single-purpose README templates cluster at **$3 to $19**; the one with source code and a generator is $19.
- Notion aesthetic templates cluster at **$10 to $25**.
- Windows packs: **$5 to $12** on Etsy and Gumroad.
- A pack that covers **many tools with one measured palette** commands more ($15 to $40), and a brand-name suite reaches $79.99.
- WCAG-measured contrast is a real selling angle ("Every accent colour passes WCAG AA" in the $39.99 pack).
- Free versions are the funnel: GitSkins, the 5-template pay-what-you-want pack, and Retro Power-Up all pair a free taste with a paid unlock.

### 3.2 Where to sell and what it costs

| Channel | Fees (current) | Fit | Link |
|---|---|---|---|
| **Gumroad** | **10% + $0.50** per direct sale; **30%** when a new customer finds you via Gumroad Discover; no monthly fee; Gumroad is merchant of record and handles sales tax. Check the help center on whether card processing is extra | Best default for kits, ebooks, theme packs, license keys | [pricing](https://gumroad.com/pricing), [fees help](https://gumroad.com/help/article/66-gumroads-fees) |
| **Etsy** | **$0.20** listing (renews every 4 months or per sale), **6.5%** transaction fee, payment processing (varies by country), a one-time shop set-up fee; **Offsite Ads 15%** (12% over $10k/yr) when a sale comes via those ads | Strong for aesthetic packs, desktop icons, planners; shoppers search there | [Etsy fees](https://help.etsy.com/hc/en-us/articles/115014483627-What-are-the-Fees-and-Taxes-for-Selling-on-Etsy) |
| **Ko-fi** | Free plan: **0%** on one-time tips, **5%** on shop sales; payment-processor fees (about 3% + $0.30) on top. Ko-fi Gold removes the 5% (per search listing, $12/month, not re-verified) | Good for tips, memberships, small shop; fan-friendly | [Ko-fi fee help](https://help.ko-fi.com/hc/en-us/articles/360002506494-Does-Ko-fi-take-a-fee) (reachable in a browser; blocked to scripts) |
| **Notion Marketplace** | **8% + $0.40** per transaction; payouts every other Thursday, $20 minimum, 14-day hold; **approval waitlist that can take a few months**; you can also list a template that links to a third-party checkout | Notion templates | [Selling on Marketplace](https://www.notion.com/help/selling-on-marketplace) |
| **VS Code Marketplace** | Hosting is free but **no built-in paid extensions**; sellers use a free extension plus an external license (Gumroad key) | Themes: free taste on Marketplace and Open VSX, paid pack elsewhere | [Publishing extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [example of the license-key pattern](https://marketplace.visualstudio.com/items?itemName=nextgencode.mario-bros-theme) |
| **Chrome Web Store** | Chrome Web Store payments are deprecated; use an external payment service | Only if BALLS ever ships a browser extension | [Google's deprecation notice](https://developer.chrome.com/docs/webstore/cws-payments-deprecation.md.txt), [ExtensionPay](https://extensionpay.com/) |
| **userstyles.world** | Free community platform, no paid plans; runs on donations | Free userstyles that funnel to paid kits | [site](https://userstyles.world), [FAQ](https://userstyles.world/docs/faq) |
| **GitHub Sponsors** | 0% platform fee on sponsorships from personal accounts per GitHub docs; free to enable | Tips for open-source themes and userstyles | [About sponsorships, fees, and taxes](https://docs.github.com/en/sponsors/sponsoring-open-source-contributors/about-sponsorships-fees-and-taxes), [About GitHub Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) |

---

## 4. The BALLS look: retro arcade, soft Hawaiian, bright, accessible

A starter palette, with contrast ratios computed from the WCAG formula (AA needs 4.5:1 for normal text, 3:1 for large text and UI parts; see [WCAG 2.2 contrast minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum) and the [WebAIM checker](https://webaim.org/resources/contrastchecker/)). Verify again in a checker before shipping.

| Name | Hex | Role | Contrast pairings (computed) |
|---|---|---|---|
| Night Maze Navy | `#14143A` | Dark background; text on bright fills | Cream on Navy 16.54:1; Gold on Navy 12.21:1; Teal on Navy 8.13:1; Orange on Navy 7.52:1; Pink on Navy 6.00:1 |
| Plumeria Cream | `#FFF7E6` | Light background; text on dark | Navy on Cream 16.54:1 |
| Lei Gold | `#FFD23F` | Primary accent on dark (a generic arcade yellow, not a trademarked character color) | Navy on Gold 12.21:1 |
| Hibiscus Pink | `#FF5C8A` | Accent on **dark only**; navy text on pink 6.00:1 | **On Cream only 2.76:1, fails** |
| Lagoon Teal | `#2EC4B6` | Accent on **dark only**; navy text on teal 8.13:1 | **On Cream only 2.03:1, fails** |
| Lava Orange | `#FF8A3D` | Highlights on dark | 7.52:1 on Navy |
| Deep Hibiscus | `#B4124F` | Pink for **light** backgrounds | 6.27:1 on Cream |
| Ocean Ink | `#0B3D5C` | Headings on light | 10.73:1 on Cream |
| Palm Green | `#1E7F5C` | Success/green on light | 4.64:1 on Cream, passes AA by a hair; use for normal text only at that size or larger |

Design rules: never use color alone to carry meaning (add icon or label, which also helps colorblind viewers); ship a dark and a light version of everything; keep any animation under three seconds and offer a static version.

---

## 5. Eight product proposals for AudreyBuildsAI / Freedom Angel Corp

Seller name: **AudreyBuildsAI** or **Freedom Angel Corp** (legal name has no "s"). For public listings use "Lil Aud-Bod" or the AudreyBuildsAI brand rather than the internal "BALLS" nickname, which marketplace moderators may flag. Prices are proposals based on the comps above.

| # | Product | Format | Price range | Effort | Where to sell | Licensing cautions |
|---|---|---|---|---|---|---|
| 1 | **Hula Arcade GitHub Profile README Kit**: 3 profile layouts (light/dark `<picture>`), self-made pixel header and divider SVGs, pixel skill badges, ready-to-paste Actions workflows (snake, metrics) that write **static SVGs**, setup PDF | ZIP (Markdown, SVG, YAML) + PDF | **$12 to $19** (comps $3 to $19). Free "lite" layout on a public GitHub repo as the funnel | Medium (1 to 2 weeks) | Gumroad; Ko-fi; free lite on GitHub and Sponsors | Only original art. snk has **no license**, so reference the Action, never copy code. `metrics` is MIT. Skill icons and Simple Icons logos stay their owners' trademarks. Keep Octocat and GitHub logos out of the product ([GitHub logo rules](https://github.com/logos)). No hit counters or trackers |
| 2 | **"Make GitHub Gorgeous" booklet**: 20 to 30 page illustrated guide covering the settings, extensions, profile README, repo README, Pages | PDF (EPUB optional) | **$7 to $12** (comps $13.50 to $15 for broader career ebooks) | Small (3 to 5 days, reuses this playbook) | Gumroad; Ko-fi; free sample chapter | Cite tools with their licenses; no copied screenshots of other people's profiles; screenshots only of Audrey's own repos |
| 3 | **Hula Arcade Dev Palette Kit**: one measured palette as VS Code/Cursor theme (dark, light, high contrast), Windows Terminal scheme, Starship preset, oh-my-posh theme | VSIX + JSON/TOML files + guide | Free dark theme on VS Code Marketplace and Open VSX; **Pro pack $9 to $29** (comps $15 to $39.99) | Medium to large (2 to 3 weeks) | Marketplace + Open VSX for the free theme; Gumroad for Pro (license-key pattern as in the Retro Power-Up example) | Build from scratch or from an MIT base and **keep the MIT notice**. Never reuse Dracula Pro (proprietary). Check font licenses before bundling fonts. Name themes without game trademarks |
| 4 | **Hula Arcade for GitHub userstyle** (Stylus) | One `.user.css` file | **Free**, tips $3 to $5; funnel to #1 and #3 | Small to medium; **ongoing upkeep** because GitHub's HTML changes | userstyles.world; GitHub repo; GitHub Sponsors; Ko-fi | Write original CSS. If you fork Catppuccin userstyles (MIT), keep their license and credit. State clearly it needs GitHub's default theme with Increase contrast off, and offer no support for forks of GitHub's branding |
| 5 | **Soft Hawaiian Arcade Notion Dashboard**: dashboard, 30 page icons, 10 covers, widgets | Notion template + PNG/SVG icon pack | **$9 to $24** (comps $9.99, $19.99, about $25) | Medium (1 to 2 weeks) | Gumroad + Etsy first; apply to Notion Marketplace (waitlist can take months; 8% + $0.40) | Original icons and covers only; follow Notion Marketplace guidelines; no Notion logo as branding |
| 6 | **Windows 11 Hula Arcade Desktop Pack**: 4K wallpapers (light/dark), `.ico` folder icons, a Rainmeter skin, a Lively animated wallpaper, matching Windows Terminal scheme, install guide | ZIP + PDF | **$5 to $12** (comps $6.50 to $11.13 on Etsy, $9.99 on Gumroad) | Medium | Etsy (shoppers search there) + Gumroad | Use supported Settings themes only; do not ship system-file patchers. Rainmeter and Lively are GPL tools: link to them, don't bundle them. No Windows logos or Pac-Man/ghost imagery. Etsy has a set-up fee and Offsite Ads fee |
| 7 | **Pixel Hula Sticker and Icon Pack**: about 60 original pixel sprites (hibiscus, plumeria, pellets, lei, palm, arcade cabinet, glitch-blob enemies) as SVG/PNG for READMEs, Notion, and social covers | SVG + PNG + license PDF | **$6 to $12**; bundle with #1 | Small | Gumroad; Etsy; Ko-fi | Original art with a clear personal/commercial license. Avoid Pac-Man-style ghosts with eyes and the Pac-Man wedge; use original "glitch blobs". Hula is a living Hawaiian cultural practice: depict respectfully (flowers, ocean, music), avoid caricature, and consider asking a Native Hawaiian reviewer |
| 8 | **Beauty Bundle** (#1 + #2 + #3 Pro + #7) | Single download | **$29 to $39** | Small once the others exist | Gumroad (bundle) | Same cautions as the parts; license text per file |

**Ranking (value per effort):** #2 booklet, #1 README Kit, #3 palette kit, then #7 sticker pack, #5 Notion, #6 desktop pack, #4 userstyle (free funnel), #8 bundle.

### Recommended launch order
1. Week 1: finish the palette and sprites (#7 assets), publish the free Hula Arcade profile on Audrey's own GitHub as a live demo.
2. Week 2: booklet (#2) plus free sample chapter; README Kit (#1) lite on GitHub.
3. Week 3 to 4: Kit (#1) paid on Gumroad; theme (#3) free tier on Marketplace and Open VSX.
4. After first sales: Notion (#5) and desktop pack (#6) on Etsy; bundle (#8).

### Questions for Audrey
- Approve the palette (or swap hues)?
- Which seller name: AudreyBuildsAI or Freedom Angel Corp?
- Okay to open a Gumroad account and Ko-fi page for AudreyBuildsAI? (BALLS will not create or publish anything until told.)
- Keep the Pac-Man wording out of public copy? (Recommended; use "retro arcade".)

---

## 6. Quick wins for GitHub (do these first, all free)

1. **Static SVGs via GitHub Actions** instead of hosted stat widgets (snake via `snk`, stats via `metrics` or `github-profile-summary-cards`). Today's public stats and activity-graph endpoints were down (503, 402), so this is the single biggest reliability win.
2. **Pick the right built-in theme**: Settings → Appearance → Dark dimmed, a colorblind variant, or the "Increase contrast" switch, or sync day/night.
3. **Light/dark `<picture>` banner + alert callouts** in the profile README and top repos (all native Markdown, zero extensions).
4. **Material Icons for GitHub + Refined GitHub** (free, MIT, open source).
5. **Stylus + Catppuccin userstyle** (Pink/Peach accent) for an instant soft pastel look, with the default-theme caveat above.

---

## 7. Sources and verification notes

- All GitHub Docs, GitHub Blog, Primer, Microsoft Learn, Notion Help, Gumroad, and marketplace links above were fetched and returned 200. Repo license, star, and activity numbers were read from the GitHub API on 2026-11-12.
- Live endpoint tests on 2026-11-12: github-readme-stats public instance 503; github-readme-activity-graph public instance 402; streak-stats.demolab.com, readme-typing-svg.demolab.com, capsule-render.vercel.app, skillicons.dev, and img.shields.io 200.
- VS Code Marketplace IDs were confirmed through the Marketplace query API (install counts shown above).
- **Not verified:** Etsy prices (Etsy blocks scripted fetches), the Notion Marketplace $24.95 price, and Ko-fi Gold's $12/month (search summary only).
- GitHub's exact theme list is shown on the Appearance page; the table above combines the changelog and Primer guidance.
- Nothing here is legal advice; confirm trademark and license questions before selling.

— BALLS
