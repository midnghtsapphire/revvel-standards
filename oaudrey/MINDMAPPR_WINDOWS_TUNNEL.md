# Run MindMappr through the oaudrey Windows tunnel

**Start here if the tunnel already shows Healthy.** Go to step 2. A healthy tunnel means the Windows connector can reach Cloudflare. To verify the entire setup, open MindMappr from outside the host, sign in, and get a reply from the local model.

This procedure uses one Windows computer. Once configured, Cloudflare forwards requests for `oaudrey.com` to MindMappr on port `3005`. MindMappr sends model requests to LM Studio on port `1234`. Keep the host awake while serving the app.

**Installation record, November 10, 2026.** The operator reported the tunnel as Healthy, and the Windows service showed Running. During the documentation check, neither port 3005 nor 1234 showed a listener. The 19 passing app checks used a temporary test server. Steps 2 through 4 verify the live deployment.

## Why we picked Windows and what GitHub can run

The goal is to sign in to the MindMappr command center from another device while its database and AI model stay on the Windows PC. On the PC itself, open `http://127.0.0.1:3005/mindmappr`. That local visit works without a tunnel. For remote visits, a browser connects to the chosen HTTPS hostname, Cloudflare Access checks the visitor's identity, and the tunnel carries the request to MindMappr. MindMappr can then call LM Studio privately on the PC. The PC must be awake and online for remote visits.

There were three **places to run the server**. Pick one for each deployment.

| Host | When to choose it | What you take on |
| --- | --- | --- |
| Windows PC, directly (chosen) | LM Studio is already on Windows and the backup is here. Node 22 ran the repaired app and all 19 startup checks passed. This uses existing hardware without provisioning a cloud server. | Keep Windows awake, start MindMappr after a restart and start LM Studio when AI is needed. The tunnel service starts separately. |
| Metal, the VirtualBox VM on the same PC | Choose this for a separate Linux environment or to reuse Linux deployment scripts. | Both Windows and the VM must be running. Inside the VM, `localhost` means the VM. A model server on Windows needs a separately configured private connection. |
| A remote VM or application host | Choose this when the site must stay available while the PC is asleep. The backup mentions an Oracle VM. Another hosting configuration in this repo uses DigitalOcean for the static hub. | Provision compute and persistent storage, maintain backups, and check provider charges. AI also needs an available backend independent of the PC if it must work around the clock. |

**Docker is a packaging choice.** It can run MindMappr on any of these hosts. The backup includes a Dockerfile. We used native Node because the Windows Docker engine was unavailable and native startup worked. Cloudflare's Windows, Debian, and Docker buttons choose how to install the **connector** on the selected host. One connector installation is enough for this setup.

**GitHub handles source, review and automation.** Keep the app source in the MindMappr repo and the operating guide in REVVEL Standards. The app backup includes a GitHub Actions workflow that starts a temporary copy and runs `npm test` on pushes and pull requests. Actions can also build a Docker image or deploy to a chosen host if configured. A GitHub-hosted runner shuts down after its job. A self-hosted runner executes jobs on the machine where you installed it. GitHub Pages can serve a static landing page or documentation. MindMappr's Node server, writable SQLite database and model service still need a running host. [GitHub Actions runners](https://docs.github.com/en/actions/how-tos/manage-runners/github-hosted-runners/use-github-hosted-runners) · [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

**Choose who owns the hostname.** The existing [hub deployment](./.do/app.yaml) and [DNS inventory](./dns-records.yml) assign the root domain and `www` to the static hub. The requested tunnel setup uses the root for MindMappr. Pointing the root at MindMappr changes what visitors see there. To keep the hub on the root, use a dedicated hostname such as `mindmappr.oaudrey.com` for both the Access policy and the tunnel route. Treat that hostname as an alternative until the owner chooses it.

## 1. Install the connector on a new host

1. Sign in to GoDaddy, open **Domain Portfolio → oaudrey.com → DNS → Forwarding**, and check both **Domain** and **Subdomains**. **Not set up** means this step is complete. If the old website redirect is still present, record its destination and remove that redirect. Email forwarding is a separate setting.
2. Sign in to Cloudflare and confirm **Domains → oaudrey.com** shows **Active**. Open **Networking → Tunnels**. If the account prompts for Zero Trust onboarding, select the intended plan and review any billing or overage terms before activating it.
3. Select the existing **oaudrey** tunnel and open its connector installation instructions. Only choose **Create Tunnel** and enter `oaudrey` when there is no tunnel with that name.
4. Under **Setup Environment**, select **Windows** and your computer's architecture. On an x64 PC, download and run the linked Windows x64 installer. Open the Start menu, search for **Command Prompt**, and select **Run as administrator**.
5. Copy the service install command directly from the tunnel's **Install and Run** panel, paste it into that administrator window, and press Enter. It starts with `cloudflared.exe service install` and contains a private token. Close the window and clear the clipboard afterward. Keep the command out of Git, tickets, screenshots, and chat.
6. Return to the dashboard. Once the connector is detected, choose **Continue** if prompted. Verify that **oaudrey** shows **Healthy**. [Cloudflare tunnel setup](https://developers.cloudflare.com/tunnel/get-started/)

## 2. Check the Windows host

1. In PowerShell on the connector computer, run `Get-Service cloudflared`. The expected status is `Running`. If it is stopped, open PowerShell as administrator and run `Start-Service cloudflared`, then recheck the dashboard.
2. Open **LM Studio → Developer**. Load the intended model, start the local server, and copy the model identifier. Use the loopback address shown there. For the default port, the OpenAI-compatible base URL is `http://127.0.0.1:1234/v1`. Keep **Serve on Local Network** off for this same-host setup. [LM Studio local server](https://lmstudio.ai/docs/developer/core/server)
3. In the repaired MindMappr folder containing `server.mjs` and `package.json`, select Node.js 22 for the Windows build tested with this app. Run `node --version`, then `npm.cmd ci` on a fresh checkout. If restoring data, follow the backup's `RESTORE.md` before the first production start and keep the original database backup.
4. For a build that supports `LLM_BASE_URL`, create a local `.env` file using the following settings. Replace the model and password placeholders. Supply `LLM_API_KEY` only if the local model server requires authentication. Treat this file as private. The original backup hardcoded OpenRouter, so use the repaired build when connecting LM Studio.

   ```dotenv
   PORT=3005
   LLM_BASE_URL=http://127.0.0.1:1234/v1
   LLM_MODEL=YOUR_LOADED_MODEL_ID
   APP_PASSWORD=YOUR_UNIQUE_MINDMAPPR_PASSWORD
   ```

5. Start the app with `node --env-file=.env server.mjs` and leave it running. On the same computer, open `http://127.0.0.1:3005/mindmappr`, sign in, and send a short test message. Verify a reply and a matching request in LM Studio's server log. Finish this check before changing public DNS.

LM Studio also offers native endpoints such as `GET /api/v1/models` and `POST /api/v1/chat`. This MindMappr build uses the OpenAI-compatible endpoints. In PowerShell, run `(Invoke-RestMethod http://127.0.0.1:1234/v1/models).data.id` and copy the exact ID. On the Windows host, the server listed both `google/gemma-3-4b` and `google/gemma-3-4b:2`. Use `LLM_MODEL=google/gemma-3-4b:2` for the selected instance.

## 3. Protect the hostname and add the route

1. Review [the oaudrey DNS manifest](./dns-records.yml). It assigns the root domain and `www` to the static hub using `APP_TARGET`. Agree which app should own each hostname and reconcile the manifest before changing live DNS. In Cloudflare **DNS → Records**, check the current records for the root domain and any `www` hostname you intend to use. Record their type, target, TTL and proxy setting so you can restore them. Confirm an existing destination can be replaced before making the cutover.
2. Open **Zero Trust → Access controls → Applications**. Create or open a self-hosted application for `oaudrey.com`. Add the public hostname with the path blank so Access covers the entire site, including the API. If publishing `www.oaudrey.com`, add it to Access too.
3. Attach an **Allow** policy for the intended operator's exact email, choose the configured identity provider or email one-time PIN, and save the application. Verify every hostname you will publish is listed. [Cloudflare Access setup](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
4. Go to **Networking → Tunnels → oaudrey → Routes → Add route → Published application**. Older dashboards call this **Public Hostnames**. Choose domain `oaudrey.com`, leave **Subdomain** blank for the root domain, and leave **Path** blank. The hostname preview should read exactly `oaudrey.com`.
5. Enter service URL `http://127.0.0.1:3005`. If the form splits the fields, choose **HTTP** and enter `127.0.0.1:3005`. Save the route. If Cloudflare reports a DNS conflict, compare the exact hostname with the records you recorded in step 1 before replacing it. The tunnel route targets the app port only.
6. If needed, repeat for subdomain `www` using the same origin. In Cloudflare DNS, verify each published hostname has a proxied tunnel record whose target ends in `.cfargotunnel.com`. [Cloudflare route instructions](https://developers.cloudflare.com/tunnel/get-started/)

## 4. Verify from a visitor's browser

1. Open a private window, ideally on a phone using cellular data. Visit `https://oaudrey.com/mindmappr`. A fresh session should prompt for Cloudflare Access before MindMappr loads.
2. Sign in with the allowed identity, then sign in to MindMappr. Send a short message and check that LM Studio handles it. Repeat for `www` if configured. Verify an unsigned or unapproved visitor cannot reach the command center.
3. After a host restart, repeat the Windows service, local app, model and external login checks. The connector runs as a Windows service. An app started from a terminal needs its own startup arrangement or must be started again.

## Troubleshooting and rollback

| What you see | What to do |
| --- | --- |
| Tunnel is Down, Inactive, or the visitor sees error 1033 | Check host power, internet, and `Get-Service cloudflared`. Start the service if stopped. Check outbound connectivity to Cloudflare on port 7844. |
| Tunnel is Healthy but the visitor sees 502 | Open the exact origin URL on the connector computer. Start MindMappr if it is down. Check the route uses HTTP and port 3005. |
| Cloudflare Access denies the intended operator | Check the hostname, attached Allow policy, sign-in address, and identity provider. |
| The app opens but agents cannot reply | Match the loaded model identifier and server port to the local environment file. Restart MindMappr after changing that file and retry a message. |
| The old site appears or the route conflicts | Check authoritative Cloudflare DNS for the exact hostname and inspect any redirect rules. Verify the saved tunnel destination. |
| The cutover must be reversed | Remove the affected published route, check for a leftover tunnel DNS record, and restore the prior DNS settings you recorded. Keep Access in place until routing and the intended audience have been verified. |

For connector or origin errors, see [Cloudflare Tunnel troubleshooting](https://developers.cloudflare.com/tunnel/troubleshooting/).
