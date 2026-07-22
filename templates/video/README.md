# Video Production System - Master Index

Comprehensive video production templates and automation for all social media platforms, CLE training, music videos, and movies.

## Directory Structure

```text
templates/video/
├── social-media/          # Social media video templates
│   ├── linkedin/          # LinkedIn avatar video templates
│   ├── facebook/          # Facebook video templates
│   ├── youtube/           # YouTube video templates (monetized)
│   └── tiktok/            # TikTok video templates
├── cle-training/          # CLE training video templates
│   ├── colorado/          # Colorado CLE specific rules
│   └── templates/         # Reusable CLE templates
├── music-video/           # Music video production
│   └── templates/         # Music video scripts and styles
└── movie/                 # Movie/long-form content
    └── templates/         # 2-hour movie templates

avatars/                   # Avatar repository
├── work/                  # Work avatars (HeyGen, D-ID, etc.)
├── personal/              # Personal avatars
└── personas/              # AI personas for different contexts

voices/                    # Voice repository
├── clones/                # Voice clone configurations
├── settings/              # Voice settings per platform
└── presets/               # Voice presets by content type
```

## Video Types & Duration

| Platform/Type | Duration | Unit | Monetization |
|--------------|----------|------|--------------|
| LinkedIn | 30-60 sec | - | Lead generation |
| Facebook | 1-3 min | - | Ads, reels |
| YouTube | 1-10 min | - | Ad revenue, sponsors |
| TikTok | 15-60 sec | - | Brand deals |
| CLE Training | 1 hour | 1 CLE unit | Course sales |
| Music Video | 3-5 min | - | Streaming, sales |
| Movie | 90-120 min | - | Streaming, sales |

## CLE Training (Colorado Rules)

### Requirements
- 1 hour of instruction = 1 CLE credit unit
- Must include attendance verification
- Certificate of completion required
- Subject matter must be approved CLE content

### Colorado Supreme Court Rules
- Accredited provider status required
- Quality assurance standards apply
- Reporting deadlines must be met

## Quick Start

1. **Choose your video type** from the templates above
2. **Select or create avatar** from `avatars/work/`
3. **Select voice** from `voices/clones/`
4. **Generate script** using template structure
5. **Create video** with HeyGen or preferred platform
6. **Upload** to target platforms with monetization

## Automation

See `docs/video-production/` for:
- Automated upload workflows
- Cross-platform monetization setup
- Analytics and tracking
- Content calendar integration

## Legal & Compliance

Each video type has compliance requirements:
- **Social Media**: FTC disclosure, platform TOS
- **CLE Training**: Colorado Bar accreditation, attendance tracking
- **Music**: Copyright, royalty clearance
- **Movies**: Full production rights, talent releases

## Repository Management

- All completed videos should be documented in this repo
- Upload links to Google Drive or cloud storage
- Update SHIP_STATUS.md with completed work
- Email notification workflow for completed requests
