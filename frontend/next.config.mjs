/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
      {
        source: '/proxy_m3u8',
        destination: 'http://127.0.0.1:8000/proxy_m3u8',
      },
      {
        source: '/proxy_segment',
        destination: 'http://127.0.0.1:8000/proxy_segment',
      },
      {
        source: '/proxy_subtitle',
        destination: 'http://127.0.0.1:8000/proxy_subtitle',
      },
    ];
  },
};

export default nextConfig;
