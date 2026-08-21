# Local LLM setup (Layer 0)

`wr/agents/HIERARCHY.md` puts local LLMs at Layer 0 and targets 60–70% of work
there. This page is how to make that true on a Windows laptop.

The short version: **LM Studio runs on your machine, so work that runs on your
machine is free. Work that runs on a GitHub runner cannot reach it.** Everything
below follows from that one fact.

## What runs where

| Where the work runs | Can it reach LM Studio? | What it costs |
| --- | --- | --- |
| Your laptop (terminal, Claude Code, any script) | Yes | Nothing |
| A self-hosted runner on your laptop | Yes | Nothing |
| `ubuntu-latest` (GitHub-hosted) | **No** | OpenRouter credits |

GitHub-hosted runners are virtual machines in Azure. `127.0.0.1` means *their*
loopback, not yours. This is why `.github/workflows/wr-rewrite.yml` — the only
workflow wired to Layer 0 — is `runs-on: self-hosted`, and why its four
recorded runs all failed in ~23 seconds: there was no self-hosted runner to
pick them up.

So: run LLM work locally, and keep CI out of the LLM business.

## 1. Start the LM Studio server

In LM Studio:

1. Load a model (left sidebar → the model you downloaded).
2. Go to the **Developer** tab (the `>_` icon).
3. Toggle **Status: Running**. The default is `http://127.0.0.1:1234`.

The API base URL this repo expects is that address plus `/v1`:

```text
http://127.0.0.1:1234/v1
```

Leave **Serve on Local Network** OFF unless you specifically need another
machine to reach it. On by default is a model server exposed to whatever
network the laptop is on, including coffee-shop Wi-Fi.

## 2. Stop Windows putting the laptop to sleep

Sleep is what makes Layer 0 unreliable — a sleeping laptop is an unreachable
endpoint, and the whole point of the cascade is that it does not silently
become a bill when that happens.

**Settings → System → Power & battery → Screen, sleep, & hibernate timeouts**

Set, for **Plugged in**:

- *Make my device sleep after* → **Never**
- *Make my screen turn off after* → whatever you like; the screen is not the
  server, so turning it off is fine and saves the panel.

Leave the **On battery** timeouts alone. You do not want a model server holding
the CPU awake in a bag.

Two extra settings that catch people out on Lenovo machines:

- **Settings → System → Power & battery → Power mode** → set to *Balanced* or
  *Best performance* while serving. *Best power efficiency* will throttle
  inference badly.
- **Lenovo Vantage → Power** (if installed) has its own sleep and battery
  settings that override Windows. Check there too, and disable any
  "Sleep after inactivity" option it adds.

If you would rather not change the global setting, keep sleep on and suppress
it only while you are working, from PowerShell:

```powershell
powercfg /requestsoverride PROCESS "LM Studio.exe" DISPLAY SYSTEM
```

Undo it with:

```powershell
powercfg /requestsoverride PROCESS "LM Studio.exe"
```

Closing the lid still sleeps the machine unless you change *Choose what closing
the lid does* → **Do nothing** (Control Panel → Power Options → Choose what
closing the lid does). Only do that plugged in — a laptop running inference
with the lid shut needs airflow.

## 3. Check it from this repo

```bash
python3 scripts/local_llm.py doctor
```

You want to see:

```text
[OK  ] lane-0-lmstudio
       endpoint: http://127.0.0.1:1234/v1
       1 model(s) loaded
         - <your model id>

Ready: work will run on lane-0-lmstudio at no cost.
```

`doctor` exits non-zero when nothing can serve a request, so it is safe to put
in front of a batch job.

Then try one prompt:

```bash
python3 scripts/local_llm.py ask "Summarise what this repo is for, in two lines."
```

It prints the lane it used on stderr, so you can always tell whether a result
was free:

```text
[lane-0-lmstudio · your-model · free (local)]
```

## 4. The spend gate

`scripts/local_llm.py` tries LM Studio, then Ollama, then OpenRouter — but
**the OpenRouter step is refused unless you explicitly allow it**:

```bash
REVVEL_LLM_ALLOW_CLOUD=1 python3 scripts/local_llm.py ask "..."
```

Without that variable, a sleeping laptop produces a loud error naming the gate,
not a silent charge. That is deliberate: the alternative — a cascade that ends
at a paid API by default — is exactly how ~270 scheduled OpenRouter calls a day
went unnoticed (#17849).

The gate must be the exact string `1`. `true`, `yes`, and `TRUE` do not open it,
so a half-remembered value fails closed.

## 4a. The same gate, in JavaScript

`scripts/local_llm.py` is the Python half. `scripts/llm-spend-gate.js` is the
JavaScript half, and it reads the same variable — one name, one decision, both
languages:

```js
const { assertCloudAllowed } = require('./llm-spend-gate');
assertCloudAllowed('my-script');   // throws CloudSpendBlockedError
```

or, to skip rather than fail:

```js
const { cloudAllowed } = require('./llm-spend-gate');
if (!cloudAllowed()) return skipGracefully();
```

Every script in the repo that POSTs to a paid provider calls it, and
`tests/llm-spend-gate-coverage.test.js` discovers call sites rather than
trusting a list, so a new one fails the build until it is gated.

Workflows are gated too, through a **repository variable** rather than fifteen
separate edits:

**Settings → Secrets and variables → Actions → Variables → `REVVEL_LLM_ALLOW_CLOUD`**

Set it to `1` to allow paid calls; leave it unset (the default) and every
billing step skips. Ten workflows check it:

| Workflow | How it is gated |
| --- | --- |
| `openrouter-agent`, `xai-review-oleg-fork`, `swe-agent`, `free-llm-router`, `brain-dump-intake`, `ship-quality` | step-level `if:` — the whole step exists to call the model |
| `openhands-resolver` | job-level `if:` — the LLM config is job-wide |
| `priority-router`, `pdf-work-request-router`, `wr-auto-classify` | guarded **inside** the script — these steps also route, comment and label, and that work is free and must keep running |

Five more workflows reach `openrouter.ai` but **cannot** spend, so they are
deliberately *not* gated: `agent-monitor`, `api-monitor`, `openrouter-key-reset`,
`openrouter-instantiation-check` and `lane-canary` all hit `GET /api/v1/models`
or probe reachability. Only `/chat/completions` bills. Gating them would break
exactly the monitoring you want when spend is the problem — and
`tests/llm-spend-gate-coverage.test.js` fails if one of them ever starts posting
a completion.

## 5. Using it from your own scripts

```python
import sys
sys.path.insert(0, "scripts")
import local_llm

result = local_llm.complete("Rewrite this paragraph...")
print(result.lane)      # lane-0-lmstudio
print(result.is_local)  # True  -> this cost nothing
print(result.text)
```

`complete(..., allow_cloud=False)` forbids the paid lane for that call even if
the environment allows it. A caller can narrow the gate; it can never widen it.

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `LMSTUDIO_ENDPOINT` | `http://127.0.0.1:1234/v1` | LM Studio's Developer tab shows the port |
| `LMSTUDIO_MODEL` | whichever model is loaded | Usually leave unset |
| `OLLAMA_ENDPOINT` | `http://127.0.0.1:11434` | Optional second local lane |
| `OLLAMA_MODEL` | `gemma3` | |
| `OPENROUTER_API_KEY` | — | Only used when the gate is open |
| `OPENROUTER_MODEL` | `moonshotai/kimi-k2` | |
| `REVVEL_LLM_ALLOW_CLOUD` | unset (= local only) | Must be exactly `1` |
| `REVVEL_LLM_TIMEOUT` | `180` | Seconds per request |

## Troubleshooting

**`doctor` says DOWN but LM Studio is clearly running.**
Check the Developer tab actually says *Running* — loading a model is not the
same as starting the server. Then confirm the port matches; LM Studio picks a
different one if 1234 is taken.

**It worked at your desk and stopped on the office network.**
`urllib` honours `http_proxy` / `https_proxy` for every request, including ones
to `127.0.0.1`, so a corporate proxy or VPN can swallow the call to your own
machine. `local_llm.py` bypasses proxies for loopback addresses specifically to
avoid this, so if you hit it from other tooling, that is the cause.

**Local answers are slow.**
Check Power mode is not *Best power efficiency*, and prefer a smaller quantised
model. Layer 0 is for volume, not for the hardest reasoning — that is what
Layer 1 escalation is for.

**A workflow needs an LLM.**
It almost certainly should not. GitHub-hosted runners cannot reach Layer 0, so
every LLM call in CI is a billed call. Either move the work local, or open the
gate deliberately in that one workflow with a comment saying why —
`.github/workflows/wr-rewrite.yml` is the worked example.
