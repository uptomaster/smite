/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** 브라우저 기본 요청 favicon.ico → SVG로 연결 (실제 .ico 없을 때 404 방지) */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg" }];
  },
};

export default nextConfig;
