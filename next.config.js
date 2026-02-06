/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.onepageme.kr/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
