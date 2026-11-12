(function () {
  var usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  var hours = document.querySelector("#hours");
  var cost = document.querySelector("#cost");
  var automation = document.querySelector("#automation");
  var price = document.querySelector("#price");

  function read(input, max) {
    var value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.min(max, value);
  }

  function render() {
    var output = document.querySelector("#roi-error");
    try {
      var roi = window.revvelCalculateAgentRoi({
        hoursPerWeek: read(hours, 1000),
        hourlyCost: read(cost, 10000),
        automationPercent: read(automation, 100),
        monthlyPrice: read(price, 100000),
      });
      document.querySelector("#hours-out").textContent = roi.monthlyHours.toFixed(1);
      document.querySelector("#net-out").textContent = usd.format(roi.monthlyNetValue);
      document.querySelector("#annual-out").textContent = usd.format(roi.annualNetValue);
      output.textContent = "";
    } catch (error) {
      output.textContent = error.message;
    }
  }

  [hours, cost, automation, price].forEach(function (input) {
    input.addEventListener("input", render);
  });
  render();

  var meta = document.querySelector('meta[name="revvel-calendly-url"]');
  var embedUrl = window.revvelCalendlyEmbedUrl(meta ? meta.getAttribute("content") : "");
  var host = document.querySelector("#calendly-embed");
  var unset = document.querySelector("#calendly-unset");
  if (embedUrl && host) {
    var widget = document.createElement("div");
    widget.className = "calendly-inline-widget";
    widget.setAttribute("data-url", embedUrl);
    widget.style.minWidth = "320px";
    widget.style.height = "700px";
    host.appendChild(widget);
    var script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    if (unset) unset.hidden = true;
  }
})();
