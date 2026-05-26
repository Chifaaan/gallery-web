// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost", port: "8000" },
      { protocol: "http",  hostname: "api",       port: "8000" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    // Proxy /api/v1/* ke FastAPI saat development
    // Hapus ini jika API di-deploy ke domain berbeda
    return [
      {
        source     : "/api/v1/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
