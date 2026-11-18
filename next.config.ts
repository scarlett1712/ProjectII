import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Prevent ESLint errors/warnings from breaking production deployment on Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
