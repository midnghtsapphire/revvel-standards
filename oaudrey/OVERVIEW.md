# oAudrey Hub Overview

## Architecture

The oAudrey hub is designed to be as lightweight and resilient as possible.

### Static Hosting

- **No Build Steps**: The entire site is pure static HTML/CSS/JS. It does not require Node.js, npm, or any build process to run or deploy.
- **Tailwind CDN**: Styling is powered by Tailwind CSS loaded via CDN, keeping the repository clean and avoiding a complex frontend pipeline.
- **PWA Capabilities**: The site includes a `manifest.json` for basic Progressive Web App support, improving user experience on mobile devices.

### Deployment

- **DigitalOcean App Platform**: The hub is deployed automatically to DigitalOcean via the `.do/app.yaml` specification. This provides robust, scalable static hosting.
- **CI/CD Pipeline**: GitHub Actions (`deploy-oaudrey.yml`) automatically syncs the `main` branch to DigitalOcean, running post-deploy health checks and DNS synchronization.
- **DNS Sync**: We maintain declarative DNS configurations in `dns-records.yml` and sync them to our registrar automatically using our custom Actions.

### Multi-Product Integration

The hub serves as the central jumping-off point for all Freedom Angel Corp products. It links out to various subdomains (e.g., `fieldwork.oaudrey.com`, `coldtrace.oaudrey.com`), which are each deployed independently but united under this landing page.
