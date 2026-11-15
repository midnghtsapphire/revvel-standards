# Deployment receipts and pending apply

Recorded by Codex on 2026-11-10. These are deployment-attempt receipts, not live
site receipts. No payment, webhook, customer, revenue, or assessment success is
claimed.

## Verified local artifacts

The existing HULL SkillRouter extension was merged through
[oaudrey #13](https://github.com/midnghtsapphire/oaudrey/pull/13), merge
`c88f10b2275e927110c0aa02b8753c9ec916e84f`, targeting the existing runtime branch
`daily/2026-11-05`. It executed the actual product checks, affiliate build, and
three packaging commands. Its committed receipts contain output hashes, not raw
provider credentials or logs.

All three revenue products have successful production builds and exported
home/pricing/health pages. The GOAP sales export also serves its working
browser-side planner, ROI page, HTML deck, and twelve-slide PDF. The original
GOAP server API remains in source; the static artifact does not provide it.

The portable generated sources run with Node or Bun built-ins. They contain
only allowlisted public exports, not repository documents or environment files.
Frozen artifact SHA-256 values are in
`products/revenue-billing/RELEASE-RECEIPTS-2026-11-10.md`.

## Hosting evidence

- The documented shared-droplet SSH key was rejected. No command ran remotely.
- The existing Railway `lucky-light` project was inspected through its connected
  account. Its existing `revvel-standards` service was left intact.
- Direct function-create calls returned success but produced project service
  records without environment instances. Read-back and dashboard verification
  established that they were not deployed. Those inactive records remain
  preserved: `affiliate-hub`, `ai-video-toolkit`, `screen-recorder-finder`.
- The connector's staged path does retain complete artifact source. The pending
  production patch is `f7d1ef3b-8a4b-4a8e-8665-5375c86116e3`, environment
  `31cdc2f8-9117-4c03-b6e2-da244f9748b7`, project
  `fda5db73-50e3-4a67-8b53-4e723630af43`.

| Staged service | Service ID |
| --- | --- |
| goap-sales | 268f585c-3178-41b9-9858-7974ad53b6c9 |
| affiliate-hub-release | d186bd13-6ac6-4f9b-a40d-fac3c41eb7a7 |
| ai-video-toolkit-release | e82b931a-09d8-4e7e-a01e-076bf5522017 |
| screen-recorder-finder-release | 62de5c8a-dfc2-4105-ac3a-305593633951 |

Read-back shows twelve additive settings across these four new services, no
deletions or existing-service edits, and `destructive: false`.

Automatic approval review rejected `accept-deploy`, stating that the user had
not approved the action. No deployment commit was applied. It was not retried
through another interface. Public domains and HTTP production verification are
still pending.

## Strict independence distinction

The application artifacts and HULL executor require no GitHub account, runner,
Action, App, or repository webhook. They can run on the owner's own Node host.
Railway's optional managed-function carrier uses
`ghcr.io/railwayapp/function-bun:1.4.4`; therefore this hosting option is **not**
a claim of a fully GitHub-registry-independent bootstrap, nor an owned-image
digest/SBOM delivery. Strict METAL hosting still requires a working owned host
or an approved carrier. No subscription tier, billing setting, DNS, or access
policy was changed.

## Acceptance remains open

The original issues stay open where acceptance requires live URLs, DNS,
working payment links, Stripe/Lago transactions and webhooks, deployed alerts,
model-quality measurements, actual A2A/AG-UI integration, GPU experiments,
customer outcomes, or an assessment. The complete per-issue matrix is in
`wr/summaries/cross-repo-review-2026-11-10.md`.
