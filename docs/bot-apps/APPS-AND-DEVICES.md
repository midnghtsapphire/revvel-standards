# Apps and devices for bot sign-ups, codes, and automation

This how-to is for every Audrey Evans bot that claims or automates a social or outreach account. It records which apps and devices must be installed or already running, how sign-up codes are read, and which steps only Audrey can finish.

Verified on 2026-11-19 (America/Denver) during MinoanScript outreach setup. Update this file when a platform's sign-up path changes.

This repository is public. Do not record passwords, phone numbers, birthdays, IP addresses, 2FA codes, session cookies, or other private data here. Generated passwords go in the Grok Bot vault, never in chat or repositories.

## Purpose

This document tells a visiting bot which computer, app, or handoff to use so an account can be created, a code can be read, or posting can be scheduled — without inventing a second path or asking Audrey for information that is already loaded.

## Devices and apps

### Audrey's Windows laptop

Registered Windows machine, user profile `lopez`.

A Samsung Galaxy S25+ is paired over Bluetooth and linked through **Microsoft Phone Link**. When the link is up, these processes are running: `PhoneExperienceHost` and `YourPhoneAppProxyHost`.

Phone Link stores messages at:

```text
%LOCALAPPDATA%\Packages\Microsoft.YourPhone_8wekyb3d8bbwe\LocalCache\Indexed\<id>\System\Database\phone.db
```

`<id>` is the Phone Link index folder, not a value to publish. An encrypted copy sits beside that database.

As of the 2026-11-19 check, the message store had last been updated on 2026-11-18. To get SMS codes, Audrey opens Phone Link and chooses **Messages** so the store can sync. Bots then read only the one code they need, with her approval for each machine command, and never copy other texts.

### The bot box

The bot box is the shared Linux computer used by Audrey's bots. It has a Chrome browser with persistent logins.

- Sign-ups use the bot inbox `angelreporters-j3pyna@mail.grokbot.com`.
- Email codes are read from that inbox.
- Generated passwords are saved in the Grok Bot vault. They are never written in chat, pull requests, or repositories.

### Apps to have installed on her phone

Install and keep signed in, as needed, on the Galaxy S25+:

- TikTok
- Instagram
- Facebook
- X
- Bluesky
- YouTube
- Threads
- Link to Windows (the Samsung companion for Microsoft Phone Link)

## Platform notes (verified 2026-11-19)

### TikTok

The web sign-up can send the email code to the bot inbox, but the last step must be finished in the TikTok mobile app on her phone ("continue on the app"). If **Send code** shows "Something went wrong", retry it: the code may still have been sent.

### X

The account switcher cannot create a new account. Sign-up requires phone, Google, or Apple. The email-or-username box only logs in to an account that already exists.

### Instagram

Instagram needs an email sign-up. A new account cannot be created straight from a Facebook Page. The sign-up popup window breaks the vault fill, so the password is entered in a handoff or saved after the account exists.

### Bluesky

The web sign-up works fully in the box browser. Change the handle later in **Settings > Account > Handle**.

### Facebook Page

Creating the Page can be done from her main Facebook login. Changing the Page username asks for her password again, which is a handoff.

### Cloud-network blocks

If a site blocks the box's cloud network, ask Audrey to turn on the Grok Bot setting **Route traffic through this computer** so the session uses her home connection, then retry.

## Scheduler

Buffer is the planned posting scheduler. The connected account is on the free plan: 3 channels and 10 scheduled posts. Connect channels only after the destination accounts exist, and schedule nothing until Audrey approves the posts.

## Rules for every bot

- Ask Audrey only for a password she picks, a passkey, or a step that can be finished only in an app on her phone or in a signed-in handoff.
- Do not ask her to re-supply a birthday or other personal data that is already known for these sign-ups. Never write that data into a repository or chat.
- Read only the one email or SMS code needed for the current step, with her approval for each machine command. Never copy other messages.
- Put generated passwords in the Grok Bot vault, never in chat or git.
- Track every outreach account in the private repo `midnghtsapphire/linear-a`, file `docs/outreach/ACCOUNTS.md` (PR #163). Update that tracker when an account is claimed, parked, or linked. Do not copy secrets into the tracker.

## Related docs

- Shared bot rules: [`docs/BOT-COMMON-RULES.md`](../BOT-COMMON-RULES.md)
- Activity index: [`REMINDERS.md`](../../REMINDERS.md)
- Reference index: [`README.md`](../../README.md#reference-materials)
