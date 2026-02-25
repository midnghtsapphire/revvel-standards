# MIDNGHTSAPPHIRE Infrastructure Map

**Author:** Audrey Evans / GlowStar Labs  
**Date:** February 25, 2026  
**Description:** Comprehensive documentation of all infrastructure, domains, repositories, and credentials for the MIDNGHTSAPPHIRE ecosystem.

---

## 1. DigitalOcean Infrastructure

### Droplets

| Name | IP Address | Purpose | Access |
| :--- | :--- | :--- | :--- |
| **MindMappr** | `164.90.148.7` | MindMappr bot, OpenClaw droplet, job queue | `root` / `+j2swyCE.*B6kdg` |
| **Revvel-API** | *(Refer to DO Panel)* | Central API services | SSH Key |
| **Data-Router-Node** | *(Refer to DO Panel)* | Data processing worker | SSH Key |

> **Note:** SSH access to most droplets is restricted to authorized SSH keys. The MindMappr droplet password is provided for emergency access.

### API Tokens & Keys
- **DigitalOcean API Token:** `[REDACTED_DO_TOKEN_IN_VAULT]`
- **Stripe Keys:** *(Refer to Vault)*
- **OpenRouter API Key:** *(Refer to Vault)*

---

## 2. Domain & DNS Management

All domains are managed via DigitalOcean DNS or Namecheap, pointing to GitHub Pages or DigitalOcean Droplets.

| Domain | Provider | Points To | Purpose |
| :--- | :--- | :--- | :--- |
| **meetaudreyevans.com** | Namecheap/DO | GitHub Pages (`rvvel`) | Main Hub / Personal Site |
| **yumyumcode.com** | Namecheap/DO | GitHub Pages (`yumyumcode`) | Consulting / Accessibility |
| **growlingeyes.com** | Namecheap/DO | DigitalOcean Droplet | Security / Monitoring |
| **truthslayer.com** | Namecheap/DO | DigitalOcean Droplet | Data Intelligence |
| **glowstarlabs.com** | Namecheap/DO | GitHub Pages | Corporate Hub |
| **reesereviews.com** | Namecheap/DO | DigitalOcean Droplet | Product Reviews |

---

## 3. GitHub Organization: MIDNGHTSAPPHIRE

### Core Repositories

| Repository | Purpose | Deployment |
| :--- | :--- | :--- |
| **rvvel** | Main site (meetaudreyevans.com) | GitHub Pages |
| **revvel-standards** | Master Standards & Documentation | Manual |
| **mindmappr** | Cognitive mapping tool | GitHub Pages |
| **Pawsitting** | Pet sitting management app | GitHub Pages |
| **mindmappr-setup** | Droplet config, backup, job queue | Droplet (164.90.148.7) |
| **openclaw-ui** | Agent Management SaaS Platform | Droplet / Vercel |
| **thealttext** | AI Accessibility Tool | GitHub Pages |
| **universal-data-router** | Data management tool | GitHub Pages |
| **SSRN_Whitepapers** | Academic & Technical research | Manual |

---

## 4. Bot Configurations

### MindMappr Bot Setup
- **Location:** MindMappr Droplet (`164.90.148.7`)
- **Telegram Token:** *(Refer to `.env` in `/root/mindmappr`)*
- **Slack Token:** *(Refer to `.env` in `/root/mindmappr`)*
- **Group IDs:** *(Configured in `config.json`)*

---

## 5. Deployment & Maintenance

### GitHub Pages (Auto-deploy)
Repos like `rvvel`, `mindmappr`, and `Pawsitting` use GitHub Actions for automatic deployment upon pushing to the `main` branch.

### Droplet Services
1. SSH into the droplet.
2. Navigate to the project directory (e.g., `/root/mindmappr`).
3. Pull latest changes: `git pull origin main`.
4. Restart services using `pm2 restart all` or `systemctl restart <service>`.

---

## 6. Immediate Contacts & Support
- **Primary Contact:** Audrey Evans (angelreporters@gmail.com)
- **Technical Support:** Submit request at [https://help.manus.im](https://help.manus.im)

---

**References:**
- DigitalOcean Dashboard: [https://cloud.digitalocean.com](https://cloud.digitalocean.com)
- GitHub Org: [https://github.com/MIDNGHTSAPPHIRE](https://github.com/MIDNGHTSAPPHIRE)
- Revvel Standards: `MIDNGHTSAPPHIRE/revvel-standards`
