# Mobile Deployment Guide

**Status:** PWA is active. Store deployments are pending account setup.

---

## 1. Current State — What Works Right Now

Every Revvel app deployed as a PWA supports **"Add to Home Screen"** on both Android and iOS:

| Platform | Method | Status |
|---|---|---|
| Android | Chrome → ⋮ → Add to Home Screen | ✅ Works now |
| iOS | Safari → Share → Add to Home Screen | ✅ Works now |
| Android (Play Store) | Trusted Web Activity (TWA) via Bubblewrap | ❌ Pending Play account |
| iOS (App Store) | Capacitor → Xcode → App Store Connect | ❌ Pending Apple account |

Users can install your app to their home screen today without any store submission.

---

## 2. Android Play Store Path

### Required Accounts (BOM Items)
| Item | Provider | Cost | Status |
|---|---|---|---|
| Google Play Developer account | Google | $25 one-time | ❌ Not purchased |
| Google Play Console access | Google | Included | — |

### Technology: Bubblewrap CLI → TWA → APK

Bubblewrap wraps your PWA in a **Trusted Web Activity (TWA)** — an Android app that loads your PWA in a full-screen Chrome view, indistinguishable from a native app.

### Exact Commands (activate when account is ready)

```bash
# Step 1: Install Bubblewrap
npm install -g @bubblewrap/cli

# Step 2: Initialize the TWA project (run once from your repo root)
bubblewrap init --manifest https://[YOUR_DOMAIN]/manifest.json

# Step 3: Build the APK
bubblewrap build

# Step 4: Sign the APK (requires Android keystore — generate once)
# keytool -genkey -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000

# Step 5: Upload to Play Console via Fastlane
bundle exec fastlane android internal
# or: bundle exec fastlane android production
```

### Play Console Setup (one-time)
1. Go to https://play.google.com/console
2. Create new app → "App" (not game) → Free
3. Fill in store listing (description, screenshots, icon)
4. Upload APK to "Internal testing" track first
5. Graduate to alpha → beta → production after testing

---

## 3. iOS App Store Path

### Required Accounts (BOM Items)
| Item | Provider | Cost | Status |
|---|---|---|---|
| Apple Developer Program | Apple | $99/year | ❌ Not purchased |
| App Store Connect access | Apple | Included | — |

### Technology: Capacitor → Xcode → App Store Connect

Capacitor wraps your PWA in a native iOS WebView container with full access to native APIs.

### Exact Commands (activate when account is ready)

```bash
# Step 1: Install Capacitor
pnpm add @capacitor/core @capacitor/ios

# Step 2: Initialize Capacitor (run once)
npx cap init [APP_NAME] com.[BUNDLE_ID].[APP_NAME]

# Step 3: Add iOS platform
npx cap add ios

# Step 4: Build your web app
pnpm build

# Step 5: Sync web build to Capacitor
npx cap sync ios

# Step 6: Open in Xcode
npx cap open ios

# In Xcode:
# - Set Team (requires Apple Developer account)
# - Set Bundle Identifier (must match App Store Connect)
# - Set version number and build number
# - Product → Archive → Distribute App → App Store Connect
```

### App Store Connect Setup (one-time)
1. Go to https://appstoreconnect.apple.com
2. Create new app → iOS → Bundle ID (create in developer.apple.com first)
3. Fill in app metadata (description, screenshots, keywords)
4. Upload build from Xcode → Submit for review
5. Review typically takes 1–3 business days

---

## 4. Required Accounts + Costs (BOM Items)

| Account | Purpose | Cost | Where to Buy |
|---|---|---|---|
| Google Play Developer | Android store deployment | $25 one-time | https://play.google.com/console/signup |
| Apple Developer Program | iOS store deployment + TestFlight | $99/year | https://developer.apple.com/programs/ |
| Fastlane (optional) | Automated store publishing | Free | https://fastlane.tools |

---

## 5. Fastlane Setup for Automated Store Publishing

Fastlane automates the build → sign → upload process for both platforms.

### Installation
```bash
# Install Fastlane (requires Ruby)
gem install fastlane

# Or use Bundler (recommended)
bundle init
echo 'gem "fastlane"' >> Gemfile
bundle install
```

### Structure
```
fastlane/
├── Fastfile    — Lane definitions (see templates/mobile/fastlane/Fastfile)
└── Appfile     — App identifiers (see templates/mobile/fastlane/Appfile)
```

### Running Lanes
```bash
# Android — deploy to internal testing
bundle exec fastlane android internal

# Android — promote to production
bundle exec fastlane android production

# iOS — deploy to TestFlight
bundle exec fastlane ios testflight

# iOS — deploy to App Store
bundle exec fastlane ios app_store
```

---

## 6. CI/CD Integration

Once accounts are active, add the deployment workflows to your app repo:

```bash
# Copy the workflow templates
cp templates/cicd/deploy-android.yml .github/workflows/deploy-android.yml
cp templates/cicd/deploy-ios.yml .github/workflows/deploy-ios.yml
```

Then follow the TODO comments in each workflow to replace the placeholder steps.

---

## 7. PWA Audit

Before submitting to any store, run the PWA audit script:

```bash
bash scripts/pwa-audit.sh
```

All checks must pass (✅) before store submission.
