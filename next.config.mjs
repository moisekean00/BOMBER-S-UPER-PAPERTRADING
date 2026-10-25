/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ["yahoo-finance2"] },
  async redirects() {
    return [
      { source: "/portfolio", destination: "/squadra", permanent: false },
      { source: "/lega", destination: "/squadre", permanent: false },
      { source: "/lega/:id", destination: "/squadre/:id", permanent: false },
    ];
  },
};
export default nextConfig;
