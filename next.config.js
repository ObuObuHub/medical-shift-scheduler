/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimization for Vercel deployment
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Handle static files
  trailingSlash: false,
  // Image optimization
  images: {
    domains: [],
    unoptimized: true
  },
  // Force fresh build
  generateBuildId: async () => {
    return 'postgres-deployment-' + Date.now()
  }
}

module.exports = nextConfig