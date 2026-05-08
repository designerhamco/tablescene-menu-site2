import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  productionBrowserSourceMaps: false,
  enablePrerenderSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    deviceSizes: [360, 640, 768, 1024, 1280, 1536],
    imageSizes: [48, 96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    preloadEntriesOnStart: false,
    serverSourceMaps: false,
    turbopackFileSystemCacheForBuild: true,
    webpackMemoryOptimizations: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
