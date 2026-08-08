/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep API routes available when deployed as a standalone product.
  output: undefined,
};

module.exports = nextConfig;
