/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-11-10 Codex WR #18334: initial unconditional export retained below.
  // output: 'export',
  // Normal server builds retain the existing GET/POST /api/plan implementation.
  // The opt-in sales export includes TSX pages and public files, without editing
  // or removing API source. Its public health file is served by the same adapter.
  ...(process.env.REVVEL_STATIC_SALES_EXPORT === '1' ? {
    output: 'export',
    pageExtensions: ['tsx'],
  } : {}),
  // 2026-11-11 MarketShipper, WR #18334: Audrey sets CALENDLY_URL. Next inlines
  // only NEXT_PUBLIC_* into client pages, so map it here. Empty stays empty.
  // Do not commit a calendly.com path.
  env: {
    NEXT_PUBLIC_CALENDLY_URL: process.env.CALENDLY_URL || process.env.NEXT_PUBLIC_CALENDLY_URL || "",
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
