import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gmny/ui', '@gmny/shared'],
  eslint: {
    // Keep Vercel builds green if root monorepo ESLint deps are incomplete.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
