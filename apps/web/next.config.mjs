/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile shared workspace packages from source (no pre-build step needed).
  transpilePackages: ['@nairaflow/ui', '@nairaflow/shared'],
};

export default nextConfig;
