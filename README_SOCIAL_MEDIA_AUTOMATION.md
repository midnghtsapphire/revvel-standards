# Social Media Automation Package

This package contains the necessary components to automate social media posts upon merging a pull request. It extracts metadata from the PR and sends it to a Zapier webhook, which can then distribute it to platforms like Buffer or Hootsuite.

## Contents

1. `.github/workflows/social-media-automation.yml`: The GitHub Action workflow.
2. `workflows/ZAPIER_AUTOMATION_BLUEPRINT.md`: The blueprint for setting up the Zapier automation.
3. `tests/social_post_formatter.test.sh`: A local test script to verify post formatting logic.

## Setup Instructions

### 1. GitHub Secrets

- Generate a Catch Hook URL from Zapier (as described in the Blueprint).
- Add this URL as a repository secret named `ZAPIER_WEBHOOK_URL` in your GitHub repository.

### 2. Zapier Configuration

- Follow the exact steps in `workflows/ZAPIER_AUTOMATION_BLUEPRINT.md` to configure the Catch Hook, Filters, and Buffer/Hootsuite integration.

### 3. Testing

- Run `./tests/social_post_formatter.test.sh` locally to ensure the text formatter is working as expected.
- Open a dummy PR, close it without merging, and ensure no action runs.
- Merge a test PR and check the GitHub Action logs. The payload should be correctly sent to Zapier.
- In Zapier, review the received hook data and confirm the fields are correctly populated.
