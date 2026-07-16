# Revvel Application Deployment Guide

**Version:** 1.0.0
**Date:** 2026-02-25
**Status:** Master Guide

---

## 1. Introduction

This guide provides the standard procedures for deploying applications to the Revvel production infrastructure. All deployments must follow these instructions to ensure consistency and stability.

## 2. Primary Production Server

- **Droplet IP Address:** `164.90.148.7`
- **SSH Access:** `ssh root@164.90.148.7`
- **Password:** `+j2swyCE.*B6kdg`

This DigitalOcean droplet is the primary server for hosting all Node.js, Python, and Vite-based applications.

## 3. Deployment Procedures

### 3.1. Node.js Applications (Express, etc.)

1. **Clone Repository:** Clone the application's GitHub repository into the `/var/www/` directory.
2. **Install Dependencies:** Navigate into the project directory and run `pnpm install`.
3. **Build Application:** Run `pnpm build` to compile any necessary assets (e.g., TypeScript).
4. **Configure systemd:**
    - Create a new service file: `sudo nano /etc/systemd/system/your-app-name.service`
    - Add the following configuration, replacing `your-app-name` and paths as needed:
        ```ini
        [Unit]
        Description=Your App Name
        After=network.target

        [Service]
        User=root
        WorkingDirectory=/var/www/your-app-name
        ExecStart=/usr/bin/pnpm start
        Restart=always

        [Install]
        WantedBy=multi-user.target
        ```
5. **Enable and Start Service:**
    - `sudo systemctl daemon-reload`
    - `sudo systemctl enable your-app-name`
    - `sudo systemctl start your-app-name`
6. **Configure Nginx:** See Section 4.

### 3.2. Python Applications (FastAPI, Flask)

1. **Clone Repository:** Clone the application's GitHub repository into `/var/www/`.
2. **Create Virtual Environment:**
    - `python3 -m venv venv`
    - `source venv/bin/activate`
3. **Install Dependencies:** `pip install -r requirements.txt`.
4. **Configure systemd:**
    - Create a new service file: `sudo nano /etc/systemd/system/your-app-name.service`
    - Add the following configuration:
        ```ini
        [Unit]
        Description=Your Python App
        After=network.target

        [Service]
        User=root
        WorkingDirectory=/var/www/your-app-name
        ExecStart=/var/www/your-app-name/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:PORT
        Restart=always

        [Install]
        WantedBy=multi-user.target
        ```
        *Replace `main:app` and `PORT` as appropriate.*
5. **Enable and Start Service:**
    - `sudo systemctl daemon-reload`
    - `sudo systemctl enable your-app-name`
    - `sudo systemctl start your-app-name`
6. **Configure Nginx:** See Section 4.

### 3.3. Vite Applications (React)

For Vite applications that need to be served from a subpath (e.g., `meetaudreyevans.com/appname/`), you **must** set the `base` property in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/appname/', // This is critical!
})
```

Deployment then follows the standard Node.js process, with Nginx routing to the correct subpath.

## 4. Nginx Reverse Proxy Configuration

Nginx is used to route traffic from port 80 to the correct application service based on the URL path.

1. **Edit Nginx Config:** `sudo nano /etc/nginx/sites-available/default`
2. **Add a new `location` block** for your application:

    ```nginx
    location /appname/ {
        proxy_pass http://localhost:PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    ```
    *Replace `/appname/` with the desired subpath and `PORT` with the application's assigned port.*

3. **Test and Reload Nginx:**
    - `sudo nginx -t`
    - `sudo systemctl reload nginx`

## 5. Port Assignments

The following ports are assigned to specific applications. Do not use these for new apps.

| Port | Application |
| :--- | :--- |
| 3000 | MeetAudreyEvans Dashboard |
| 3001 | PawSitting |
| 3002 | TheAltText |
| 3003 | ReeseReviews |
| 3004 | ForensicStudio |
| 8080 | MindMappr Bot |

## 6. Docker Deployment (Alternative)

While `systemd` is the primary method, Docker is a viable alternative. If using Docker:

1. Ensure your repository contains a working `Dockerfile`.
2. Build the image: `docker build -t your-app-name .`
3. Run the container, mapping the appropriate port: `docker run -d -p PORT:CONTAINER_PORT your-app-name`
4. Configure Nginx to proxy to the mapped host `PORT`.

## 7. Updating the meetaudreyevans.com Hub

Every new application **must** be added to the central hub.

1. **Clone the `rvvel` repo:** `gh repo clone MIDNGHTSAPPHIRE/rvvel`
2. **Edit `Portfolio.tsx`:** Add a new card for your application, including its name, description, icon, and a link to its deployed URL (`http://164.90.148.7/appname/`).
3. **Push changes:** Commit and push your changes to the `main` branch. The site will auto-deploy via GitHub Pages.
4. **Update Droplet App Registry:** SSH into the droplet and edit `/var/www/meetaudreyevans-dashboard/src/AppsRepository.jsx` to include the new application. This ensures it appears in the droplet-hosted dashboard as well.
