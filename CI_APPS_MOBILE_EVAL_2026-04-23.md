# CI / Review-App GitHub Marketplace Apps — Mobile-Automation Evaluation (April 23, 2026)

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluation (awaiting adoption decision)
**Scope:** 20 GitHub Marketplace apps under the "Continuous integration" / "Review apps" categories, scored specifically for their ability to automate **Google Play Store** and **Apple App Store** shipping on top of the current Revvel mobile stack (PWA → Bubblewrap/TWA + Apache Cordova + Fastlane).
**Related:** [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) · [`_MASTER_BOM.md`](./_MASTER_BOM.md) · [`CODE_QUALITY_APPS_EVAL_2026-04-23.md`](./CODE_QUALITY_APPS_EVAL_2026-04-23.md) · [`STARRED_REPOS_EVAL_2026-04-20.md`](./STARRED_REPOS_EVAL_2026-04-20.md) · [`OPENROUTER_MARKETPLACE_ACTIONS.md`](./OPENROUTER_MARKETPLACE_ACTIONS.md) · [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) · [`../templates/mobile/MOBILE_DEPLOYMENT.md`](../templates/mobile/MOBILE_DEPLOYMENT.md) · [`../templates/mobile/CORDOVA_STANDARD.md`](../templates/mobile/CORDOVA_STANDARD.md)

---

## 0. TL;DR — What to actually adopt for mobile automation

- **Primary stack stays GitHub Actions + Fastlane.** The scaffolds under [`../templates/cicd/deploy-android.yml`](../templates/cicd/deploy-android.yml), [`../templates/cicd/deploy-ios.yml`](../templates/cicd/deploy-ios.yml), [`../templates/cicd/deploy-cordova.yml`](../templates/cicd/deploy-cordova.yml) plus [`../templates/mobile/fastlane/Fastfile`](../templates/mobile/fastlane/Fastfile) already cover Play Store internal/production tracks and TestFlight/App Store once the developer accounts in [`../templates/mobile/MOBILE_DEPLOYMENT.md` §5](../templates/mobile/MOBILE_DEPLOYMENT.md) are purchased. No marketplace app below *replaces* this path — they at best complement it.
- **Adopt now (free or cheap, fills a real mobile gap):** **Codemagic CI/CD** (as a *fallback* for macOS/iOS builds without paying for GitHub-hosted macOS minutes), **pre-commit ci** (already recommended in [`CODE_QUALITY_APPS_EVAL_2026-04-23.md`](./CODE_QUALITY_APPS_EVAL_2026-04-23.md); reconfirmed here for mobile repos).
- **Adopt on condition:** **Bitrise** (only if we outgrow Codemagic's free tier *and* need native iOS signing helpers); **AccessLint** (only on repos that render HTML — our PWAs do).
- **Skip — overlaps with GitHub Actions + Fastlane:** Render, CircleCI, Travis CI, Azure Pipelines (both entries), Google Cloud Build, AWS Connector for GitHub, AppVeyor, Cirrus CI, Appcircle, IONOS Deploy Now, webapp.io, Nx Cloud, Shopify, Spacelift, Mend Bolt.
- **Net new tooling cost if we adopt the "Adopt now" set:** **$0** — Codemagic free tier is 500 macOS-minutes/month; pre-commit ci is free for public repos.

**Key constraint this eval respects:** mobile store shipping needs a macOS runner for iOS (Xcode) and non-trivial signing (keystore for Android, provisioning profiles + App Store Connect API key for iOS). Any tool that cannot produce a signed `.aab` or `.ipa` on demand is, by definition, a non-replacement for the Fastlane lanes in [`../templates/mobile/fastlane/Fastfile`](../templates/mobile/fastlane/Fastfile).

---

## 1. Summary table

Legend: Fit = ⭐ (poor) … ⭐⭐⭐⭐ (excellent); "Mobile Fit" is scored *specifically* for Play Store + App Store automation, not generic CI. "Overlap" is against GitHub Actions + Fastlane, which is our incumbent.

| # | App | Category | Cost (our usage) | macOS / iOS signing? | Overlap with GH Actions + Fastlane | Mobile Fit | Recommendation |
|---|---|---|---|---|---|---|---|
| 1  | [Render](https://github.com/marketplace/render) | Web app hosting + CI | Free tier / $7+/svc | No | Partial (web only) | ⭐ | **Skip** — web-hosting PaaS, not a mobile CI |
| 2  | [CircleCI](https://github.com/marketplace/circleci) | General CI | Free (6k credits/mo) / $15+/mo | Yes (paid macOS tier) | High — duplicates GitHub Actions | ⭐⭐ | **Skip** — we already run CircleCI + GH Actions; adding a third lane does not help stores |
| 3  | [Travis CI](https://github.com/marketplace/travis-ci) | General CI | Free (OSS) / $69+/mo | Yes (paid) | High | ⭐⭐ | **Skip** — legacy for our stack; macOS pricing is the worst of the pack |
| 4  | [Azure Pipelines](https://github.com/marketplace/azure-pipelines) | General CI | Free (1,800 min/mo public) | Yes (macOS agents) | High | ⭐⭐ | **Skip** — capable but duplicates GH Actions; no store-specific tooling we don't already have via Fastlane |
| 5  | [Google Cloud Build](https://github.com/marketplace/google-cloud-build) | General CI | Pay-as-you-go | No managed macOS | Partial (Android only) | ⭐⭐ | **Skip** — no iOS path; we already solve Android in GH Actions |
| 6  | [AWS Connector for GitHub](https://github.com/marketplace/aws-connector-for-github) | CI bridge | Free app; AWS build costs | No managed macOS (self-host Mac) | Partial | ⭐⭐ | **Skip** — only makes sense if we were already on AWS CodeBuild |
| 7  | [Shopify](https://github.com/marketplace/shopify-online-store) | E-commerce deploy | Free | No | None, but wrong stack | ⭐ | **Skip** — Shopify theme deploys, unrelated to mobile stores |
| 8  | [Codemagic CI/CD](https://github.com/marketplace/codemagic-ci-cd) | **Mobile-first CI** | Free (500 macOS min/mo) / $0.095/min after | **Yes — managed macOS + code-signing UI** | Partial — complements Fastlane | ⭐⭐⭐⭐ | **Adopt as fallback** — keep GH Actions + Fastlane primary; use Codemagic when GH macOS runners are oversubscribed or for the signing UI |
| 9  | [Azure Pipelines (OAuth)](https://github.com/marketplace/azure-pipelines-oauth) | Same as #4, OAuth auth | Same as #4 | Yes | High | ⭐⭐ | **Skip** — duplicate of #4; pick at most one if adopted |
| 10 | [Official Nx Cloud App](https://github.com/marketplace/official-nx-cloud-app) | Monorepo build cache | Free (OSS) / $19+/mo | No | Partial — helps monorepos only | ⭐⭐ | **Defer** — revisit when a Revvel mobile repo ships as an Nx monorepo |
| 11 | [Bitrise](https://github.com/marketplace/bitrise-checks) | Mobile-first CI | Free (200 builds/mo, 45 min cap) / $36+/mo | **Yes — managed macOS + signing vault** | Partial — complements Fastlane | ⭐⭐⭐ | **Adopt-on-condition** — only if Codemagic free tier is exhausted AND an iOS signing quirk outpaces Fastlane |
| 12 | [IONOS Deploy Now](https://github.com/marketplace/ionos-deploy-now) | Web hosting deploy | Paid hosting required | No | None, but wrong stack | ⭐ | **Skip** — IONOS hosting only |
| 13 | [webapp.io](https://github.com/marketplace/layer-ci) | PR review environments | Free (limited) / $80+/mo | No | None, but web-only | ⭐⭐ | **Skip** for mobile — genuinely interesting for PWA preview URLs (see §4.3), but does not ship to stores |
| 14 | [AppVeyor](https://github.com/marketplace/appveyor) | Windows/macOS CI | Free (OSS) / $29+/mo | Yes | High | ⭐⭐ | **Skip** — Windows-primary; macOS tier is behind paid plans |
| 15 | [spacelift.io](https://github.com/marketplace/spacelift-io) | IaC delivery | Free (limited) / $320+/mo | No | None, but wrong stack | ⭐ | **Skip** — Terraform/Pulumi pipeline tool, unrelated to mobile |
| 16 | [Cirrus CI](https://github.com/marketplace/cirrus-ci) | General CI | Free (OSS) / pay-as-you-go | Yes (macOS available) | High | ⭐⭐ | **Skip** — interesting FreeBSD/macOS support, but no store-specific advantage over GH Actions |
| 17 | [Mend Bolt](https://github.com/marketplace/whitesource-bolt) | Dependency vulns | Free (public repos) | No | High with Dependabot + CodeQL + GitGuardian | ⭐⭐ | **Skip** — covered by incumbent security stack (see [`CODE_QUALITY_APPS_EVAL_2026-04-23.md` §5.2](./CODE_QUALITY_APPS_EVAL_2026-04-23.md)) |
| 18 | [AccessLint](https://github.com/marketplace/accesslint) | A11y PR checks | Free (OSS) / $29+/mo | No (HTML static analysis) | None | ⭐⭐⭐ | **Adopt-on-condition** — install on PWA repos (`oaudrey`, `penny-sovereign-yield-scout`, `the-alt-text`) when they render HTML in PRs; aligns with `the-alt-text`'s accessibility mission |
| 19 | [pre-commit ci](https://github.com/marketplace/pre-commit-ci) | Hosted pre-commit auto-fix | Free (public) / $5/mo private | No | None (mobile repos still benefit from Python/JS hooks) | ⭐⭐⭐⭐ | **Adopt** — already recommended in [`CODE_QUALITY_APPS_EVAL_2026-04-23.md` §3.3](./CODE_QUALITY_APPS_EVAL_2026-04-23.md); reconfirmed for mobile repos |
| 20 | [Appcircle Mobile CI/CD](https://github.com/marketplace/appcircle-mobile-ci-cd) | **Mobile-first CI** | Free (limited) / $39+/mo | **Yes — managed macOS + signing** | Partial — direct competitor to Codemagic/Bitrise | ⭐⭐ | **Skip** — third mobile-CI-SaaS option; Codemagic wins on free tier and Bitrise wins on enterprise features, leaving Appcircle without a lane |

---

## 2. Assessment rubric

Each app is scored against five mobile-specific dimensions. The table above is the one-line rollup; the per-app notes in §3–§5 expand on "Overlap" and "Mobile Fit".

| Dimension | What we check |
|---|---|
| **Replaces Fastlane path** | Does the tool produce a signed `.aab` / `.ipa` *and* push to Play Console / App Store Connect, or does it stop at "build artifact"? |
| **Managed macOS** | iOS builds need a macOS runner with Xcode. Does the app provide one on its free tier? |
| **Signing UX** | Keystore (Android) + provisioning profiles + App Store Connect API key (iOS) handling — secrets-safe per [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md)? |
| **Store submission** | Can it upload to Play Console *internal/closed/production* tracks and TestFlight / App Store review, or only attach the binary as a GitHub Release? |
| **Overlap with incumbents** | GitHub Actions (primary), CircleCI (already configured in several repos), Fastlane (primary store driver), plus the `templates/cicd/deploy-*.yml` scaffolds. |

The incumbent baseline is: **GitHub Actions workflow → Gradle/Xcode build → Fastlane lane (`android internal` / `android production` / `ios testflight` / `ios app_store`) → store API**. Anything that does not materially reduce the effort of that chain is a skip.

---

## 3. Adopt now (⭐⭐⭐⭐)

### 3.1 Codemagic CI/CD — Managed macOS fallback for iOS

**Why adopt.** GitHub-hosted macOS runners are 10× the compute-minute cost of Linux runners, and the free tier for private repos is tight. Codemagic's free tier offers **500 macOS-build-minutes/month** plus a GUI for certificates/profiles that is less error-prone than the Fastlane `match` flow the first time someone sets it up. It is a *fallback*, not a replacement — the Fastlane lanes in [`../templates/mobile/fastlane/Fastfile`](../templates/mobile/fastlane/Fastfile) run unchanged; Codemagic just becomes a second place where they can execute.

**Why not primary.** Vendor lock-in and secrets duplication. Our source-of-truth for store deploys stays in GitHub Actions + Fastlane per [`../templates/mobile/MOBILE_DEPLOYMENT.md` §7](../templates/mobile/MOBILE_DEPLOYMENT.md).

**Next step.** When the Apple Developer Program purchase in [`../templates/mobile/MOBILE_DEPLOYMENT.md` §5](../templates/mobile/MOBILE_DEPLOYMENT.md) lands, connect Codemagic to *one* mobile repo as a secondary workflow. Document the fallback procedure under a new §8 of `MOBILE_DEPLOYMENT.md`. Register under [`_MASTER_INVENTORY.md`](./_MASTER_INVENTORY.md) §9.

### 3.2 pre-commit ci — Shared with the code-quality eval

**Why adopt.** Mobile repos still lint JS/TS (Cordova/Capacitor), Dart (if Flutter ever enters the stack), and shell scripts. The rationale in [`CODE_QUALITY_APPS_EVAL_2026-04-23.md` §3.3](./CODE_QUALITY_APPS_EVAL_2026-04-23.md) applies identically here — enabling pre-commit ci on mobile repos means hooks run even when a committer skips them locally.

**Next step.** Enable alongside the code-quality rollout (week of April 27, 2026). No extra work beyond re-using that workflow on mobile repos.

---

## 4. Adopt on condition (⭐⭐⭐)

### 4.1 Bitrise — Mobile-first CI (fallback to the fallback)

Bitrise's free tier (200 builds/mo, 45-minute build cap) is narrower than Codemagic's, but its signing vault and step library are the most mature in the category. **Trigger to install:** Codemagic's 500 free macOS-minutes/month are consistently exhausted *and* a specific iOS signing edge case (e.g., enterprise provisioning, per-build certificate rotation) outpaces Fastlane. Until that trigger fires, the $36+/mo starting plan is not justified.

### 4.2 AccessLint — Accessibility in PR comments (PWA repos only)

Mobile repos in this org are PWAs first, which means every PR that changes the rendered HTML benefits from an a11y lint. AccessLint's free OSS tier posts findings as PR comments. It pairs naturally with `the-alt-text`'s mission. **Trigger to install:** any PWA repo that emits HTML diffs in PRs (today: `oaudrey`, `penny-sovereign-yield-scout`, `the-alt-text`). Not a store-automation tool; included because the issue asks about "review apps" broadly.

### 4.3 webapp.io — PR review environments (PWA repos only)

Not a store automation tool. Flagged here only because the issue groups "review apps" with CI. Its free tier can spin up a PWA preview URL per PR, which is genuinely useful for the Bubblewrap/TWA flow in [`../templates/mobile/MOBILE_DEPLOYMENT.md` §2](../templates/mobile/MOBILE_DEPLOYMENT.md) — TWAs pin to a specific PWA URL, and being able to test the PR's PWA build in a TWA wrapper *before* signing an `.aab` is a real gap. **Trigger to install:** when the TWA activation procedure is drafted. Skip for now.

---

## 5. Skip / defer (⭐⭐ and below)

Grouped by reason for skipping.

### 5.1 Duplicate of GitHub Actions + Fastlane (generic CI)

- **CircleCI** (#2), **Travis CI** (#3), **Azure Pipelines** (#4), **Azure Pipelines (OAuth)** (#9), **Google Cloud Build** (#5), **AWS Connector for GitHub** (#6), **AppVeyor** (#14), **Cirrus CI** (#16).

All are capable general CIs. None provide a store-submission capability that Fastlane does not already deliver on GitHub Actions. Adding a second CI just means second-copy of secrets and a duplicated failure surface. **Rule of thumb for Revvel:** one CI per repo unless a specific OS runner (macOS for iOS) forces a second.

### 5.2 Duplicate of an already-picked mobile CI

- **Appcircle** (#20) competes directly with Codemagic (§3.1) and Bitrise (§4.1). We pick one primary + one fallback; Appcircle does not win either slot on free-tier generosity or signing UX, so it is out.

### 5.3 Wrong stack

- **Render** (#1): web hosting + CI, not mobile store submission.
- **Shopify** (#7): storefront theme deploys.
- **IONOS Deploy Now** (#12): IONOS-hosted web only.
- **spacelift.io** (#15): Terraform/Pulumi IaC delivery; revisit only if Revvel adopts Terraform (see Infracost trigger in [`CODE_QUALITY_APPS_EVAL_2026-04-23.md` §4.2](./CODE_QUALITY_APPS_EVAL_2026-04-23.md)).

### 5.4 Duplicate of incumbent security stack

- **Mend Bolt** (#17): covered by Dependabot + CodeQL + GitGuardian + Gitleaks per [`_MASTER_BOM.md`](./_MASTER_BOM.md).

### 5.5 Defer

- **Nx Cloud** (#10): only useful if a mobile repo ships as an Nx monorepo. None do today. Revisit on first Nx workspace commit.

---

## 6. Rollout plan

1. **On Apple Developer Program purchase** ([`../templates/mobile/MOBILE_DEPLOYMENT.md` §5](../templates/mobile/MOBILE_DEPLOYMENT.md) trigger) — Connect **Codemagic CI/CD** as a secondary workflow for the first iOS-shipping repo. Primary stays GitHub Actions + Fastlane per [`../templates/cicd/deploy-ios.yml`](../templates/cicd/deploy-ios.yml).
2. **Week of April 27, 2026** — Enable **pre-commit ci** on mobile repos alongside the code-quality rollout.
3. **On first visible PWA UI PR** — Enable **AccessLint** on `oaudrey`, `penny-sovereign-yield-scout`, `the-alt-text`.
4. **If Codemagic free tier exhausts** — Evaluate **Bitrise** (§4.1) before paying Codemagic overage.
5. **On TWA activation draft** — Pilot **webapp.io** on one PWA repo for PR preview URLs.

## 7. Out of scope (deliberately)

- We do **not** run two general-purpose CIs on the same repo. GitHub Actions is primary; CircleCI is tolerated where already configured but not expanded to mobile.
- We do **not** migrate store submission away from Fastlane. Fastlane's `supply` (Play) and `deliver` (App Store Connect) drivers are the vendor-neutral interface; moving submission logic into a proprietary CI GUI (Codemagic/Bitrise/Appcircle workflow editor) would forfeit that portability.
- We do **not** install any paid tier beyond the current free allocations without a sign-off in [`_MASTER_BOM.md`](./_MASTER_BOM.md).

---

*Authored: April 23, 2026. Next review: on Apple Developer Program purchase, or on exhaustion of Codemagic's free macOS-minute tier — whichever comes first.*
