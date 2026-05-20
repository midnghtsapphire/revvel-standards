# Supported Runner Targets

Runners execute tasks on target platforms. If a target platform requires an account, API key, or credential that is not currently available, the runner **must not fail vaguely**. Instead, it must generate a **procurement BOM** detailing the exact item needed and where to store the credential.

## Core Runner Targets

*   **GitHub**: Repository management, branch creation, PRs, workflows (direct integration).
*   **Vercel**: App preview and production deployments.
*   **Supabase**: Database migrations, auth config, storage buckets, edge functions.
*   **Zapier**: Automation bridge, workflow deployment.
*   **Make**: Automation workflows.
*   **n8n**: Open-source automation node workflows.
*   **Gumloop**: Visual automation pipelines.
*   **CLI Tools**: Local or containerized execution.
*   **Browser Automation**: Web scraping or headless interactions.

## Rule: Missing Access & Procurement BOMs
If the runner cannot connect to `n8n`, `Make`, `Gumloop`, `Zapier`, or any API endpoint due to missing configuration, it halts execution on that step and outputs a procurement BOM, explicitly listing what must be connected or purchased.
