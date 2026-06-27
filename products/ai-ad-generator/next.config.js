/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // Allow @napi-rs/canvas native binary
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
};

module.exports = nextConfig;
