/* Global Fusion Digest assistant — local, deterministic, no network calls.
   It answers common questions, links to the checklist and starts a booking email.
   It identifies itself as an automated assistant and never claims to be Audrey. */
(function () {
  "use strict";

  var EMAIL = "hello@oaudrey.com";
  var FAQ = [
    { k: ["price", "cost", "how much", "$"], a: "The exposure audit is a fixed $2,500. The leadership briefing is $1,500, and the ransomware readiness review is $4,000. No hourly billing and no retainer." },
    { k: ["include", "get", "deliver", "report"], a: "You get a scored report across ten phases and 59 controls, a findings register with evidence, a red-flag brief within 24 hours if something cannot wait, a 30/60/90 plan, and a 60-minute walkthrough." },
    { k: ["long", "time", "days", "turnaround"], a: "Five business days from access, assuming the intake form comes back within one day." },
    { k: ["pentest", "penetration", "hack", "scan"], a: "No. This is a configuration, exposure and readiness audit. Penetration testing is quoted separately." },
    { k: ["school", "district", "k12", "education"], a: "Yes. Schools are a core audience: small IT teams, internet-facing web stacks and the same edge devices attackers target." },
    { k: ["clinic", "health", "hipaa", "medical"], a: "Yes. Clinics are a core audience, with language that maps to HIPAA exposure and insurance questionnaires." },
    { k: ["manufactur", "ot", "plant", "ics"], a: "Yes. Manufacturing and OT environments are covered, including segmentation and unpatchable systems." },
    { k: ["backup", "restore", "ransomware"], a: "Backup is Phase 6 and the most important phase. It includes isolation, immutability and a timed restore test. The readiness review is $4,000." },
    { k: ["book", "call", "talk", "consult", "schedule"], a: "I can start a booking email for you. A 20-minute call is enough to say whether the audit fits.", cta: "Book a call", href: "mailto:" + EMAIL + "?subject=Exposure%20audit%20call" },
    { k: ["checklist", "download", "free", "pdf"], a: "The nine-page checklist is free and requires no email.", cta: "Download the checklist", href: "exposure-audit-checklist.pdf" },
    { k: ["who", "audrey", "you"], a: "I am an automated assistant for Global Fusion Digest, not Audrey. Audrey reviews every audit personally and replies to email within one business day." },
    { k: ["msp", "partner", "white label"], a: "There is a white-label partner license at $3,000 a year, with onboarding and quarterly updates." }
  ];

  var root = document.createElement("div");
  root.setAttribute("data-gfd-assistant", "true");
  root.innerHTML =
    '<style>' +
    '#gfdBtn{position:fixed;right:20px;bottom:20px;z-index:9999;background:#e8b04b;color:#111;border:0;border-radius:999px;padding:14px 18px;font:700 14px system-ui;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}' +
    '#gfdPanel{position:fixed;right:20px;bottom:84px;width:340px;max-width:calc(100vw - 40px);max-height:70vh;overflow:auto;background:#131c2e;color:#f4f7fb;border:1px solid #22304a;border-radius:16px;padding:16px;z-index:9999;display:none;font:14px/1.5 system-ui;box-shadow:0 18px 50px rgba(0,0,0,.45)}' +
    '#gfdPanel h4{margin:0 0 4px;font-size:15px}' +
    '#gfdPanel .gfd-note{color:#93a1b8;font-size:12px;margin:0 0 12px}' +
    '#gfdLog{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}' +
    '.gfd-u{align-self:flex-end;background:#22304a;padding:8px 10px;border-radius:10px;max-width:85%}' +
    '.gfd-a{align-self:flex-start;background:#0b1220;border:1px solid #22304a;padding:8px 10px;border-radius:10px;max-width:90%}' +
    '#gfdChips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}' +
    '#gfdChips button{background:transparent;border:1px solid #3a4a68;color:#cdd7e6;border-radius:999px;padding:6px 10px;font:12px system-ui;cursor:pointer}' +
    '#gfdForm{display:flex;gap:6px}' +
    '#gfdInput{flex:1;background:#0b1220;border:1px solid #22304a;color:#f4f7fb;border-radius:10px;padding:10px;font:13px system-ui}' +
    '#gfdSend{background:#e8b04b;color:#111;border:0;border-radius:10px;padding:10px 12px;font:700 13px system-ui;cursor:pointer}' +
    '#gfdPanel a{color:#e8b04b}' +
    '</style>' +
    '<button id="gfdBtn" aria-expanded="false">Ask the assistant</button>' +
    '<div id="gfdPanel" role="dialog" aria-label="Global Fusion Digest assistant">' +
    '<h4>Global Fusion Digest assistant</h4>' +
    '<p class="gfd-note">Automated assistant, not Audrey. Answers come from a fixed knowledge base; no tracking, no network calls.</p>' +
    '<div id="gfdLog"><div class="gfd-a">Hi. Ask about pricing, what is included, sectors or booking a call.</div></div>' +
    '<div id="gfdChips">' +
    '<button data-q="How much does it cost?">Pricing</button>' +
    '<button data-q="What do I get?">What is included</button>' +
    '<button data-q="Is this a penetration test?">Is it a pentest?</button>' +
    '<button data-q="Book a call">Book a call</button>' +
    '<button data-q="Download the checklist">Checklist</button>' +
    '</div>' +
    '<form id="gfdForm"><input id="gfdInput" placeholder="Type a question" autocomplete="off"><button id="gfdSend" type="submit">Send</button></form>' +
    '</div>';

  document.body.appendChild(root);

  var btn = document.getElementById("gfdBtn");
  var panel = document.getElementById("gfdPanel");
  var log = document.getElementById("gfdLog");
  var form = document.getElementById("gfdForm");
  var input = document.getElementById("gfdInput");

  function add(text, cls, cta, href) {
    var d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    if (cta && href) {
      d.appendChild(document.createElement("br"));
      var a = document.createElement("a");
      a.href = href;
      a.textContent = cta;
      d.appendChild(a);
    }
    log.appendChild(d);
    panel.scrollTop = panel.scrollHeight;
  }

  function answer(q) {
    var s = q.toLowerCase();
    var best = null, score = 0;
    FAQ.forEach(function (item) {
      var n = item.k.filter(function (k) { return s.indexOf(k) !== -1; }).length;
      if (n > score) { score = n; best = item; }
    });
    add(q, "gfd-u");
    if (best) {
      add(best.a, "gfd-a", best.cta, best.href);
    } else {
      add("I do not have that one in my notes. Email " + EMAIL + " and Audrey will reply within one business day.", "gfd-a", "Send an email", "mailto:" + EMAIL + "?subject=Question%20about%20the%20audit");
    }
  }

  btn.addEventListener("click", function () {
    var open = panel.style.display === "block";
    panel.style.display = open ? "none" : "block";
    btn.setAttribute("aria-expanded", String(!open));
    if (!open) input.focus();
  });

  document.getElementById("gfdChips").addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (t) answer(t.getAttribute("data-q"));
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = "";
    answer(q);
  });
})();
