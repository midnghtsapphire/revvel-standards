(function () {
  function calendlyEmbedUrl(value) {
    if (typeof value !== "string") return null;
    var trimmed = value.trim();
    if (!trimmed) return null;
    var url;
    try {
      url = new URL(trimmed);
    } catch (error) {
      return null;
    }
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.hostname !== "calendly.com") return null;
    var path = url.pathname.replace(/\/+$/, "");
    if (!path) return null;
    url.hash = "";
    return url.toString();
  }
  window.revvelCalendlyEmbedUrl = calendlyEmbedUrl;
})();
