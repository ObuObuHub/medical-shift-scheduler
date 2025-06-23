/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false
  },
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
  }
}

module.exports = nextConfig