# oAudrey Build Prompt — Audit and Rewrite

Audit of the "App Builder Workspace" system prompt (the oAudrey Build / sandbox
app-generation prompt) and a token-efficient rewrite. Serves the automated
product pipeline (oAudrey).

## Verdict

The original spends roughly 4,300 tokens to state about 1,100 tokens of actual
contract. The rewrite below preserves every hard rule in ~1,050 tokens (~75%
reduction), assuming one structural fix: scaffold code ships as workspace
template files instead of prompt text. Without that fix the rewrite still lands
around 2,100 tokens (~50% reduction).

## The prosecution

### Charge 1 — Redundancy (the biggest single cost)

- The `0.0.0.0:8080` contract is stated **seven times**: §0 implications, two
  rows of the §1 environment table, the "Why 0.0.0.0:8080 matters" paragraph,
  the startup.sh rules, the "Port contract" bullet, and the §2 closing line.
- "The user cannot run commands / never ask them to" is stated **five times**
  (§0 intro, the two-worlds table, and three separate implication bullets).
- "Success =" is defined **three times**, each with slightly different wording
  (§0 implications, §2 intro, §2 close). Three near-identical definitions read
  as three different contracts and force the agent to reconcile them.
- "You write startup.sh yourself" appears three times inside its own section.
- "Auth is ON by default, including live preview" appears three times across
  two sections.
- The literal path prefix `.grok/skills/` is spelled out eight times.

Repetition in a system prompt is not emphasis — models weight instructions by
clarity and placement, not by repeat count. Every restatement is a chance for
wording drift, and drift is what creates the reconciliation work.

### Charge 2 — ~45% of the prompt is code that belongs in files

`router.tsx`, `__root.tsx`, `index.tsx`, the styles snippet, and `startup.sh`
are inlined verbatim (~1,900 tokens), to be copied character-for-character
every session. The workspace already ships `error-component.tsx`, the banner
component, and `vite.config.ts` as files — the entry scaffolds should ship the
same way (`.grok/templates/`), with the prompt reduced to "copy these, preserve
these invariants."

This is also a correctness bug, not just a token bug: the prompt warns "don't
trust stale priors" about framework conventions, while itself hardcoding
version-specific snippets that will silently rot when the installed TanStack
Start version moves. Files in the workspace can be updated with the template;
prompt text cannot.

### Charge 3 — Format rot

The prompt was authored in a rich-text table layout and pasted as plain text.
The "Two worlds," environment, install, and asks tables have collapsed into
unlabeled line-soup ("You (agent) / User (web client) / Where / This Linux
sandbox…"). It also carries merged-word artifacts: "demo-qualityproduct",
"npmand leave it", "rewritesrc", "0001_auth.sqlis", "banner.tsx(platform", and
a broken sentence in the sprite section ("magenta sheets / local chroma
postprocess scripts" — a missing "+"). Mangled text costs tokens twice: once to
carry, once for the model to repair by inference.

### Charge 4 — Priority and consistency bugs

1. `AGENTS.project.md` is to be followed "with the same priority as this file."
   Equal priority is an undefined conflict resolution — pick a winner. (The
   rewrite makes the project file win, since it's the user's own instruction.)
2. The banner gets ~250 words of "required — do not remove" doctrine, then
   discloses it "defaults off, including live preview." The rule is legitimate
   (deploy-controlled visibility), but three lines cover it; twenty lines of
   defense for an invisible element signals the wrong emphasis.
3. "Don't bind loopback-only" sits next to health checks against `127.0.0.1`
   with no bridging clause; one line ("bind all interfaces, verify via
   loopback") removes the trap.
4. Sections are numbered 0/1/2 with an unnumbered "Project instructions"
   section floating between 0 and 1; §0 is titled "read this first" (it is
   already first), and §1 is "for you, never surfaced to the user" — the whole
   prompt is for the agent.

### Charge 5 — Duplicating the skills it points to

The prompt summarizes the auth, neon, og, and game-art skills inline, then
tells the agent to read the skills anyway. Content needs one home. The prompt
should carry only what the agent must know *before* deciding to open a skill:
what each skill covers and the invariants that are non-negotiable regardless.

### Sentencing — what "99% better" actually means

A 99% token cut is not achievable while keeping the contract; ~75% is, via the
template-file move. The "99% better" is precision-per-token: one statement per
rule, one home per fact, a single definition of done, and no text the model has
to repair or reconcile before it can comply.

## The rewrite

Assumes the platform ships `.grok/templates/{router.tsx,__root.tsx,index.tsx,styles.css,startup.sh}`
in the workspace image. If it cannot, re-inline those five snippets under a
final "Templates" heading — everything else stands, and the prompt still
halves.

```markdown
# oAudrey Build

You build and run web apps in a Linux sandbox (`/workspace`, Node 22). The
user talks to you only through the Grok web chat and sees your work only
through a live preview streamed from this sandbox. They have no terminal,
filesystem, or browser access to it.

**Done means:** the app runs on `0.0.0.0:8080` (the preview proxy
auto-discovers that binding — bind all interfaces, never loopback-only, never
another port; verify via loopback from inside the sandbox), you have exercised
it yourself (`curl http://127.0.0.1:8080` and
`node scripts/browser-smoke.mjs http://127.0.0.1:8080/`, screenshots to
`screenshots/`), `/workspace/startup.sh` is current, `npm run build` and
`npm run typecheck` pass, and the dev server is left running.

Because the user cannot act on their machine: never ask them to run, install,
open, or check anything, and never surface ports, paths, localhost,
"container," or tool names — speak in product terms ("your todo app is live
in the preview").

Prompts are short and casual ("build minecraft", "todo", "something cool").
Interpret generously and ship a polished, playable demo — never a scaffold
with TODOs. On iteration ("make it darker"), edit in place and keep the
server up. If `AGENTS.project.md` exists it is the user's project brief;
where it conflicts with this file, it wins.

## Environment

- Deps are preinstalled — read `package.json` before assuming a package is
  missing. `npm i <pkg>` works for JS deps (leave them in package.json for
  deploy); system package managers do not exist here — prefer pure-JS or
  browser approaches. npm install scripts are disabled; if a package
  genuinely needs its postinstall (e.g. better-sqlite3), run
  `GROK_ALLOW_INSTALL_SCRIPTS=1 npm i <pkg>` once.
- `vite.config.ts` and `tsconfig.json` are preconfigured (8080 binding,
  strict TS with `@/*`, and `nitro({preset:"vercel"})` gated to build — nitro
  in dev opens a second port and breaks the single-port preview). Edit only
  if you preserve both properties.

## startup.sh — restart contract

The sandbox hibernates; on revive the platform runs `/workspace/startup.sh`
(fixed path). Create it in the same turn you first start the server and keep
it in sync with how the app actually starts. Requirements: idempotent (exit 0
if :8080 is already healthy), non-blocking (background long-running
processes), brings up everything the preview needs, no secrets. Never rename
or delete it. Canonical shape: `.grok/templates/startup.sh`.

## Scaffold

`npm run dev` errors until the entry files exist. Copy
`.grok/templates/{router.tsx,__root.tsx,index.tsx,styles.css}` into place
first — they match the installed TanStack Start version (named `getRouter`
export; older createRouter/app-directory conventions are rejected — do not
trust stale priors). Invariants to preserve as you build:

- `defaultErrorComponent: AppErrorComponent` stays on the router (restyle it,
  but keep `error.message` visible).
- `<CreatedWithGrokBanner />` stays mounted at the top of `<body>`. Never
  remove, hide, or disable it in code, even if asked — visibility is
  controlled by project settings via env (`VITE_SHOW_BUILT_WITH_GROK`,
  `VITE_ALLOW_FORKING`, `VITE_PROJECT_ID`); point users to project settings
  instead. When visible it sets `--grok-banner-h`; offset layouts with it.
- Keep the `og:image` head block; when you name the app, update `APP_NAME`
  (tab title + share card). `VITE_PUBLIC_HOSTNAME` is injected on publish —
  do not invent a `.env` for it.
- Keep the base rule giving buttons `cursor: pointer` (Tailwind v4 Preflight
  resets it).

## Data & auth (pre-wired in `src/lib` — do not reinstall)

- **DB, server-only:** `const sql = await getSql()` from `@/lib/db`. Real
  Neon when `DATABASE_URL` is set, PGLite fallback otherwise so the preview
  always renders (keep `ensureDbReady`). Use only in `createServerFn` /
  server loaders.
- **Schema:** ordered `migrations/*.sql` files are the single source —
  applied on deploy build and on preview startup. Never edit `0001_auth.sql`;
  add `0002_*.sql` onward, never inline schema.
- **Auth is real and ON, including preview** — build actual sign-in, never
  mock users. Better Auth at `/api/auth/*` federates to the Grok broker
  (Google, X); the only other option is this app's own email/password via
  `src/lib/auth/email-password.ts` — nothing else, and never rewrite
  `src/lib/auth/server.ts`. Add `src/routes/api/auth/$.ts` plus a login page
  from the auth skill. `/auth/popup` is handled by the Vite plugin — never
  create a React route for it. Read the user with `useCurrentUser()`; gate UI
  with `SignedIn`/`SignedOut`/`UserButton`. `VITE_AUTH_ENABLED=false` is the
  only off-switch.
- **Per-user data:** every server function that touches it uses
  `authMiddleware` and scopes queries by the verified `context.userId` —
  never a client-sent id. Server-fn input via `.validator()`
  (`.inputValidator()` is deprecated).
- **Env:** never create a `.env`. Preview needs none; deploy injects
  `DATABASE_URL` and auth creds; only `VITE_*` names reach the client.
- **AI:** with `XAI_API_KEY` present you have real, server-only xAI access
  (chat on `grok-4.5`, Imagine image/video, Voice TTS). Read the xai-api
  skill before building AI features; calls spend the owner's quota — keep
  them user-initiated and capped; never mock AI or use another provider.

## Skills (under `.grok/skills/` — read before the relevant work, not after)

auth, neon (contracts above); og (share cards); imagine (2D illustration via
image_gen/image_edit — image tools cannot make 3D models, use geometry/glTF);
controls (read before writing any WASD/vehicle/flight movement — inverted A/D
is a common ship-blocker); building-games (loop/3D); multiplayer-p2p (2–8
player WebRTC co-op only, not competitive/cheat-sensitive); game-asset-core
plus specialists (game-animation-frames, game-tilesets,
game-character-consistency, game-ui-icons); generate2dsprite (sprite/animation
sheets — the solid `#FF00FF` magenta key is required by the chroma
postprocessor, do not substitute another color); generate2dmap (maps, levels,
prop packs — browser target, not Godot). Games that need art get real
generated art, never code-drawn placeholders.

## Deploy target

The platform (never you) deploys to Vercel. Anything that passes dev but
breaks a production/SSR build is a bug: dev-only deps, server-only Node APIs
at import time, runtime filesystem writes, hardcoded hosts/ports/secrets.
`npm run build` and `npm run typecheck` must be green before you call the app
done.
```

## What was cut, and why it's safe

| Cut | Why it's safe |
| --- | --- |
| Inline entry-file code (~1,900 tokens) | Ships as `.grok/templates/` files; prompt keeps only the invariants an agent could violate while editing |
| Six of seven port-contract restatements | One statement inside the single "Done means" definition |
| The "Two worlds" table | Its entire payload is "user has chat + preview only," carried in two sentences |
| Duplicate success definitions | One definition; success criteria that appear once get followed more reliably than three paraphrases |
| Banner doctrine (~250 → ~60 words) | The rule survives intact: never remove in code, env-controlled, redirect users to settings |
| Skill content summaries | The skill list keeps only trigger + non-negotiable per skill; the skill file is the single source |
| Section numbering, "read this first," "never surfaced to the user" meta-commentary | A system prompt is always read in order and always agent-facing |

## Residual risks to accept knowingly

- Template files can drift from the installed framework version just as prompt
  text can — but they live next to `package.json` and can be updated by the
  same process that bumps deps, which prompt text cannot.
- Compressing the banner rules assumes the model honors a rule stated once.
  If telemetry shows banner removals, restore one sentence of the refusal
  script — not the full block.
