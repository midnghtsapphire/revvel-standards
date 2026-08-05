# Icon Size Quick Reference

All required icon sizes for every Revvel web application, grouped by platform.

---

## Web (Favicon)

| Size | File Name | Head Tag | Source |
|---|---|---|---|
| 16×16 | `favicon-16x16.png` | `<link rel="icon" sizes="16x16" href="/icons/favicon-16x16.png">` | `app-icon-1024x1024.png` |
| 32×32 | `favicon-32x32.png` | `<link rel="icon" sizes="32x32" href="/icons/favicon-32x32.png">` | `app-icon-1024x1024.png` |
| 48×48 | `favicon-48x48.png` | (bundle into favicon.ico) | `app-icon-1024x1024.png` |
| multi | `favicon.ico` | `<link rel="shortcut icon" href="/icons/favicon.ico">` | Bundle 16+32+48 using ImageMagick |

**ImageMagick command:**
```bash
convert favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico
```

---

## PWA (Progressive Web App)

| Size | File Name | Manifest Entry | Source |
|---|---|---|---|
| 192×192 | `icon-192x192.png` | `{"src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png"}` | `app-icon-1024x1024.png` |
| 512×512 | `icon-512x512.png` | `{"src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png"}` | `app-icon-1024x1024.png` |
| 192×192 | `maskable-icon-192x192.png` | `{"src": "/icons/maskable-icon-192x192.png", "sizes": "192x192", "purpose": "maskable"}` | Add 20% padding (safe zone) |
| 512×512 | `maskable-icon-512x512.png` | `{"src": "/icons/maskable-icon-512x512.png", "sizes": "512x512", "purpose": "maskable"}` | Add 20% padding (safe zone) |

**Sharp (Node.js) batch resize command:**
```javascript
const sharp = require('sharp');
const sizes = [192, 512];
for (const size of sizes) {
  sharp('app-icon-1024x1024.png')
    .resize(size, size)
    .toFile(`icon-${size}x${size}.png`);
}
```

**Maskable icon:** The icon content must fit within the central 80% of the canvas (safe zone). The outer 20% may be cropped by Android adaptive icon masks.

---

## Apple (iOS / iPadOS)

| Size | File Name | Head Tag | Device |
|---|---|---|---|
| 180×180 | `apple-touch-icon-180x180.png` | `<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png">` | iPhone (Retina) |
| 167×167 | `apple-touch-icon-167x167.png` | `<link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon-167x167.png">` | iPad Pro |
| 152×152 | `apple-touch-icon-152x152.png` | `<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png">` | iPad (older) |

**Notes:**
- Apple automatically rounds corners and adds gloss — provide a square icon, no rounding needed
- iOS ignores the manifest `icons` array — the `apple-touch-icon` link tags are required separately
- Source: `app-icon-1024x1024.png`

---

## Android (Chrome / Play Store)

| Size | File Name | Usage | Source |
|---|---|---|---|
| 192×192 | `android-chrome-192x192.png` | Chrome "Add to Home Screen" | `app-icon-1024x1024.png` |
| 512×512 | `android-chrome-512x512.png` | Play Store listing | `app-icon-1024x1024.png` |
| 1024×1024 | `splash-screen-1024x1024.png` | Android splash screen source | Original art |

---

## Desktop App / System Tray

| Size | File Name | Platform | Usage |
|---|---|---|---|
| 16×16 | `tray-icon-16x16.png` | macOS | Menu bar |
| 22×22 | `tray-icon-22x22.png` | macOS | Retina menu bar |
| 32×32 | `tray-icon-32x32.png` | Windows | System tray |
| 256×256 | `tray-icon-256x256.png` | Windows | High DPI system tray |
| 1024×1024 | `app-icon-1024x1024.png` | macOS | .icns source (all sizes derived from this) |

**macOS .icns generation:**
```bash
# Create iconset directory
mkdir MyApp.iconset
# Copy + rename sizes
cp icon-16x16.png MyApp.iconset/icon_16x16.png
cp icon-32x32.png MyApp.iconset/icon_32x32.png
# ... (add all required sizes)
# Generate .icns
iconutil -c icns MyApp.iconset
```

---

## Social / OG

| Size | File Name | Meta Tag | Notes |
|---|---|---|---|
| 1200×630 | `og-image-1200x630.png` | `<meta property="og:image" content="...">` | Open Graph (Facebook, LinkedIn) |
| 1200×630 | `og-image-1200x630.jpg` | Fallback JPEG | Some platforms prefer JPEG |

**Design notes:**
- OG image should include the Revvel Emblem + project name wordmark
- Leave ~100px padding on all edges (some platforms crop)
- Text should be readable at thumbnail size (thumbnail is ~200×105px)

---

## Recommended Export Tool

| Tool | Best For | Link |
|---|---|---|
| **Sharp** (Node.js) | Batch resizing from 1024 source | `npm i sharp` |
| **ImageMagick** | ICO generation + macOS .icns | `brew install imagemagick` |
| **Squoosh** | Manual per-file compression | <https://squoosh.app> |
| **RealFaviconGenerator** | Complete favicon set generation | <https://realfavicongenerator.net> |

---

## Directory Structure

Place all icons in your app repo at:

```text
client/public/icons/
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── favicon.ico
├── icon-192x192.png
├── icon-512x512.png
├── maskable-icon-192x192.png
├── maskable-icon-512x512.png
├── apple-touch-icon-180x180.png
├── apple-touch-icon-167x167.png
├── apple-touch-icon-152x152.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── splash-screen-1024x1024.png
├── tray-icon-16x16.png
├── tray-icon-22x22.png
├── tray-icon-32x32.png
├── tray-icon-256x256.png
├── app-icon-1024x1024.png
├── og-image-1200x630.png
├── og-image-1200x630.jpg
├── logo-full.svg
├── logo-full@2x.png
├── logo-full@3x.png
├── logo-mark.svg
├── logo-mark-192x192.png
├── logo-mark-512x512.png
├── logo-dark.svg
└── logo-light.svg
```
