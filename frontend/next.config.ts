import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com", "plus.unsplash.com"],
  },
  /* Fix for monorepo root detection issue blocking build */
  outputFileTracingRoot: path.join(__dirname, "../../"),
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow the containerized microservices to be accessed
  async rewrites() {
    return [
      {
        source: '/api/triage/:path*',
        destination: `${process.env.NEXT_PUBLIC_TRIAGE_SERVICE_URL || 'http://localhost:8001'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
