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
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
