/* WR-4600 dashboard shell: tabs + the interactive Dose Bench. */
/* global DoseEngine, window, document, location */
(function () {
  "use strict";
  var E = DoseEngine;
  var TABS = window.WR4600_TABS;

  // --- Tab nav ---
  var nav = document.getElementById("tabs");
  var main = document.getElementById("main");

  TABS.forEach(function (tab, i) {
    var btn = document.createElement("button");
    btn.textContent = tab.label;
    btn.dataset.id = tab.id;
    if (i === 0) btn.classList.add("active");
    btn.addEventListener("click", function () {
      show(tab.id);
    });
    nav.appendChild(btn);

    var sec = document.createElement("section");
    sec.className = "tab" + (i === 0 ? " active" : "");
    sec.id = "tab-" + tab.id;
    sec.innerHTML = tab.html;
    main.appendChild(sec);
  });

  function show(id) {
    TABS.forEach(function (t) {
      var sec = document.getElementById("tab-" + t.id);
      if (sec) sec.classList.toggle("active", t.id === id);
    });
    nav.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.id === id);
    });
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    if (id === "bench") mountBench();
    window.scrollTo(0, 0);
  }

  // --- Interactive Dose Bench ---
  var benchMounted = false;
  function mountBench() {
    if (benchMounted) return;
    var mount = document.getElementById("bench-mount");
    if (!mount) return;
    benchMounted = true;
    mount.innerHTML =
      '<h2>The Bench</h2>' +
      '<p class="lede">Every naive red-light build dies here. Dose is not "more light." Response is biphasic — the Arndt–Schulz inverted U. Below threshold, nothing. Above it, inhibition. Set your numbers and find out which build you actually have.</p>' +
      '<p class="note">Fluence · J/cm² = mW/cm² × s ÷ 1000 · 660 + 850nm</p>' +
      '<div class="bench">' +
      '  <div class="card">' +
      '    <div class="slider-row"><label>Irradiance <span class="val"><span id="v-irr">50</span> mW/cm²</span></label><input type="range" id="s-irr" min="1" max="200" step="1" value="50"></div>' +
      '    <div class="slider-row"><label>Exposure <span class="val"><span id="v-exp">60</span> s</span></label><input type="range" id="s-exp" min="1" max="600" step="1" value="60"></div>' +
      '    <div class="slider-row"><label>Spot area <span class="val"><span id="v-area">60</span> cm²</span></label><input type="range" id="s-area" min="1" max="300" step="1" value="60"></div>' +
      '    <div class="readout"><div class="big"><span id="r-fluence">3.0</span></div><div class="unit">J/cm² delivered fluence</div>' +
      '    <div id="r-zone" class="zone-badge"></div></div>' +
      '    <p class="note" id="r-detail"></p>' +
      '  </div>' +
      '  <div class="curve-wrap"><div id="curve"></div>' +
      '  <p class="note">Schematic Arndt–Schulz form — deliberately not predictive. Anchors: fluence commonly 1–20 J/cm²; irradiance 5–50 mW/cm² for stimulation; peak ATP ~3 J/cm² at 25 mW/cm² in cortical neurons. Set irradiance to what your meter actually reads at that distance.</p></div>' +
      '</div>' +
      '<div class="callout"><strong>Why irradiance is not a proxy for dose.</strong> Same joules, different power, different outcome. In a hamster oral-mucositis model, 660nm delivering an identical 0.9 J/cm² per point reduced severity at 55 mW/cm² and did nothing measurable at 155 mW/cm². The fleet treats irradiance and fluence as two independent gated parameters. Neither alone is a dose. <em>This single result is why the Bench has two sliders where most calculators have one.</em></div>';

    ["s-irr", "s-exp", "s-area"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", update);
    });
    update();
  }

  function update() {
    var irr = Number(document.getElementById("s-irr").value);
    var exp = Number(document.getElementById("s-exp").value);
    var area = Number(document.getElementById("s-area").value);
    document.getElementById("v-irr").textContent = irr;
    document.getElementById("v-exp").textContent = exp;
    document.getElementById("v-area").textContent = area;

    var c = E.classify(irr, exp);
    var joules = E.totalJoules(c.fluenceJcm2, area);
    document.getElementById("r-fluence").textContent = c.fluenceJcm2.toFixed(2);

    var zoneEl = document.getElementById("r-zone");
    zoneEl.className = "zone-badge zone-" + c.zone;
    var label =
      c.zone === "therapeutic"
        ? "THERAPEUTIC — in the 1–20 J/cm² window"
        : c.zone === "subthreshold"
        ? "SUBTHRESHOLD — below the window, expect nothing"
        : "INHIBITORY — past the window, the descending limb";
    zoneEl.textContent = label;

    var warn = c.irradianceInBand
      ? ""
      : " ⚠ irradiance " + irr + " mW/cm² is outside the commonly-cited 5–50 band — same fluence, different treatment.";
    document.getElementById("r-detail").textContent =
      "Total energy " + joules.toFixed(1) + " J over " + area + " cm²." + warn;

    drawCurve(c.fluenceJcm2);
  }

  // Schematic Arndt–Schulz curve on a log-fluence axis, with a marker at the
  // current dose and the therapeutic band shaded.
  function drawCurve(currentFluence) {
    var W = 460, H = 260, padL = 34, padR = 14, padT = 14, padB = 30;
    var x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
    var logMin = -1, logMax = 2; // 0.1 .. 100 J/cm²
    function fx(f) {
      var lg = Math.log10(Math.max(f, Math.pow(10, logMin)));
      return x0 + ((lg - logMin) / (logMax - logMin)) * (x1 - x0);
    }
    function fy(r) {
      return y0 - r * (y0 - y1);
    }
    var pts = [];
    for (var i = 0; i <= 120; i++) {
      var lg = logMin + (i / 120) * (logMax - logMin);
      var f = Math.pow(10, lg);
      pts.push(fx(f).toFixed(1) + "," + fy(E.relativeResponse(f)).toFixed(1));
    }
    var bandX0 = fx(E.FLUENCE_WINDOW.min), bandX1 = fx(E.FLUENCE_WINDOW.max);
    var mx = fx(currentFluence), my = fy(E.relativeResponse(currentFluence));
    var ticks = [0.1, 1, 10, 100]
      .map(function (t) {
        return '<line class="axis" x1="' + fx(t) + '" y1="' + y0 + '" x2="' + fx(t) + '" y2="' + (y0 + 4) + '"/>' +
          '<text x="' + fx(t) + '" y="' + (y0 + 16) + '" text-anchor="middle">' + t + '</text>';
      })
      .join("");
    document.getElementById("curve").innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Arndt-Schulz biphasic dose-response curve">' +
      '<rect class="band" x="' + bandX0 + '" y="' + y1 + '" width="' + (bandX1 - bandX0) + '" height="' + (y0 - y1) + '"/>' +
      '<line class="axis" x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '"/>' +
      '<line class="axis" x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '"/>' +
      ticks +
      '<text x="' + ((x0 + x1) / 2) + '" y="' + (H - 2) + '" text-anchor="middle">fluence J/cm² (log)</text>' +
      '<polyline class="curve" points="' + pts.join(" ") + '"/>' +
      '<circle class="marker" cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="5"/>' +
      "</svg>";
  }

  // Deep-link support.
  var initial = (location.hash || "").replace("#", "");
  if (initial && TABS.some(function (t) { return t.id === initial; })) show(initial);
})();
