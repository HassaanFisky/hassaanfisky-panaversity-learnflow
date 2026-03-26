/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com", "plus.unsplash.com"],
  },
  // Allow the containerized microservices to be accessed
  async rewrites() {
    return [
      {
        source: '/api/triage/:path*',
        destination: `${process.env.NEXT_PUBLIC_TRIAGE_SERVICE_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
