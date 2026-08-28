import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore the "canvas" module required by pdfjs-dist for rendering.
  // We only use pdfjs-dist for text extraction, not rendering.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
