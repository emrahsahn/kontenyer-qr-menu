import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/cafe', destination: '/menu', permanent: true },
      { source: '/club', destination: '/menu', permanent: true },
      { source: '/seafood', destination: '/menu', permanent: true },
      { source: '/dev-portal', destination: '/menu', permanent: true },
      { source: '/restaurant', destination: '/menu', permanent: true },
      { source: '/admin', destination: '/panel', permanent: true },
    ];
  },
};

export default nextConfig;
