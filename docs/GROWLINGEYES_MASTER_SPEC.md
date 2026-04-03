# GROWLINGEYES MASTER SPECIFICATION & OSINT STANDARDS
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Organization:** Freedom Angel Corps
**Motto:** "We believe you."
**Status:** SINGLE SOURCE OF TRUTH (SSOT)
**Version:** 2.0.0 (April 3, 2026)

---

## 1. Branding & Identity

GrowlingEyes is a product of **Freedom Angel Corps**. 
The core philosophy is rooted in the motto: **"We believe you."**
All branding must strictly adhere to the following rules:
- **No App or Agent Branding:** Do not mention the names of the underlying AI agents (e.g., Manus, OpenRouter, Kimi) or the framework apps in user-facing UI.
- **Payment Gateway:** Freedom Angel Corps serves as the payment gateway and organizational umbrella. 
- **Footer/Credits:** Use "Brought to you by Freedom Angel Corps" or "The Tech Way: GrowlingEyes is a product of Freedom Angel Corps."

---

## 2. CI/CD & Quality Assurance (QA) Standards

To maintain a robust, intuitive, and "precog" QA process that self-heals, the following standards are mandatory:

### Continuous Integration / Continuous Deployment (CI/CD)
- **Primary Pipeline:** All code must flow from GitHub to DigitalOcean droplets seamlessly.
- **Automated Testing:** Every push to the `main` branch must trigger an automated build and test suite.
- **CodeMagic:** Codemagic is the standard for QA and mobile/web builds going forward. It must be integrated into the GitHub repository to run automated UI tests, unit tests, and deployment scripts.

### The "Precog" QA & Self-Healing Protocol
1. **Automated Incident Logging:** Any error or failure during testing must be automatically logged.
2. **RAID & DARE Templates:** Use the DARE (Define, Assess, Respond, Evaluate) and RAID (Risks, Assumptions, Issues, Dependencies) templates for all issue tracking.
3. **Post-Test Deep Research:** At the conclusion of every accepted test, the QA swarm must autonomously deep-research opportunities to improve the existing software based on the test results.
4. **Actionable To-Do Lists:** QA must extensively list all issues, how they occurred, and how they were fixed. This creates a historical knowledge base to alleviate non-value, reoccurring issues.
5. **Kanban Use Cases:** For any new app or major feature, Kanban use cases must be created for requirements gathering.

### Swarm & MAS (Multi-Agent System) Protocols
- **One Iteration (EXRUP):** Use Extreme Rapid Programming (EXRUP) for one-iteration delivery.
- **Auto-Scaling:** If a MAS or swarm is lagging or hitting rate limits, the system must autonomously spin up a new swarm to take over the load.
- **GitHub Issues Integration:** Swarms must automatically read and write to GitHub issues to track their progress and delegate tasks.

---

## 3. AI & Media Generation Standards

GrowlingEyes utilizes cutting-edge AI for content creation and OSINT analysis.

### Approved Media Generation Tools
- **Video Generation:** HeyGen (for avatars and spoken video), Runway/Sora (for b-roll).
- **Image Generation:** Leonardo.ai (primary for assets, glassmorphic 3D UI elements, and marketing materials).
- **Voice/Audio:** ElevenLabs (for all text-to-speech, alerts, and voiceovers).

### OSINT LLM Research Strategy
- **Blue Ocean OSINT Plan:** Leverage the best LLMs for deep research (e.g., GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro for massive context windows).
- **Repository Scanning:** AI swarms must autonomously search all GitHub repositories (including FOSS opportunities) for cutting-edge OSINT tools, scrapers, and data parsers.
- **Human Consumption:** All raw intelligence data (JSON, XML, CSV) MUST be parsed, synthesized, and presented in a format optimized for human consumption (dashboards, readable reports, map overlays).

---
## 4. Dark Web & Encrypted Channel Intelligence

To achieve true "precog" capabilities, GrowlingEyes deploys automated listeners across encrypted and dark web channels.

### The Dark Web Listener Swarm
- **Objective:** Find brilliant streams, "golden ticket" opportunities, and cutting-edge intelligence no one else has.
- **Mechanism:** A coded listener process that can be summoned directly from the GrowlingEyes dashboard. It crawls `.onion` forums, specialized Discord servers, and Telegram channels.
- **Military & Tactical Feeds:** Specific focus on identifying and parsing Telegram/Discord channels used by military, paramilitary, and hacker groups (e.g., agricultural hacking, water system SCADA vulnerabilities).

### Anonymous Incident Reporting
- **Feature:** A secure, anonymous reporting portal for whistleblowers, insiders, and citizens to report emergencies, anomalies, or supply chain disruptions.
- **Integration:** Reports feed directly into the central intelligence dashboard for human or AI verification.

---

## 5. Advanced Mapping & Real-Time Tracking

GrowlingEyes provides a unified "glass pane" for global situational awareness.

### LiDAR & Temporal Change Detection
- **FOSS LiDAR Sources:** Utilize OpenTopography API, AWS Open Data (CanElevation), NRCan Elevation API, and USGS 3DEP.
- **Temporal Analysis:** Users must be able to input GPS coordinates and a time period to generate a report showing changes over time (organic vs. man-made anomalies).

### Real-Time Tracking
- **Aircraft (Presidential/VIP/Military):** Integration with OpenSky Network API (ADS-B data) and CelesTrak (for satellite tracking).
- **Maritime Vessels:** Integration with AIS APIs (e.g., Spire, MarineTraffic, or open FOSS alternatives) to track ships in real-time.

---

## 6. API & Connector Registry

The following APIs and connectors are approved and integrated into the GrowlingEyes ecosystem (secrets/keys are managed via `.env` and DigitalOcean App Platform, never hardcoded):

### Core Intelligence APIs
1.  **GDELT Project API:** Global database of events, language, and tone.
2.  **NASA FIRMS API:** Real-time active fire and thermal anomalies (VIIRS/MODIS).
3.  **USGS Earthquake API:** Real-time seismic events.
4.  **CISA KEV Catalog:** Known Exploited Vulnerabilities.
5.  **NVD CVE API:** National Vulnerability Database.
6.  **OpenSky Network API:** Real-time and historical ADS-B flight tracking.
7.  **CelesTrak API:** Satellite tracking (TLEs) and orbital data.
8.  **ReliefWeb API:** Humanitarian crisis and disaster reports.
9.  **IODA (Internet Outage Detection and Analysis) API:** Global internet disruptions.
10. **Cloudflare Radar API:** Internet traffic anomalies and BGP route leaks.
11. **ACLED API:** Armed Conflict Location & Event Data.
12. **SIPRI Arms Transfers:** Global arms trade tracking.
13. **US Drought Monitor API:** Agricultural and water security threats.

### Media & Communication APIs
14. **HeyGen API:** Avatar and video generation.
15. **Leonardo.ai API:** Image and UI asset generation.
16. **ElevenLabs API:** Voice synthesis and alerts.
17. **Telegram Bot API:** For bridging encrypted channels into the dashboard.
18. **Discord Webhooks/API:** For listener swarm integration.

*(A complete map of all 90 specific RSS/JSON endpoints mapped to their respective domains—Cyber, Kinetic, Maritime, Nuclear, BioChem, etc.—is maintained in the `growlingeyes/server/fetchers` directory.)*

---
**END OF SPECIFICATION**
