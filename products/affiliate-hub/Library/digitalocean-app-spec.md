# DigitalOcean App Spec

- **Source:** DigitalOcean, App Platform app spec reference
- **URL:** <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- **Retrieved:** 2026-11-11
- **Used for:** `products/affiliate-hub/.do/app.yaml`
- **Fields taken from that page:** app `alerts` rules `DEPLOYMENT_FAILED` and `DOMAIN_FAILED`; component alerts `CPU_UTILIZATION`, `MEM_UTILIZATION`, `RESTART_COUNT` with operator `GREATER_THAN` and window `FIVE_MINUTES`; `health_check.http_path`; `domains[].domain` and `type: PRIMARY`; `envs[].type: SECRET` with the value left out of git; `instance_size_slug: apps-s-1vcpu-1gb` (the slug in the official example on that page); `dockerfile_path` relative to the repo root; `source_dir` as the Docker build context.
