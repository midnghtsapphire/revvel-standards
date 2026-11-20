# HOME SERVER STANDARD — the always-on local fleet engine

**Status:** Active · **Author:** Audrey Evans (owner decision 2026-11-16) · **Drafted by:** Kimi audit agent
**Evidence base:** `docs/audits/GITHUB-AUDIT-2026-11-16.md` Appendix A (measured: gemma-3-4b
<0.5 tok/s CPU-only on the operator laptop — the local lane cannot carry the fleet on
current hardware).

> **Decision note (2026-11-16):** GitHub stays the repo-of-record (free, offsite backup).
> Compute moves local: self-hosted Actions runner, LM Studio/Ollama Layer-0 lanes, n8n-style
> always-on jobs. Consequence of not doing this: every always-on job stays hostage to the
> hosted-Actions billing lock (2026-11-06) and per-token cloud meters. Owner RULE #12
> (sandbox wipes lost thousands of hours) is the standing justification for owning hardware.

---

## 1. Budget build (~$1,300, payday ~end of month)

| Part | Pick | ~Cost | Why |
| --- | --- | --- | --- |
| GPU | Used RTX 3090 24GB | $550–650 | The whole point. 24GB VRAM runs 32B-class models quantized (~20–30 tok/s) and flies 8–14B (60–100+ tok/s). Fallback: new 4060 Ti 16GB (~$450) + put savings into 96GB RAM. |
| CPU | Ryzen 7700 | in bundle | Inference is GPU-bound; CPU just feeds it. |
| Motherboard | B650 (AM5) | in bundle | Upgrade path survives to ~2027+ CPUs. |
| RAM | 64GB DDR5 | in bundle ($400 for CPU+mobo+RAM) | Model juggling + databases + runner workspaces. |
| Storage 1 | 2TB NVMe | ~$110 | OS, models (~200–400GB), active workspaces. |
| Storage 2 | 4TB HDD | ~$120 | "The drive" — archives, backups staging, datasets. |
| PSU/case | 850W + airflow case | ~$120 | 3090 transient spikes demand honest wattage. |

**Buy order if cash is tight:** GPU first (used 3090s sell fast), storage second, the rest anytime.

## 2. Operating system & base software

1. **Windows 11 Pro** (owner's known environment; LM Studio setup docs in this repo are
   Windows-specific — `docs/LOCAL_LLM_SETUP.md`) with WSL2 for Linux tooling, **or** Ubuntu
   24.04 bare metal if the box is headless. Decide at build time; record the choice here.
2. **LM Studio 0.4.0+** (native `/api/v1` model management) + **Ollama** as second lane.
3. **Docker Desktop / Docker Engine** — for n8n, self-hosted runner container, Trivy/ClamAV.
4. **n8n** (Docker) — the always-on lane that replaces commented-out crons (pending WR 05).
5. **Git + Git Credential Manager** (ships with Git for Windows).

## 3. Machine & identity setup (GCM multi-identity)

The server gets its **own GitHub identity** — never the owner's personal login.

1. Create a dedicated GitHub account (e.g. a `*-home-server` bot account) **or** at minimum a
   fine-grained PAT named `home-server` scoped to only the repos the fleet needs
   (Contents: read/write, Issues/PRs: read/write — no admin, no delete).
2. On the server, pin the identity so GCM never confuses it with the owner's account:

   ```bash
   git config --global credential.https://github.com.username <bot-account-name>
   ```

3. Per-repo pinning when identities differ repo-to-repo:

   ```bash
   git remote set-url origin https://<bot-account-name>@github.com/midnghtsapphire/<repo>.git
   ```

4. Commit identity on the server is a label, not auth — set it to the bot name so the
   provenance ledger (`logs/agent-audit/`, LEDGER.md) records who pushed:

   ```bash
   git config --global user.name  "<bot-account-name>"
   git config --global user.email "<bot-id>+<bot-account-name>@users.noreply.github.com"
   ```

5. **Never store tokens in remote URLs or files.** GCM stores them encrypted; a token in
   `.git/config` survives in plain text and leaks into backups.

## 4. GitHub self-hosted runner

1. Repo or org level: Settings → Actions → Runners → New self-hosted runner.
2. Run as a Windows service / systemd unit, labels: `self-hosted, home, gpu`.
3. **Re-enable `probe-selfhosted.yml.disabled`** (rename to `.yml`) to verify reachability.
4. Security rule (non-negotiable): self-hosted runners only on **private** repos, or on
   public repos with "Require approval for all outside collaborators" ON — a public-repo
   self-hosted runner executes strangers' PR code on your hardware otherwise.
5. Existing precedent: `.github/workflows/wr-rewrite.yml` is already `runs-on: self-hosted`;
   `tests/local-llm-cascade.test.js` pins that. Do not "fix" it to `ubuntu-latest` — a green
   CI that bills is a red outcome.

## 5. Local LLM lanes (Layer 0 made real)

Lane order stays the repo standard: **LM Studio → Ollama → OpenRouter (gated)**.

| Lane | Model to load first | Role |
| --- | --- | --- |
| Default | `qwen/qwen3.5-9b` (already downloaded) | Grunt work: triage, labels, summaries, small diffs |
| Heavy | a 32B-class instruct (Q4) | Research synthesis, multi-file code — replaces most cloud calls |
| Embeddings | `nomic-embed-text` | Retrieval only — NEVER chat (known gotcha) |

- `python3 scripts/local_llm.py doctor` must exit 0 against the server before the fleet points at it.
- Set `LMSTUDIO_API_KEY` on the server if the LM Studio API is reachable from other machines;
  record the endpoint in `config/connections.yml` (status `verified` once `doctor` passes).
- The spend gate is unchanged: `REVVEL_LLM_ALLOW_CLOUD=1` exactly, or nothing bills.

## 6. Backup & durability

- The box is not the archive — GitHub is. Everything the box produces lands in a repo the
  same day (owner rule: nothing lives only on one disk).
- Archives/backups follow `AGENTS.md` Backups: `backup-YYYY-MM-DD-<folder>-<bot>` to the
  project repo or private `midnghtsapphire/box-backups`; >100MB as Release assets split <2GB;
  verify sha256 after upload.
- The 4TB HDD mirrors nothing automatically — schedule a nightly robocopy/restic job (n8n
  or Task Scheduler) from NVMe workspaces to HDD, and weekly from HDD to GitHub releases.

## 7. Acceptance gate (declare the server "live" only when all pass)

- [ ] `probe-selfhosted` workflow runs green on the box
- [ ] `scripts/local_llm.py doctor` exits 0 with qwen3.5-9b loaded
- [ ] A test WR flows issue → research → `wr:code` label (bridge) → coder run **with zero
      cloud spend** (receipt: workflow run URL + LM Studio logs)
- [ ] Nightly backup job receipt (file list + sha256) posted to `box-backups`
- [ ] `SYSTEM_STATE.md` updated: "Home server: ✅" with the date
