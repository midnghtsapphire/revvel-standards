# grok — research source

Raw material that originated from **Grok sessions (xAI)**. Drop transcripts, exports,
generated drafts, screenshots, and data here — one subfolder per project or
topic.

## Conventions

- Treat everything here as **unverified** until checked against a primary
  source. It is input, not a standard.
- When you compile across sources into a real project, do the compilation in
  `docs/research-drafts/<topic>/` and cite these files in that topic's
  `sources.md`.
- No secrets or credentials. Nothing load-bearing — promote finished work to its
  real home (a `docs/*_STANDARD.md`, a product under `products/`, or a
  workflow) and leave a pointer behind.

## Grok API demo and specialist — added 2026-11-12

The owner-requested, tested API starter kit is in the private repository [midnghtsapphire/grok-api-demo](https://github.com/midnghtsapphire/grok-api-demo). It contains runnable source, setup instructions, the capabilities brief, offline tests and sanitized live-test evidence. This source archive remains unverified research material; the demo repository records the actual tested/untested boundary separately.

The new [Grok API Navigator profile](../agents/grokapi/PROFILE.md) documents detailed responsibilities, trigger words, failure diagnosis and handoff requirements. Invoke it with `/persona grokapi <task>` through the existing Revvel persona system after the draft registration PR is reviewed and merged. This addition does not enable scheduled API tests or media-generation jobs.
