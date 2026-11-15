# Hula Arcade Dev Palette Kit: Install Guide

One palette, five places: VS Code or Cursor, Windows Terminal, Starship, and oh-my-posh. Pick the pieces you want. Nothing here changes system files, and every step can be undone by deleting the lines you added.

## What is in the bundle

| Folder | File | What it is |
|---|---|---|
| `vscode/` | `hula-arcade-dev-palette-1.0.0.vsix` | Both themes: **Hula Arcade Night** (dark) and **Aloha Day** (light) |
| `windows-terminal/` | `hula-arcade.schemes.json` | Two color schemes: Hula Arcade Night and Hula Arcade Aloha Day |
| `starship/` | `hula-arcade.starship.toml` | Starship prompt with a night palette and a day palette |
| `oh-my-posh/` | `hula-arcade-night.omp.json`, `hula-arcade-day.omp.json` | oh-my-posh themes for dark and light terminals |
| `palette/` | `palette.json`, `CONTRAST.md` | The colors and the measured contrast ratios |

## The palette

| Name | Hex | Role |
|---|---|---|
| Navy | `#1B1F4B` | Sidebar, panels, headings |
| Deep ink | `#14163A` | Dark editor background, text on light |
| Pellet yellow | `#FFD23F` | Cursor, numbers, buttons (dark theme) |
| Lagoon teal | `#19C3B1` | Strings, links, status bar (dark theme) |
| Hibiscus | `#D81B60` | Status bar and buttons (light theme), accents |
| Sand cream | `#FFF4E0` | Light editor background, text on dark |
| Lei lavender | `#B8A1FF` | Functions, selections (dark theme) |

Brand hibiscus, teal, yellow and lavender are too faint to use as small text on every background, so the kit adds a few **derived shades** (a lighter hibiscus for dark backgrounds, darker teal, violet, gold and hibiscus for cream). They are listed in `palette.json`. Every text color in every file clears **4.5:1** (WCAG AA). The numbers are in `CONTRAST.md`.

## 1. VS Code or Cursor

1. Open the Extensions view (`Ctrl+Shift+X`, or `Cmd+Shift+X` on a Mac).
2. Click the `...` menu at the top of the panel and choose **Install from VSIX...**.
3. Pick `hula-arcade-dev-palette-1.0.0.vsix`.
4. Press `Ctrl+K Ctrl+T` (`Cmd+K Cmd+T` on a Mac) and choose **Hula Arcade Night** or **Aloha Day**.

Command-line install, if you prefer:

```bash
code --install-extension hula-arcade-dev-palette-1.0.0.vsix
# Cursor:
cursor --install-extension hula-arcade-dev-palette-1.0.0.vsix
```

**Follow your operating system's day and night mode.** Add this to your user `settings.json` (Command Palette, then "Preferences: Open User Settings (JSON)"):

```json
{
  "window.autoDetectColorScheme": true,
  "workbench.preferredDarkColorTheme": "Hula Arcade Night",
  "workbench.preferredLightColorTheme": "Aloha Day"
}
```

> Tip: if you already have another theme installed, the theme picker lists both. Switching never deletes anything.

## 2. Windows Terminal

1. Open Windows Terminal, then **Settings**, then **Open JSON file** (bottom left).
2. Find the `"schemes"` array. Open `hula-arcade.schemes.json` and copy the two objects inside its `"schemes"` array. Paste them into your `"schemes"` array, with a comma between objects.
3. To use a scheme everywhere, put it in `profiles.defaults`:

```json
"profiles": {
  "defaults": {
    "colorScheme": "Hula Arcade Night"
  }
}
```

4. Save. Open tabs update immediately. Use `"Hula Arcade Aloha Day"` for a light terminal.

Font tip: any monospace font works. If you also use Starship or oh-my-posh glyphs, install a Nerd Font (for example "Cascadia Code NF") and set it under Appearance. Fonts are not included in this kit and keep their own licenses.

## 3. Starship

1. Install Starship from <https://starship.rs> (for Windows: `winget install --id Starship.Starship`).
2. Copy the preset into place:

```bash
# macOS / Linux
mkdir -p ~/.config && cp hula-arcade.starship.toml ~/.config/starship.toml
```

```powershell
# Windows PowerShell
Copy-Item .\hula-arcade.starship.toml $HOME\.config\starship.toml
```

3. Turn Starship on in your shell, if you have not already:

```bash
# bash: add to ~/.bashrc      zsh: add to ~/.zshrc
eval "$(starship init bash)"
```

```powershell
# PowerShell: add to $PROFILE
Invoke-Expression (&starship init powershell)
```

4. The preset uses the night palette. For a light terminal, change one line near the top of the file:

```toml
palette = "hula_arcade_day"
```

The preset does not need a Nerd Font. It uses ordinary Unicode shapes only.

## 4. oh-my-posh

1. Install oh-my-posh from <https://ohmyposh.dev> and a Nerd Font. The themes use the powerline arrow glyph, which needs a Nerd Font or another Powerline-patched font.
2. Point your shell at the theme file:

```powershell
# PowerShell: add to $PROFILE (use your real path)
oh-my-posh init pwsh --config "$HOME\themes\hula-arcade-night.omp.json" | Invoke-Expression
```

```bash
# bash / zsh: add to ~/.bashrc or ~/.zshrc
eval "$(oh-my-posh init bash --config ~/themes/hula-arcade-night.omp.json)"
```

3. For a light terminal use `hula-arcade-day.omp.json` instead.

## Troubleshooting

- **A theme is missing from the list.** Reload the window (Command Palette, "Developer: Reload Window") and look again.
- **Boxes or question marks in the prompt.** Install a Nerd Font and select it in your terminal, or use the Starship preset, which needs no special font.
- **PowerShell blocks the profile.** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`, then open a new tab.
- **Colors look different on my monitor.** Terminals may apply their own minimum-contrast setting. Windows Terminal's "Automatically adjust lightness of indistinguishable text" can be turned off under Appearance.

## Undo

Delete the lines you added. In VS Code, uninstall the extension from the Extensions view. Nothing else was changed.

## Licenses and credits

- Pro bundle: see `LICENSE.txt` (single purchaser, use on your own devices, no resale).
- The dark theme alone is also distributed as a free package under the MIT license.
- Everything in this kit was drawn and written from scratch by AudreyBuildsAI. It contains no third-party code.
- Not affiliated with GitHub, Microsoft, Starship, or oh-my-posh. Product names belong to their owners.

Thank you for supporting AudreyBuildsAI (Freedom Angel Corp). Mahalo!
