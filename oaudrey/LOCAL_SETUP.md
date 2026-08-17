# Running oAudrey Locally

This guide explains how to run the oAudrey hub locally on your machine for development and testing.

## Quick Start (3 Simple Options)

The oAudrey hub is a **static HTML site** with no build step required. You just need to serve the files with a local web server.

### Option 1: Python (No Installation Needed)

Python 3 comes pre-installed on most systems.

```bash
cd oaudrey
python3 -m http.server 8080
```

Then open <http://localhost:8080> in your browser.

### Option 2: Node.js http-server

If you have Node.js installed:

```bash
cd oaudrey
npx http-server -p 8080
```

Then open <http://localhost:8080> in your browser.

### Option 3: PHP (if available)

If you have PHP installed:

```bash
cd oaudrey
php -S localhost:8080
```

Then open <http://localhost:8080> in your browser.

## GitHub Pages Deployment

The repository is also configured to deploy to GitHub Pages automatically on every push to `main`. Once enabled in your repository settings, the site will be available at:

```text
https://midnghtsapphire.github.io/revvel-standards/oaudrey/
```

### Enabling GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Build and deployment":
   - Source: **GitHub Actions**
4. The `static.yml` workflow will automatically deploy on the next push to `main`

The GitHub Pages deployment is useful for:

- Quick previews without DigitalOcean setup
- Testing before deploying to production
- Sharing work-in-progress with stakeholders
- Backup/mirror of the production site

## What You're Running

The oAudrey hub consists of:

- **`index.html`** — Main landing page (uses Tailwind CSS via CDN)
- **`404.html`** — Branded error page
- **No build step** — All dependencies loaded via CDN
- **No server-side code** — Pure static HTML/CSS/JavaScript

## Development Workflow

1. **Make changes** to `index.html` or `404.html`
2. **Refresh browser** to see changes immediately
3. **No restart needed** — changes appear instantly

## Viewing Other Products Locally

The oAudrey hub links to several product tabs. To run them locally:

### FieldWork

```bash
cd fieldwork
python3 -m http.server 8081
# Open http://localhost:8081
```

### ColdTrace

```bash
cd coldtrace
# See coldtrace/README.md for setup instructions (requires backend)
```

### Penny Sovereign Yield Scout

```bash
cd penny-sovereign-yield-scout
python3 -m http.server 8082
# Open http://localhost:8082
```

## Testing the Full Experience

To test the oAudrey hub with all product tabs working:

1. Run oAudrey hub on port 8080
2. Run FieldWork on port 8081
3. Run other products on different ports
4. Update the links in `index.html` temporarily to point to localhost URLs

Example temporary changes for local testing:

```html
<!-- Change from -->
<a href="https://fieldwork.oaudrey.com">FieldWork</a>

<!-- To -->
<a href="http://localhost:8081">FieldWork</a>
```

**Note:** Don't commit these localhost changes — they're just for local testing.

## Troubleshooting

### Port Already in Use

If you get "Address already in use" error, either:

- Stop the process using that port, or
- Use a different port number:

  ```bash
  python3 -m http.server 8081  # Use port 8081 instead
  ```

### Browser Shows Plain HTML Without Styling

This means Tailwind CSS isn't loading from the CDN. Check:

1. You have an active internet connection (Tailwind loads from `cdn.tailwindcss.com`)
2. Your browser isn't blocking the CDN
3. Try a different browser or clear your cache

### External Links Don't Work

The oAudrey hub links to external product subdomains (`fieldwork.oaudrey.com`, etc.). When running locally, these links will try to reach the production URLs. This is expected behavior. See "Testing the Full Experience" above if you want to test with local product instances.

## Production Deployment

For deploying to production (DigitalOcean or other hosting):

- See [`README.md`](./README.md) for DigitalOcean App Platform instructions
- See [`../standards/OAUDREY_DEPLOYMENT_STANDARD.md`](../standards/OAUDREY_DEPLOYMENT_STANDARD.md) for complete deployment guide
