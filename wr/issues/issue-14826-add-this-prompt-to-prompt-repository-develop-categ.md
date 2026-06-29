# WR: [WR] add this prompt to prompt repository develop categories and organize

**Issue:** #14826  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-06-29  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

**WR Status:** 🟡 In Progress  

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

None

### Delivery Mode

None

### Lifecycle Mode

None

### Commercial Mode

None

### Summary

_No response_

### Objective

Role & Core Objective

You are an expert Frontend Engineer and Creative Technologist specializing in interactive WebGL, Three.js, and canvas-based generative animations. Your objective is to build a high-performance web application that extracts network paths from a specific reference image, "veins-hero-live.jpg", and constrains a fluid particle simulation ("eurorhyricites") strictly within those extracted pathways.

The application must support BOTH a 2D HTML5 Canvas implementation and a 3D Three.js WebGL implementation, switchable via a user interface toggle. Particles must flow dynamically through the network channels rather than spawning randomly across the screen.

Technical Architecture & Stack

Framework: React (Vite)

Styling: Tailwind CSS

Animation Engines:

1. HTML5 Canvas API (2D Context) for lightweight, ultra-fast 2D rendering.


2. Three.js (WebGL) utilizing Points, BufferGeometry, or custom shader materials for a 3D depth-mapped network.



Vector Utilities: Bezier curve computation, mathematical graph networks (nodes/edges), pixel-threshold processing.


Key Features & Implementation Mechanics

1. Dual-Engine Particle Architecture

Implement a unified state manager or toggle to cleanly switch between the two rendering pipelines:

2D Canvas Mode: Focuses on crisp, 2D vector path tracking, utilizing alpha trails (ctx.fillStyle = 'rgba(0,0,0,0.1)') to create smooth motion blur along the pathways of "veins-hero-live.jpg".

3D WebGL Mode: Maps the 2D network paths into a 3D space by introducing procedural Z-depth coordinates (creating a dimensional, organic root structure). Utilize glowing particle shaders or additive blending (Three.AdditiveBlending) to make the particles look self-illuminated.


2. Network Path Mapping & Steering Constraints

Create a logical mathematical graph model (nodes and branching edges) that mirrors the exact layout topology of "veins-hero-live.jpg", radiating from a central brain/gear hub out to branching root systems.

Constraint Rule: Particles must be rigidly bound to these mapped lines. Implement path-following steering behaviors (e.g., Craig Reynolds' steering algorithms) that pull particles back onto the center of the vector paths if they drift.

Flow Direction: All particles must actively cycle or pump from the central core outward into the branching terminals, cycling back to the core upon expiration.


3. UI Controls & Visual Aesthetic

Wrap the application in a sleek, premium developer dashboard using a Glassmorphism visual style:

High-gloss aesthetics, frosted glass backgrounds (backdrop-blur), and crisp, semi-transparent subtle borders.

Deep charcoal or dark neon-green tinted backdrops matching the visual theme of "veins-hero-live.jpg".


Provide interactive controls:

Engine Switch: Toggle between [2D Canvas] and [3D WebGL].

Simulation Tuning: Sliders for Particle Speed, Flow Density, Particle Size, and Z-Depth Intensity (for 3D mode).

Map Visibility: A toggle to fade the underlying template image ("veins-hero-live.jpg") in and out behind the live simulation.



Code Generation Guidelines

Deliver clean, modular TypeScript. Keep the particle physics engines mathematically pure and isolated from the React UI rendering lifecycles.

Optimize loops using requestAnimationFrame, targeting a locked 60 FPS. For 3D WebGL, reuse geometries and materials efficiently to avoid memory leaks during engine toggles.

Write explicit coordinate generation code that builds a beautiful, branching network map matching the structure of "veins-hero-live.jpg" natively without requiring external spatial asset files.

### Required Bundle

_No response_

### Definition of Done

_No response_

### Do Not Under-Scope

_No response_

### Explicit Exclusions

_No response_

### Delivery Shape

None

### Expected Scope

_No response_

### Validation Expectations

_No response_

### Blocker Rule

_No response_

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis
- [ ] Domain strategy
- [ ] Monetization

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

N/A — pending Jules refinement

## Step 3 — Requirements

N/A — pending Jules refinement

## Recommendations

N/A — pending Jules refinement

## Risks

N/A — pending Jules refinement
