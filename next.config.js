/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*", 
        // 로컬(localhost) 대신 배포 서버 주소로 변경
        destination: "https://api.onepageme.kr/api/:path*", 
      },
    ];
  },
};

module.exports = nextConfig;