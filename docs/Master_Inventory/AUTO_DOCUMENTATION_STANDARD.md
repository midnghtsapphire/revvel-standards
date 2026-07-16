# Revvel Auto-Documentation Standard

**Version:** 1.0.0
**Date:** April 3, 2026
**Status:** Mandatory Policy

## 1. Introduction

This document establishes the mandatory auto-documentation standards for all Revvel and MIDNGHTSAPPHIRE repositories. The goal is to ensure that every change, deployment, and architectural decision is automatically logged and easily traceable without relying on manual updates by developers or AI agents.

## 2. Core Principles

Documentation in the Revvel ecosystem is treated as a first-class citizen, on par with the code itself. The primary directive is that **no change goes undocumented**. Every action taken on a repository, server, or configuration must leave an automated trail.

### 2.1. The Automation Mandate

To minimize human error and ensure consistency, all routine documentation updates must be integrated into the Continuous Integration and Continuous Deployment (CI/CD) pipelines. This includes changelogs, API documentation, and infrastructure maps.

## 3. Mandatory Repository Artifacts

Every repository within the organization must contain specific documentation artifacts to comply with this standard.

### 3.1. The CHANGELOG.md Requirement

A `CHANGELOG.md` file is strictly mandatory in the root directory of every single repository. This file serves as the historical record of the project's evolution.

1. **Format:** The file must adhere to the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and utilize Semantic Versioning.
2. **Automation:** The `CHANGELOG.md` must be automatically updated by a GitHub Action upon every push to the `main` branch.
3. **Content Requirements:** The automated logging process must capture and record the following information for every change:
    * **Timestamp:** The exact date and time the change was committed and merged.
    * **Description:** A clear summary of what was changed (derived from the commit message or PR title).
    * **Author:** The identity of the user, developer, or AI agent (e.g., Venice AI, Claude) that authored and pushed the change.

### 3.2. Automated API Documentation

For backend services and APIs, documentation must be generated directly from the source code.

1. **Generation Tools:** Tools like Swagger (OpenAPI) or TypeDoc must be integrated into the build process.
2. **Hosting:** The generated documentation must be automatically hosted and accessible (e.g., via GitHub Pages or a dedicated `/docs` route on the deployed application).
3. **Synchronization:** The API documentation must update simultaneously with the deployment of new code to ensure it always reflects the live environment.

## 4. Infrastructure and State Tracking

The state of the ecosystem extends beyond individual repositories. Changes to infrastructure and cross-project status must also be tracked automatically.

### 4.1. Single Source of Truth (SSOT) Updates

The `INFRASTRUCTURE_MAP.md` file located in the `revvel-standards` repository is the absolute SSOT for all infrastructure, domains, and server configurations. Any script or pipeline that provisions a new droplet, updates a DNS record, or changes a deployment port must automatically trigger an update to this central file.

### 4.2. Sprint State and Handoffs

While some elements of sprint tracking require manual input, the `SPRINT_STATE.md` file (or its equivalent in project-specific `/docs` folders) should automatically pull in metrics such as the number of commits, open issues, and recent deployments to provide an accurate, real-time snapshot of project health during agent handoffs.

## 5. Compliance and Enforcement

Failure to adhere to these auto-documentation standards will result in blocked deployments.

1. **CI/CD Gates:** GitHub Actions pipelines are configured to fail if a `CHANGELOG.md` is missing or if the automated update script fails to execute.
2. **Code Review:** AI reviewers (Venice AI, Claude) are instructed to reject pull requests that do not include the necessary configuration for auto-documentation or that attempt to bypass the automated logging systems.
