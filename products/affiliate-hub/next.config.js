/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
