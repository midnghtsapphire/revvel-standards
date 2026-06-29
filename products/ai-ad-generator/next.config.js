/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // serverExternalPackages replaces experimental.serverComponentsExternalPackages in Next.js 15
  serverExternalPackages: ['@napi-rs/canvas'],
};

module.exports = nextConfig;
