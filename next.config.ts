import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/stable-basket',
        destination: '/baskets/staple-basket',
        permanent: true,
      },
      {
        source: '/staple-basket',
        destination: '/baskets/staple-basket',
        permanent: true,
      },
      {
        source: '/stable-box',
        destination: '/baskets/staple-basket',
        permanent: true,
      },
      {
        source: '/staple-box',
        destination: '/baskets/staple-basket',
        permanent: true,
      },
      {
        source: '/stable',
        destination: '/baskets/staple-basket',
        permanent: true,
      },
      {
        source: '/staple',
        destination: '/baskets/staple-basket',
        permanent: true,
      },
      {
        source: '/custom-basket',
        destination: '/baskets/custom-basket',
        permanent: true,
      },
      {
        source: '/custom-box',
        destination: '/baskets/custom-basket',
        permanent: true,
      },
      {
        source: '/custom',
        destination: '/baskets/custom-basket',
        permanent: true,
      },
      {
        source: '/basket/:slug*',
        destination: '/baskets/:slug*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
