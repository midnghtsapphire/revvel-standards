# Apache Cordova Mobile Deployment Standard

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Active Template
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Apache Cordova is an open-source mobile development framework that packages web applications (HTML, CSS, JavaScript) into native mobile apps for Android and iOS using a WebView container. It provides a plugin system for accessing native device APIs (camera, GPS, contacts, push notifications, etc.).

This standard defines how to integrate Apache Cordova into the Revvel CI/CD pipeline, including:
- Project scaffolding and structure
- CI/CD workflow via `templates/cicd/deploy-cordova.yml`
- Build and signing configuration for Android and iOS
- Plugin management and Dependabot integration
- Fastlane integration for automated store publishing

---

## 2. Cordova vs. Capacitor vs. Bubblewrap

| Feature | Apache Cordova | Capacitor | Bubblewrap (TWA) |
|---|---|---|---|
| **Approach** | WebView wrapper + plugins | WebView wrapper + native layer | Chrome TWA (Android only) |
| **Platform support** | Android, iOS | Android, iOS | Android only |
| **Plugin ecosystem** | Mature (1,000+ plugins) | Growing (Ionic-maintained) | N/A — loads PWA directly |
| **Native API access** | Via Cordova plugins | Via Capacitor plugins | Minimal (Web APIs only) |
| **Framework agnostic** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Maintenance status** | Apache Foundation (stable) | Ionic (active) | Google (active) |
| **Best for** | Projects needing broad plugin support, legacy hybrid apps | New hybrid apps using Ionic | PWAs targeting Play Store |

**Recommendation:** Use Capacitor for new projects. Use Cordova when you need a specific plugin only available in the Cordova ecosystem, or when migrating an existing Cordova-based app. The full standards-level rationale (rubric, scorecard, risks, rollout) is in [`../../docs/CAPACITOR_MOBILE_EVAL_2026-04-28.md`](../../docs/CAPACITOR_MOBILE_EVAL_2026-04-28.md).

---

## 3. Prerequisites

### 3.1 Local Development Tools

```bash
# Install Node.js 20+ (via nvm recommended)
nvm install 20 && nvm use 20

# Install Cordova CLI globally
npm install -g cordova

# Verify installation
cordova --version
```

### 3.2 Android Prerequisites

| Requirement | Version | Install |
|---|---|---|
| Java JDK | 17 (LTS) | `brew install openjdk@17` / `apt install openjdk-17-jdk` |
| Android Studio | Latest | <https://developer.android.com/studio> |
| Android SDK | API 33+ | Via Android Studio SDK Manager |
| Gradle | Bundled with Android Studio | — |

Set required environment variables:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)   # macOS
export ANDROID_HOME=$HOME/Library/Android/sdk        # macOS
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

### 3.3 iOS Prerequisites

| Requirement | Install |
|---|---|
| macOS (required) | Apple hardware or macOS VM |
| Xcode (latest) | Mac App Store |
| Xcode Command Line Tools | `xcode-select --install` |
| CocoaPods | `sudo gem install cocoapods` |

---

## 4. Project Scaffolding

### 4.1 Create a New Cordova Project

```bash
# Create project (run from your workspace root)
cordova create [APP_DIR] [BUNDLE_ID] [APP_DISPLAY_NAME]
# Example:
cordova create my-app com.revvel.myapp "My Revvel App"

cd my-app

# Add platforms
cordova platform add android
cordova platform add ios    # macOS only

# Verify requirements
cordova requirements android
cordova requirements ios
```

### 4.2 Standard Project Structure

```text
my-app/
├── config.xml            ← App configuration (name, ID, version, plugins)
├── www/                  ← Web source files (your HTML/CSS/JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── platforms/            ← Generated native projects (gitignore these)
│   ├── android/
│   └── ios/
├── plugins/              ← Installed Cordova plugins (gitignore these)
├── hooks/                ← Cordova lifecycle hooks (optional)
├── package.json
└── .gitignore
```

### 4.3 `.gitignore` for Cordova Projects

Add to your project's `.gitignore`:

```text
# Cordova generated artifacts
platforms/
plugins/
```

These are regenerated on each build from `config.xml` and `package.json`.

---

## 5. Configuration: `config.xml`

The `config.xml` is the central configuration file for a Cordova project:

```xml
<?xml version='1.0' encoding='utf-8'?>
<widget
  id="com.revvel.myapp"
  version="1.0.0"
  xmlns="http://www.w3.org/ns/widgets"
  xmlns:cdv="http://cordova.apache.org/ns/1.0"
>
  <name>My Revvel App</name>
  <description>A Revvel mobile application built with Apache Cordova</description>
  <author email="developer@revvel.app" href="https://revvel.app">
    Revvel Developer
  </author>

  <!-- Content source -->
  <content src="index.html" />

  <!-- Allowed navigation targets -->
  <allow-navigation href="*" />
  <allow-intent href="http://*/*" />
  <allow-intent href="https://*/*" />
  <allow-intent href="tel:*" />
  <allow-intent href="sms:*" />
  <allow-intent href="mailto:*" />
  <allow-intent href="geo:*" />

  <!-- Android-specific settings -->
  <platform name="android">
    <allow-intent href="market:*" />
    <icon density="ldpi" src="res/icon/android/ldpi.png" />
    <icon density="mdpi" src="res/icon/android/mdpi.png" />
    <icon density="hdpi" src="res/icon/android/hdpi.png" />
    <icon density="xhdpi" src="res/icon/android/xhdpi.png" />
    <icon density="xxhdpi" src="res/icon/android/xxhdpi.png" />
    <icon density="xxxhdpi" src="res/icon/android/xxxhdpi.png" />
    <splash density="land-hdpi" src="res/screen/android/screen-hdpi-landscape.png" />
    <splash density="land-ldpi" src="res/screen/android/screen-ldpi-landscape.png" />
    <splash density="land-mdpi" src="res/screen/android/screen-mdpi-landscape.png" />
    <splash density="land-xhdpi" src="res/screen/android/screen-xhdpi-landscape.png" />
    <splash density="port-hdpi" src="res/screen/android/screen-hdpi-portrait.png" />
    <splash density="port-ldpi" src="res/screen/android/screen-ldpi-portrait.png" />
    <splash density="port-mdpi" src="res/screen/android/screen-mdpi-portrait.png" />
    <splash density="port-xhdpi" src="res/screen/android/screen-xhdpi-portrait.png" />
  </platform>

  <!-- iOS-specific settings -->
  <platform name="ios">
    <allow-intent href="itms:*" />
    <allow-intent href="itms-apps:*" />
    <icon height="57" src="res/icon/ios/icon.png" width="57" />
    <icon height="114" src="res/icon/ios/icon@2x.png" width="114" />
    <!-- ... additional iOS icon sizes ... -->
  </platform>

  <!-- Plugins (added via "cordova plugin add") -->
  <!-- cordova-plugin-device -->
  <!-- cordova-plugin-network-information -->
  <!-- cordova-plugin-splashscreen -->
</widget>
```

---

## 6. Plugin Management

### 6.1 Adding Plugins

```bash
# Add a plugin (saved to config.xml automatically)
cordova plugin add cordova-plugin-camera
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-geolocation
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-splashscreen

# List installed plugins
cordova plugin list

# Remove a plugin
cordova plugin remove cordova-plugin-camera
```

### 6.2 Common Revvel Plugins

| Plugin | npm Package | Use Case |
|---|---|---|
| Camera | `cordova-plugin-camera` | Photo/video capture |
| Device Info | `cordova-plugin-device` | Device metadata |
| Geolocation | `cordova-plugin-geolocation` | GPS location |
| Network | `cordova-plugin-network-information` | Connectivity detection |
| Push Notifications | `cordova-plugin-push` | FCM / APNs push |
| Splash Screen | `cordova-plugin-splashscreen` | Launch screen |
| Status Bar | `cordova-plugin-statusbar` | Status bar color/style |
| File | `cordova-plugin-file` | Filesystem access |
| InAppBrowser | `cordova-plugin-inappbrowser` | External URLs in a WebView |
| Vibration | `cordova-plugin-vibration` | Haptic feedback |

### 6.3 Plugin Security Policy

- Only install plugins from `npm` (official registry) or verified GitHub sources
- Review plugin `plugin.xml` for dangerous permissions before installing
- Audit plugins with `npm audit` before every release (plugins are npm packages)
- Remove unused plugins — they expand the attack surface of the app

---

## 7. Build Commands

### 7.1 Development Builds

```bash
# Build for Android (debug)
cordova build android

# Build for iOS (debug, macOS only)
cordova build ios

# Run on connected Android device
cordova run android --device

# Run on connected iOS device (macOS only)
cordova run ios --device

# Run on Android emulator
cordova emulate android

# Run on iOS Simulator (macOS only)
cordova emulate ios
```

### 7.2 Release Builds

#### Android Release Build

```bash
# Step 1: Generate signing keystore (run once)
keytool -genkey -v \
  -keystore release.keystore \
  -alias release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Step 2: Build release APK
cordova build android --release -- \
  --keystore=release.keystore \
  --storePassword=YOUR_STORE_PASSWORD \
  --alias=release \
  --password=YOUR_KEY_PASSWORD

# Step 3: Locate the signed APK
# Output: platforms/android/app/build/outputs/apk/release/app-release.apk

# Step 4: (Optional) Build AAB instead of APK (required for Play Store)
cordova build android --release -- \
  --packageType=bundle \
  --keystore=release.keystore \
  --storePassword=YOUR_STORE_PASSWORD \
  --alias=release \
  --password=YOUR_KEY_PASSWORD
# Output: platforms/android/app/build/outputs/bundle/release/app-release.aab
```

#### iOS Release Build

```bash
# Sync platforms and plugins before building
cordova prepare ios

# Build for App Store distribution (requires Xcode + Apple Developer account)
cordova build ios --release --device

# Then open in Xcode for signing and archiving:
open platforms/ios/[APP_NAME].xcworkspace
# In Xcode: Product → Archive → Distribute App → App Store Connect
```

---

## 8. Android: Signing and Play Store Deployment

### 8.1 Required GitHub Secrets

| Secret | Value | Where to Get |
|---|---|---|
| `KEYSTORE_BASE64` | `base64 release.keystore` | Generate with keytool (one-time) |
| `KEYSTORE_PASSWORD` | Keystore password | Set during keytool generation |
| `KEY_ALIAS` | Key alias (e.g., `release`) | Set during keytool generation |
| `KEY_PASSWORD` | Key password | Set during keytool generation |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | JSON key content | Google Play Console → Setup → API access |

### 8.2 Encode Keystore for GitHub Secrets

```bash
# Encode keystore as base64 (copy output to KEYSTORE_BASE64 secret)
base64 -i release.keystore | pbcopy   # macOS
base64 release.keystore               # Linux
```

**IMPORTANT:** Never commit `release.keystore` to version control. Store in HashiCorp Vault:

```bash
vault kv put revvel/apps/cordova/android/prod \
  keystore_base64="$(base64 -i release.keystore)" \
  keystore_password="YOUR_STORE_PASSWORD" \
  key_alias="release" \
  key_password="YOUR_KEY_PASSWORD"
```

### 8.3 Play Console Setup (One-Time)

1. Create app at <https://play.google.com/console>
2. Go to **Setup → API access → Link to Google Cloud project**
3. Create a Service Account with **Release Manager** role
4. Download the JSON key → store content in `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret

---

## 9. iOS: Signing and App Store Deployment

### 9.1 Required GitHub Secrets

| Secret | Value | Where to Get |
|---|---|---|
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID (10-char alphanumeric) | App Store Connect → Users → Keys |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer UUID | App Store Connect → Users → Keys |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | `.p8` file content | Downloaded when creating key |

### 9.2 App Store Connect Setup (One-Time)

1. Go to <https://appstoreconnect.apple.com> → Users and Access → Keys
2. Click **+** to generate an API key with **App Manager** role
3. Download the `.p8` file (only downloadable once)
4. Store content in `APP_STORE_CONNECT_API_KEY_CONTENT` secret
5. Note the Key ID and Issuer ID for the other two secrets

Store in HashiCorp Vault:

```bash
vault kv put revvel/apps/cordova/ios/prod \
  api_key_id="YOUR_KEY_ID" \
  issuer_id="YOUR_ISSUER_UUID" \
  api_key_content="$(cat AuthKey_XXXXXXXXXX.p8)"
```

---

## 10. CI/CD Integration

### 10.1 Activate the Workflow

Copy the workflow template to your app repo:

```bash
cp templates/cicd/deploy-cordova.yml .github/workflows/deploy-cordova.yml
```

Then follow the TODO comments in the workflow to replace placeholder steps with the real Cordova + Fastlane build steps.

### 10.2 Workflow Triggers

The `deploy-cordova.yml` template uses `workflow_dispatch` (manual trigger only) by default. To enable automatic deployment on push to `main`:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    # ... inputs ...
```

### 10.3 Required Accounts and Costs

| Account | Purpose | Cost | Where to Get |
|---|---|---|---|
| Google Play Developer | Android store deployment | $25 one-time | <https://play.google.com/console/signup> |
| Apple Developer Program | iOS store deployment + TestFlight | $99/year | <https://developer.apple.com/programs/> |

---

## 11. Dependabot Integration

Cordova plugins are npm packages, so they are automatically covered by the existing Dependabot `npm` ecosystem configuration in `templates/cicd/dependabot.yml`.

No additional Dependabot configuration is required for Cordova projects — plugin version updates will appear as standard npm PRs alongside your other dependency updates.

To verify:
1. Ensure `plugins/` is in `.gitignore` (Cordova restores them from `package.json`)
2. Confirm `package.json` lists your Cordova plugins as dependencies
3. Check that `templates/cicd/dependabot.yml` is active in your repo

---

## 12. Fastlane Integration

Cordova builds can be integrated into the Fastfile from `templates/mobile/fastlane/Fastfile`. Add Cordova-specific lanes:

```ruby
# In fastlane/Fastfile — add these lanes alongside the existing Android/iOS lanes

platform :android do
  desc "Build Cordova APK and deploy to Play Store Internal Testing"
  lane :cordova_internal do
    # TODO: Activate when accounts are ready
    # sh("cordova build android --release -- " \
    #    "--keystore=release.keystore " \
    #    "--storePassword=#{ENV['KEYSTORE_PASSWORD']} " \
    #    "--alias=#{ENV['KEY_ALIAS']} " \
    #    "--password=#{ENV['KEY_PASSWORD']}")
    # supply(
    #   track: "internal",
    #   aab: "platforms/android/app/build/outputs/bundle/release/app-release.aab",
    #   json_key_data: ENV["GOOGLE_PLAY_JSON_KEY"],
    # )
    UI.message("⚠️  Cordova Android lane not yet active. See CORDOVA_STANDARD.md")
  end
end

platform :ios do
  desc "Build Cordova IPA and deploy to TestFlight"
  lane :cordova_testflight do
    # TODO: Activate when accounts are ready
    # Replace [APP_NAME] with your actual Xcode project name (same as the
    # `name` field in config.xml, e.g., "MyRevvelApp")
    # sh("cordova prepare ios")
    # gym(
    #   workspace: "platforms/ios/[APP_NAME].xcworkspace",
    #   scheme: "[APP_NAME]",
    #   export_method: "app-store",
    # )
    # pilot(skip_waiting_for_build_processing: true)
    UI.message("⚠️  Cordova iOS lane not yet active. See CORDOVA_STANDARD.md")
  end
end
```

---

## 13. Security Checklist

Before releasing a Cordova app to any store, verify:

- [ ] `platforms/` and `plugins/` are in `.gitignore` — never committed
- [ ] `release.keystore` (Android) is **not** in version control — stored in HashiCorp Vault
- [ ] All plugin permissions in `config.xml` are justified and minimal
- [ ] `npm audit` reports no high/critical CVEs in Cordova plugins
- [ ] `cordova-plugin-whitelist` or CSP meta tag restricts network access appropriately
- [ ] No API keys, tokens, or secrets in `www/` source files
- [ ] App transport security (iOS) and network security config (Android) are configured
- [ ] `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` stored as GitHub Secrets — not hardcoded
- [ ] App Store Connect API key (iOS) stored as GitHub Secrets — not in code

---

## 14. Troubleshooting

### "ANDROID_HOME not found

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
export ANDROID_HOME=$HOME/Android/Sdk           # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### "cordova requirements android" fails

Ensure Java 17 is installed and `JAVA_HOME` is set:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
java -version  # should show 17.x
```

### CocoaPods errors on iOS

```bash
sudo gem install cocoapods
pod repo update
```

### Plugins not restoring after clone

```bash
cordova prepare
# This restores all platforms and plugins listed in config.xml / package.json
```

---

## 15. Related Standards

| Document | Relevance |
|---|---|
| `templates/mobile/MOBILE_DEPLOYMENT.md` | Overall mobile deployment guide (PWA, TWA, Capacitor, Cordova) |
| `docs/CAPACITOR_MOBILE_EVAL_2026-04-28.md` | Standards-level evaluation that designates Capacitor as the primary PWA → native shell wrapper, with Cordova kept for legacy/migration |
| `templates/cicd/deploy-cordova.yml` | Cordova GitHub Actions workflow template |
| `templates/cicd/dependabot.yml` | Dependabot config (covers Cordova npm plugins automatically) |
| `SECURITY_STANDARD.md` | Security requirements for mobile apps |
| `docs/Master_Inventory/VAULT_AGENT_STANDARD.md` | Keystore and API key secret management |
| `docs/Master_Inventory/DEPLOYMENT_STANDARD.md` | How releases flow through CI to the stores |
