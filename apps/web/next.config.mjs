/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexum/kite", "@nexum/x402", "@nexum/types"],
  serverExternalPackages: ["ethers"],
  experimental: {
    // Silence the "Critical dependency" warning from ethers dynamic require
    esmExternals: "loose",
  },
  webpack: (config) => {
    // ethers uses some Node.js built-ins
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
