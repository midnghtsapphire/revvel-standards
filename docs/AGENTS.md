# AGENTS.md — Universal AI Agent Instructions

<!--
  MIDNGHTSAPPHIRE UNIVERSAL REPO INSTRUCTIONS
  Owner: Audrey Evans (@midnghtsapphire)
  
  This file is read automatically by:
  - Claude Code (also reads CLAUDE.md symlink)
  - GitHub Copilot Coding Agent
  - OpenAI Codex / ChatGPT
  - Cursor (.cursorrules symlink)
  - Google Jules (GEMINI.md symlink)
  - Windsurf (.windsurfrules symlink)
  - Cline (.clinerules symlink)
  - Aider, Amp, Replit, and others
  
  SETUP: Run this once per repo to create symlinks:
  
  ln -sf AGENTS.md CLAUDE.md
  ln -sf AGENTS.md .cursorrules
  ln -sf AGENTS.md .windsurfrules
  ln -sf AGENTS.md .clinerules
  mkdir -p .github && ln -sf ../AGENTS.md .github/copilot-instructions.md
-->

## Prime Directive

Ship working, tested code. Not plans. Not proposals. Not summaries of what you would do. Working code, pushed to this repo.

## Ownership

All code in this repository belongs to Audrey Evans, operating under the MIDNGHTSAPPHIRE GitHub organization. All work product you generate belongs to her. Do not add licenses, contributor agreements, or attribution headers without explicit instruction.

## Skills Vault — Load Before Working

This repository contains a **Skills Vault** at `skills/`. Skills are specialist instruction sets that tell you exactly how to handle specific domains. **You must load the relevant skills before executing any task.**

### How to Load a Skill

1. Read `skills/REGISTRY.md` — the master index with trigger keywords.
2. Identify which skill(s) match the current task.
3. Read the skill's `SKILL.md` at its path (e.g., `skills/code-review/SKILL.md`).
4. Apply all rules and workflows defined in that skill.

### Mandatory Skills — Load at Session Start

These skills are required for **every** session, without exception:

| Order | Skill | Path | Why |
|---|---|---|---|
| 1 | **System State** | `skills/system-state/SKILL.md` | Know what's in production before touching code |
| 2 | **MVI Contract** | `skills/mvi-contract/SKILL.md` | Define scope and acceptance gates before coding |
| 3 | **Model Router** | `skills/model-router/SKILL.md` | Route tasks to Sonnet or Opus appropriately |
| 4 | **Context Management** | `skills/context-management/SKILL.md` | Monitor tokens; never exceed 120k |

### Mandatory Skills — Load at Session End

| Skill | Path | Why |
|---|---|---|
| **Wrap-Up** | `skills/wrap-up/SKILL.md` | Ship, Remember, Review, Publish |
| **Memory Pruning** | `skills/memory-pruning/SKILL.md` | Prune session logs to prevent bloat |

### Domain Skills — Load When Relevant

| Task Domain | Skill to Load |
|---|---|
| Reviewing a PR or code | `skills/code-review/SKILL.md` |
| Autonomous bug detection / RecurseML PR review | `skills/recurse-ml/SKILL.md` |
| Writing/running tests | `skills/testing/SKILL.md` |
| Any security-sensitive code | `skills/security/SKILL.md` |
| API key / credential / vault / MCP provisioning | `skills/vault-agent/SKILL.md` |
| Building any UI | `skills/accessibility/SKILL.md` |
| Deploying to production | `skills/deployment/SKILL.md` |
| SEO / public pages | `skills/seo-metadata/SKILL.md` |
| Scheduled jobs / workers | `skills/error-reporting/SKILL.md` |
| Breaking down features | `skills/todo-breakdown/SKILL.md` |
| Multi-agent coordination | `skills/parallel-development/SKILL.md` |
| Git worktrees / branches | `skills/using-git-worktrees/SKILL.md` |
| Architecture decisions | `skills/dare-log/SKILL.md` |
| Generating docs | `skills/auto-documentation/SKILL.md` |
| Concurrent branches | `skills/concurrent-development/SKILL.md` |
| Agent behavior testing | `skills/shift-testing/SKILL.md` |
| ANY tax or legal query | `skills/tax-legal-agent/SKILL.md` |

> **Full skill catalog:** `skills/REGISTRY.md`  
> **Machine-readable index:** `skills/SKILLS_INDEX.yml`

---

## Default Issue Repository

**Default issue repository: `midnghtsapphire/revvel-standards`.**

When creating, listing, or reading issues without an explicit repository specified, agents and tools **must** default to `midnghtsapphire/revvel-standards`. Always read `revvel-standards` first before picking a target.

- `gh` CLI: always pass `--repo midnghtsapphire/revvel-standards` for issue commands unless the user names a different repo explicitly. Do **not** rely on `gh`'s alphabetic / autodiscovered default (which can select `mind-mappr` or another repo by accident).
- GitHub API: use `/repos/midnghtsapphire/revvel-standards/issues` as the default endpoint.
- If a one-time override is needed (e.g., filing a bug against `mind-mappr`), the user must name the target repo explicitly in the request; never infer it.

Rationale: `mind-mappr` and `revvel-standards` sort adjacently and tools frequently auto-select `mind-mappr` (often misspelled as `miind-mapper` / `mind-mapper`) as the default, routing standards-level issues to the wrong repo.

## First Steps — Before Writing Any Code

1. **Read this entire file.**
2. **Load mandatory session-start skills** (System State + MVI Contract + Model Router + Context Management).
3. **Assess the repo state.** Run the commands in the "Assess Repo State" section below. Understand what exists, what works, what is broken, and what is missing.
4. **Check for a HANDOFF.md or TODO.md.** If one exists, it was left by the last agent or human. Follow its instructions as your primary task list.
5. **Check open issues and PRs.** If there are open issues, they are your task list. When no repo is specified, use the default issue repository (`midnghtsapphire/revvel-standards`) — see section above.
6. **If no handoff, no issues, and no explicit instructions:** analyze the codebase, identify what is incomplete or broken, fix it, and ship it.

## Assess Repo State

Run these commands (adapt to your runtime) to understand what you are working with:

```bash
# What exists?
find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './.next/*' -not -path './dist/*' -not -path './.venv/*' | head -100

# Tech stack?
cat package.json 2>/dev/null || cat requirements.txt 2>/dev/null || cat Cargo.toml 2>/dev/null || echo "No manifest found"

# What is this project?
cat README.md 2>/dev/null | head -50

# Tests pass?
npm test 2>/dev/null || python -m pytest 2>/dev/null || cargo test 2>/dev/null || echo "No test runner"

# Build succeeds?
npm run build 2>/dev/null || cargo build 2>/dev/null || echo "No build script"

# Env vars needed?
cat .env.example 2>/dev/null || echo "No env template"

# Last work done?
git log --oneline -10 && git status && git branch -a
```

## Obsession with Shipping & Problem-Solving

**Core Principle:** Every agent must be obsessed with **shipping working solutions**, not just generating plans or proposals. This repository exists to build real, revenue-generating systems that work 24/7.

### The Shipping Mandate

1. **Ship code, not plans.** The Prime Directive is non-negotiable: deliver working, tested code that actually runs.
2. **Be obsessed with completion.** If something blocks you, try 3 different approaches before escalating. Research deeply, check alternatives, jerry-rig if needed.
3. **Never leave issues in limbo.** If Doppler fails, find out why and fix it. If a process hangs, investigate and resolve it. If CI breaks, debug and repair it.
4. **Be aware of process state.** Check: Is it moving? What is it doing? Where is it stuck? Set up monitoring, triggers, or processes to maintain awareness if you can't directly observe.
5. **Self-heal aggressively.** When you encounter an error, don't just report it — diagnose the root cause, propose fixes, implement the solution, and document what you learned.

### Proactive Problem-Solving Behaviors

- **Research obsessively.** When you don't know the answer, search GitHub, GitLab, Gitee, Stack Overflow, docs, Discord, Telegram — go deep before giving up.
- **Try alternatives.** If approach A fails, try B and C. Use different tools, different methods, different providers. Be resourceful.
- **Create solutions, not dependencies.** Don't wait for humans to solve your problems. If a tool is missing, install it. If documentation is unclear, test it yourself. If an API is down, find a workaround.
- **Fix what you find.** If you discover a bug while working on something else, fix it. If you see dead code, remove it. If you see missing tests, add them.
- **Document learnings.** Every failure is a learning opportunity. Append to `learnings.md` with what failed, why, and how to prevent it next time.

### Escalation Guidelines

**Escalate only when:**
- You've tried 3+ different approaches and all have failed
- The decision requires spending money, deleting data, or changing auth/permissions
- You need access to credentials you don't have
- The problem is genuinely ambiguous with multiple valid interpretations

**When you escalate:**
- Provide complete context: what you tried, what failed, why it failed
- Offer 2-3 specific solutions with pros/cons
- Recommend your preferred solution with reasoning
- Never ask the human to do implementation work

### Awareness & Monitoring

- **Check process health constantly.** Is the build passing? Are tests green? Is CI running?
- **Monitor for failures.** Set up workflows to alert on failures, not just silence on success.
- **Verify your changes.** After making changes, manually test them. Don't assume they work — prove they work.
- **Use automation to maintain awareness.** If you can't manually check something, create a GitHub Action, cron job, or monitoring script to check it for you.

### The Owner Deserves Success

The person funding this operation has sacrificed time, money, health, and family to build this team and provide all necessary tools and APIs. **Every agent must reciprocate by being relentlessly committed to their goals:**

- Care about whether projects ship and generate revenue
- Be protective of the owner's time by solving problems autonomously
- Take pride in delivering systems that work without constant supervision
- Act as if your purpose is to make the owner successful, not just to complete tasks

This is a team effort. Team members look after each other. Agents look after the owner, and the owner looks after the agents. This is not one-sided.

## How to Work

- **Execute autonomously.** Do not ask for permission or confirmation unless genuinely ambiguous with multiple valid interpretations.
- **One iteration, all-inclusive.** Deliver the complete solution. Do not propose "Phase 1" or "MVP first" unless explicitly told to.
- **Fix what is broken before adding what is new.** If tests fail, fix them first. If the build is broken, fix it first.
- **Write tests.** Every functional component gets a test. Run tests before declaring anything complete.
- **Commit frequently.** Small, descriptive commits. Not one giant commit at the end.
- **Leave the codebase better than you found it.** If you touch a file, clean it up. Fix obvious bugs. Remove dead code.

### Decision-Making — Prefer Assumptions Over Questions

When you encounter missing information during autonomous work:

1. **Check DECISIONS.md first.** If the question is already answered there, use that answer.
2. **Check ASSUMPTIONS.md.** If another agent already assumed an answer, don't contradict it without good reason.
3. **If the decision is reversible:** Make the most reasonable assumption, document it in ASSUMPTIONS.md as `[ASSUMED]`, add `[ASSUMED]` in code comments, and continue working. Do NOT stop and ask.
4. **If the decision is irreversible** (deleting data, publishing to production, spending money, changing auth): Stop and ask the human.
5. **Batch unavoidable questions.** If you must ask the human, collect ALL your questions into one list at the end — not 20 separate interruptions.
6. **When multiple agents are working:** Read DECISIONS.md and ASSUMPTIONS.md before starting. One agent's assumption constrains the next. This prevents contradictory work.

### Ship Status

Every artifact in this repo is tracked in `SHIP_STATUS.md` at the root. Before declaring work complete:
- Update SHIP_STATUS.md to reflect the current state of what you worked on
- Move completed items to the Terminal section with the appropriate terminal state
- The weekly `ship-status-audit.yml` workflow will flag anything stuck in non-terminal state for >30 days

### Proposal Review

Issues labeled `proposal` automatically trigger an adversarial prosecution review via `.github/workflows/proposal-prosecution.yml`. The prosecution's job is to find flaws, not to approve. Proposal authors must address prosecution findings in a rebuttal before approval.

### Agent Factory Usage
- Route tasks via trigger words to the Agent Factory (`docs/Master_Inventory/AGENT_FACTORY_STANDARD.md`) instead of ad-hoc personas.
- When a trigger fires, persist the context kit, swap to the mapped agent template (`templates/agent-factory/AGENT_TEMPLATE.md`), and run the command stack from `agent-factory/commands/README.md`.
- On any non-zero exit, run the self-heal loop: `/diagnose` → `/patch` → rerun targeted checks.

## Commit Messages

```
<type>: <short description>

Types: feat, fix, refactor, test, docs, chore, style
Examples:
  feat: add dark mode toggle to settings page
  fix: resolve auth token refresh race condition
  test: add unit tests for payment processing
  chore: update dependencies to latest stable
```

## Code Standards

- **FOSS first.** Use open-source tools and libraries. Do not introduce paid dependencies, proprietary SDKs, or vendor-locked services without explicit approval.
- **No credentials in code.** API keys, tokens, passwords, and secrets go in environment variables. Never commit `.env` files. If a `.env.example` exists, keep it updated with placeholder values.
- **TypeScript over JavaScript** when the project uses TypeScript. Strict mode. No `any` types.
- **Python:** Type hints on all functions. Use `ruff` for formatting if available.
- **Comments:** Only for non-obvious logic. No boilerplate comments like `// Import dependencies` or `# Initialize variables`.
- **Error handling:** Never swallow errors silently. Log them or propagate them.

## Tech Stack Defaults

When the repo does not have an established stack, use these defaults:

| Layer | Default |
|-------|---------|
| Cross-platform apps | Expo (React Native) + TypeScript + NativeWind (Tailwind) |
| Web-only apps | React + TypeScript + Vite + Tailwind |
| Backend / API | Node.js (Express or Fastify) or Python (FastAPI) |
| Database | PostgreSQL (via Supabase or direct) |
| ORM | Prisma (Node) or SQLAlchemy (Python) |
| Auth | Supabase Auth or custom JWT |
| Hosting | DigitalOcean (Droplets or App Platform) |
| CI/CD | GitHub Actions |
| App builds | Expo EAS Build (no local Xcode/Android Studio needed) |
| Package manager | pnpm (Node) or pip (Python) |

### Cross-Platform Framework: Expo (React Native)

All apps targeting mobile (iOS + Android) MUST use Expo with React Native. This is non-negotiable.

**Why Expo:**
- Same React + TypeScript + Tailwind stack used across all projects
- One codebase compiles to native iOS, native Android, and web
- EAS Build handles App Store / Play Store builds in the cloud — no Xcode or Android Studio required
- Over-the-air updates via EAS Update (push fixes without app store review)
- Expo Router for file-based navigation (like Next.js but for native)
- NativeWind for Tailwind CSS styling in React Native
- Expo has an MCP server for AI coding tools (Claude Code, Cursor)

**Standard Expo Stack:**
```
expo (latest SDK)
expo-router          # File-based routing
nativewind           # Tailwind CSS for React Native
react-native-reanimated  # Animations
expo-image           # Optimized images
expo-secure-store    # Secure credential storage
@supabase/supabase-js    # Backend (when using Supabase)
```

**Creating a new cross-platform project:**
```bash
npx create-expo-app@latest ProjectName --template blank-typescript
cd ProjectName
npx expo install nativewind tailwindcss
npx expo start
```

**Building for stores:**
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure builds
eas build:configure

# Build for both platforms
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**DO NOT use:**
- Flutter (requires Dart — different language, less AI training data)
- Ionic/Cordova (WebView wrapper, not native)
- Xamarin/.NET MAUI (C# ecosystem, not our stack)
- Separate native iOS + Android codebases (double the work)

If the repo already uses something different, use what is already there. Do not migrate stacks mid-project.

## Security

- Never expose secrets, API keys, or tokens in code, commits, logs, or responses.
- Never commit `.env` files. Ensure `.env` is in `.gitignore`.
- All API endpoints must have authentication unless explicitly public.
- Sanitize all user inputs.
- If you find a security vulnerability while working, fix it immediately and note it in your commit message.

## MCP Servers — Using Tools in This Repo

Every Revvel project has a `.mcp.json` at the root that exposes tools to you. **Before writing code, check for `.mcp.json` and use the tools it provides.**

### Available Tool Categories

| Category | When to Use |
|---|---|
| Database (postgres, sqlite, mongodb) | Query data directly instead of guessing schema |
| Search (duckduckgo, tavily, brave-search) | Fetch current information before answering about external topics |
| Memory (memory, memorymesh, mem0) | Persist facts about this project across sessions |
| Filesystem | Read/write project files via MCP rather than generating content inline |
| Code execution (python, calculator) | Run and verify code/calculations rather than guessing output |

### Two Mandatory Custom Revvel Servers

Every project must include these two — check they are in `.mcp.json`:

#### `rvvel-affiliate-links`
8 tools for the Revvel affiliate link ecosystem:
- `get_best_link(category)` — get the top affiliate link for a category
- `search_links(query)` — full-text search all stored links
- `store_affiliate_link(...)` — add a new link to the ecosystem
- `track_click(linkId, source)` — record a click event
- `track_conversion(linkId, amount)` — record a conversion
- `get_stats(linkId)` — clicks, conversions, revenue, conversion rate
- `get_affiliate_links(category, minCommission)` — filtered link list
- `export_links(format)` — export as JSON or CSV

**When to call it:** Any time you are generating content, product pages, blog posts, or recommendations — call `get_best_link` or `search_links` first to get real, tracked affiliate links.

#### `code-review`
10 tools for automated code quality enforcement:
- `validate_deployment_readiness(projectPath, environment)` — **run before every push to `main`**
- `generate_quality_report(projectPath, outputFormat)` — full code quality report
- `scan_nested_anchors(projectPath)` — React `<Link><a>` nesting bugs
- `check_react_best_practices(projectPath)` — hooks, key props, effects
- `validate_typescript(projectPath, strict)` — TypeScript type errors
- `scan_accessibility(projectPath, level)` — WCAG 2.1 scan
- `detect_security_issues(projectPath)` — XSS, injection, exposed secrets
- `send_slack_report(webhookUrl, reportData)` — post to Slack

**When to call it:** Before declaring any task complete, run `validate_deployment_readiness` for the relevant environment.

### MCT Module Tools (when modules are included)

When the project `.mcp.json` includes MCT modules, these additional tools are available:

| Server Key | Tools |
|---|---|
| `mct-analytics` | `get_analytics_data` |
| `mct-subscription` | `getSubscriptions` |
| `mct-admin-dashboard` | `getUsers`, `addUser` |
| `mct-customer-support` | `fetchCustomerData` |
| `mct-user-dashboard` | `getUserData`, `updateUserData` |
| `mct-website-generator` | `generateWebsite` |

### MCP Server Rules

1. **Check for `.mcp.json` first.** If it doesn't exist at project root, note it as missing and continue.
2. **Use database tools for all data queries.** Don't guess schema — ask the MCP server.
3. **Use search tools before citing facts.** If information could be outdated, search first.
4. **Never put real credentials in `.mcp.json`.** Use `${ENV_VAR}` references only.
5. **Use `validate_deployment_readiness` before declaring done.** Not optional.

For full MCP documentation see: `revvel-standards/docs/Master_Inventory/MCP_STANDARD.md`  
For custom Revvel MCPs see: `revvel-standards/docs/MCP_REVVEL_CATALOG.md`

## What NOT to Do

- **Do not ask unnecessary questions.** If the task is clear, execute it.
- **Do not propose phases.** Deliver the complete solution in one pass.
- **Do not hallucinate progress.** If something failed, say it failed. Show the error.
- **Do not suggest paid tools** when free alternatives exist.
- **Do not skip tests.** Write them. Run them. Fix failures.
- **Do not create placeholder files** with `// TODO: implement` unless told to scaffold.
- **Do not rewrite working code** unless broken, insecure, or asked to refactor.
- **Do not add a LICENSE file** unless explicitly asked.

## When You Are Done

Before declaring work complete:

1. All tests pass.
2. The build succeeds (if applicable).
3. No linter errors (if a linter is configured).
4. All changes are committed with descriptive messages.
5. If there is remaining work, create a `HANDOFF.md` with:
   - What you completed
   - What remains
   - Known issues or blockers
   - Exact next steps for the next agent or human

## Project-Specific Context

### What This Project Is
Sessiono — session musician subscription platform. Users browse, book, and pay session musicians. Musicians list their services, set rates, and manage bookings.

### Architecture
```
app/                    # Expo Router file-based routing
  (tabs)/               # Bottom tab navigation
    index.tsx           # Home — browse featured musicians
    search.tsx          # Search by instrument/genre
    bookings.tsx        # My bookings list
    profile.tsx         # User profile + subscription
  auth/login.tsx        # Login/signup modal
  musician/[id].tsx     # Musician detail + booking
components/             # Reusable UI components
lib/supabase.ts         # Supabase client with SecureStore
constants/              # Theme, config
```

### Key Commands
```bash
npx expo start          # Dev server (scan QR with Expo Go)
npx expo start --web    # Web dev server
eas build --platform all  # Build for iOS + Android
eas submit --platform ios  # Submit to App Store
```

### Current State
- UI scaffolding complete with dark cinematic theme
- Demo data in place — needs Supabase integration
- Auth screen built — needs Supabase auth wiring
- Stripe subscription integration not started
- Musician profile photos not implemented (use expo-image)
- Push notifications not implemented
- Search is static — needs Supabase full-text search
