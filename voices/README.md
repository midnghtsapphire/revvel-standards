# Voice Repository - Master Index

This repository stores all voice clones and voice settings for video production.

## Voice File Upload & Combination System 🎙️

Similar to Donna AI - upload audio files and combine them to create unique voice outputs:

### Supported Input Formats
- **MP3** - Most common audio format
- **WAV** - Lossless quality
- **M4A** - Apple lossless
- **FLAC** - Free lossless
- **OGG** - Open format
- **WEBM** - Web audio

### Voice Combination Process

```text
Input Audio Files
       │
       ▼
┌──────────────────────────────────────┐
│        VOICE COMBINATION ENGINE      │
├──────────────────────────────────────┤
│  1. Upload multiple audio files      │
│  2. Select voice characteristics     │
│  3. Blend voices (adjust ratios)     │
│  4. Apply effects (pitch, speed)     │
│  5. Generate combined voice clone    │
│  6. Export for use in videos         │
└──────────────────────────────────────┘
       │
       ▼
Final Voice Clone + Settings
```

### Donna AI-Style Features
- **Multi-file upload** - Combine multiple voice samples
- **Voice blending** - Mix characteristics from different voices
- **Emotion control** - Adjust emotional tone
- **Speed/pitch adjustment** - Fine-tune output
- **Real-time preview** - Hear before committing
- **Export options** - Multiple formats and quality settings

## Directory Structure

```text
voices/
├── clones/                  # Voice clone configurations
│   ├── primary/             # Main voice clone
│   ├── variations/          # Speed/pitch variations
│   └── emotional/           # Emotional voice variants
├── settings/                # Platform-specific settings
│   ├── linkedin/
│   ├── youtube/
│   ├── tiktok/
│   ├── cle-training/
│   └── music/
└── presets/                 # Voice presets by content type
    ├── professional/
    ├── conversational/
    ├── energetic/
    └── dramatic/
```

## Voice Clone Providers

### ElevenLabs
- High-quality voice cloning
- Emotion control
- Speed/pitch adjustment
- Best for: Professional content

### Resemble AI
- Real-time cloning
- Custom AI voices
- Best for: Custom voices

### Play.ht
- Natural voices
- Voice library
- Best for: Large-scale production

## Voice Settings by Platform

### LinkedIn (Professional)
```json
{
  "speed": 0.95,
  "pitch": 0,
  "stability": 0.75,
  "clarity": 0.85,
  "style": "professional",
  "volume": 1.0
}
```

### YouTube (Engaging)
```json
{
  "speed": 1.0,
  "pitch": 0,
  "stability": 0.65,
  "clarity": 0.8,
  "style": "engaging",
  "volume": 1.0
}
```

### TikTok (Energetic)
```json
{
  "speed": 1.05,
  "pitch": 0,
  "stability": 0.5,
  "clarity": 0.75,
  "style": "energetic",
  "volume": 1.0
}
```

### CLE Training (Clear, Educational)
```json
{
  "speed": 0.9,
  "pitch": 0,
  "stability": 0.85,
  "clarity": 0.95,
  "style": "educational",
  "volume": 1.0
}
```

### Music/Singing
```json
{
  "speed": 1.0,
  "pitch": 0,
  "stability": 0.7,
  "clarity": 0.9,
  "style": "musical",
  "volume": 1.0,
  "harmony": true
}
```

## Voice Presets

### Professional Preset
- Speed: 0.95
- Tone: Authoritative, clear
- Best for: Business, legal, educational

### Conversational Preset
- Speed: 1.0
- Tone: Friendly, relatable
- Best for: Social media, vlogs

### Energetic Preset
- Speed: 1.05-1.1
- Tone: Enthusiastic, dynamic
- Best for: Promotions, TikTok

### Dramatic Preset
- Speed: 0.85-0.95
- Tone: Deep, emotional
- Best for: Storytelling, movies

## Maintenance

- Test voice quality monthly
- Update settings as platforms evolve
- Archive failed clones
- Keep backup in cloud storage

## Storage & Backup

All voice files should be:
- [ ] Saved to Google Drive (Primary)
- [ ] Backed up to revvel-standards repo
- [ ] Documented with creation date
- [ ] Versioned for changes
