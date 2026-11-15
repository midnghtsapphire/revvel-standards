# Hula Arcade GitHub Profile README Kit: Setup Guide

This kit gives you three ready-made profile layouts, original pixel banners, badges and dividers, and three GitHub Actions that draw your contribution snake and stats as **static SVG files**. Everything is free on GitHub Free for a public profile repository. No paid plan, no tracking, no hit counters, and no hosted image widgets that can go down.

## What is in the box

| Path | What it is |
|---|---|
| `layouts/01-arcade-hero/README.md` | Big banner, about table, toolbox badges, snake, stats |
| `layouts/02-aloha-minimal/README.md` | Short and calm: banner, intro, badges, links |
| `layouts/03-builder-dashboard/README.md` | Scoreboard, project table, workflow diagram, collapsible sections |
| `assets/banners/` | Hero, minimal and dashboard banners, each in light and dark |
| `assets/dividers/` | Pellet and wave dividers, light and dark |
| `assets/badges/` | 14 toolbox badges and 6 status badges (text only, no logos) |
| `assets/sprites/` | The hula dancer, Auky, hibiscus, palm, pellet and glitch blob as SVG |
| `.github/workflows/` | `pixel-stats.yml`, `snake.yml`, `metrics.yml` (the same files are also in `workflows/`) |
| `scripts/` | `pixel_stats.py`, `make_banner.py`, `make_badge.py`, `publish-output.sh`, `hula_art.py` |
| `LICENSE.txt` | Your license |

## Step 1. Make your profile repository

1. On GitHub, create a **public** repository whose name is **exactly your username**. For the user `octo-fan` the repository is `octo-fan/octo-fan`.
2. Tick "Add a README file" so the repository is not empty.
3. GitHub shows a banner on the repository page saying that this README appears on your profile.

## Step 2. Pick a layout

1. Open one of the folders in `layouts/` and copy its `README.md` over the README in your new repository.
2. Copy the whole `assets/` folder into the repository root, so the pictures sit at `assets/banners/...`.
3. Upload by drag and drop in the browser (Add file, then Upload files) or with git.

## Step 3. Make it yours

Open the README and search for the word **EDIT**. Every place you should change has an `EDIT:` comment or text. Then search for **YOUR-USERNAME** and replace it with your GitHub username. It appears in the picture addresses for the snake and the stats, and in the links.

The README uses the `<picture>` element so visitors in dark mode see the dark banner and visitors in light mode see the light one. Every image has `alt` text for screen readers. Keep the alt text when you edit.

## Step 4. Turn on the snake and the stats

The snake and the stats are drawn by GitHub Actions, once a day, into SVG files on a branch called `output`. The pictures in your README point at that branch, so they can never be "down" because of someone else's server.

1. Copy the `.github/workflows/` folder and the `scripts/` folder into your repository root. In the browser: Add file, Upload files, and drop both folders in.
2. Open the **Actions** tab. If GitHub asks you to enable workflows, click the green button.
3. Choose **Pixel stats** in the left list, click **Run workflow**, then **Run workflow** again. Wait for the green check (about 30 seconds).
4. Do the same for **Snake**.
5. Refresh your profile. The snake and the stats now appear. After that they update on their own every day.

> [!NOTE]
> If a run fails with a 403 error when pushing, open Settings, then Actions, then General, scroll to **Workflow permissions**, choose **Read and write permissions**, save, and run it again.

### How the pieces work

- `pixel-stats.yml` runs `scripts/pixel_stats.py`, a small script that uses only Python's standard library and the built-in token every Action already has. It writes `stats-light.svg` and `stats-dark.svg`.
- `snake.yml` calls the published `Platane/snk` Action to draw your contribution graph as a snake. The Action is used as published; none of its code is in this kit. It is pinned to an exact version (a commit SHA), so it cannot change under you.
- `publish-output.sh` copies the generated files onto the `output` branch with plain `git`. Files from the two workflows live side by side.
- Public repositories get free Action minutes. Each run takes under a minute.

### Optional: richer metrics

`metrics.yml` uses the open-source `lowlighter/metrics` Action to draw a detailed stats image. It needs a personal access token because it reads more of your account than the built-in token can.

1. In GitHub, go to Settings, Developer settings, Personal access tokens, and create a **classic** token. For public data only, no scopes are needed. Name it `metrics`.
2. In your profile repository, go to Settings, Secrets and variables, Actions, and add a repository secret named `METRICS_TOKEN` with that token.
3. Run the **Metrics (optional)** workflow once. It commits `assets/generated/metrics.svg` to your default branch.
4. In the Builder Dashboard layout, remove the comment markers around the metrics image.

Until you add the secret, the workflow does nothing. The metrics project has been updated less often than the other tools, so treat this one as a bonus.

## Step 5. Customize banners and badges (optional)

You need Python 3.8 or newer. No packages to install.

```bash
# new banner text (letters, numbers and . , ! ? - : / ' + # ( ) & work)
python3 scripts/make_banner.py --layout hero --title "HI, I'M ADA" --tagline "I BUILD COMPILERS|AND LOVE TEA" --out assets/banners

# new badge
python3 scripts/make_badge.py "OPEN TO WORK" --color teal --out assets/badges/status-open-to-work.svg

# preview your stats offline with made-up numbers
python3 scripts/pixel_stats.py --sample --out preview
```

`make_banner.py` writes the light and dark files with the same names the layouts already use, so you do not have to edit the README. The script tells you when text is too long to fit.

## Accessibility and kindness checklist

- Text and background pairs in the banners and badges are at least 4.5:1 contrast: ink on cream is 15.98:1, cream on ink is 15.98:1, deep hibiscus on cream is 4.54:1, pellet yellow on ink is 12.06:1.
- Do not use color alone to carry meaning. The badges all have words.
- The only moving picture is the snake. If you prefer a calm profile, delete the snake section.
- Viewers can pause animated images in their GitHub accessibility settings.

## Troubleshooting

| Problem | Fix |
|---|---|
| Banner is missing | Check that `assets/banners/` is at the repository root and the README path matches. |
| Snake or stats show a broken image | Run the workflows once (Step 4). Check that the `output` branch exists, and that you replaced `YOUR-USERNAME` in both places. |
| Workflow fails with 403 | Turn on Read and write permissions (note in Step 4). |
| Nothing updates after months | GitHub pauses scheduled workflows in public repositories after 60 days without repository activity. Open the Actions tab and re-enable them. |
| Stats numbers look low | The stats count public repositories you own, not forks. |
| `make_banner.py` says text is too long | Shorten the title or put the tagline on two lines with `|`. |

## Updating the pinned Actions

The workflows pin each third-party Action to a full commit SHA with the version in a comment. To update, find the Action's new release on its GitHub page, copy the full commit SHA of the tag, and replace the old SHA. Test with Run workflow.

## Credits and licensing

- Pro kit license: see `LICENSE.txt`.
- Pixel art, banners, badges, sprites, scripts, and the 5x7 pixel font were all drawn and written from scratch for this kit.
- Actions used from their own repositories (not included): `actions/checkout` (MIT), `Platane/snk` (the repository has no license file, so this kit only calls the published Action and copies none of its code), and `lowlighter/metrics` (MIT).
- Not affiliated with GitHub or Microsoft. GitHub is a trademark of GitHub, Inc.

Thank you for supporting AudreyBuildsAI (Freedom Angel Corp). Mahalo!
