# WR: [WR] Find Playlist for Viking Experimentation Music, the metrics and confidence scale

**Issue:** #17944  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-24  
**Research Date:** 2026-08-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

The user requires a live desktop dashboard that aggregates metrics, confidence scales, and playlist data for "Viking Experimentation Music". The dashboard is intended to provide all necessary information to conceptualize and create a new brand, genre, or artistry band name. Additionally, the user requested that the dashboard feature a "viking chibi theme" for its visual design.

## Background & Motivation

Creating a new music brand or genre requires synthesizing significant amounts of qualitative and quantitative data. A dedicated, themed dashboard allows the user to explore metrics, track confidence scales on potential names or directions, and analyze existing playlists in the "Viking Experimentation" space. The "viking chibi theme" ensures the tool is engaging and aligns with the aesthetic preferences of the user.

## Scope

- **In Scope:**
  - A live desktop dashboard displaying metrics and a confidence scale for brand/genre creation.
  - Integration of a "viking chibi theme" across the UI components.
  - Data visualization for playlist analysis and creation metrics.
- **Out of Scope:**
  - Automated generation of the music itself.
  - Direct integration with third-party streaming platforms for music playback.

## Approach

The dashboard will be built as a modern web application optimized for desktop use, leveraging React and styled-components to implement the "viking chibi theme".
1. **Frontend:** Develop a React-based UI featuring chibi-style viking illustrations, custom typography, and a cohesive color palette (e.g., oceanic blues, wood browns, and metallic silver).
2. **Data Visualization:** Use charting libraries (such as Recharts or Chart.js) to display metrics and confidence scales regarding brand viability and playlist characteristics.
3. **Deployment:** Deploy the application via Vercel (or a similar hosting provider) to ensure it is live and accessible, fulfilling the "TESTABLE-LIVE" requirement.
Create a live HTML dashboard for Viking Experimentation Music, including metrics and a confidence scale. It will be served off the `oaudrey/freedomangelcorp` repository for fast implementation and rapid iteration. The dashboard is primarily for internal use but will be evaluated as a potential digital product for sale.

## Approach

Build a single-page HTML dashboard to display the playlist, metrics, and confidence scale. Deploy it directly via GitHub Pages on the `oaudrey/freedomangelcorp` repository to ensure fast delivery. The implementation will prioritize speed and immediate utility over long-term maintainability, acknowledging that the underlying technology will likely change.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows
- [ ] Dashboard UI successfully applies the "viking chibi theme"
- [ ] Metrics and confidence scale visualizations are implemented and functional

## Risks & Mitigations

- **Risk:** The "viking chibi theme" might distract from the data presentation if not balanced correctly.
  - **Mitigation:** Ensure high contrast and clear data visualization hierarchies, using the theme primarily for structural elements and decorative assets rather than obscuring data.
- **Risk:** Ambiguity in what specific metrics are most valuable for the confidence scale.
  - **Mitigation:** Implement a flexible, configurable metrics model that can be adjusted based on user feedback.
**Risk:** The technology might become obsolete quickly, requiring rewrites if it becomes a long-term product.
**Mitigation:** Keep the implementation as a simple, disposable live HTML dashboard. Do not over-engineer. Focus on finding product-market fit first.

## Competitor & Pricing Intelligence

Pricing data pending — competitive benchmark research required.

## Learnings — What & Why

The request highlights a unique intersection of data analytics and highly stylized personal tooling ("viking chibi theme"). Creating personalized data dashboards requires balancing aesthetic requests with functional data visualization. This WR establishes the foundation for building themed, single-purpose analysis tools that remain rigorously testable and deployable within the existing infrastructure.
The user wants to experiment with rapid deployment of live HTML dashboards for niche use cases (like Viking Experimentation Music) directly on their main repository (`oaudrey/freedomangelcorp`). This approach reduces time-to-market and operational overhead for testing product ideas, emphasizing speed and disposability over over-engineering.
