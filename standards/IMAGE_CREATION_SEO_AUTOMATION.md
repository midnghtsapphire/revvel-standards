# Standard: Image Creation, LSI, SEO & Release Automation

## Core Directives

1. **Automation First Stack:** All image creation, metadata tagging (LSI/SEO), and release banner production must operate exclusively via headless build processes and GitHub Actions.
2. **Zero Manual Hub Flow:** Manual studio UI is not the production control plane. Agents create the Work Request (WR) and Code. Humans merge only.
3. **Structured Storage:** Configurations and templates must be managed as multi-surface blueprints.

## Implementation Requirements

- **Builder**: Headless processing is driven by `scripts/image-seo-build-pack.mjs`.
- **Workflows**: Production updates are handled through defined workflows (`image-seo-pipeline`, `release-banner-social`, `image-seo-qa`).
- **Blueprints**: Configuration is declared via schemas in `workflows/blueprints/`.
- **Secrets**: Keys are registered in the Connections Registry sub-files.
