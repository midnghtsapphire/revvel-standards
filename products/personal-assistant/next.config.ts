import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const productRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keep tracing inside this product folder when the monorepo root also has a lockfile.
  outputFileTracingRoot: productRoot,
  turbopack: {
    root: productRoot,
  },
};

export default nextConfig;
