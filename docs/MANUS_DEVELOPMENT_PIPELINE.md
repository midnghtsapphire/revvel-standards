# Manus Development Pipeline: From Prompt to Production

This document outlines the standard operating procedure (SOP) for how Manus AI processes user requests, writes code, tests, and deploys to the live DigitalOcean droplet for the GrowlingEyes project.

## 1. Request Intake & Planning (The "Think" Phase)
When a user prompt is received:
1. **Context Analysis**: Manus reviews the prompt against the current project state, recent commits, and the `revvel-standards` specification.
2. **Task Planning**: A multi-phase plan is generated using the `plan` tool. This breaks the request down into logical steps (e.g., Diagnosis → Code Modification → Local Testing → Deployment → Verification).
3. **Communication**: Manus sends an `info` message to acknowledge the request and outline the approach.

## 2. Investigation & Diagnosis (The "See" Phase)
Before writing code, Manus investigates the current state of the application:
1. **File Inspection**: Uses `file` (`read`, `match`) and `shell` (`grep`, `find`) tools to locate relevant components, APIs, and database schemas.
2. **Log Analysis**: If an error is reported, Manus checks PM2 logs (`pm2 logs growlingeyes`) or Nginx error logs on the droplet via SSH.
3. **Live Testing**: Uses `curl` or browser tools to test endpoints and verify the issue in the live environment.

## 3. Code Modification (The "Write" Phase)
Once the issue is understood, Manus modifies the codebase:
1. **Targeted Edits**: Uses the `file` tool (`edit`, `write`) to make precise changes to TypeScript, React components, or configuration files.
2. **Standard Compliance**: Ensures all changes adhere to the `revvel-standards` (e.g., using `fetchWithFallback`, stripping HTML, truncating URLs).
3. **Local Verification**: Runs `npm run build` or `npx tsc --noEmit` in the sandbox to catch syntax or type errors before deployment.

## 4. Deployment & Verification (The "Ship" Phase)
The deployment process is fully automated via SSH:
1. **Build**: Compiles the frontend (Vite) and backend (esbuild) in the sandbox (`npm run build`).
2. **Transfer**: Uses `scp` and `rsync` to push the compiled assets (`dist/index.js` and `dist/public/`) to the DigitalOcean droplet (`164.90.148.7`).
3. **Permissions**: Sets correct ownership and permissions (`chmod -R o+rX /var/www/growlingeyes/dist/public/`) to ensure Nginx can serve the files.
4. **Restart**: Restarts the PM2 process (`pm2 restart growlingeyes --update-env`) to apply backend changes.
5. **Live Check**: Uses `curl` with a browser User-Agent to verify the live site returns HTTP 200 and serves the new assets.

## 5. Documentation & Tracking (The "Record" Phase)
After a successful deployment:
1. **GitHub Issues**: Creates or closes issues via the `gh` CLI to maintain an audit trail of bugs and features.
2. **Version Control**: Commits all source changes to the `main` branch with descriptive commit messages and pushes to GitHub.
3. **Standards Update**: If a new pattern is established (e.g., live data polling, vault security), it is documented in `GROWLINGEYES_MASTER_SPEC.md`.

## Sandboxes & Environments
* **Local Sandbox**: The isolated Ubuntu environment where Manus writes code, runs builds, and tests logic.
* **DigitalOcean Droplet (Live)**: The production server (`164.90.148.7`) running Nginx and PM2. Manus connects via SSH using the `growlingeyes_deploy` key.
* **Vault Server**: The secure HashiCorp Vault instance (`159.65.36.200`) used for secret management.

This pipeline ensures that every change is planned, tested, deployed securely, and documented for future reference.
