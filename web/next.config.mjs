/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/anime/:path*',
        destination: 'http://127.0.0.1:8000/anime/:path*',
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
      {
        source: '/logs/:path*',
        destination: 'http://127.0.0.1:8000/logs/:path*',
      },
    ];
  },
};

export default nextConfig;
