import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.next/**",
        "**/bin/**",
        "**/obj/**",
        "**/.vs/**",
        "**/logs/**",
        "**/TestResults/**",
        "**/coverage/**"
      ]
    };

    return config;
  }
};

export default nextConfig;
