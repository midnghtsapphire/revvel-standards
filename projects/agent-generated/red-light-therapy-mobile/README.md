# Red Light Therapy Mobile Planner

Issue-linked deliverable for [midnghtsapphire/revvel-standards#15204](https://github.com/midnghtsapphire/revvel-standards/issues/15204).

## What This Ships

- Mobile-first browser tool for planning low-power red-light sessions.
- Dose-to-time calculator (J/cm2 and mW/cm2).
- Weekly schedule generator.
- Safety guardrail warning when single-session dose exceeds 12 J/cm2.

## Location

- App UI: `build/app/index.html`
- Calculator logic: `build/app/calculator.js`
- Browser controller: `build/app/app.js`

## Run Locally

Open `build/app/index.html` in any modern mobile or desktop browser.

## Source Reference

Concept prompt references: [Smartphone-Driven Low-Power Light-Emitting Device (PMC5406741)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5406741/).

## Safety

This tool is for general wellness and informational purposes only. It is not a medical device and does not diagnose, treat, cure, or prevent any condition.
