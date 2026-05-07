/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-fcc7d340a2644ff0824f795f0528543a.r2.dev',
      },
    ],
  },
};

module.exports = nextConfig;
