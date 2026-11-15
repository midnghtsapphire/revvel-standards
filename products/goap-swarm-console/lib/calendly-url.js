"use strict";

// WR #18334: the booking embed is driven by CALENDLY_URL (mapped to
// NEXT_PUBLIC_CALENDLY_URL for the Next client). An empty value, or any URL
// that is not an https://calendly.com/<path> link, returns null so the page
// renders the "not set" state. This refuses a made-up path and also refuses
// to iframe an arbitrary host if the env value is wrong.

function calendlyEmbedUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.hostname !== "calendly.com") return null;
  const path = url.pathname.replace(/\/+$/, "");
  if (!path) return null;
  url.hash = "";
  return url.toString();
}

module.exports = { calendlyEmbedUrl };
