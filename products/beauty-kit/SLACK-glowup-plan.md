# BALLS Slack Glow-Up Plan

**Brand:** Freedom Angel Corp / AudreyBuildsAI · **Look:** retro arcade + soft Hawaiian · **Mascots:** Auky and BALLS (Lil Aud-Bod)
**Date:** 2026-11-12 · **Author:** BALLS

> Legend. **Cost:** FREE = every plan, PAID = Pro or higher. **Who:** CONNECTOR = BALLS can do it through the Slack connector, AUDREY = only Audrey can click it.

## 1. What the audit found (read-only)

The workspace audit is a brand-new workspace with three public channels, one member, default channel purposes and no custom emoji. Workspace-specific details stay in the private Page, not in this public repo.


## 2. Plan reality check (what needs a paid plan)

Source: [Slack plans and features](https://slack.com/help/articles/115003205446-Slack-plans-and-features-by-plan) and [Slack pricing](https://slack.com/pricing) (links verified 2026-11-12).

| Feature | Free | Pro | Business+ |
| --- | --- | --- | --- |
| Custom sidebar sections | no | yes | yes |
| Standalone canvases, canvas templates | no (one canvas per channel or DM) | yes | yes |
| Lists | no | yes | yes |
| Workflow Builder | no | yes | yes |
| Conditional branching in workflows | no | no | yes |
| Huddles | 1:1 only | yes | yes |
| Slack Connect channels with other companies | 1:1 DMs only | yes | yes |
| Message history | 90 days | unlimited | unlimited |
| Apps | 10 | unlimited | unlimited |
| Custom emoji, emoji packs, aliases | yes | yes | yes |
| Custom themes, default status suggestions | yes | yes | yes |

List prices seen on Slack's own pages: Pro $8.75 per user per month billed monthly, $7.25 billed annually. Business+ $18 monthly, $15 annually.

## 3. The look: custom sidebar themes

Slack's current custom theme takes **4 colors**: System navigation, Selected items, Presence indication, Notifications. Slack's help page ([Change your Slack theme](https://slack.com/help/articles/205166337-Change-your-Slack-theme)) says to use Profile picture, Preferences, Appearance, Custom theme. Slack picks the text color itself. A third-party test on 5 Oct 2026 ([slack.green](https://slack.green/en/blog/slack-themes)) found Import accepts exactly 4 or exactly 8 colors with `#`, and rejects the text that Slack's own Share button copies ("Check out my Slack theme: ..."), so paste only the colors.

| Theme | Paste this (4 colors) | Notes |
| --- | --- | --- |
| **Arcade Night** (dark, default) | `#1B1F4B,#FFD23F,#19C3B1,#D81B60` | Navy sidebar, pellet-yellow selection, lagoon presence dot, hibiscus badge. Tick Darker sidebars. |
| **Aloha Day** (light) | `#FFF4E0,#FFD23F,#0B6E65,#C2185B` | Sand-cream sidebar. Untick Darker sidebars so text turns dark. |
| Arcade Night, legacy 8-color form | `#1B1F4B,#14163A,#FFD23F,#14163A,#2A2F6B,#FFF4E0,#19C3B1,#D81B60` | Slack keeps colors 1, 3, 7, 8 and drops the rest. |

Contrast checks (WCAG ratios computed by BALLS): cream text on navy 14.3:1, navy text on yellow 12.1:1, white on hibiscus `#D81B60` 4.95:1, white on badge `#C2185B` 5.9:1, teal `#19C3B1` on navy 7.1:1, `#0B6E65` on cream 5.6:1.

Palette: navy `#1B1F4B`, deep ink `#14163A`, pellet yellow `#FFD23F`, lagoon teal `#19C3B1`, hibiscus `#D81B60`, sand cream `#FFF4E0`, lei lavender `#B8A1FF`.

- Cost: FREE. Who: AUDREY (a theme is personal to each user's account, so BALLS cannot set it).
- Tip: paste the theme string into any message and Slack shows an Apply Slack theme button for everyone in that channel. Posting that message is also an Audrey step.

## 4. Channel naming and sidebar sections

**Channel names cannot contain emoji.** Names are lowercase letters, numbers, hyphens and underscores, 80 characters at most ([conversations.create docs](https://docs.slack.dev/reference/methods/conversations.create), [Slack's naming guidance](https://slack.com/help/articles/217626408-Create-guidelines-for-channel-names), which recommends text prefixes like `help-`, `team-`, `proj-`, `announce-`). So the emoji go on **sidebar section names** and in channel **topics**, and the channel names use clean text prefixes.

**Convention:** one hub channel per brand named exactly for the brand, extra channels as `brand-topic` (for example `audreybuildsai-build-log`). Workspace-wide channels use `announce-`, `social-`, `fleet-`.

### Sidebar sections (PAID, AUDREY)
Sections are personal to each user. Create via Home, hover Channels, three dots, Channel section ([help](https://slack.com/help/articles/360043207674-Organize-your-sidebar-with-custom-sections)). On a paid plan Audrey can share a section so others get it in one click ([help](https://slack.com/help/articles/29873996048019-Share-sidebar-sections-in-Slack)).

| Order | Section name (with emoji) | Channels |
| --- | --- | --- |
| 1 | 📣 Start Here | announce-all-hands |
| 2 | 🌟 Freedom Angel Corp | freedom-angel-corp |
| 3 | 🕹️ AudreyBuildsAI | audreybuildsai |
| 4 | 🌺 oaudrey | oaudrey |
| 5 | ⭐ Reese Reviews | reese-reviews |
| 6 | 🌅 Rising Aloha | rising-aloha |
| 7 | 🕊️ Uprising Hope | uprising-hope |
| 8 | 🔍 Forensic Finders | forensic-finders |
| 9 | 🦋 Emmyliette | emmyliette |
| 10 | 🤖 Fleet and Lounge | fleet-revvel-standards, social-random |

**Free-plan fallback:** no custom sections, so sort the sidebar alphabetically and rely on the prefixes, then star the 3 channels used most.

### Channel renames and new channels (PROPOSALS; the connector has no rename, create-channel or set-topic tool, so Audrey does these: FREE)

| Proposed rename (public channel) | New name |
| --- | --- |
| #all-oaudrey | #announce-all-hands |
| #random | #social-random |
| #revvel-standards | #fleet-revvel-standards |

**New brand channels to create** (name, then topic up to 250 characters, then description):

| Channel | Topic | Description |
| --- | --- | --- |
| #freedom-angel-corp | 🌟 Freedom Angel Corp HQ: company news, decisions, brand rules | The parent company hub. Legal name is Freedom Angel Corp (no "s"). |
| #audreybuildsai | 🕹️ Building AI in public: bots, builds, wins and oops | Build log and mascot fleet for AudreyBuildsAI. |
| #oaudrey | 🌺 oaudrey home base: site, launches, front-door updates | Everything about the oaudrey front door. |
| #reese-reviews | ⭐ Reese Reviews: picks, drafts, honest opinions | Review drafts, research and publishing. |
| #rising-aloha | 🌅 Rising Aloha: good-morning energy and island-bright ideas | Ideas and content for Rising Aloha. |
| #uprising-hope | 🕊️ Uprising Hope: projects that lift people up | Projects and updates for Uprising Hope. |
| #forensic-finders | 🔍 Forensic Finders: source-first public-records research | Research notes and findings. Cite sources. |
| #emmyliette | 🦋 Emmyliette: books, drafts and series planning | Manuscripts, covers and launch planning. |

Each new channel should get its brand-hub canvas as the first tab (see section 5) and one short intro post signed BALLS: "Aloha! This is the home of &lt;brand&gt;. Pellets, wins and questions go here. 🌺 — BALLS".

## 5. Canvases as branded homepages

Channel tabs hold up to 15 canvases, lists, workflows or links ([help](https://slack.com/help/articles/32562841868307-Add-and-manage-tabs-in-channels-and-direct-messages)). Canvas templates and standalone canvases are PAID ([help](https://slack.com/help/articles/25893367794195-Find-and-use-canvas-templates)).


### Welcome canvas draft
```
Aloha, player one! 🌺 Welcome to the oaudrey arcade, home of the Freedom Angel Corp family of brands.
Grab a pellet, find your channel, and chomp something wonderful today. 🕹️

## ✨ Meet your mascots
- Auky 🟡 the round yellow chomper who gobbles bugs and keeps us on track.
- BALLS (Lil Aud-Bod) 🌺 the daring pixel hula girl who makes everything beautiful.

## 🗺️ Start here
announce-all-hands: announcements · social-random: jokes and wins · fleet-revvel-standards: standards and the bot fleet playbook

## 🎮 The eight brands
Freedom Angel Corp · AudreyBuildsAI · oaudrey · Reese Reviews · Rising Aloha · Uprising Hope · Forensic Finders · Emmyliette

## 🎨 House style
Bright and friendly, contrast 4.5:1 or better. Navy #1B1F4B, yellow #FFD23F, teal #19C3B1, hibiscus #D81B60, cream #FFF4E0.

## ✅ First-day checklist
Set a status · Say hi in your brand channel · Star your channels · Ask Auky or BALLS if stuck

Fail, regroup, ship. 🌺 — BALLS
```
Hub template for each brand: tagline, quick facts (brand, home channel, accent color, mascots), mission, key links, this-week checklist, look and feel. Accent colors: Freedom Angel Corp `#1B1F4B` (cream text 14.3:1), AudreyBuildsAI `#FFD23F` (ink text 12.1:1), oaudrey `#D81B60` (white 4.95:1), Reese Reviews `#0B6E65` (white 6.1:1), Rising Aloha `#FF8A3D` (ink 7.4:1), Uprising Hope `#6A4CC3` (white 6.1:1), Forensic Finders `#2A2F6B` (cream 11.2:1), Emmyliette `#FF5D8F` (ink 6.0:1).

**Lists (PAID):** use one list as a content calendar or bot-task tracker per brand, with Status, Owner and Due columns. The connector can create and fill lists (slack_create_list and slack_add_list_record) once Audrey approves a layout. Not created yet.

## 6. Custom emoji wishlist (FREE, AUDREY uploads)

Rules: JPG, PNG or GIF, square, under 128 KB, 128 by 128 works best, GIFs up to 50 frames, names use lowercase letters, numbers, hyphens and underscores ([Slack help](https://slack.com/help/articles/206870177-Add-custom-emoji-and-aliases-to-your-workspace)). Emoji upload is desktop and iOS only. The connector can search emoji but not upload them. You can drag many files at once into Customize workspace, Emoji.

| Set | Emoji names |
| --- | --- |
| BALLS (hula girl) | `:balls-hula:` (animated), `:balls-wave:`, `:balls-chomp:`, `:balls-shipit:`, `:balls-oops:`, `:balls-sparkle:`, `:balls-party:` (animated), `:balls-brb:`, `:balls-heart:`, `:balls-dare:` |
| Auky (yellow chomper) | `:auky:`, `:auky-chomp:` (animated), `:auky-hibiscus:`, `:auky-facepalm:`, `:auky-bugbite:`, `:auky-thumbsup:`, `:auky-sleepy:`, `:auky-cheers:` |
| Arcade status | `:pellet:`, `:power-pellet:`, `:build-green:`, `:build-red:`, `:ghost-bug:`, `:level-up:`, `:coin-drop:`, `:high-score:` |
| Brand badges | `:fac:`, `:abai:`, `:oaudrey:`, `:reese-reviews:`, `:rising-aloha:`, `:uprising-hope:`, `:forensic-finders:`, `:emmyliette:` |
| Aliases (easy codes) | `:aloha:` for BALLS wave, `:chomp:` for Auky chomp, `:ship:` for BALLS shipit |

Use original art only. [Slackmojis](https://slackmojis.com) is handy for generic reactions (parrots, party, retro-style) but it hosts lots of third-party characters (Mario, Kirby, Sonic and more) and says it is not affiliated with Slack, so do not resell those and avoid Pac-Man or Bandai Namco imagery in anything public. Slack's built-in Emoji packs tab (Add Emoji, Emoji packs) is a free way to add curated sets in one click.

## 7. Workflows (PAID, AUDREY builds; BALLS drafts)

Workflow Builder lives in the sidebar under Agents and tools, then Workflows, New, Build Workflow ([help](https://slack.com/help/articles/17542172840595-Build-a-workflow--Create-a-workflow-in-Slack)). Triggers include a person joining a channel, a schedule, a message with keywords, an emoji reaction, a link and a list update. No conditionals needed here (those are Business+).

**Workflow A, Welcome Aloha.** Trigger: When a person joins a channel (announce-all-hands). Step 1: Send a message to "the person who joined": "Aloha, <name>! 🌺 I'm BALLS, your hula-girl guide. Start with the Welcome canvas (tab at the top of this channel), pick your brand channel, and set a fun status. Fail, regroup, ship. — BALLS". Add a button "Open the Welcome canvas" (open a link). Name: "🌺 Welcome Aloha", icon: BALLS.

**Workflow B, Daily Chomp (standup).** Trigger: On a schedule, weekdays 9:00 AM America/Denver, in audreybuildsai. Step 1: Send a message to the channel: "🕹️ Daily Chomp! Reply in this thread: 1) What did you chomp yesterday? 2) What are you chomping today? 3) Any ghosts (blockers)? — BALLS". Optional step: add a form step ("Yesterday", "Today", "Blockers") and post the answers.

**Workflow C, Win Wall.** Trigger: When an emoji reaction is used (:tada: or :balls-party: in each brand channel). Step: Send a message to a wins channel, "🏆 New win!" with a link to the message.

Without Pro, the free substitutes are scheduled messages and Reminders. BALLS can schedule a message through the connector (slack_schedule_message) if Audrey approves it, which gives a free-plan style daily prompt.

## 8. Message design: Block Kit and App Home

Block Kit builds rich messages from JSON `blocks` (up to 50 per message, 100 in an App Home tab) ([Block Kit docs](https://docs.slack.dev/block-kit/), [App Home docs](https://docs.slack.dev/surfaces/app-home)). Block Kit Builder is linked from those docs. Always put the real content in the top-level `text` field too, because screen readers read that field and not the blocks. Needs a Slack app with a bot token, so it is an AUDREY (or code) task, and apps on Slack infrastructure are PAID. Starter message:

```json
{
  "text": "Aloha! Daily Chomp is open: what did you chomp, what's next, any ghosts?",
  "blocks": [
    {"type": "header", "text": {"type": "plain_text", "text": "🕹️ Daily Chomp", "emoji": true}},
    {"type": "section", "text": {"type": "mrkdwn", "text": "*Aloha!* Reply in the thread:\n• What did you chomp yesterday?\n• What are you chomping today?\n• Any ghosts (blockers)?"}},
    {"type": "context", "elements": [{"type": "mrkdwn", "text": "🌺 from BALLS · Fail, regroup, ship"}]}
  ]
}
```
App Home idea: a "BALLS Home" tab with the eight brand buttons, the week's wins and links to each brand-hub canvas.

## 9. Huddles, status, Connect, apps

- **Huddles** (1:1 on Free, unlimited on paid). Pick the huddle theme from the three-dot menu: Peach, Bubble Gum or Midnight match the palette. Video background upload only appears if Slack has switched on the new picker for the workspace, otherwise you get blur and 6 preset pictures. Source for those details is a third-party test, [slack.green huddle backgrounds](https://slack.green/en/blog/slack-huddle-background) (29 Sep 2026), with Slack's [huddle help](https://slack.com/help/articles/4402059015315-Use-huddles-in-Slack-Use-huddles-in-Slack). AUDREY.
- **Status presets** (FREE, AUDREY as Owner): Admin, Edit workspace, Statuses ([help](https://slack.com/help/articles/115002531586-Customize-status-suggestions-for-your-workspace)), custom emoji allowed. Proposed set: 🕹️ In the maze (heads-down, 2 hours), 🌺 Aloha break (30 minutes), 🚀 Shipping (1 hour), 🎙️ In a huddle (1 hour), 🤖 Bot wrangling (today), 🌴 Away, back soon (today).
- **Slack Connect** (PAID for shared channels, FREE for 1:1 DMs; [guide](https://slack.com/help/articles/115004151203-A-guide-to-Slack-Connect)). Good for brand collaborators and Reese Reviews partners. AUDREY.
- **Marketplace apps** ([Slack Marketplace](https://slack.com/marketplace)). Polish picks, all with free tiers per [Thread Patrol's 2026 roundup](https://thread-patrol.com/blog/best-apps-for-slack) (vendor-run list, confirm prices): GitHub (PR and issue notifications in audreybuildsai, free), Donut (intros and celebrations, free plan, standard from $74 a month), Geekbot (async standups, free up to 10, $2.50 per participant), Polly (polls, free), Google Calendar and Giphy for everyday delight. Workspace admins may need to approve installs. AUDREY.

## 10. Sellable product angles: "Slack Glow-Up Kit"

Verified comparables (checked 2026-11-12):

| Listing | Price | Link |
| --- | --- | --- |
| Pastel Time Slack theme (4-page PDF), Gumroad | $2 | [link](https://onsaider.gumroad.com/l/pastel_time_slack_theme) |
| Block Emojis, 100 pixel emoji, itch.io | $1 minimum | [link](https://pixelpiledriver.itch.io/block-emojis) |
| Slack Emoji Pack, 17 matching emoji from one photo, Custom Emoji | $4.99 | [link](https://www.customemoji.com/emote-pack/for/slack) |
| Climate Change Slack Emoji Pack, 67 emoji, Gumroad | $50 | [link](https://nicolegkelner.gumroad.com/l/slack) |

Unverified (search snippet only, the pages blocked or errored): an Etsy 24-emote pack at about £9.62, Etsy emoji sets about $10 to $30, a Slack Pack of 80 emoji at $5, a Notion Slack set-up guide at $12, a Make.com onboarding blueprint at $39.

| Product idea | Contents | Price idea |
| --- | --- | --- |
| Theme Pack | 6 four-color themes with contrast notes and a visual guide | $5 to $9 |
| BALLS and Auky Emoji Pack | 30 to 40 original emoji at 128 px, upload guide, alias list | $9 to $19 |
| Canvas Starter | welcome canvas plus brand-hub template as pasteable Markdown | $9 to $15 |
| **Slack Glow-Up Kit** (flagship) | themes, emoji, canvas templates, naming guide, workflow recipes, Block Kit starter JSON | $29 to $39 |
| Done-with-you setup | Audrey or BALLS tailors the kit to a buyer's brand | $79 to $149 |

Pricing logic: the cheapest comps are $1 to $5 for thin files, while a themed 67-emoji pack holds at $50, so bundles with a distinct art style and a how-to can sit at $29 to $39. These are ideas to test, not guarantees. Ship original art only, add a clear license, and avoid Pac-Man or other third-party characters. Slack canvas templates live inside a workspace, so the kit should ship the canvases as pasteable Markdown.

## 11. Top 5 changes ranked by wow-per-effort

1. **Apply Arcade Night** (about 1 minute, FREE, AUDREY). Instant brand feel.
2. **Create the eight brand channels with topics and descriptions** (about 15 minutes, FREE, AUDREY). Gives every brand a home and clears the "generic" look.
3. **Sidebar sections with emoji for the eight brands** (about 10 minutes, PAID, AUDREY). Biggest visual upgrade to the left rail.
4. **Upload the starter BALLS and Auky emoji and set status presets** (about 30 minutes plus art, FREE, AUDREY). Gives the mascots a daily presence.
5. **Pin the Welcome canvas and brand-hub canvases as channel tabs and turn on Welcome Aloha** (about 15 minutes, PAID, AUDREY). The canvases are already written, so only the sharing and pinning clicks remain.

## 12. Who does what

| Item | Cost | Who |
| --- | --- | --- |
| Create canvases (welcome plus eight brand hubs) | PAID | CONNECTOR (done) |
| Share a canvas or add it as a channel tab | PAID | AUDREY |
| Rename channels, create channels, set topics and descriptions | FREE | AUDREY (no connector tool) |
| Sidebar theme | FREE | AUDREY |
| Sidebar sections | PAID | AUDREY |
| Custom emoji upload, aliases | FREE | AUDREY |
| Status presets | FREE | AUDREY (Owner) |
| Workflows A, B and C | PAID | AUDREY (BALLS drafted) |
| Lists | PAID | CONNECTOR after approval |
| Scheduled standup message | FREE | CONNECTOR after approval |
| Apps, App Home, Slack Connect, huddle theme | mixed | AUDREY |

— BALLS
