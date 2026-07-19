import type { NextConfig } from 'next';
import path from 'node:path';

const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@gmny/ui', '@gmny/shared'],
  outputFileTracingRoot: monorepoRoot,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
