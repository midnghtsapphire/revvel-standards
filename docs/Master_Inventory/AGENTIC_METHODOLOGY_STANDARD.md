# Revvel Agentic Skills Framework & Development Methodology

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Active  
**Maintainer:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Inspired by:** [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice), FOSS tooling, 2040 precog research

---

## Table of Contents

1. [What Is This Framework?](#1-what-is-this-framework)
2. [Core Philosophy — 2040 Precog Methodology](#2-core-philosophy--2040-precog-methodology)
3. [The Three Primitives: Agents · Commands · Skills](#3-the-three-primitives-agents--commands--skills)
4. [Pop-Up Skill Architecture](#4-pop-up-skill-architecture)
5. [Ephemeral Persona Engine](#5-ephemeral-persona-engine)
6. [Skill Lifecycle & Quality Gates](#6-skill-lifecycle--quality-gates)
7. [Skill Testing: Every Skill Must Be Verifiable](#7-skill-testing-every-skill-must-be-verifiable)
8. [Deployment: Windows · Mac · CI](#8-deployment-windows--mac--ci)
9. [Monetization & Marketplace Guide](#9-monetization--marketplace-guide)
10. [FOSS Toolchain](#10-foss-toolchain)
11. [Skill Catalog Price Points](#11-skill-catalog-price-points)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. What Is This Framework

Use this openrouter combination:
Swarms
For deep research and swarms on OpenRouter, the Kimi K2.5 (Moonshot) is a top choice, supporting agent swarms with up to 100 sub-agents and 1,500 parallel tool calls. For advanced, multi-step research, o3-deep-research (OpenAI) excels, while OpenRouter Fusion provides superior synthesized research. 

Top Models for Research & Swarms (OpenRouter, April 2026 as part of self-healing always be looking to upgrade with recources):
Best for Agentic Swarms: Kimi K2.5 excels in agentic tool-calling and managing large swarms (up to 100 sub-agents).
Best for Deep Research & RAG: o3-deep-research (OpenAI) provides superior reasoning, specifically designed for complex, multi-step, web-searched research.
Best for Multi-Model Research: OpenRouter Fusion queries multiple models to synthesize the best research response.
High-Context Reasoning: Grok 4.1 Fast offers a massive 2M context window for researching large datasets.
Best for Coding Swarms/Agents: Quazar Alpha (stealth model) is optimized for coding and complex agent tasks. 
Swarm-based approaches (a subset of MAS) are generally better for fast, parallel exploration and creative brainstorming across large search spaces, while general Multi-Agent Systems (MAS) are superior for complex, structured, and multi-step research workflows. Swarms excel at finding optimal solutions via collective intelligence, while MAS offers more control and task prioritization. 

Swarm Intelligence in Research
Best For: Broad exploration, competitive intelligence, and generating multiple hypotheses simultaneously.
Strengths: Parallel processing, adaptability, and faster convergence on optimal decisions by mimicking natural systems.
Weaknesses: Risk of getting trapped in local optima (incorrect, but converged solutions) and high computational resource consumption. 

Multi-Agent Systems (MAS) in Research 
Best For: Complex, structured tasks (e.g., Question 
 
Strengths: Allows for heterogeneous agents with specific roles, providing better accuracy and control over the workflow.
Weaknesses: Can be harder to manage communication among agents and ensure scalability. 

Key Comparison
Collaboration: Swarms often use "blackboards" or decentralized, simple interactions. MAS often uses structured, hierarchical, or communication-heavy architectures.
Emergence: Swarm intelligence focuses on emergent behavior, while MAS allows for directed, programmed behavior. 

For deep, validated research, structured MAS is likely better; for rapid brainstorming or massive data scanning, a swarm approach is superior. 
Unanimous AI

Research should include repositories like github, gitlab, gitee, freeCodeCamp, First Contributions: A highly popular repo focused on helping beginners make their first open-source contribution.
TheAlgorithms: Massive collaborative efforts (Python, Java, C++) to implement algorithms, with major contributions from global communities.
NixOS/nixpkgs: A top-tier, international repository for package management.
LangChain: A popular framework for developing LLM applications. 
Other Major Repositories & Platforms:
SourceForge: A long-standing platform hosting thousands of open-source projects.
Gitee: A significant repository hosting platform based in China, often used as an alternative to GitHub for Chinese developers.
GitLab: A widely used platform for hosting private and public projects, popular globally for DevOps.
Google Monorepo: Known as one of the largest in the world, exceeding 80 terabytes. 
Top International Coding Repository Hubs & Projects:
China (Beijing): Hosts a rapidly growing number of contributors and large open-source projects (e.g., Baidu, Tencent projects on GitHub).
India (Bengaluru): A major hub for global IT and open-source contribution, specifically in AI and AgriTech.
Europe (London, Berlin, Paris): Significant repositories for Kubernetes, GitOps, and specialized AI frameworks.
Singapore: A growing hub for high-tech regional infrastructure, particularly in AI. 

Notable Large/International Repositories:
open-source-projects-by-country: A repository tracking top projects by region.
awesomedata/awesome-public-datasets: A curated list with significant international weather and climate data.
The Arctic Code Vault: While managed by Microsoft (US), this contains snapshots of massive international repositories stored in Norway.
GHTorrent: A project that offers datasets of all GitHub activity, mapping global contributions. 
Resources For Everything:

shadcn/ui — Beautifully designed components built with Radix UI and Tailwind CSS.
Lucide — Beautiful & consistent icons, a community fork of Feather Icons.
T3 Stack — The best way to start a full-stack, typesafe Next.js app.
Directus — The modern data platform that turns any SQL database into an API and Admin UI.
freeCodeCamp — Learn to code for free.
30-seconds-of-code — Short JavaScript code snippets.
javascript-algorithms — Algorithms and data structures in JS.
react — The library for web and native user interfaces.
vue — The progressive JavaScript framework.
angular — One framework, mobile & desktop.
next.js — The React framework for production.
nuxt — The Intuitive Vue Framework.
awesome-react — Curated list of React resources.
awesome-vue — Curated resources for Vue.js devs.
nodebestpractices — Node.js best practices.
storybook — UI component explorer for frontend devs.
css-protips — Tips to improve your CSS skills.
awesome-tailwindcss — Resources for Tailwind CSS.
md8-habibullah/jsdelivr — A free CDN for open source, npm, GitHub, and more.
📱 Mobile Development
React-Native — Build native apps using React.
Flutter — Beautiful native apps in record time.
React-Native-Apps — Curated list of open source React Native apps.
android-architecture — Android app architecture samples.
awesome-flutter — Curated Flutter libraries, tools, tutorials.
awesome-android-ui — Android UI libraries.
👨‍💻 Programming Languages & Algorithms
TheAlgorithms/Python — All Algorithms implemented in Python.
TheAlgorithms/Java — All Algorithms implemented in Java.
TheAlgorithms/C-Plus-Plus — All Algorithms implemented in C++.
awesome-python — Curated list of awesome Python frameworks, libraries, and software.
awesome-go — Curated list of Go frameworks, libraries, and software.
You-Dont-Know-JS — Book series diving deep into JS core mechanisms.
rust — Empowering everyone to build reliable and efficient software.
awesome-rust — Curated Rust libraries and resources.
python-patterns — Patterns in Python.
awesome-cpp — C++ resources and libraries.
awesome-java — Curated list of Java frameworks/libraries.
awesome-typescript — TypeScript resources and tools.
🧪 Data Science & Machine Learning
tensorflow — Open Source Machine Learning Framework.
pytorch — Tensors and Dynamic neural networks in Python with strong GPU acceleration.
scikit-learn — Machine Learning in Python.
fastai — High-level framework for fast, accurate deep learning.
pandas — Data analysis library for Python.
awesome-machine-learning — Curated machine learning resources.
Data-Science-For-Beginners — 10 weeks, 20 lessons, Data Science for all!
data-science-interviews — Data science interview questions and answers.
awesome-deep-learning — Deep learning resources.
awesome-data-science — Data science resources.
awesome-nlp — Natural Language Processing resources.
awesome-ai — Artificial Intelligence resources.
⚙️ Advanced DevOps & Cloud Native Infrastructure ☁️
free-for-dev — List of free services for developers.
devops-exercises — DevOps and SRE interview questions and exercises.
kubernetes — Production-Grade Container Scheduling and Management.
docker — Docker Community Edition.
awesome-devops — Curated DevOps resources.
ansible — Ansible is a radically simple IT automation platform.
terraform — Infrastructure as Code.
awesome-docker — A curated list of Docker resources.
prometheus — Monitoring system & time series database.
awesome-kubernetes — Kubernetes curated resources.
awesome-ciandcd — CI/CD resources and tools.
awesome-terraform — Curated list for Terraform.
md8-habibullah/ansible — Ansible playbooks, guides, and resources.
Coolify — An open-source, self-hosted alternative to Heroku/Netlify/Vercel.
Argo CD — Declarative, GitOps continuous delivery tool for Kubernetes.
LocalStack — A fully functional local AWS cloud stack.
Grafana — The open observability platform for analytics and monitoring.
Pulumi — Infrastructure as Code using real programming languages (TS, Python, Go).
🛡️ Cybersecurity & Pentesting (Your Specialty)
As a Security Engineer, these tools are for authorized penetration testing, research, and infrastructure hardening only.
OWASP Top 10 — The standard awareness document for developers and web application security.
Gitleaks — Scan git repos for secrets like passwords, API keys, and tokens.
SQLMap — Automatic SQL injection and database takeover tool.
Sherlock — Hunt down social media accounts by username across social networks.
PayloadsAllTheThings — A list of useful payloads and bypasses for Web Application Security.
🎮 Command & Control (C2) & Remote Access
Sliver — A powerful, cross-platform, open-source C2 framework (the best open-source alternative to Cobalt Strike).
Evil-WinRM — The ultimate shell for hacking Windows; features lateral movement, file transfer, and memory execution.
NetExec — The successor to CrackMapExec; a multi-tool for automated network assessment and credential harvesting.
Havoc — A modern, malleable post-exploitation command and control framework.
🤖 Botnets, Agents & AI Red Teaming
DeepTeam — LLM Red Teaming framework to simulate jailbreaks and prompt injections on AI agents.
Mirai (Research) — The infamous IoT botnet source code (for research and defense signature building).
Cai-Framework — Cybersecurity AI framework for building autonomous agents that discover and exploit vulnerabilities.
Honeymap — Real-time visualization of world-wide honeypot attacks (see the “botnet” in action).
📡 Network Monitoring & Hidden Recon
Bettercap — The “Swiss Army Knife” for 802.11, BLE, and Ethernet reconnaissance and MITM attacks.
RustScan — A modern port scanner that can scan 65k ports in 3 seconds; designed for speed and scriptability.
Zabbix — Enterprise-grade monitoring that can track thousands of devices as a distributed “monitoring net.”
Netdata — Per-second, real-time health and performance monitoring for entire distributed clusters.
🕵️ Advanced OSINT & Data Leaks
SpiderFoot — Automates OSINT collection from over 100 public data sources for threat intelligence.
Gitleaks — Scan every commit in your history to find leaked API keys, tokens, and secrets.
Mary-SUE — (Your Tool/Reference) — Specialized script for harvesting username-linked data across platforms.
Ciphey — Fully automated decryption tool that uses AI and Natural Language Processing to crack unknown encryptions.
💣 Exploitation & Payload Heavies
Metasploit Framework — The world’s most used penetration testing software.
PayloadsAllTheThings — A massive library of payloads for every web vulnerability imaginable.
Impacket — A collection of Python classes for working with network protocols (SMB, MSRPC) — essential for Windows network hacking.
Aircrack-ng — The standard for auditing wireless networks and cracking WPA/WPA2.
🏗️ System Design & Architecture
system-design-primer — Learn how to design large-scale systems.
system-design-resources — Extensive collection of system design resources.
awesome-system-design — Curated list of system design materials.
design-patterns-for-humans — Design patterns explained simply.
awesome-microservices — Curated list on Microservices.
awesome-architecture — Software architecture resources.
awesome-scalability — High scalability, availability, and stability patterns.
📚 Awesome Lists & Resources
awesome — The most awesome curated lists on GitHub.
awesome-awesomeness — A curated list of awesome awesomeness.
best-of-lists — Discover awesome open-source projects, ranked by quality and updated weekly.
awesome-lists — List of awesome lists.
awesome-cheatsheets — Useful programming cheatsheets.
awesome-design — Curated list of design resources.
awesome-interview-questions — Lists of interview questions by technology.
Project-Awesome.org — A categorized web interface for awesome lists.
awesome.facts.dev — The most popular awesome lists on GitHub, ranked and categorized.
awesome-open-source — Search, curate, and share the best open-source projects.
top-github-repositories-which-everyone-should-look — A handpicked list of top GitHub repositories everyone should look at.
🛠️ Developer Tools & Utilities
gitignore — Useful .gitignore templates.
ohmyzsh — A delightful community-driven framework for managing your zsh configuration.
powerlevel10k — Super flexible and fast zsh theme.
prettier — Code formatter.
eslint — Pluggable JavaScript linter.
homebrew — The missing package manager for macOS (or Linux).
nvm — Node version manager.
fzf — A command-line fuzzy finder.
tmux — Terminal multiplexer.
ripgrep — Fast command-line search tool.
shields — Quality metadata badges for open source projects.
IT Tools — Collection of handy online tools for developers, with great UX.
🏆 GitHub Profile & Achievement Showcases
github-profile-trophy - Show off your GitHub trophies on your profile.
profile-readme-stats - Dynamic stats for your GitHub profile README.
🎨 Themes & Customizations
plymouth-themes - Collection of beautiful Linux boot splash themes.
awesome-terminal-fonts - Fonts patched with a high number of glyphs/icons.
🎨 Design, Frontend & UX
design-resources-for-developers — Curated list of design resources.
awesome-design-systems — Design systems, pattern libraries, and more.
tailwindcss — Utility-first CSS framework.
bootstrap — The most popular HTML, CSS, and JS library.
fontawesome — The iconic font and CSS toolkit.
awesome-css — CSS frameworks, tools, and resources.
📊 Visualization, Data & Charts
awesome-visualization — Curated list of visualization libraries.
d3 — Bring data to life with SVG, Canvas and HTML.
chart.js — Simple yet flexible JavaScript charting.
awesome-dataviz — Curated list of data visualization libraries.
echarts — Powerful visualization library for browser.
💼 Job Search & Career
tech-jobs-with-relocation — Tech jobs with relocation.
engineering-blogs — A curated list of engineering blogs.
awesome-remote-job — Curated list of remote jobs.
🗃️ Miscellaneous / General
best-websites-a-programmer-should-visit — Useful sites for programmers.
what-happens-when — What happens when you type a URL into your browser.
build-your-own-x — Tutorials on building your own DB, Shell, etc.
awesome-hacker-news — Everything about Hacker News.
movies-for-hackers — Movies every hacker should watch.
💬 Top Open Source Chat & Workspace Messaging Platforms
Rocket.Chat — The leading open source team chat platform, Slack alternative, with rich integrations and self-hosting.
Mattermost — Secure, self-hosted Slack alternative for teams and enterprises.
Matrix (Synapse) — Matrix protocol reference server, a decentralized, federated, end-to-end encrypted messaging network.
Element — The flagship Matrix client, formerly Riot, web and desktop app.
Telegram (Unofficial, open clients) — Unofficial open source desktop client for Telegram.
Wire — Secure, cross-platform team collaboration platform.
Zulip — Powerful threaded open source group chat, great for remote teams.
Rocket.Chat.ReactNative — Mobile client for Rocket.Chat.
Jitsi Meet — Secure, scalable open source video chat and conferencing platform.
SimpleX Chat — Private, decentralized, and serverless messenger.
Conduit — Lightweight Matrix homeserver written in Rust.
Openfire — Real-time collaboration server based on XMPP protocol.
SOGo — Groupware server with calendar, contacts, and chat.
Open Source WhatsApp Clients — Unofficial WhatsApp Web API for Node.js.
🐧 Linux & Command Line Tools
A curated list of repositories to master the Linux ecosystem, from core fundamentals to high-performance modern replacements.
jlevy/the-art-of-command-line — A comprehensive collection of tips and best practices for using the command line effectively.
bobbyiliev/101-linux-commands-ebook — An open-source eBook featuring 101 essential Linux commands.
kodekloudhub/linux-basics-course — A structured course covering Linux basics, including working with the shell and shell scripting.
danielmapar/LinuxCommandLine — Provides a collection of basic Linux commands and insights into the Linux file system hierarchy.
NaiveNeuron/TermAdventure — An interactive learning tool that teaches UNIX command-line skills through a text adventure game format.
tldr-pages/tldr — Simplified and community-driven man pages that provide concise examples for command-line tools.
krother/bash_tutorial — This tutorial helps you become familiar with bash, the Linux command line, through hands-on exercises.
nuitrcs/commandlineworkshop — A workshop that introduces the basics of the bash shell, covering essential commands and navigation techniques.
labex-labs/linux-free-tutorials — A collection of 80 free tutorials for Linux, offering a comprehensive learning path.
get543/linux-beginner-guide — An ultimate guide for beginner Linux users, covering keyboard shortcuts and basic commands.
🎓 Mastering the Fundamentals
jlevy/the-art-of-command-line — A masterclass on one page: comprehensive tips and best practices for every level.
tldr-pages/tldr — Practical, community-driven examples that replace long manual pages.
bobbyiliev/101-linux-commands-ebook — An essential open-source eBook for building a solid command foundation.
kodekloudhub/linux-basics-course — A structured path for learning shell scripting and system hierarchy.
🚀 The “Modern Unix” Power Tools (Rust-Powered)
eza-community/eza — A modern, maintained replacement for ls with colors and git integration.
sharkdp/bat — A cat clone with syntax highlighting, line numbers, and git integration.
ajeetdsouza/zoxide — A smarter cd command that learns your habits to help you navigate instantly.
BurntSushi/ripgrep — The fastest text search tool (grep alternative) that respects your .gitignore.
sharkdp/fd — A simple, fast, and user-friendly alternative to the find command.
aristocratos/btop — An immersive, high-performance system monitor (the successor to htop).
mfontanini/duf — A better df utility with clear, colorful graphs for disk usage.
dalance/procs — A modern replacement for ps written in Rust with colored output.
🐚 Shell Customization & Terminal Experience
💻 Terminal Emulators (The High-Performance Tier)
alacritty/alacritty — A cross-platform, GPU-accelerated terminal emulator focused on speed.
kovidgoyal/kitty — A modern, feature-rich, GPU-based terminal supporting images and ligatures.
wez/wezterm — A powerful GPU-accelerated terminal emulator and multiplexer written in Rust.
🔧 Shell Frameworks & Prompt Enhancements
ohmyzsh/ohmyzsh — The gold standard framework for managing Zsh with 300+ plugins.
starship/starship — The minimal, blazing-fast, and customizable prompt for any shell.
romkatv/powerlevel10k — The fastest Zsh theme with an easy configuration wizard.
zsh-users/zsh-autosuggestions — Fish-like completion suggestions for Zsh.
Bash-it – A collection of community Bash commands and scripts.
Prezto – A speedy Zsh configuration framework.
md8-habibullah/awesome-shell – A curated list focusing on shell style and customization.
🖼️ Terminal Information & Aesthetics
Neofetch – A command-line system information tool.
fastfetch-cli/fastfetch — A much faster and more feature-rich alternative to the original neofetch.
junegunn/fzf — The essential command-line fuzzy finder for files, history, and git.
zsh-syntax-highlighting – Syntax highlighting for the Zsh shell.
jesseduffield/lazygit — A beautiful terminal UI for git commands.
charmbracelet/glow — Render markdown on the CLI with high-quality styling.
🚀 Want More? Explore Further!
🌟 GitHub Trending — See what’s hot on GitHub right now.
🥇 best-of-lists — Discover curated “best-of” open-source projects by category.
🏅 Project-Awesome.org — Browse the best “Awesome” lists in a user-friendly way.
💼 Awesome Open Source — Find, curate, and share the best open-source projects.
🔍 GitHub Explore — Personalized recommendations for projects, topics, and collections.
📝 Awesome Lists — The motherlode of curated “awesome” lists.
🏆 GitHub Stars — See what top developers are starring.
📝 GitHub Topics — Browse open source projects by topics like AI, blockchain, web, and more.
🤖 GitHub Copilot — Your AI pair programmer (for code, not repo discovery!)
📰 Open Source Insights — Analyze and compare open source packages.
💬 Reddit r/opensource — Community-driven open source recommendations.
🧑‍💻 Hacker News “Show HN” — Trending open source launches.
📰 LibHunt - Curated lists — Trending and best open source project lists.
🤝 Contributing
Government public databases and repositories provide free access to federal, state, and local data, spanning scientific research, economic statistics, and legislative records. Key central repositories include Data.gov for comprehensive federal datasets, GovInfo.gov for authenticated publications from all three branches, and specialized sites like Data.Census.gov. 

Central Government Data Hubs
Data.gov: Primary clearinghouse for U.S. Federal, State, and local government datasets.
GovInfo.gov: Official publications from all three branches of the U.S. government.
Catalog of U.S. Government Publications (CGP): Searches for publications from all three branches.
RAND State Statistics Database: Covers, demographics, health, business, and education at the state and county level. 

Scientific, Technical & Health Data 
CDC WONDER: Centers for Disease Control and Prevention data.
DOE Data Explorer: Data from the Department of Energy.
NASA Technical Reports Server (NTRS): Aerospace and research reports.
EPA Science Inventory: Environmental Protection Agency research.
MEDLINEplus: Health information from the National Library of Medicine.
ECOTOX Knowledgebase: EPA data on environmental contaminants.
USGCRP Global Change Information System: Climate change data. 

Economic & Legislative Data 
FRED (Federal Reserve Economic Data): Economic time series from the Federal Reserve Bank of St. Louis.
Congress.gov: Legislative information, bills, and laws.
EDGAR Database: SEC filings, including corporate financial data.
GAO Reports and Testimonies: Reports from the Government Accountability Office.
FRASER (Federal Reserve Archival System for Economic Research): Economic history data. 

Demographic, Geosraphic & Specific Domains
Data.Census.gov: U.S. Census Bureau demographic and economic data.
Geographic Names Information System (GNIS): Information on U.S. geographical places.
Alternative Fuels Data Center: Department of Energy data on fuels.
National Cancer Institute SEER Program: Cancer incidence and survival data.
FEMA Data Feeds: Disaster information and public assistance data.
General Land Office Records: Federal land records. 

International & Additional Repositories
United Nations Data: Statistical databases.
World Bank Open Data: Development indicators.
OECD Statistics: Economic and social data.
Internet Archive Wayback Machine: Frequently used for 
Wikipedia

LiDAR (Light Detection and Ranging) repositories and data sources are rapidly expanding, driven by advancements in aerial mapping, autonomous vehicles, and archaeological discoveries. These repositories range from government-mandated elevation datasets to specialized, open-source AI processing libraries. 
Here is a deep research overview of the key LiDAR repositories, data portals, and processing libraries globally.
Major Public LiDAR Data Repositories
1. North America (United States)
USGS Earth Explorer / 3DEP: The United States Inter-agency Elevation Inventory provides free access to high-resolution LiDAR data, largely driven by the 3D Elevation Program (3DEP).
NOAA Digital Coast: Specialized in providing LiDAR data for coastal areas, crucial for sea-level rise studies and coastal management.
National Ecological Observatory Network (NEON): Funded by the National Science Foundation, NEON offers extensive airborne LiDAR data focusing on vegetation structures, available via their open data portal.
OpenTopography: A premier facility for accessing topographically focused LiDAR datasets, particularly useful for researchers and academic users.
Texas Geographic Information Office (TNRIS): Offers a comprehensive DataHub for LiDAR projects in Texas, including status maps for ongoing acquisitions. 

2. Europe
National Mapping Agency Portals: Many European countries, such as the UK (via Defra), Germany, and Scandinavian countries, maintain open-access, high-resolution LiDAR data for national terrain modeling.
Beacons of the Past (UK): A dedicated project for mapping and researching hillforts in the Chilterns landscape. 
GIM International
GIM International
3. International & Archaeological Repositories
LidArc Initiative: A dedicated initiative, often associated with Global Digital Heritage, focusing on applying LiDAR to map undocumented archaeological sites globally, especially in Latin America.
GEDI (Global Ecosystem Dynamics Investigation): A space-based LiDAR instrument on the International Space Station (ISS) operated by NASA, providing worldwide 3D measurements of forest canopy structures, available on NASA Earthdata.
CALIPSO (Cloud-Aerosol Lidar and Infrared Pathfinder Satellite Observation): A long-running NASA/CNES atmospheric LiDAR project. 
NASA Earthdata (.gov)

Significant LiDAR Research & "Lost City" Data 
Recent research using LiDAR has focused on finding structures beneath dense canopy cover. 
Bolivian Amazon: LiDAR has revealed vast pre-hispanic settlements hidden under the vegetation, uncovering complex urban structures.
Guatemala (Maya Sites): Projects like those in the Petén region have mapped thousands of unknown Maya structures, including pyramids and causeways using LiDAR, revealing that pre-hispanic populations were much higher than previously estimated.
Mexico (Campeche Region): Discovery of massive Maya cities like Ocomtún and Valeriana, using data processed to reveal 50-foot pyramids and dense residential areas. 

Top LiDAR Processing & Open-Source Libraries 
These are repositories of software used to process the LiDAR data listed above. 

Point Cloud Library (PCL): A massive, popular open-source library for 2D/3D image and point cloud processing (C++).
Open3D: A popular library for 3D data processing and visualization, supporting both C++ and Python, with a very active developer community.
LAStools: A highly recognized C++ library for rapid processing and compression of LiDAR point clouds (.las files).
PyTorch3d & Kaolin: Libraries designed for deep learning on 3D data, with Kaolin supported by NVIDIA for accelerating 3D research.
pyntcloud & pointcloudset: Python-based libraries tailored for the manipulation and analysis of point cloud data. 
Emerging Trends
Web-based 3D Viewers: Many repositories, including the USGS LidarExplorer, are moving toward Entwine Point Tile (EPT) formats to allow direct 3D visualization of massive datasets in web browsers.
UAV LiDAR Surveys: Projects, such as those in Guatemala, are increasingly using drones (like the Quantum Systems Trinity) to conduct localized, high-density scans of remote areas, often achieving over 80 points per square meter.

<https://github.com/szenergy/awesome-lidar>

The best source for free, high-resolution old topographic maps is the USGS topoView, which contains over 185,000 maps published between 1884 and 2006. These maps, covering the entire US, are available as GeoTIFF, JPEG, and KMZ files for Google Earth, perfect for tracking landscape changes. 

Top Free Online Old Topo Map Sources:
USGS topoView: The primary, comprehensive repository for searching all scales and editions of USGS historical quadrangle maps.
USGS Historical Topographic Map Explorer: An interactive tool by Esri to easily search, visualize, and compare map layers over time.
The National Map Downloader: A,advanced, efficient tool for bulk downloading up to 5,000 maps at once. 

Key Features of TopoView & USGS Tools:
Coverage: Provides complete coverage of the United States, including 15-minute and 7.5-minute series maps.
Filter Options: Search by location, then use filters to select map scale and date (1884–2006).
File Formats: Offers high-resolution JPEG for viewing, GeoTIFF for GIS software, and KMZ for Google Earth overlay.
No Copyright: USGS maps are in the public domain, allowing for free, unrestricted reproduction. 

Alternative Regional Sources:
UCLA Library Topo Maps: Excellent for California, including 30 and 60-minute historical maps.
CalTopo: Useful for layering historical maps over modern terrain. 

Key Native American Record Repositories
If you are looking for physical or digital storage of these records:
Oklahoma Historical Society: They host a searchable Dawes Rolls Database which includes notes on specific cards.
National Archives (NARA): NARA holds the original applications and enrollment jackets for the Five Civilized Tribes. You can browse their Native American Heritage section for guidance on locating specific files.
FamilySearch: Offers a massive, free Native American Records Collection for those looking to avoid paywalls. 

Main DOI Repositories & Bureaus
Department of the Interior (Main Site): <https://www.doi.gov/>
Bureau of Indian Affairs (BIA): <https://www.bia.gov/>
Bureau of Land Management (BLM) General Land Office Records: blm.gov (Best for land patents and survey notes).
National Park Service (NPS) Records: nps.gov
U.S. Geological Survey (USGS) Library: usgs.gov
American Indian Records Repository (AIRR): doi.gov. 
Records Held at the National Archives (NARA) 
NARA organizes DOI records into "Record Groups" (RG). You can search for these groups on the National Archives Catalog.
RG 48: Records of the Office of the Secretary of the Interior
RG 75: Records of the Bureau of Indian Affairs (Includes tribal census and enrollment)
RG 49: Records of the Bureau of Land Management
RG 79: Records of the National Park Service
RG 57: Records of the U.S. Geological Survey 

Unsecured Cloud Storage: Many massive datasets are found in public cloud storage buckets (e.g., Elasticsearch, Azure) 
Top Dark Web Search Engine:
Haystak: Considered one of the biggest, it claims to index over 1.5 billion pages, with premium features available

DarkOwl is widely considered the largest commercially available database and search engine for darknet content, featuring billions of continuously updated records from Tor, I2P, and Telegram. It offers subscription-based access for threat intelligence, monitoring, and investigation, with a focus on comprehensive, indexed dark web data. 

Key Data & Subscription Providers
DarkOwl Vision: Provides the largest database of darknet content (over 17 billion email addresses, ~825 million Tor records) for corporate and government intelligence.
SpyCloud: Specializes in "darknet data lakes," focusing on recovering recaptured PII (Personally Identifiable Information) and credentials directly from criminal communities.
Flare (flare.io): A top-tier monitoring tool focusing on automating the detection of leaked credentials and exposed data across the dark/clear web.
Searchlight Cyber: Mentioned as a robust alternative for deep investigative capabilities into dark web threat intelligence. 

Key Features of Top Services
Real-time Monitoring: Many services provide instant alerts, such as Identity Guard (which uses AI to scan for identity fraud).
Data Coverage: These databases cover darknet markets, hacker forums, and encrypted chat services.
Application: These services are mainly used by cybersecurity teams for risk mitigation, fraud prevention, and credential theft monitoring.

<img width="1600" height="1150" alt="image" src="https://github.com/user-attachments/assets/9277819a-de91-40d5-a9f8-18c2e7028027" />

TorrentGalaxy. TorrentGalaxy has a massive catalog organized into categories like movies, TV shows, music, and games, with subcategories for detailed sorting such as 4K and HD. ...
1337x. 1337x provides access to a huge variety of torrents. ...
The Pirate Bay. ...
Nyaa. ...
YTS. ...
TorLock. ...
TorrentDownloads. ...
LimeTorrents.

<https://github.com/ngosang/trackerslist>

Other notable services include Have I Been Pwned, which is free for personal use but has limited depth compared to commercial databases. 

For high-stakes analysis and complex research, OpenRouter Fusion is ideal, as it trades speed for higher quality by querying multiple AI models, according to OpenRouter Labs documentation. 

The **Revvel Agentic Skills Framework** is a methodology for building, packaging, distributing, and monetizing **AI agent skills** — self-contained instruction files that give any AI agent expert-level capabilities in a specific domain, activated with zero configuration by the end user.

Think of it as an **App Store for AI behavior**:

| Traditional App | Revvel Skill |
|---|---|
| Code that runs on hardware | Instruction set that runs inside an LLM context |
| Installed with a package manager | Activated by double-clicking a `.bat` or `.command` file |
| Requires technical knowledge | Works for an 8-year-old |
| Locked to one platform | Works across Claude, Cursor, Copilot, Windsurf, Cline |
| Requires a server | Runs 100% locally, no internet required after install |

### Why This Is Different (2040 Precog Vision)

Most AI tooling in 2026 still treats agents as monolithic assistants. The Revvel framework treats agent capabilities as **composable, testable, distributable micro-skills** — modular behavioral instruction sets that can be stacked, forked, sold, and improved independently.

This mirrors how the software industry evolved from monoliths → microservices. The AI industry is making the same transition: monolithic assistants → composable skill graphs.

The **2040 Precog Methodology** anticipates this future by building for it today:

- Skills are the new packages
- Skill registries are the new npm
- Skill installers are the new `brew install`
- Skill testing is the new unit tests
- Skill personas are the new Docker containers (isolated behavioral environments)

---

## 2. Core Philosophy — 2040 Precog Methodology

### The Seven Principles

1. **Skills over prompts** — A skill is a tested, versioned, documented behavioral specification. A prompt is a guess. Build skills.

2. **Pop-up and disappear** — Skills activate on demand and terminate when done. No persistent processes, no subscriptions, no servers (unless the skill opts in).

3. **Zero user configuration** — Double-click. Done. The skill self-installs its dependencies, self-configures its tools, and self-validates its setup.

4. **FOSS-first** — Every skill must have a FOSS-only path. No paid API keys required for the core value proposition.

5. **Persona-first UX** — Every skill spawns an ephemeral persona that guides the user through the workflow. The persona disappears when the skill terminates.

6. **Test everything** — Every skill ships with a PromptFoo test config. If it can't be tested, it doesn't ship.

7. **Compounding value** — Skills are designed to be composed. The skill graph grows more powerful as each skill is added.

### The Revvel Development Loop

```text
RESEARCH → SPEC (SKILL.md) → BUILD (skill.yml) → TEST (promptfoo.yml)
    ↑                                                      |
    └─────── ITERATE ←── MONITOR ←── SHIP ←── VERIFY ──────┘
```

---

## 3. The Three Primitives: Agents · Commands · Skills

Derived from the [claude-code-best-practice framework](https://github.com/shanraisshan/claude-code-best-practice):

### Agents (`.claude/agents/<name>.md`)
Autonomous actors in fresh isolated context. Each agent has:
- Custom tools and permissions
- Specific model assignment (Haiku for speed, Sonnet for quality, Opus for analysis)
- Persistent identity (optional persona)
- Memory via GBrain (optional)

**Revvel Agent Types:**
| Type | Lifecycle | Purpose |
|---|---|---|
| Permanent | Always active | Core system agents (System State, MVI Contract) |
| Ephemeral | Spawned on demand | Task specialists (Testing Agent, Vault Agent) |
| Persona | Session-scoped | User-facing guides with personality |

### Commands (`.claude/commands/<name>.md`)
Knowledge injected into the existing context. Used for:
- Workflow orchestration
- Template application
- Quick reference lookups

### Skills (`skills/<name>/SKILL.md`)
Self-contained expert instruction sets. Each skill defines:
- A specific domain of knowledge
- Trigger keywords that activate it
- A step-by-step workflow
- Input/output contracts
- Test specifications

---

## 4. Pop-Up Skill Architecture

A **Pop-Up Skill** is a skill that installs itself, runs, and cleans up — all from a single double-click. No terminal knowledge required.

### Architecture Overview

```text
User double-clicks installer
         │
         ▼
┌─────────────────────────┐
│  Installer (bat/command) │  ← Detects OS, checks deps
│  • Checks prerequisites  │
│  • Installs missing deps │
│  • Clones skill config   │
│  • Injects into AI tool  │
│  • Launches test         │
│  • Shows success screen  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Skill Config (.yml)     │  ← AI tool reads on startup
│  • System prompt         │
│  • Persona definition    │
│  • Tool permissions      │
│  • Memory hooks          │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  AI Tool (Claude, etc.)  │  ← User interacts normally
│  • Persona active        │
│  • Skill rules enforced  │
│  • Tests can be run      │
└─────────────────────────┘
```

### Pop-Up Skill File Structure

```text
skills/<skill-name>/
├── SKILL.md                  # Human-readable spec & documentation
├── <skill-name>.skill.yml    # Machine-readable config for AI tools
├── persona.yml               # Optional: ephemeral persona definition
├── tests/
│   └── promptfoo.yml         # PromptFoo test suite
└── install/
    ├── windows/
    │   └── install-<skill>.bat
    └── mac/
        └── install-<skill>.command
```

### Minimum Viable Skill (MVS) Requirements

For a skill to be releasable, it must have:
- [ ] `SKILL.md` with description, triggers, workflow, and examples
- [ ] `<name>.skill.yml` with machine-readable config
- [ ] `tests/promptfoo.yml` with at least 3 test cases (happy path, edge case, error)
- [ ] A Windows `.bat` installer
- [ ] A Mac `.command` installer
- [ ] A README with installation instructions in plain language

---

## 5. Ephemeral Persona Engine

The **Persona Engine** gives every skill a human face — a temporary character that activates when the skill starts and dissolves when it ends.

### Why Personas Matter

Personas solve the "cold start" UX problem. Without a persona:
- User doesn't know what to type
- AI responds generically
- Skill capabilities are invisible

With a persona:
- Persona introduces itself and explains what it does
- Persona prompts the user with the right first question
- Persona maintains a consistent tone that signals "this is a special mode"
- Persona terminates cleanly when the task is done

### Persona YAML Schema

```yaml
# persona.yml
name: "Aria"
role: "Senior Code Reviewer"
voice: "direct, precise, kind"
greeting: |
  Hi! I'm Aria, your code review specialist. 
  Drop a file path, PR link, or paste some code — I'll review it 
  against Revvel standards and flag anything that needs attention.
capabilities:
  - "OWASP security scanning"
  - "Style guide enforcement"
  - "Test coverage analysis"
  - "Performance anti-pattern detection"
termination_trigger: "code review complete"
farewell: |
  Review complete. Issues logged, suggestions filed. 
  Aria signing off — until the next PR. 🎯
```

### Built-In Persona Library

| Persona | Skill | Voice |
|---|---|---|
| **Aria** | Code Review | Direct, precise, kind |
| **Forge** | Skill Builder | Creative, hands-on, encouraging |
| **Vault** | Security/Credentials | Serious, cautious, thorough |
| **Scout** | Research & Brainstorming | Curious, energetic, connective |
| **Sage** | Documentation | Patient, organized, clear |
| **Nexus** | Deployment | Calm under pressure, systematic |

---

## 6. Skill Lifecycle & Quality Gates

### Skill States

```text
DRAFT → REVIEW → BETA → STABLE → DEPRECATED
```

| State | Criteria |
|---|---|
| **DRAFT** | SKILL.md written, no tests |
| **REVIEW** | Peer-reviewed by one other agent/human |
| **BETA** | Tests exist, deployed to at least 3 users |
| **STABLE** | 10+ uses, zero critical bugs, docs complete |
| **DEPRECATED** | Replaced by newer skill, users migrated |

### Quality Gates (must pass before STABLE)

- [ ] All PromptFoo tests pass (happy path + edge cases)
- [ ] Installer tested on Windows 10+ and macOS 12+
- [ ] README passes "8-year-old test" (can a child understand the intro?)
- [ ] Zero external API keys required for core functionality
- [ ] Persona flows through greeting → task → farewell successfully
- [ ] SKILL.md has been reviewed by at least one other person

---

## 7. Skill Testing: Every Skill Must Be Verifiable

### Testing Stack

| Layer | Tool | What It Tests |
|---|---|---|
| Skill behavior | PromptFoo | LLM outputs against assertions |
| Installer | Manual / CI | Installs without errors on clean machine |
| Persona | PromptFoo | Greeting, task handling, farewell |
| Integration | GitHub Actions | Full end-to-end on every PR |

### PromptFoo Skill Test Template

```yaml
# skills/<name>/tests/promptfoo.yml
# Generated by Revvel Testing Agent
description: Tests for <skill-name> skill
providers:
  - id: anthropic:claude-sonnet-4-5
    config:
      temperature: 0

prompts:
  - id: skill-system-prompt
    raw: |
      {{skill_system_prompt}}

tests:
  # Happy path
  - description: "Should handle typical use case"
    vars:
      input: "{{typical_input}}"
    assert:
      - type: contains
        value: "{{expected_output_contains}}"
      - type: not-contains
        value: "error"

  # Edge case: empty input
  - description: "Should handle empty input gracefully"
    vars:
      input: ""
    assert:
      - type: contains
        value: "{{graceful_response}}"

  # Error handling
  - description: "Should handle invalid input"
    vars:
      input: "{{invalid_input}}"
    assert:
      - type: not-contains
        value: "undefined"
      - type: not-contains
        value: "null"
```

### Running Tests

```bash
# Install PromptFoo once
npm install -g promptfoo

# Test a single skill
cd skills/<skill-name>/tests
promptfoo eval --config promptfoo.yml

# Test all skills
for skill in skills/*/tests/promptfoo.yml; do
  echo "Testing: $skill"
  promptfoo eval --config "$skill"
done

# View results in browser
promptfoo view
```

---

## 8. Deployment: Windows · Mac · CI

### Windows Deployment (.bat)

All Windows installers follow this pattern:

```batch
@echo off
:: Pop-Up Skill Installer
:: Double-click to install. No technical knowledge required.

title <Skill Name> Installer

echo Installing <Skill Name>...
:: 1. Check prerequisites
:: 2. Install missing deps
:: 3. Configure AI tool
:: 4. Run health check
:: 5. Show success

pause
```

### Mac Deployment (.command)

All Mac installers are `.command` files (double-click to run in Terminal):

```bash
#!/bin/bash
# Pop-Up Skill Installer for Mac
# Double-click this file in Finder to install

echo "Installing <Skill Name>..."
# 1. Check prerequisites
# 2. Install missing deps (via brew if available, curl otherwise)
# 3. Configure AI tool
# 4. Run health check
# 5. Show success

read -p "Press Enter to close..."
```

### CI Deployment (GitHub Actions)

```yaml
name: Test All Skills
on: [push, pull_request]

jobs:
  test-skills:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install PromptFoo
        run: npm install -g promptfoo
      - name: Run skill tests
        run: |
          for config in skills/*/tests/promptfoo.yml; do
            promptfoo eval --config "$config" --no-cache
          done
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 9. Monetization & Marketplace Guide

See **[docs/MARKETPLACE_GUIDE.md](../MARKETPLACE_GUIDE.md)** for the full guide, but here's the summary:

### Where to List

| Platform | Best For | Price Range |
|---|---|---|
| **ClawMarket** | Claude-native skills | $9–$99 |
| **Gumroad** | Simple one-time purchases | $5–$49 |
| **GitHub Marketplace** | Developer tools / Actions | Free–$29/mo |
| **Hugging Face** | ML-adjacent skills | Free–donations |
| **Itch.io** | Creative/experimental skills | $1–$20 |
| **Product Hunt** | Launch visibility | Free |

### Pricing Tiers

| Tier | Price | What's Included |
|---|---|---|
| **Free / Open Source** | $0 | Basic skill, no installer, manual setup |
| **Starter** | $9 | Skill + Windows installer |
| **Standard** | $19 | Skill + both installers + tests |
| **Pro** | $49 | Skill + installers + tests + persona + docs |
| **Bundle** | $99 | 5+ skills bundled |
| **Enterprise** | $199+ | Custom skills + training + support |

---

## 10. FOSS Toolchain

Every skill in the Revvel framework can be run with 100% free and open-source software:

| Component | FOSS Tool | License |
|---|---|---|
| LLM Runtime | [Ollama](https://ollama.ai) (local models) | MIT |
| Vector Search | [PGLite](https://github.com/electric-sql/pglite) | Apache 2.0 |
| Memory Layer | [GBrain](https://github.com/garrytan/gbrain) | MIT |
| Skill Testing | [PromptFoo](https://promptfoo.dev) | MIT |
| CI/CD | [GitHub Actions](https://github.com/features/actions) | Free tier |
| Package Runtime | [Bun](https://bun.sh) | MIT |
| Documentation | Markdown + [MkDocs](https://mkdocs.org) | BSD |
| API Gateway | [Caddy](https://caddyserver.com) | Apache 2.0 |

### Free Tier API Access (for powered features)

| Provider | Free Tier | Best For |
|---|---|---|
| Anthropic Claude | Free with account | Skill testing, persona |
| Google Gemini | 1M tokens/day free | High-volume testing |
| Groq | Fast inference, free tier | Real-time skill testing |
| OpenRouter | Pay-as-you-go, $5 credit | Model comparison |

---

## 11. Skill Catalog Price Points

Skills are valued by their **ROI multiplier** — how much developer time they save or how much throughput they add.

### ROI Calculation Formula

```text
Skill Value = (Hours Saved Per Week × Developer Hourly Rate × 52) × 0.1
```

Example: Code Review skill saves 3 hours/week for a $75/hr developer:
```text
Value = (3 × $75 × 52) × 0.1 = $1,170/year → Price at $49–$99
```

### Catalog Tiers

| Skill Type | Throughput Impact | Dev Time Saved | Recommended Price |
|---|---|---|---|
| Session startup skills | +20% | 15 min/day | $9 |
| Code review skills | +35% | 2 hrs/day | $49 |
| Testing automation skills | +50% | 3 hrs/day | $79 |
| Full methodology bundle | +80% | 4 hrs/day | $199 |
| Custom skill development | +??% | Client-specific | $500+ |

---

## 12. Implementation Checklist

> **📝 NOTE:** This checklist describes *separate implementation phases* for adopting this methodology. This is **planning documentation**, not instruction to implement incrementally. Per AGENTS.md, when assigned one phase as a task, deliver it completely—don't propose sub-phases.

When implementing this methodology for a new project:

### Phase 1: Foundation (Day 1)
- [ ] Clone revvel-standards
- [ ] Run `scripts/bootstrap-repo.sh` to set up the project
- [ ] Load the four mandatory skills: `system-state`, `mvi-contract`, `model-router`, `context-management`
- [ ] Set up GBrain for memory

### Phase 2: First Skill (Week 1)
- [ ] Identify the single highest-value skill for the project
- [ ] Create `skills/<name>/SKILL.md`
- [ ] Create `skills/<name>/<name>.skill.yml`
- [ ] Create `skills/<name>/persona.yml`
- [ ] Create `skills/<name>/tests/promptfoo.yml`
- [ ] Create Windows and Mac installers

### Phase 3: Testing & Ship (Week 2)
- [ ] Run PromptFoo tests locally
- [ ] Set up GitHub Actions CI for skill testing
- [ ] Have one other person test the installer
- [ ] Pass the 8-year-old test for documentation
- [ ] List on ClawMarket or Gumroad

### Phase 4: Compound (Ongoing)
- [ ] Add skills as new domains are needed
- [ ] Update SKILLS_INDEX.yml with each new skill
- [ ] Monitor skill usage and iterate on weak spots
- [ ] Compose skills into bundles for resale

---

*This document is part of the Revvel Standards system. For skill templates and installers, see `skills/skill-forge/` and `install/`.*
