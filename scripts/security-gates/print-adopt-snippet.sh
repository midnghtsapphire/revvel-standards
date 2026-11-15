#!/usr/bin/env bash
# print-adopt-snippet.sh — print the CircleCI job to paste into another repo's
# .circleci/config.yml, pinned to the current main commit of revvel-standards.
# Needs network (git ls-remote). Override the pin with REVVEL_STANDARDS_SHA.
set -euo pipefail
sha="${REVVEL_STANDARDS_SHA:-$(git ls-remote https://github.com/midnghtsapphire/revvel-standards.git refs/heads/main | cut -f1)}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "could not resolve a commit to pin" >&2; exit 2; }
cat <<YAML
# --- paste under jobs: -------------------------------------------------------
  security-gates:
    docker:
      - image: cimg/node:22.11
    steps:
      - checkout
      - run:
          name: Security gates (revvel-standards ${sha:0:10})
          no_output_timeout: 20m
          command: curl -fsSL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/${sha}/scripts/security-gates/bootstrap.sh | REVVEL_STANDARDS_SHA=${sha} bash
# --- paste under a workflow's jobs: (PR branches only) -------------------------
      - security-gates:
          filters:
            branches:
              ignore: main
# ------------------------------------------------------------------------------
YAML
