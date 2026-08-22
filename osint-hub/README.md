# OSINT Hub — Gen Z Intelligence Arsenal 2026

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/osint-hub/)**

## 🎯 Overview

**OSINT Hub** is a next-generation intelligence platform built for researchers, security professionals, and digital investigators who operate at machine speed. Combining AI orchestration, automated reconnaissance, and fusion-powered analysis, OSINT Hub represents the future of intelligence gathering.

## ✨ Key Features

### 🛡️ **50+ OSINT Tools Integrated**
- Threat Intelligence: AlienVault OTX, MISP, Abuse.ch, CISA KEV
- Network Recon: Shodan, Censys, SecurityTrails, GreyNoise
- OSINT Platforms: OpenCTI, Maltego CE, TheHive, Spiderfoot
- SOCMINT: snscrape, instaloader, Mastodon.py, Reddit Toolkit
- Web Recon: theHarvester, Recon-ng, Photon, OSRFramework

### 🤖 **AI-Orchestrated Intelligence**
- **Multi-LLM Collaboration**: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Perplexity, DeepSeek R1
- **Autonomous Collection**: 24/7 monitoring with zero human intervention
- **Fusion Analysis**: Cross-source correlation and MITRE ATT&CK mapping
- **Self-Healing**: Automatic error recovery and retry logic

### 👁️ **Project Overwatch**
- Continuous monitoring of brand mentions, credential leaks, and infrastructure changes
- Intelligent alerting with smart correlation (no alert fatigue)
- Automated incident response workflows
- GitHub Issues, tickets, and threat feed updates—all autonomous

### 🧬 **OSINT Fusion Blueprint**
4-layer intelligence pipeline:
1. **Collection**: Threat feeds, network scans, social media, dark web
2. **Processing**: Normalization (STIX), deduplication, enrichment
3. **Analysis**: AI correlation, pattern detection, ATT&CK mapping
4. **Action**: Alerts, tickets, reports, feed enrichment

**End-to-end latency**: Raw data → Actionable alert in < 60 seconds

## 🚀 30-Day Product Blueprint

### Week 1-2: Foundation
- Infrastructure setup (GitHub, CI/CD)
- Core OSINT tool integration
- Data pipeline architecture
- AI agent orchestration framework
- Initial feed ingestion (3+ sources)

### Week 3: Intelligence
- Multi-LLM analysis pipeline
- Correlation engine (MISP/OpenCTI)
- Automated enrichment
- Threat scoring algorithm
- Dashboard prototype

### Week 4: Production
- Real-time monitoring activation
- Alert system deployment
- Auto-response workflows
- Documentation & training
- Go-live & iteration

## 🛠️ Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Design**: Glassmorphism, neon gradients, Gen Z aesthetic
- **Typography**: Space Grotesk (sans-serif) + JetBrains Mono (monospace)
- **Deployment**: GitHub Pages
- **Intelligence**: Multi-LLM orchestration (OpenRouter, direct APIs)

## 🌐 Live Demo

Visit the live site: [https://midnghtsapphire.github.io/revvel-standards/osint-hub/](https://midnghtsapphire.github.io/revvel-standards/osint-hub/)

**Note**: The GitHub Pages path includes `/revvel-standards/` because this is part of the `revvel-standards` repository.

## 📦 Deployment

The OSINT Hub is designed to be deployed as a static site. To deploy:

1. **Local Development**:
   ```bash
   # Clone the repository
   git clone https://github.com/midnghtsapphire/revvel-standards.git
   cd revvel-standards/osint-hub
   
   # Open in browser
   open index.html
   # or use a local server
   python3 -m http.server 8000
   ```

2. **GitHub Pages**:
   - Already configured in `revvel-standards` repository
   - Accessible at `/revvel-standards/osint-hub/` path (full path including repository name)
   - Automatic deployment on push to `main`

3. **Vercel/Netlify**:
   ```bash
   # Deploy to Vercel
   vercel --prod
   
   # Deploy to Netlify
   netlify deploy --prod --dir=osint-hub
   ```

## 🔧 Configuration

### Environment Variables

No environment variables required for the static frontend. For backend integration:

```bash
# OSINT API Keys (server-side only)
SHODAN_API_KEY=your_shodan_key
OTX_API_KEY=your_alienvault_key
CENSYS_API_ID=your_censys_id
CENSYS_API_SECRET=your_censys_secret

# AI/LLM APIs
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key
# Perplexity research uses the no-key helallao/perplexity-ai fork.
```

## 📊 OSINT Data Sources

### Threat Intelligence Feeds
- **AlienVault OTX** (STIX/TAXII, real-time)
- **MISP Project** (community feeds, daily)
- **Abuse.ch URLhaus** (malware URLs, hourly)
- **CISA KEV** (known exploited vulnerabilities, daily)

### Network & Infrastructure
- **Shodan**: Exposed services, banners, TLS fingerprints
- **Censys**: TLS certificates, open services
- **SecurityTrails**: DNS history, subdomain enumeration
- **GreyNoise**: Internet scan noise classification

### OSINT Platforms
- **OpenCTI**: Threat intelligence management
- **MISP**: Threat sharing and correlation
- **TheHive**: Incident response and case management
- **Maltego CE**: Link analysis and OSINT graphing
- **Spiderfoot**: Automated OSINT collection

## 🤖 AI Research Stack

| LLM | Best For | Context Window |
|-----|----------|----------------|
| **GPT-4o** | General synthesis, structured reports | 128K tokens |
| **Claude 3.5 Sonnet** | Long-document analysis, code review | 200K tokens |
| **Gemini 1.5 Pro** | Massive context, multi-source synthesis | 1M tokens |
| **Perplexity no-key fork** | Real-time web search synthesis without an official API key | Live web |
| **DeepSeek R1** | Cutting-edge reasoning, code generation | 64K tokens |

## 🎨 Design Philosophy

### Gen Z Aesthetic
- **Dark Mode First**: Optimized for OSINT operations
- **Neon Gradients**: High-contrast, vibrant color palette
- **Glassmorphism**: Modern, translucent UI elements
- **Bold Typography**: Space Grotesk for impact
- **Micro-interactions**: Smooth hover effects and animations

### Color Palette
```css
Neon Blue:   #3a86ff  /* Primary actions, links */
Neon Purple: #8338ec  /* Secondary elements */
Neon Pink:   #ff006e  /* Alerts, CTAs */
Neon Green:  #06ffa5  /* Success states */
Neon Yellow: #ffbe0b  /* Warnings */
```

## 📖 Documentation

For detailed implementation guides, see:
- [OSINT Integration Standard](../docs/Master_Inventory/OSINT_STANDARD.md)
- [GROWLINGEYES MASTER SPEC](../docs/GROWLINGEYES_MASTER_SPEC.md)
- [AGENTS.md](../docs/AGENTS.md) — Universal agent instructions
- [Skills Registry](../skills/REGISTRY.md)

## 🔒 Security & Privacy

- **No data collection**: Static frontend, no tracking
- **FOSS-first**: Prioritize open-source tools
- **Audit everything**: Immutable logs for all collection actions
- **Correlation over silos**: Unified intelligence, not data dumps

## 🤝 Contributing

This is part of the **MIDNGHTSAPPHIRE / Revvel Standards** ecosystem. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow the [Revvel Standards](../README.md)
4. Submit a pull request

## 📜 License

**All Rights Reserved — Freedom Angel Corp**

EIN: 86-1209156  
Contact: <support@freedomangel.com>

## 🌟 Acknowledgments

Built with research from:
- AI_Orchestrated_OSINT.pdf
- OSINT_ARSENAL_2026.pdf
- OSINT_Fusion_Blueprint.pdf
- Project_Omni_OSINT.pdf
- PROJECT_OVERWATCH.pdf
- The_30_Day_Product_Blueprint.pdf

Powered by the MIDNGHTSAPPHIRE agent swarm 🤖

---

**OSINT Hub** — Intelligence at machine speed. Built for Gen Z. 🚀
