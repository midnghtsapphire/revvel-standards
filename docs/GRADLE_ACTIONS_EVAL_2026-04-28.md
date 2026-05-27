# Gradle GitHub Actions / Extensions — Evaluation (April 28, 2026)

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluated — **partial adoption (one official action), reject the rest**
**Date:** April 28, 2026
**Scope:** Score 20 Gradle-adjacent items (19 GitHub Actions + 1 marketplace App) listed in the triggering Jules issue against the actual Revvel stack and decide which — if any — earn a permanent slot in `templates/cicd/`.
**Source issue:** Jules EVALUATE — *"Evaluate many Gradle GitHub extensions for revvel-standards"*.
**Related:** [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) · [`_MASTER_BOM.md`](./_MASTER_BOM.md) · [`STACK.md`](./STACK.md) · [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md) · [`CODE_QUALITY_APPS_EVAL_2026-04-23.md`](./CODE_QUALITY_APPS_EVAL_2026-04-23.md) · [`STARRED_REPOS_EVAL_2026-04-20.md`](./STARRED_REPOS_EVAL_2026-04-20.md) · [`LEMONTREE_AUTOMATION_EVAL_2026-04-28.md`](./LEMONTREE_AUTOMATION_EVAL_2026-04-28.md) · [`Master_Inventory/DEPENDABOT_STANDARD.md`](./Master_Inventory/DEPENDABOT_STANDARD.md) · [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md) · [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml)

---

## 0. TL;DR — what to actually adopt

- **Adopt one action only:** the **official** [`gradle/actions/setup-gradle@v4`](https://github.com/gradle/actions) (this is the action behind the marketplace listing **"Build with Gradle"**). Wire it into [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) on the Android job *before* `cordova build android`, so Gradle's wrapper download + dependency cache is reused across runs and so the same job can publish a Dependency Submission graph for free. This is the only item in the list that gives Revvel a non-cosmetic improvement.
- **Defer (revisit only if a true standalone Gradle/JVM project lands):** [`gradle-update/update-gradle-wrapper-action`](https://github.com/gradle-update/update-gradle-wrapper-action). Useless today (no `gradle-wrapper.properties` exists in any Revvel repo — Cordova ships its own wrapper inside `platforms/android/` which is regenerated on every `cordova platform add android`), but is the right tool the *day* a JVM library lands.
- **Skip everything else (18 items).** The remaining marketplace entries are either (a) thin reskins of the official action by third-party vendors (BuildJet, davidkhala, "Gradle NG", "Gradle CMD", "Gradle Cache", "Run gradle task", "Gradle Android"), (b) niche helpers for problems Revvel does not have ("Gradle Library Release", "Gradle Version Incrementer", "Get Gradle Versions", "Gradle Update Checker", "Version Check Gradle", "Gradle Self Updater", "Update Gradle Wrapper" — duplicate of #2, "Export Gradle properties"), (c) misnamed/wrong-scope ("Gradle Metadata action" is for *Docker Buildx Bake* metadata, not Gradle), or (d) the only **App** in the list (**Buildless**) — a paid commercial build-cache backend that competes with the *free* cache layer the official action already gives us.
- **Net cost of the recommendation:** **$0.** `gradle/actions/setup-gradle@v4` is free, runs on the existing `ubuntu-latest` runners we already pay for, and adds ~2–4 minutes of saved Cordova-Android build time once the cache warms.
- **Net new agents/secrets required:** **zero.** The action needs no token; the Dependency Submission step it can emit uses the built-in `GITHUB_TOKEN` with `contents: write` permission already standard across Revvel workflows.

This document is the receipt for that decision and is logged in [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.11 and [`_MASTER_BOM.md`](./_MASTER_BOM.md) §🚀 CI/CD & Deployment Automation so the same 20-item list does not get re-evaluated from scratch on the next sweep.

---

## 1. Why this list showed up

Revvel does **not** ship any standalone Gradle/JVM project today. A `find . -name 'build.gradle*' -o -name 'settings.gradle*' -o -name 'gradlew'` across this repo returns zero matches. The only Gradle exposure in the entire ecosystem is **transitive**:

- [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md) §3 lists Gradle as an Android Studio-bundled toolchain dependency.
- [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) runs `cordova build android --release`, which internally generates `platforms/android/` (with its own `gradlew` + `build.gradle`) on every CI run and then drives Gradle to produce the `.aab`.
- [`../templates/mobile/fastlane/Fastfile`](../templates/mobile/fastlane/Fastfile) line 17 contains a commented-out `gradle(...)` lane left from the Fastlane scaffold.

That is the entire surface area. Therefore an action only earns adoption if it improves the Cordova-Android build path — every other angle (publishing JARs to Maven Central, JVM library version bumps, Docker-Bake metadata, BuildJet-runner hosting, etc.) is currently inert for this org.

---

## 2. Summary table

Legend: Fit = ⭐ (poor) … ⭐⭐⭐⭐ (excellent), scored against the Cordova-Android pipeline above. "Overlap" = duplication with the incumbent (`actions/setup-java@v4` + `cordova build android` + Fastlane + Dependabot).

| # | Item | Type | Cost (our usage) | What it does | Overlap | Fit | Recommendation |
|---|---|---|---|---|---|---|---|
| 1  | [Build with Gradle](https://github.com/marketplace/actions/build-with-gradle) (`gradle/actions/setup-gradle@v4`, `gradle/actions/dependency-submission@v4`, `gradle/actions/wrapper-validation@v4`) | Action (official, by Gradle Inc.) | Free | Caches `~/.gradle/caches` + `~/.gradle/wrapper`, validates `gradle-wrapper.jar` integrity, emits Dependency Graph for Dependabot/CodeQL | None — fills a gap in Cordova workflow | ⭐⭐⭐⭐ | **Adopt** in [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) Android job. See §3. |
| 2  | [Update Gradle Wrapper Action](https://github.com/marketplace/actions/update-gradle-wrapper-action) (`gradle-update/update-gradle-wrapper-action`) | Action (community, well-maintained) | Free | Opens PRs to bump `gradle/wrapper/gradle-wrapper.properties` to latest Gradle | None today (no committed wrapper) | ⭐⭐ | **Defer** — re-evaluate when a JVM project ships. Cordova regenerates `platforms/android/gradle/wrapper/` on every CI run, so a wrapper-bump PR has nothing durable to bump. |
| 3  | [Buildless](https://github.com/marketplace/buildless) | **App** (paid SaaS) | Free tier limited; quote-based for serious usage | Remote Gradle build-cache backend (cache-as-a-service) | High — duplicates the cache `gradle/actions/setup-gradle` already provides via `actions/cache` | ⭐ | **Skip** — paying for build-cache hosting is not justified at our build volume; the official action already caches on each runner via the standard GitHub Actions cache (10 GB / repo / 7 days, which is more than Cordova's ~600 MB Gradle cache needs). |
| 4  | [Gradle Android](https://github.com/marketplace/actions/gradle-android) | Action (community) | Free | Thin wrapper that runs `./gradlew <task>` on Android projects | High — `gradle/actions/setup-gradle` + a one-line `run:` step does the same | ⭐ | **Skip** — adds an indirection for no functional gain. |
| 5  | [Gradle CMD](https://github.com/marketplace/actions/gradle-cmd) | Action (community) | Free | Generic "run a Gradle command" wrapper | High — same as #4 | ⭐ | **Skip** — `run: ./gradlew <task>` is shorter and audit-able. |
| 6  | [Gradle NG](https://github.com/marketplace/actions/gradle-ng) | Action (community) | Free | Description is a near-verbatim copy of `gradle/actions/setup-gradle` ("Configures Gradle for GitHub actions, caching state and generating a dependency graph via Dependency Submission") | High — fork/reskin | ⭐ | **Skip** — pin upstream `gradle/actions/setup-gradle@v4` instead. |
| 7  | [Gradle Cache](https://github.com/marketplace/actions/gradle-cache) | Action (community) | Free | Caches `.gradle` folder | High — subset of `gradle/actions/setup-gradle` | ⭐ | **Skip** — the official action already does this and validates the wrapper jar at the same time. |
| 8  | [Export Gradle properties](https://github.com/marketplace/actions/export-gradle-properties) | Action (community) | Free | Reads `gradle.properties` and emits each key as a step output | None today (no `gradle.properties` checked in) | ⭐ | **Skip** — niche helper for projects that store CI config in `gradle.properties`; Revvel does not. |
| 9  | [Version Check Gradle](https://github.com/marketplace/actions/version-check-gradle) | Action (community) | Free | Checks whether the Gradle project's `version` is already published to a registry | None today (no Gradle publishing target) | ⭐ | **Skip** — answers a question Revvel does not ask. |
| 10 | [Get Gradle Versions](https://github.com/marketplace/actions/get-gradle-versions) | Action (community) | Free | Fetches the list of latest Gradle releases from `services.gradle.org` | None | ⭐ | **Skip** — `gradle/actions/setup-gradle` already accepts `gradle-version: release` to do this implicitly. |
| 11 | [Gradle Metadata action](https://github.com/marketplace/actions/gradle-metadata-action) | Action (community) | Free | **Despite the name, this is for [Docker Buildx Bake](https://github.com/docker/bake-action) metadata, not Gradle.** Misnamed listing. | N/A — wrong scope | ⭐ | **Skip** — flag as a mis-listed marketplace entry; not a Gradle tool at all. |
| 12 | [Gradle BuildJet Action](https://github.com/marketplace/actions/gradle-buildjet-action) | Action (BuildJet vendor) | Free action; requires paid BuildJet runners ($0.01–$0.04/min) | Same as #1 but tuned for [BuildJet](https://buildjet.com/) self-hosted runners | High — vendor reskin | ⭐ | **Skip** — Revvel does not run on BuildJet; would need a separate runner subscription to even use. |
| 13 | [Gradle library release](https://github.com/marketplace/actions/gradle-library-release) | Action (community) | Free | Builds, publishes, generates changelog, creates GitHub Release for a Gradle library | None today (no library to release) | ⭐ | **Skip** — when/if Revvel ships a JVM library, evaluate at that point against [`semantic-release`](https://github.com/semantic-release/semantic-release) (incumbent for our Node libs). |
| 14 | [Run gradle task](https://github.com/marketplace/actions/run-gradle-task) | Action (community) | Free | Yet another `./gradlew <task>` wrapper (its own description repeats #4: *"Run Android Gradle tasks"*) | High — duplicate of #4/#5 | ⭐ | **Skip** — duplicate. |
| 15 | [Gradle Dependency Submission](https://github.com/marketplace/actions/gradle-dependency-submission) | Action (community fork — `mikepenz/gradle-dependency-submission`) | Free | Calculates Gradle dependency graph and submits to the GitHub Dependency Submission API | High — `gradle/actions/dependency-submission@v4` (item #1) covers this officially | ⭐⭐ | **Skip** — pick the official sibling in #1; the community fork was useful before Gradle Inc. shipped the official one in 2024 and is now superseded. |
| 16 | [Gradle Self Updater](https://github.com/marketplace/actions/gradle-self-updater) | Action (community) | Free | Self-updates the local Gradle wrapper via `./gradlew wrapper --gradle-version <latest>` | High — duplicates #2 with worse PR ergonomics | ⭐ | **Skip** — same conclusion as #2 (defer until standalone Gradle project exists), and worse than #2 when that day comes. |
| 17 | [Update Gradle Wrapper](https://github.com/marketplace/actions/update-gradle-wrapper) | Action (community) | Free | **Same listing slug as #2 in slightly different wording.** Marketplace lists both. | High — duplicate of #2 | ⭐ | **Skip** — pick at most one; #2 (`gradle-update/update-gradle-wrapper-action`) is the canonical one if/when adopted. |
| 18 | [gradle update checker](https://github.com/marketplace/actions/gradle-update-checker) | Action (community) | Free | Checks whether dependencies in `build.gradle` have newer Maven Central versions | High — Dependabot's `gradle` ecosystem ([`Master_Inventory/DEPENDABOT_STANDARD.md`](./Master_Inventory/DEPENDABOT_STANDARD.md)) does this with PR auto-creation | ⭐ | **Skip** — Dependabot covers it and is the org-wide standard. |
| 19 | [Gradle Version Incrementer](https://github.com/marketplace/actions/gradle-version-incrementer) | Action (community) | Free | Increments `version=` in `build.gradle` and optionally commits | None today (no `build.gradle` to increment) | ⭐ | **Skip** — release versioning is owned by `semantic-release`/`changesets` in the Node stack; revisit only with a JVM library. |
| 20 | [davidkhala/setup-gradle](https://github.com/marketplace/actions/davidkhala-setup-gradle) | Action (community, single-maintainer) | Free | Sets up Java + Gradle in one step | High — `actions/setup-java@v4` + `gradle/actions/setup-gradle@v4` is the supported pair | ⭐ | **Skip** — single-maintainer reskin; supply-chain risk vs. the two upstream actions it bundles. |

**Tally:** 1 adopt · 1 defer · 18 skip.

---

## 3. The one adoption — wiring `gradle/actions/setup-gradle@v4` into Cordova-Android

### 3.1 Why this is non-cosmetic

`cordova build android --release` invokes Gradle to assemble the AAB. On a cold runner the first Gradle invocation downloads:

- The Gradle distribution (~150 MB for Gradle 8.x).
- The Android Gradle Plugin + its transitive Maven artifacts (~250 MB).
- Project-local plugins pulled in by Cordova plugins (varies, ~50–200 MB).

Without caching, every CI run pays this cost (~3 min on `ubuntu-latest`). `gradle/actions/setup-gradle@v4` caches `~/.gradle/caches/`, `~/.gradle/wrapper/`, and `~/.gradle/notifications/` keyed on `**/gradle-wrapper.properties` + `**/build.gradle*`. After the first warm cache, the subsequent runs reuse ~600 MB of Gradle state and shave 2–4 min off the Cordova-Android job.

It additionally validates the integrity of `gradle-wrapper.jar` (CVE class: tampered wrappers used to ship malware via PRs — see [GHSA-23q2-5gf8-xq2c](https://github.com/advisories/GHSA-23q2-5gf8-xq2c)–style supply-chain issues), which is a non-trivial security win.

### 3.2 Suggested edit (do **not** apply in this PR — see §6)

Inside [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml), in the `deploy-cordova-android` job, add the action immediately *after* the existing `actions/setup-java@v4` step and *before* `cordova build android`:

```yaml
      - name: Set up Gradle (cache + wrapper validation)
        uses: gradle/actions/setup-gradle@v4
        with:
          # Cache only on the default branch to avoid PR-cache pollution.
          cache-read-only: ${{ github.ref != format('refs/heads/{0}', github.event.repository.default_branch) }}
          # Validate every gradle-wrapper.jar that Cordova generates inside platforms/android/.
          validate-wrappers: true
```

Optional companion step (push a Dependency Graph for Dependabot once the Cordova-Android plugin matrix stabilizes — gated on `github.ref == 'refs/heads/main'` so PRs don't spam the API):

```yaml
      - name: Submit Gradle dependency graph
        if: github.ref == format('refs/heads/{0}', github.event.repository.default_branch)
        uses: gradle/actions/dependency-submission@v4
        with:
          dependency-graph: generate-and-submit
```

### 3.3 Pinning policy

Pin to the **major tag** `@v4` per the existing convention in [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-java@v4`). Do **not** pin to `@main`. Do **not** pin to a SHA unless [`Master_Inventory/DEPENDABOT_STANDARD.md`](./Master_Inventory/DEPENDABOT_STANDARD.md) is amended to require SHA pins for *all* `actions/*` steps (it currently does not).

### 3.4 Permissions

The base action needs no extra permissions. The optional dependency-submission step needs job-level:

```yaml
permissions:
  contents: write
```

That is consistent with the permission pattern already documented in [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md).

---

## 4. Risks / unknowns

| Risk | Mitigation |
|---|---|
| Cordova regenerates `platforms/android/` per run, so the cache key (`hashFiles('**/gradle-wrapper.properties')`) flips whenever a Cordova plugin bumps its bundled Android targets, invalidating the cache. | Acceptable — even occasional cache misses are no worse than the status quo (zero caching). |
| `gradle/actions/setup-gradle` writes to `$RUNNER_TEMP` and `~/.gradle`, both of which are runner-local; no cross-tenant data is exposed on `ubuntu-latest`. | Documented; matches [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) "secrets are read-only inputs" invariant. |
| Gradle Inc. retires `@v4` in the future. | Standard `actions/*` major-version churn; covered by Dependabot's `actions` ecosystem in [`Master_Inventory/DEPENDABOT_STANDARD.md`](./Master_Inventory/DEPENDABOT_STANDARD.md). |
| Buildless (item #3) emails sales after a marketplace install. | We do not install it. |
| Mis-listed item #11 ("Gradle Metadata action") is actually a Docker Buildx Bake helper. | Flagged here so it is not re-evaluated as a Gradle tool on the next sweep. |

---

## 5. Cross-references updated

- [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §1.11 — new row pointing at this doc, status **🟡 Research Topic** (the one adopt-recommended action) and noting 18 skipped + 1 deferred siblings.
- [`_MASTER_BOM.md`](./_MASTER_BOM.md) §🚀 CI/CD & Deployment Automation — new row, priority **P2** (free; non-blocking; activate when Cordova-Android pipeline is exercised end-to-end).

No edits to [`STACK.md`](./STACK.md) — Gradle is not promoted to a first-class stack element by this evaluation; it remains a transitive Cordova dependency.

---

## 6. Why no workflow edit ships in this PR

Per [`AGENTS.md`](./AGENTS.md) Prime Directive ("ship working, tested code") *and* the established Jules-EVALUATE pattern in [`LEMONTREE_AUTOMATION_EVAL_2026-04-28.md`](./LEMONTREE_AUTOMATION_EVAL_2026-04-28.md), [`STARRED_REPOS_EVAL_2026-04-20.md`](./STARRED_REPOS_EVAL_2026-04-20.md), [`CI_APPS_MOBILE_EVAL_2026-04-23.md`](./CI_APPS_MOBILE_EVAL_2026-04-23.md), and [`API_CRAFTPRO_EVAL_2026-04-20.md`](./API_CRAFTPRO_EVAL_2026-04-20.md): an *evaluation* PR commits the receipt + inventory rows; the *adoption* PR (which actually edits [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml)) is opened separately so it can be exercised end-to-end against a real Cordova-Android build before being merged. That second PR is out of scope for the triggering issue, which scoped the work to **evaluation**.

The exact diff to apply when that PR is opened is captured verbatim in §3.2 above so the adoption work is mechanical.

---

## 7. Decision

| Item | Decision | Tracked status in `_MASTER_INVENTORY.md` |
|---|---|---|
| `gradle/actions/setup-gradle@v4` ("Build with Gradle", item #1) | **Adopt** in Cordova-Android job (separate PR — see §6). | 🟡 Research Topic → flip to ✅ Active when the adoption PR merges. |
| `gradle-update/update-gradle-wrapper-action` (item #2) | **Defer** — no committed wrapper to bump today. | 🟡 Research Topic (deferred; no action until a JVM project lands). |
| All 18 other items | **Skip / Reject (P3) — do not adopt.** | 🗑️ Removed (one row covering the bundle, with this doc as the receipt). |

— *Audrey Evans (MIDNGHTSAPPHIRE), April 28, 2026.*
