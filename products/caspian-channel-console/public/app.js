/* global CaspianEngine */
(function () {
  "use strict";

  const E = window.CaspianEngine;
  if (!E) {
    document.body.innerHTML = "<p style='padding:2rem;font-family:sans-serif'>Failed to load caspian-engine.js</p>";
    return;
  }

  const state = {
    selected: new Set(["email", "slack", "telegram"]),
    inbound: [],
    lastBlueprint: null,
  };

  const $ = (id) => document.getElementById(id);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      document.querySelectorAll(".panel").forEach((p) => {
        p.classList.toggle("active", p.id === `panel-${tab.dataset.tab}`);
      });
    });
  });

  // ── Planner ───────────────────────────────────────────────────────────────
  function renderChannels() {
    const grid = $("channel-grid");
    grid.innerHTML = "";
    E.listChannels().forEach((ch) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "channel-chip" + (state.selected.has(ch.id) ? " selected" : "");
      btn.innerHTML = `<span class="name">${escapeHtml(ch.icon)} ${escapeHtml(ch.name)}</span><span class="meta">${escapeHtml(ch.costTier)}${ch.liveOnGateway ? " · live" : " · check"}</span>`;
      btn.addEventListener("click", () => {
        if (state.selected.has(ch.id)) state.selected.delete(ch.id);
        else state.selected.add(ch.id);
        renderChannels();
        refreshSimChannelSelect();
        // live-update soft preview without requiring rebuild
        tryPreview();
      });
      grid.appendChild(btn);
    });
  }

  function fillPlans() {
    const sel = $("plan");
    sel.innerHTML = E.listPricingTiers()
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — $${p.priceUsd}/${escapeHtml(p.period)}</option>`)
      .join("");
    sel.value = "pro";
  }

  function fillUseCases() {
    const row = $("usecase-row");
    const cases = ["support", "sales", "community", "personal", "devops", "social"];
    cases.forEach((uc) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = uc;
      b.addEventListener("click", () => {
        const recs = E.recommendChannels(uc);
        state.selected = new Set(recs.map((c) => c.id));
        renderChannels();
        refreshSimChannelSelect();
        buildBlueprint();
        toast(`Applied ${uc} preset`);
      });
      row.appendChild(b);
    });
  }

  function selectedIds() {
    return Array.from(state.selected);
  }

  function inputBundle() {
    return {
      agentName: $("agent-name").value,
      persona: $("persona").value,
      language: $("language").value,
      channels: selectedIds(),
      messagesPerMonth: Number($("messages").value),
      planId: $("plan").value,
      seats: 1,
    };
  }

  function tryPreview() {
    try {
      if (selectedIds().length === 0) return;
      renderSummary(E.buildBlueprint(inputBundle()), E.estimateCost(inputBundle()));
      $("behavior-preview").textContent = E.buildBehaviorPrompt(selectedIds());
    } catch {
      /* incomplete form — ignore soft preview errors */
    }
  }

  function buildBlueprint() {
    try {
      const input = inputBundle();
      const bp = E.buildBlueprint(input);
      const cost = E.estimateCost(input);
      state.lastBlueprint = { bp, cost, input };
      renderSummary(bp, cost);
      $("behavior-preview").textContent = E.buildBehaviorPrompt(bp.channelIds);
      $("code-preview").textContent = E.generateIntegrationCode(input);
      refreshSimChannelSelect();
      toast("Blueprint ready");
    } catch (err) {
      toast(String(err.message || err), true);
    }
  }

  function renderSummary(bp, cost) {
    $("summary-stats").innerHTML = [
      ["Channels", bp.stats.channelCount],
      ["Live GW", bp.stats.liveOnGatewayCount],
      ["Paid tier", bp.stats.paidCount],
      ["Caps", bp.stats.capabilityCount],
      ["Plan", `$${cost.planUsd}`],
      ["Total / mo", `$${cost.totalUsd}`],
    ]
      .map(
        ([k, v]) =>
          `<div class="stat"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(String(v))}</div></div>`
      )
      .join("");

    $("email-line").textContent = bp.emailAddress
      ? `Hosted agent email: ${bp.emailAddress}`
      : "Email channel not selected — add Email for a hosted inbox address.";

    $("cost-box").innerHTML = `
      <p><strong>$${cost.totalUsd}</strong> USD / month planning total</p>
      <p class="muted">Console plan ${cost.plan.name}: $${cost.planUsd} · Channel transport est. $${cost.channelTotalUsd} · Overage $${cost.overageUsd}</p>
      <div class="table-wrap" style="margin-top:8px"><table>
        <thead><tr><th>Channel</th><th>Base</th><th>Variable</th><th>Total</th></tr></thead>
        <tbody>
          ${cost.perChannel
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.name)}</td><td>$${r.baseUsd}</td><td>$${r.variableUsd}</td><td>$${r.totalUsd}</td></tr>`
            )
            .join("")}
        </tbody>
      </table></div>
      <ul class="small muted" style="margin-top:8px">
        ${cost.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}
      </ul>`;

    $("warnings-list").innerHTML =
      bp.warnings.length === 0
        ? "<li class='muted'>No warnings for this mix.</li>"
        : bp.warnings.map((w) => `<li class="warn">${escapeHtml(w)}</li>`).join("");
  }

  $("btn-build").addEventListener("click", buildBlueprint);
  $("btn-clear-channels").addEventListener("click", () => {
    state.selected.clear();
    renderChannels();
    refreshSimChannelSelect();
  });
  ["agent-name", "persona", "language", "messages", "plan"].forEach((id) => {
    $(id).addEventListener("change", tryPreview);
    $(id).addEventListener("input", tryPreview);
  });

  // ── Simulator ─────────────────────────────────────────────────────────────
  function refreshSimChannelSelect() {
    const sel = $("sim-channel");
    const ids = selectedIds();
    sel.innerHTML = ids
      .map((id) => {
        const ch = E.getChannel(id);
        return `<option value="${ch.id}">${ch.icon} ${ch.name}</option>`;
      })
      .join("");
  }

  function renderTranscript() {
    const box = $("sim-transcript");
    if (state.inbound.length === 0) {
      box.innerHTML = "<p class='muted'>No events yet.</p>";
      return;
    }
    try {
      const result = E.simulateConversation({
        agentName: $("agent-name").value,
        persona: $("persona").value,
        channels: selectedIds(),
        inbound: state.inbound,
      });
      box.innerHTML = result.events
        .map((ev) => {
          const cls = ev.direction === "inbound" ? "in" : "out";
          return `<div class="event ${cls}">
            <div class="meta">${ev.direction.toUpperCase()} · ${escapeHtml(ev.channelName)} · ${escapeHtml(ev.conversationId)} · ${escapeHtml(ev.sender)}</div>
            <div class="body">${escapeHtml(ev.text)}</div>
          </div>`;
        })
        .join("");
    } catch (err) {
      box.innerHTML = `<p class="danger">${escapeHtml(err.message || String(err))}</p>`;
    }
  }

  $("btn-sim-send").addEventListener("click", () => {
    if (selectedIds().length === 0) {
      toast("Select channels on Planner first", true);
      return;
    }
    state.inbound.push({
      channel: $("sim-channel").value,
      sender: $("sim-sender").value,
      text: $("sim-text").value,
    });
    renderTranscript();
    toast("Handler replied");
  });

  $("btn-sim-reset").addEventListener("click", () => {
    state.inbound = [];
    renderTranscript();
  });

  $("btn-sim-demo").addEventListener("click", () => {
    if (selectedIds().length === 0) {
      state.selected = new Set(["email", "slack", "telegram"]);
      renderChannels();
      refreshSimChannelSelect();
    }
    const chans = selectedIds();
    state.inbound = [
      { channel: chans[0], sender: "ada@client.com", text: "We need onboarding help." },
      {
        channel: chans[Math.min(1, chans.length - 1)],
        sender: "U0SLACK",
        text: "Can you post the runbook link in-thread?",
      },
      {
        channel: chans[Math.min(2, chans.length - 1)],
        sender: "@buyer",
        text: "Price for Pro plan?",
      },
    ];
    renderTranscript();
    toast("Demo thread loaded");
  });

  // ── Export ────────────────────────────────────────────────────────────────
  $("btn-copy-code").addEventListener("click", async () => {
    try {
      const code = E.generateIntegrationCode(inputBundle());
      $("code-preview").textContent = code;
      await navigator.clipboard.writeText(code);
      toast("Code copied");
    } catch (err) {
      toast(String(err.message || err), true);
    }
  });

  $("btn-download-md").addEventListener("click", () => {
    try {
      const md = E.exportBlueprintMarkdown(inputBundle());
      downloadFile(`${safeName()}-blueprint.md`, md, "text/markdown");
      toast("Markdown downloaded");
    } catch (err) {
      toast(String(err.message || err), true);
    }
  });

  $("btn-download-json").addEventListener("click", () => {
    try {
      const json = JSON.stringify(E.exportBlueprintJson(inputBundle()), null, 2);
      downloadFile(`${safeName()}-blueprint.json`, json, "application/json");
      toast("JSON downloaded");
    } catch (err) {
      toast(String(err.message || err), true);
    }
  });

  function safeName() {
    try {
      return E.normalizeAgentName($("agent-name").value);
    } catch {
      return "agent";
    }
  }

  function downloadFile(name, body, type) {
    const blob = new Blob([body], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderChecklist() {
    $("checklist").innerHTML = E.gatewayChecklist()
      .map(
        (step) =>
          `<li><strong>${escapeHtml(step.title)}</strong><br/><code>${escapeHtml(step.command)}</code><br/>${escapeHtml(step.detail)}</li>`
      )
      .join("");
  }

  // ── Research ──────────────────────────────────────────────────────────────
  function renderResearch() {
    const r = E.getResearch();
    $("research-blurb").innerHTML = `${escapeHtml(r.description)} ·
      <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.repo)}</a>
      · <strong>${escapeHtml(String(r.stars))}★</strong> / ${escapeHtml(String(r.forks))} forks (observed ${escapeHtml(r.observedAt)}, confidence: ${escapeHtml(r.starsConfidence)}).`;

    const rows = [
      ["Repository", r.repo],
      ["Stars", `${r.stars} (${r.starsConfidence})`],
      ["Forks", String(r.forks)],
      ["Open issues", String(r.openIssues)],
      ["License", r.license],
      ["Primary language", r.language],
      ["Homepage", r.homepage],
      ["Gateway", r.gateway],
      ["PyPI", r.pypi],
      ["npm", r.npm],
      ["Observed at", r.observedAt],
    ];
    $("research-table").innerHTML =
      "<tbody>" +
      rows
        .map(
          ([k, v]) =>
            `<tr><th>${escapeHtml(k)}</th><td>${linkify(String(v))}</td></tr>`
        )
        .join("") +
      "</tbody>";

    $("keyword-chips").innerHTML = r.keywords
      .map((k) => `<span class="pill">${escapeHtml(k)}</span>`)
      .join("");

    $("channel-table").innerHTML =
      "<thead><tr><th>Channel</th><th>Tier</th><th>Live GW</th><th>Connect</th><th>Notes</th></tr></thead><tbody>" +
      E.listChannels()
        .map(
          (c) =>
            `<tr><td>${c.icon} ${escapeHtml(c.name)}</td><td>${escapeHtml(c.costTier)}</td><td>${c.liveOnGateway ? "yes" : "check"}</td><td><code>${escapeHtml(c.connectMethod)}</code></td><td class="small muted">${escapeHtml(c.notes)}</td></tr>`
        )
        .join("") +
      "</tbody>";

    $("competitor-list").innerHTML = E.listCompetitors()
      .map(
        (c) => `<div class="event" style="margin-bottom:10px">
          <div class="meta">${escapeHtml(c.name)} · ${escapeHtml(c.starsNote)}</div>
          <div class="body small"><strong>Gap:</strong> ${escapeHtml(c.weakness)}<br/><strong>Our edge:</strong> ${escapeHtml(c.ourEdge)}</div>
        </div>`
      )
      .join("");
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  function renderPricing() {
    $("pricing-grid").innerHTML = E.listPricingTiers()
      .map((p) => {
        const cls = p.highlight ? "price-card highlight" : "price-card";
        return `<div class="${cls}">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="price">$${p.priceUsd}<span>/${p.period}</span></div>
          <p class="small muted">${p.seats} seats · ${p.maxChannels} channels · ${p.messagesIncluded.toLocaleString()} msgs</p>
          <ul>${p.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
          <button class="btn ${p.highlight ? "primary" : ""}" data-plan="${p.id}" type="button">${escapeHtml(p.cta)}</button>
        </div>`;
      })
      .join("");

    $("pricing-grid").querySelectorAll("button[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $("plan").value = btn.getAttribute("data-plan");
        document.querySelector('.tab[data-tab="planner"]').click();
        buildBlueprint();
        toast(`Selected ${btn.getAttribute("data-plan")} plan`);
      });
    });
  }

  $("waitlist-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const email = String($("waitlist-email").value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid email", true);
      return;
    }
    const entry = {
      email,
      size: $("waitlist-size").value,
      at: new Date().toISOString(),
      product: "caspian-channel-console",
    };
    const key = "caspian-channel-console-waitlist";
    // Guard against corrupted/legacy localStorage content — a bad value must
    // not permanently break the waitlist form with an uncaught SyntaxError.
    let prev;
    try {
      prev = JSON.parse(localStorage.getItem(key) || "[]");
    } catch (_err) {
      prev = [];
    }
    if (!Array.isArray(prev)) prev = [];
    prev.push(entry);
    localStorage.setItem(key, JSON.stringify(prev));
    $("waitlist-status").textContent = `Saved locally: ${email}. ${prev.length} entr${prev.length === 1 ? "y" : "ies"} on this device.`;
    $("waitlist-email").value = "";
    toast("Waitlist saved on this device");
  });

  // ── Utils ─────────────────────────────────────────────────────────────────
  function toast(msg, isError) {
    const el = $("toast");
    el.textContent = msg;
    el.style.background = isError ? "var(--danger)" : "var(--accent)";
    el.style.color = isError ? "#1a0a0a" : "var(--accent-ink)";
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function linkify(s) {
    if (/^https?:\/\//.test(s)) {
      return `<a href="${escapeHtml(s)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s)}</a>`;
    }
    return escapeHtml(s);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  fillPlans();
  fillUseCases();
  renderChannels();
  refreshSimChannelSelect();
  renderChecklist();
  renderResearch();
  renderPricing();
  buildBlueprint();
})();
