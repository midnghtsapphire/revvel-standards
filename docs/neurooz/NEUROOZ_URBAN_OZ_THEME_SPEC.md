# Neurooz — Urban Oz Theme & Visual Design Specification

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**Design System:** Urban Oz — Cyberpunk Wizard of Oz  
**Aesthetic:** Dark Glassmorphism + Neon Emerald + Street Art Typography  

---

## 1. Design Philosophy

The Urban Oz theme reimagines the Wizard of Oz as a cyberpunk cityscape. The Emerald City is a neon-lit metropolis. The Yellow Brick Road is a glowing data highway. Characters are urban archetypes — the Scarecrow is a street-smart AI guide, the Tin Man is a chrome financial guardian, the Lion is a courage-building wellness coach.

**Core Principles:**
- **Dark-first:** True dark mode with OLED-friendly backgrounds (energy-saving)
- **Neon accents:** Emerald green neon as primary accent — the "Oz glow"
- **Glassmorphism:** Frosted glass panels with subtle transparency
- **Sensory-safe:** Every animation has an off-switch (ADHD/Neuro mode)
- **Urban edge:** Street art typography, graffiti-inspired decorative elements
- **Depth illusion:** Parallax layers creating a city-depth effect

---

## 2. Color System

### Primary Palette

```css
:root {
  /* Core Colors */
  --oz-bg-primary: #0A0E17;          /* Deep space black — main background */
  --oz-bg-secondary: #111827;         /* Dark slate — card backgrounds */
  --oz-bg-tertiary: #1E293B;          /* Elevated surfaces */
  
  /* The Emerald Glow — Primary Brand Color */
  --oz-emerald-50: #ECFDF5;
  --oz-emerald-100: #D1FAE5;
  --oz-emerald-200: #A7F3D0;
  --oz-emerald-300: #6EE7B7;
  --oz-emerald-400: #34D399;
  --oz-emerald-500: #10B981;           /* Primary emerald */
  --oz-emerald-600: #059669;
  --oz-emerald-700: #047857;
  --oz-emerald-800: #065F46;
  --oz-emerald-900: #064E3B;
  --oz-emerald-glow: rgba(16, 185, 129, 0.4);  /* Neon glow effect */
  
  /* Neon Accents */
  --oz-neon-pink: #FF6B9D;            /* Alerts, Ruby Slippers accent */
  --oz-neon-blue: #60A5FA;            /* Info, secondary actions */
  --oz-neon-amber: #FBBF24;           /* Warnings, Yellow Brick Road */
  --oz-neon-purple: #A78BFA;          /* Creative mode accent */
  --oz-neon-red: #F87171;             /* Impulse alerts, critical errors */
  
  /* Text */
  --oz-text-primary: #F1F5F9;         /* Primary text — NOT pure white */
  --oz-text-secondary: #94A3B8;       /* Secondary text */
  --oz-text-muted: #64748B;           /* Muted/disabled text */
  --oz-text-accent: #34D399;          /* Accent text — emerald */
  
  /* Glassmorphism */
  --oz-glass-bg: rgba(17, 24, 39, 0.7);
  --oz-glass-border: rgba(16, 185, 129, 0.2);
  --oz-glass-blur: 16px;
  --oz-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### Cognitive Mode Color Schemes

```css
/* Focus Mode — Deep, concentrated, minimal distraction */
[data-mode="focus"] {
  --mode-bg: #0A2E36;
  --mode-accent: #2E8B57;
  --mode-text: #E2E8F0;
  --mode-glow: rgba(46, 139, 87, 0.3);
}

/* Creative Mode — Warm, inspiring, energetic */
[data-mode="creative"] {
  --mode-bg: #1A1033;
  --mode-accent: #A78BFA;
  --mode-text: #F1F5F9;
  --mode-glow: rgba(167, 139, 250, 0.3);
  --mode-secondary: #FBBF24;
}

/* Executive Function Mode — Clean, structured, professional */
[data-mode="executive"] {
  --mode-bg: #0F172A;
  --mode-accent: #60A5FA;
  --mode-text: #F1F5F9;
  --mode-glow: rgba(96, 165, 250, 0.3);
}

/* Rest Mode — Soft, warm, calming */
[data-mode="rest"] {
  --mode-bg: #1A1520;
  --mode-accent: #C4B5FD;
  --mode-text: #E2E8F0;
  --mode-glow: rgba(196, 181, 253, 0.2);
}
```

### Accessibility Mode Overrides

```css
/* WCAG AAA — Maximum contrast */
[data-accessibility="wcag-aaa"] {
  --oz-bg-primary: #000000;
  --oz-text-primary: #FFFFFF;
  --oz-emerald-500: #00FF88;      /* High contrast emerald */
  font-size: 18px;
}

/* Dyslexic Mode — Readability-first */
[data-accessibility="dyslexic"] {
  font-family: 'OpenDyslexic', 'Atkinson Hyperlegible', sans-serif;
  line-height: 1.9;
  letter-spacing: 0.2em;
  word-spacing: 0.3em;
}

/* Neuro Mode — Zero sensory load */
[data-accessibility="neuro"] {
  --oz-glass-blur: 0px;           /* No blur effects */
  * { animation: none !important; transition: none !important; }
}

/* ECO CODE — Battery conservation */
[data-accessibility="eco"] {
  --oz-bg-primary: #000000;        /* True OLED black */
  --oz-glass-bg: #000000;
  --oz-glass-blur: 0px;
  --oz-glass-shadow: none;
  * { 
    animation: none !important; 
    box-shadow: none !important;
    filter: none !important;
  }
}

/* No Blue Light — Warm filtering */
[data-accessibility="no-blue-light"] {
  --oz-bg-primary: #1A1510;
  --oz-text-primary: #F5DEB3;
  --oz-emerald-500: #DAA520;      /* Warm gold replaces emerald */
  --oz-neon-blue: #DEB887;        /* Warm replaces blue */
  filter: sepia(20%) saturate(80%);
}

/* Menstrual UI — Soft and affirming */
[data-accessibility="menstrual"] {
  --oz-bg-primary: #1A1520;
  --oz-emerald-500: #E8A0BF;      /* Soft pink replaces emerald */
  --oz-neon-amber: #F0C8A8;       /* Warm peach */
  --oz-text-primary: #F3E8EE;
}
```

---

## 3. Typography

### Font Stack

```css
:root {
  /* Primary — Urban, modern, readable */
  --font-primary: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Display — Headlines, Oz character names */
  --font-display: 'Clash Display', 'Bebas Neue', 'Impact', sans-serif;
  
  /* Mono — Code, data, numbers */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Graffiti — Decorative accents, section headers (sparingly) */
  --font-graffiti: 'Permanent Marker', 'Rock Salt', cursive;
  
  /* Accessible alternatives */
  --font-dyslexic: 'OpenDyslexic', 'Atkinson Hyperlegible', sans-serif;
}
```

### Type Scale

```css
:root {
  --text-xs: 0.75rem;      /* 12px — Labels, timestamps */
  --text-sm: 0.875rem;     /* 14px — Secondary text, captions */
  --text-base: 1rem;       /* 16px — Body text */
  --text-lg: 1.125rem;     /* 18px — Emphasized body, WCAG minimum */
  --text-xl: 1.25rem;      /* 20px — Subheadings */
  --text-2xl: 1.5rem;      /* 24px — Section headers */
  --text-3xl: 1.875rem;    /* 30px — Page titles */
  --text-4xl: 2.25rem;     /* 36px — Hero text */
  --text-5xl: 3rem;        /* 48px — Dashboard hero, Emerald City title */
  --text-display: 4rem;    /* 64px — Splash screen, marketing */
}
```

### Street Art Typography Guidelines
- Use `--font-graffiti` ONLY for decorative elements: section dividers, Oz character quote blocks, achievement badges
- Never use graffiti font for body text, navigation, or form labels
- Maximum 2 words in graffiti font per screen
- Pair with clean `--font-primary` for readability

---

## 4. Component Design System

### 4.1 Glass Card (Primary Container)

```css
.oz-glass-card {
  background: var(--oz-glass-bg);
  backdrop-filter: blur(var(--oz-glass-blur));
  -webkit-backdrop-filter: blur(var(--oz-glass-blur));
  border: 1px solid var(--oz-glass-border);
  border-radius: 16px;
  box-shadow: var(--oz-glass-shadow);
  padding: 24px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.oz-glass-card:hover {
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.15);
}

/* Neon edge variant — for primary/active cards */
.oz-glass-card--neon {
  border: 1px solid var(--oz-emerald-500);
  box-shadow: 
    0 0 8px var(--oz-emerald-glow),
    0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### 4.2 Neon Button System

```css
.oz-btn {
  font-family: var(--font-primary);
  font-weight: 600;
  border-radius: 12px;
  padding: 12px 24px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

/* Primary — Emerald glow */
.oz-btn--primary {
  background: linear-gradient(135deg, var(--oz-emerald-600), var(--oz-emerald-500));
  color: #FFFFFF;
  border: none;
  box-shadow: 0 0 20px var(--oz-emerald-glow);
}

.oz-btn--primary:hover {
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
  transform: translateY(-1px);
}

/* Ghost — Glass outline */
.oz-btn--ghost {
  background: transparent;
  color: var(--oz-emerald-400);
  border: 1px solid var(--oz-glass-border);
}

.oz-btn--ghost:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: var(--oz-emerald-500);
}

/* Danger — Ruby glow (for impulse alerts) */
.oz-btn--danger {
  background: linear-gradient(135deg, #DC2626, #EF4444);
  color: #FFFFFF;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}
```

### 4.3 Emerald City Dashboard Layout

```text
┌─────────────────────────────────────────────────────────┐
│  ░░░ EMERALD CITY SKYLINE (parallax background) ░░░    │
│  ░░░ Neon buildings, glowing windows, aurora sky ░░░    │
├─────────┬───────────────────────────────┬───────────────┤
│         │                               │               │
│  NAV    │   MAIN CONTENT AREA           │  SIDEBAR      │
│  -----  │   (Bento Grid Layout)         │  ---------    │
│  [MODE] │   ┌─────────┬─────────┐       │  Scarecrow    │
│  Focus  │   │ COGN    │ TASKS   │       │  Chat         │
│  Create │   │ MODE    │ TODAY   │       │               │
│  Exec   │   │ [glass] │ [glass] │       │  Quick        │
│  Rest   │   ├─────────┼─────────┤       │  Actions      │
│         │   │ FINANCE │ YELLOW  │       │               │
│  [MENU] │   │ GUARD   │ BRICK   │       │  Impulse      │
│  Tasks  │   │ [glass] │ ROAD    │       │  Score        │
│  Money  │   │         │ [glass] │       │               │
│  Growth │   └─────────┴─────────┘       │  Mode         │
│  Goals  │                               │  Timer        │
│         │                               │               │
├─────────┴───────────────────────────────┴───────────────┤
│  [Mode Switcher FAB]        [Accessibility Mode Toggle] │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Oz Character Design Guide

| Character | Role | Visual Style | Personality | Color |
|-----------|------|-------------|-------------|-------|
| **Scarecrow** | AI Task Assistant | Tattered hoodie, straw-textured hair, glowing LED eyes | Street-smart, witty, protective | Amber/Gold |
| **Tin Man** | Financial Guardian | Chrome/metallic body, heart-shaped LED chest piece | Compassionate, data-driven, non-judgmental | Silver/Steel Blue |
| **Lion** | Courage Coach | Mane as neon fur, graffiti-style roar | Encouraging, brave, celebrates small wins | Warm Orange/Gold |
| **Dorothy** | User Avatar (customizable) | Urban streetwear, ruby sneakers (not slippers) | Determined, navigating the city | Ruby Red |
| **Toto** | Notification Agent | Small glowing dog sprite | Alerts, nudges, playful | Emerald Green |

**Implementation:**
- Characters rendered as **Lottie animations** (JSON-based, lightweight, scalable)
- Static versions as **SVG** for reduced-motion modes
- Each character has 3 states: idle, speaking, celebrating
- Max character animation size: 50KB per character
- Characters appear in context: Scarecrow in task views, Tin Man in financial views, etc.

### 4.5 Yellow Brick Road Progress System

```text
START ─── ○ ─── ○ ─── ★ ─── ○ ─── ○ ─── ★ ─── ○ ─── ● EMERALD CITY
          │     │     │     │     │     │     │     │
        Task  Task  MILE  Task  Task  MILE  Task  CURRENT
        Done  Done  STONE Done  Done  STONE Done  POSITION
                    ✓                 ✓
```

- Road rendered as SVG path with neon amber glow
- Milestones are larger nodes with achievement badges
- Current position shown with Dorothy avatar
- Completed sections glow brighter
- Parallax scrolling on mobile — road moves as user scrolls through tasks
- In ECO mode: static path, no glow effects, simple dots

---

## 5. Animation Guidelines

### Allowed Animations (respects `prefers-reduced-motion`)

| Animation | Duration | Easing | Purpose | Eco Mode |
|-----------|----------|--------|---------|----------|
| Card hover glow | 300ms | ease-out | Visual feedback | Disabled |
| Mode transition | 500ms | ease-in-out | Smooth state change | Disabled |
| Yellow Brick progress | 800ms | spring | Achievement celebration | Disabled |
| Neon pulse on active card | 2s loop | sine | Attention indicator | Disabled |
| Character idle | 3s loop | linear | Personality | Disabled |
| Page transition | 200ms | ease | Navigation clarity | Instant cut |
| Skeleton loading | 1.5s loop | ease-in-out | Loading state | Static gray |
| Impulse alert shake | 300ms | elastic | Urgent notification | Static red border |

### Reduced Motion Behavior

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. Iconography

- **Primary icon set:** Lucide React (open-source, consistent, accessible)
- **Custom icons:** Oz-themed icons for mode indicators, character badges
- **Icon treatment:** Outlined style default, filled when active
- **Neon glow on hover:** `filter: drop-shadow(0 0 4px var(--oz-emerald-glow))`
- **Minimum touch target:** 44px × 44px (WCAG requirement)

---

## 7. Responsive Breakpoints

```css
/* Mobile-first design */
--screen-sm: 640px;    /* Small phones */
--screen-md: 768px;    /* Tablets */
--screen-lg: 1024px;   /* Laptops */
--screen-xl: 1280px;   /* Desktops */
--screen-2xl: 1536px;  /* Large screens */
```

- **Mobile (< 768px):** Single column, bottom navigation, hamburger menu
- **Tablet (768-1024px):** Two-column bento grid, side drawer navigation
- **Desktop (1024+):** Full three-column layout with persistent sidebar

---

## 8. Sound Design (Optional — User-Controlled)

| Sound | Trigger | Style | Duration |
|-------|---------|-------|----------|
| Mode switch chime | Cognitive mode changes | Crystalline bell, pitch varies by mode | 0.5s |
| Task complete ping | Task marked done | Coin-like ding (dopamine hit) | 0.3s |
| Impulse alert | Spending alert triggered | Gentle warning tone, not alarming | 0.8s |
| Emerald City ambience | Focus mode active | Subtle urban hum, distant neon buzz | Loop |
| Yellow Brick Road step | Task progress | Soft footstep sound | 0.2s |
| Achievement fanfare | Milestone reached | Short brass fanfare (Oz theme) | 1.5s |

**Rules:**
- All sounds OFF by default — user must opt-in
- Volume control in settings
- Sounds respect device silent mode
- ECO mode: all sounds disabled
- Sound files: WebM/OGG format, max 50KB each

---

## 9. Classic Oz Theme (Toggle Alternative)

For users who prefer the classic Oz aesthetic:

```css
[data-theme="classic-oz"] {
  --oz-bg-primary: #2C1810;           /* Warm sepia brown */
  --oz-bg-secondary: #3D2B1F;         /* Rich earth */
  --oz-emerald-500: #2E8B57;          /* Forest green (not neon) */
  --oz-neon-amber: #DAA520;           /* Golden amber */
  --oz-text-primary: #F5F0E8;         /* Warm cream */
  
  --font-display: 'Playfair Display', serif;  /* Storybook headers */
  --font-graffiti: 'Caveat', cursive;          /* Handwritten accents */
  
  /* No neon glow effects */
  --oz-emerald-glow: transparent;
  --oz-glass-blur: 8px;               /* Softer blur */
}
```

- Classic theme uses **warm earth tones** instead of neon
- **Illustrated** characters instead of cyberpunk
- **Watercolor textures** instead of glass panels
- **Serif fonts** for a storybook feel
- Same layout and functionality — only visual treatment changes

---

## 10. Implementation Checklist

| Item | Technology | Priority | Status |
|------|-----------|----------|--------|
| CSS Custom Properties (design tokens) | CSS Variables | P0 | [ ] |
| Dark mode base styles | Tailwind + CSS | P0 | [ ] |
| Glass card component | React + CSS | P0 | [ ] |
| Neon button system | React + CSS | P0 | [ ] |
| Mode-specific color schemes | CSS data attributes | P0 | [ ] |
| Accessibility mode overrides | CSS + React context | P1 | [ ] |
| Lottie character animations | lottie-web | P1 | [ ] |
| Emerald City parallax background | CSS + Three.js (optional) | P1 | [ ] |
| Yellow Brick Road SVG path | SVG + GSAP | P1 | [ ] |
| Graffiti typography accents | Web fonts | P2 | [ ] |
| Sound design integration | Web Audio API | P2 | [ ] |
| Classic Oz theme toggle | CSS + React context | P2 | [ ] |
| Aurora sky effect | CSS animation | P3 | [ ] |
| 3D Emerald City (Three.js) | Three.js / R3F | P3 | [ ] |
